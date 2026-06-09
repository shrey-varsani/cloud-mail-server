package handlers

import (
	"bufio"
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"

	"services-go/retrieval-service/internal/config"
	"services-go/retrieval-service/internal/repositories"
)

type POP3Session struct {
	conn       net.Conn
	backend    *repositories.BackendClient
	state      string // AUTHORIZATION, TRANSACTION, UPDATE
	user       string
	mailbox    *repositories.MailboxDto
	inboxID    int64
	emails     []repositories.EmailDto
	deleted    map[int]bool
	mu         sync.Mutex
}

type POP3Server struct {
	port          string
	backendClient *repositories.BackendClient
	listener      net.Listener
	useTLS        bool
	tlsCertFile   string
	tlsKeyFile    string
	quit          chan struct{}
	wg            sync.WaitGroup
}

func NewPOP3Server(cfg config.Config, bc *repositories.BackendClient) *POP3Server {
	return &POP3Server{
		port:          cfg.Pop3Port,
		backendClient: bc,
		useTLS:        cfg.UseTLS,
		tlsCertFile:   cfg.TLSCertFile,
		tlsKeyFile:    cfg.TLSKeyFile,
		quit:          make(chan struct{}),
	}
}

func (s *POP3Server) Start() error {
	var err error
	addr := "0.0.0.0:" + s.port

	if s.useTLS && s.tlsCertFile != "" && s.tlsKeyFile != "" {
		log.Printf("[POP3] Loading TLS certificate configurations...")
		cert, errCert := tls.LoadX509KeyPair(s.tlsCertFile, s.tlsKeyFile)
		if errCert != nil {
			return fmt.Errorf("failed to load POP3 key pair certificate: %w", errCert)
		}
		tlsCfg := &tls.Config{Certificates: []tls.Certificate{cert}}
		s.listener, err = tls.Listen("tcp", addr, tlsCfg)
	} else {
		log.Printf("[POP3] Starting raw unsecure TCP connector...")
		s.listener, err = net.Listen("tcp", addr)
	}

	if err != nil {
		return err
	}

	log.Printf("[INFO] POP3 Server listening on TCP port %s (TLS: %t)", s.port, s.useTLS)

	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		for {
			conn, err := s.listener.Accept()
			if err != nil {
				select {
				case <-s.quit:
					return
				default:
					log.Printf("[POP3] Listener connection acceptance failure: %v", err)
					continue
				}
			}
			go s.handleConnection(conn)
		}
	}()

	return nil
}

func (s *POP3Server) Stop() {
	close(s.quit)
	if s.listener != nil {
		s.listener.Close()
	}
	s.wg.Wait()
	log.Println("[INFO] POP3 Server stopped successfully")
}

func (s *POP3Server) handleConnection(conn net.Conn) {
	defer conn.Close()
	log.Printf("[POP3] New connection established from remote address: %s", conn.RemoteAddr())

	session := &POP3Session{
		conn:    conn,
		backend: s.backendClient,
		state:   "AUTHORIZATION",
		deleted: make(map[int]bool),
	}

	session.writeResponse("+OK POP3 Server Ready (Platform Retainer v1.0.0)")

	scanner := bufio.NewScanner(conn)
	for scanner.Scan() {
		line := scanner.Text()
		log.Printf("[POP3][IN %s] %s", conn.RemoteAddr(), line)
		
		parts := strings.Fields(line)
		if len(parts) == 0 {
			continue
		}

		cmd := strings.ToUpper(parts[0])
		args := parts[1:]

		keepAlive := session.executeCommand(cmd, args)
		if !keepAlive {
			break
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("[POP3][ERROR %s] Read loop error: %v", conn.RemoteAddr(), err)
	}
	log.Printf("[POP3] Connection closed with client: %s", conn.RemoteAddr())
}

func (session *POP3Session) writeResponse(msg string) {
	session.conn.Write([]byte(msg + "\r\n"))
	log.Printf("[POP3][OUT %s] %s", session.conn.RemoteAddr(), msg)
}

func (session *POP3Session) executeCommand(cmd string, args []string) bool {
	session.mu.Lock()
	defer session.mu.Unlock()

	switch cmd {
	case "USER":
		if session.state != "AUTHORIZATION" {
			session.writeResponse("-ERR Command unauthorized in current state")
			return true
		}
		if len(args) == 0 {
			session.writeResponse("-ERR Missing username / email address identifier")
			return true
		}
		session.user = args[0]
		session.writeResponse("+OK User accepted, please send password via PASS")
		return true

	case "PASS":
		if session.state != "AUTHORIZATION" || session.user == "" {
			session.writeResponse("-ERR Send USER first before inputting password details")
			return true
		}
		if len(args) == 0 {
			session.writeResponse("-ERR Password missing")
			return true
		}
		pwd := args[0]

		// Resolve from platform repository APIs
		box, err := session.backend.AuthenticateOrResolveMailbox(session.user, pwd)
		if err != nil {
			session.writeResponse("-ERR Authentication failure resolving mailbox storage profile")
			return true
		}

		session.mailbox = box
		
		// Load inbox folder state
		folders, err := session.backend.FetchFolders(box.ID)
		if err != nil {
			session.writeResponse("-ERR Folders state mapping unavailable")
			return true
		}

		// Find inbox
		var inboxID int64 = 1
		for _, fd := range folders {
			if strings.EqualFold(fd.Name, "Inbox") {
				inboxID = fd.ID
				break
			}
		}
		session.inboxID = inboxID

		// Load active emails in inbox
		emails, err := session.backend.FetchEmails(inboxID)
		if err != nil {
			session.writeResponse("-ERR Email retrieval API timeout")
			return true
		}

		session.emails = emails
		session.state = "TRANSACTION"
		session.writeResponse(fmt.Sprintf("+OK Mailbox successfully loaded (%d message(s), capacity: %d bytes)", len(emails), box.StorageCapacityBytes))
		return true

	case "STAT":
		if session.state != "TRANSACTION" {
			session.writeResponse("-ERR Not in TRANSACTION state")
			return true
		}
		
		activeCount, activeSize := session.calculateMetrics()
		session.writeResponse(fmt.Sprintf("+OK %d %d", activeCount, activeSize))
		return true

	case "LIST":
		if session.state != "TRANSACTION" {
			session.writeResponse("-ERR Must validate authentication credentials first")
			return true
		}

		if len(args) > 0 {
			// List specific message statistics
			idx, err := strconv.Atoi(args[0])
			if err != nil || idx < 1 || idx > len(session.emails) || session.deleted[idx] {
				session.writeResponse("-ERR No such Active message inside current Inbox index")
				return true
			}
			session.writeResponse(fmt.Sprintf("+OK %d %d", idx, session.emails[idx-1].SizeInBytes))
		} else {
			activeCount, activeSize := session.calculateMetrics()
			session.writeResponse(fmt.Sprintf("+OK %d message(s) (%d bytes)", activeCount, activeSize))
			for i, em := range session.emails {
				msgIdx := i + 1
				if !session.deleted[msgIdx] {
					session.conn.Write([]byte(fmt.Sprintf("%d %d\r\n", msgIdx, em.SizeInBytes)))
				}
			}
			session.conn.Write([]byte(".\r\n"))
		}
		return true

	case "RETR":
		if session.state != "TRANSACTION" {
			session.writeResponse("-ERR Session authorization pending")
			return true
		}
		if len(args) == 0 {
			session.writeResponse("-ERR Reference index is required")
			return true
		}

		idx, err := strconv.Atoi(args[0])
		if err != nil || idx < 1 || idx > len(session.emails) || session.deleted[idx] {
			session.writeResponse("-ERR Reference email index not found")
			return true
		}

		email := session.emails[idx-1]
		_ = session.backend.MarkAsRead(email.ID) // Update statistics in backend as well

		session.writeResponse(fmt.Sprintf("+OK %d bytes", email.SizeInBytes))
		// Format POP3 / SMTP Raw Message format
		session.conn.Write([]byte(fmt.Sprintf("From: %s\r\n", email.Sender)))
		session.conn.Write([]byte(fmt.Sprintf("To: %s\r\n", email.RecipientsTo)))
		session.conn.Write([]byte(fmt.Sprintf("Subject: %s\r\n", email.Subject)))
		session.conn.Write([]byte(fmt.Sprintf("Date: %s\r\n", email.ReceivedAt.Format(time.RFC1123Z))))
		session.conn.Write([]byte("\r\n"))
		session.conn.Write([]byte(email.Body + "\r\n"))
		session.conn.Write([]byte(".\r\n"))
		return true

	case "DELE":
		if session.state != "TRANSACTION" {
			session.writeResponse("-ERR Cannot compute operations prior to authentication")
			return true
		}
		if len(args) == 0 {
			session.writeResponse("-ERR Missing index number key")
			return true
		}

		idx, err := strconv.Atoi(args[0])
		if err != nil || idx < 1 || idx > len(session.emails) || session.deleted[idx] {
			session.writeResponse("-ERR Invalid element or already deleted")
			return true
		}

		session.deleted[idx] = true
		session.writeResponse(fmt.Sprintf("+OK message %d marked for destruction", idx))
		return true

	case "RSET":
		if session.state != "TRANSACTION" {
			session.writeResponse("-ERR Unrecognized execution state bounds")
			return true
		}
		session.deleted = make(map[int]bool)
		session.writeResponse("+OK Unmark all queued deletions successfully")
		return true

	case "NOOP":
		session.writeResponse("+OK Active Ping acknowledged")
		return true

	case "QUIT":
		if session.state == "TRANSACTION" {
			session.state = "UPDATE"
			// Finalize deletions in actual Storage Engine database
			for idx, d := range session.deleted {
				if d {
					email := session.emails[idx-1]
					log.Printf("[POP3] Sync delete event with storage backend: Email ID %d", email.ID)
					_ = session.backend.DeleteEmail(email.ID)
				}
			}
		}
		session.writeResponse("+OK POP3 Server signing off. Goodbye!")
		return false

	default:
		session.writeResponse("-ERR Unrecognized command keyword or formatting error")
		return true
	}
}

func (session *POP3Session) calculateMetrics() (int, int64) {
	activeCount := 0
	var activeSize int64 = 0
	for i, em := range session.emails {
		if !session.deleted[i+1] {
			activeCount++
			activeSize += em.SizeInBytes
		}
	}
	return activeCount, activeSize
}
