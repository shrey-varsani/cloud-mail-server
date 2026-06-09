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

type IMAPSession struct {
	conn       net.Conn
	backend    *repositories.BackendClient
	state      string // NON-AUTHENTICATED, AUTHENTICATED, SELECTED
	user       string
	mailbox    *repositories.MailboxDto
	selectedFd *repositories.FolderDto
	emails     []repositories.EmailDto
	mu         sync.Mutex
}

type IMAPServer struct {
	port          string
	backendClient *repositories.BackendClient
	listener      net.Listener
	useTLS        bool
	tlsCertFile   string
	tlsKeyFile    string
	quit          chan struct{}
	wg            sync.WaitGroup
}

func NewIMAPServer(cfg config.Config, bc *repositories.BackendClient) *IMAPServer {
	return &IMAPServer{
		port:          cfg.ImapPort,
		backendClient: bc,
		useTLS:        cfg.UseTLS,
		tlsCertFile:   cfg.TLSCertFile,
		tlsKeyFile:    cfg.TLSKeyFile,
		quit:          make(chan struct{}),
	}
}

func (s *IMAPServer) Start() error {
	var err error
	addr := "0.0.0.0:" + s.port

	if s.useTLS && s.tlsCertFile != "" && s.tlsKeyFile != "" {
		log.Printf("[IMAP] Injecting Secure SSL layout layers...")
		cert, errCert := tls.LoadX509KeyPair(s.tlsCertFile, s.tlsKeyFile)
		if errCert != nil {
			return fmt.Errorf("failed to load dynamic x509 cert: %w", errCert)
		}
		tlsCfg := &tls.Config{Certificates: []tls.Certificate{cert}}
		s.listener, err = tls.Listen("tcp", addr, tlsCfg)
	} else {
		log.Printf("[IMAP] Launching standard TCP multi-client server...")
		s.listener, err = net.Listen("tcp", addr)
	}

	if err != nil {
		return err
	}

	log.Printf("[INFO] IMAP Server listening on TCP port %s (TLS: %t)", s.port, s.useTLS)

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
					log.Printf("[IMAP] Connection handler exception: %v", err)
					continue
				}
			}
			go s.handleConnection(conn)
		}
	}()

	return nil
}

func (s *IMAPServer) Stop() {
	close(s.quit)
	if s.listener != nil {
		s.listener.Close()
	}
	s.wg.Wait()
	log.Println("[INFO] IMAP Server stopped successfully")
}

func (s *IMAPServer) handleConnection(conn net.Conn) {
	defer conn.Close()
	log.Printf("[IMAP] Connection accepted from remote system: %s", conn.RemoteAddr())

	session := &IMAPSession{
		conn:    conn,
		backend: s.backendClient,
		state:   "NON-AUTHENTICATED",
	}

	session.writeUntagged("OK IMAP4rev1 Server Ready (Platform Retainer v1.0.0)")

	scanner := bufio.NewScanner(conn)
	for scanner.Scan() {
		line := scanner.Text()
		log.Printf("[IMAP][IN %s] %s", conn.RemoteAddr(), line)

		parts := strings.Fields(line)
		if len(parts) < 2 {
			session.conn.Write([]byte("* BAD command string missing required tag\r\n"))
			continue
		}

		tag := parts[0]
		cmd := strings.ToUpper(parts[1])
		args := parts[2:]

		keepAlive := session.executeCommand(tag, cmd, args)
		if !keepAlive {
			break
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("[IMAP][ERROR %s] Connection error: %v", conn.RemoteAddr(), err)
	}
	log.Printf("[IMAP] Connection disconnected gracefully with address: %s", conn.RemoteAddr())
}

func (session *IMAPSession) writeTagged(tag, status, message string) {
	resp := fmt.Sprintf("%s %s %s", tag, status, message)
	session.conn.Write([]byte(resp + "\r\n"))
	log.Printf("[IMAP][OUT %s] %s", session.conn.RemoteAddr(), resp)
}

func (session *IMAPSession) writeUntagged(message string) {
	resp := fmt.Sprintf("* %s", message)
	session.conn.Write([]byte(resp + "\r\n"))
	log.Printf("[IMAP][OUT %s] %s", session.conn.RemoteAddr(), resp)
}

func (session *IMAPSession) executeCommand(tag, cmd string, args []string) bool {
	session.mu.Lock()
	defer session.mu.Unlock()

	switch cmd {
	case "CAPABILITY":
		session.writeUntagged("CAPABILITY IMAP4rev1 AUTH=PLAIN LITERAL+")
		session.writeTagged(tag, "OK", "CAPABILITY completed")
		return true

	case "NOOP":
		session.writeTagged(tag, "OK", "NOOP completed successfully")
		return true

	case "LOGIN":
		if session.state != "NON-AUTHENTICATED" {
			session.writeTagged(tag, "NO", "Already authenticated or invalid session context state")
			return true
		}
		if len(args) < 2 {
			session.writeTagged(tag, "BAD", "Missing account credentials (username password required)")
			return true
		}

		user := args[0]
		pwd := args[1]

		// Resolve from database APIs
		box, err := session.backend.AuthenticateOrResolveMailbox(user, pwd)
		if err != nil {
			session.writeTagged(tag, "NO", "Invalid Credentials - Storage profile mismatch")
			return true
		}

		session.user = user
		session.mailbox = box
		session.state = "AUTHENTICATED"
		session.writeTagged(tag, "OK", fmt.Sprintf("[%s] authenticated successfully", user))
		return true

	case "SELECT":
		if session.state != "AUTHENTICATED" && session.state != "SELECTED" {
			session.writeTagged(tag, "NO", "Authentication required prior to selected folder actions")
			return true
		}
		if len(args) == 0 {
			session.writeTagged(tag, "BAD", "Target mailbox name is required")
			return true
		}

		folderName := cleanMailboxName(args[0])

		folders, err := session.backend.FetchFolders(session.mailbox.ID)
		if err != nil {
			session.writeTagged(tag, "NO", "Folder list catalog pull failed")
			return true
		}

		var found *repositories.FolderDto
		for _, fd := range folders {
			if strings.EqualFold(fd.Name, folderName) {
				found = &fd
				break
			}
		}

		if found == nil {
			// fallback/mock create custom folder
			found = &repositories.FolderDto{
				ID: 10, Name: folderName, Type: "USER_DEFINED", MailboxID: session.mailbox.ID, TotalCount: 0, UnreadCount: 0,
			}
		}

		emails, err := session.backend.FetchEmails(found.ID)
		if err != nil {
			session.writeTagged(tag, "NO", "Failed loading emails inside target folder")
			return true
		}

		session.selectedFd = found
		session.emails = emails
		session.state = "SELECTED"

		// Send standard RFC responses
		session.writeUntagged(fmt.Sprintf("%d EXISTS", len(emails)))
		session.writeUntagged("0 RECENT")
		session.writeUntagged("FLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)")
		session.writeUntagged("OK [PERMANENTFLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)] Limited write access rules")
		session.writeTagged(tag, "OK", fmt.Sprintf("[READ-WRITE] SELECT Folder '%s' successfully prepared", folderName))
		return true

	case "SEARCH":
		if session.state != "SELECTED" {
			session.writeTagged(tag, "NO", "SELECT folder context prior to executing search commands")
			return true
		}

		// Perform searching based on basic structures or return all
		var matched []string
		for i := range session.emails {
			matched = append(matched, strconv.Itoa(i+1))
		}

		if len(matched) > 0 {
			session.writeUntagged(fmt.Sprintf("SEARCH %s", strings.Join(matched, " ")))
		} else {
			session.writeUntagged("SEARCH")
		}
		session.writeTagged(tag, "OK", "SEARCH commands processed safely")
		return true

	case "FETCH":
		if session.state != "SELECTED" {
			session.writeTagged(tag, "NO", "Session selects must occur first")
			return true
		}
		if len(args) < 2 {
			session.writeTagged(tag, "BAD", "Missing message identifiers or fetch query limits")
			return true
		}

		seqRange := args[0]
		// fetch query attributes fields like: "FLAGS", "INTERNALDATE", "RFC822.SIZE", "BODY[]"
		queryParts := strings.Join(args[1:], " ")

		session.handleFetch(tag, seqRange, queryParts)
		return true

	case "LOGOUT":
		session.writeUntagged("BYE Host gateway connection signing off")
		session.writeTagged(tag, "OK", "LOGOUT completed")
		return false

	default:
		session.writeTagged(tag, "BAD", "Command keyword not supported by platform schema")
		return true
	}
}

func (session *IMAPSession) handleFetch(tag, seqRange, fields string) {
	// Parse range, e.g. "1" or "1:3" or "2:*"
	var startIdx, endIdx int
	total := len(session.emails)

	if seqRange == "*" {
		if total == 0 {
			session.writeTagged(tag, "OK", "FETCH empty results")
			return
		}
		startIdx = total
		endIdx = total
	} else if strings.Contains(seqRange, ":") {
		bounds := strings.Split(seqRange, ":")
		if b1, err := strconv.Atoi(bounds[0]); err == nil {
			startIdx = b1
		}
		if bounds[1] == "*" {
			endIdx = total
		} else if b2, err := strconv.Atoi(bounds[1]); err == nil {
			endIdx = b2
		}
	} else {
		if b, err := strconv.Atoi(seqRange); err == nil {
			startIdx = b
			endIdx = b
		}
	}

	if startIdx < 1 { startIdx = 1 }
	if endIdx > total { endIdx = total }

	if startIdx > endIdx || startIdx > total {
		session.writeTagged(tag, "OK", "FETCH complete (No indexes matched context)")
		return
	}

	for i := startIdx; i <= endIdx; i++ {
		email := session.emails[i-1]
		_ = session.backend.MarkAsRead(email.ID) // Update statistics in backend as well

		var fetchItems []string

		// Check if requested size/dates/flags
		if strings.Contains(strings.ToUpper(fields), "FLAGS") {
			flagStr := "\\Seen"
			if email.IsStarred {
				flagStr = "\\Flagged \\Seen"
			}
			fetchItems = append(fetchItems, fmt.Sprintf("FLAGS (%s)", flagStr))
		}
		if strings.Contains(strings.ToUpper(fields), "RFC822.SIZE") {
			fetchItems = append(fetchItems, fmt.Sprintf("RFC822.SIZE %d", email.SizeInBytes))
		}
		if strings.Contains(strings.ToUpper(fields), "INTERNALDATE") {
			fetchItems = append(fetchItems, fmt.Sprintf("INTERNALDATE \"%s\"", email.ReceivedAt.Format("02-Jan-2006 15:04:05 -0700")))
		}
		if strings.Contains(strings.ToUpper(fields), "BODY") || strings.Contains(strings.ToUpper(fields), "RFC822") {
			// Construct complete MIME output string format
			rfcText := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nDate: %s\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
				email.Sender, email.RecipientsTo, email.Subject, email.ReceivedAt.Format(time.RFC1123Z), email.Body)
			
			fetchItems = append(fetchItems, fmt.Sprintf("BODY[] {%d}\r\n%s", len(rfcText), rfcText))
		}

		session.writeUntagged(fmt.Sprintf("%d FETCH (%s)", i, strings.Join(fetchItems, " ")))
	}

	session.writeTagged(tag, "OK", "FETCH Completed successfully")
}

func cleanMailboxName(name string) string {
	name = strings.Trim(name, "\"")
	return name
}
