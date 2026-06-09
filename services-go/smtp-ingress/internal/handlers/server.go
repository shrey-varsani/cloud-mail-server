package handlers

import (
	"crypto/tls"
	"fmt"
	"log"
	net "net"
	"sync"
	"sync/atomic"

	"services-go/smtp-ingress/internal/config"
	"services-go/smtp-ingress/internal/kafka"
)

// Server coordinates the active lifecycle of the Go SMTP Receiving System connection listener.
type Server struct {
	config       *config.Config
	publisher    kafka.Publisher
	authenticator Authenticator
	activeClients int64
	wg           sync.WaitGroup
	quit          chan struct{}
	listener     net.Listener
}

// NewServer builds an instances of the TCP system coordinator.
func NewServer(cfg *config.Config, pub kafka.Publisher, auth Authenticator) *Server {
	return &Server{
		config:        cfg,
		publisher:     pub,
		authenticator: auth,
		quit:          make(chan struct{}),
	}
}

// Start launches the socket daemon listener with optional secure TLS filters.
func (s *Server) Start() error {
	addr := fmt.Sprintf("0.0.0.0:%d", s.config.SMTPPort)
	
	var err error
	var l net.Listener

	if s.config.TLSEnabled {
		log.Printf("[SMTP SERVER] Loading secure TLS parameters. Cert: %s, Key: %s", s.config.TLSCertPath, s.config.TLSKeyPath)
		cert, cerr := tls.LoadX509KeyPair(s.config.TLSCertPath, s.config.TLSKeyPath)
		if cerr != nil {
			log.Printf("[SMTP SERVER] Failed loading certificates: %v. Reverting safely to Non-TLS listener context.", cerr)
			l, err = net.Listen("tcp", addr)
		} else {
			tlsConfig := &tls.Config{
				Certificates: []tls.Certificate{cert},
				MinVersion:   tls.VersionTLS12,
			}
			l, err = tls.Listen("tcp", addr, tlsConfig)
			log.Printf("[SMTP SERVER] TLS listener compiled successfully on port %d", s.config.SMTPPort)
		}
	} else {
		l, err = net.Listen("tcp", addr)
	}

	if err != nil {
		return err
	}
	s.listener = l
	log.Printf("[SMTP API] SMTP Ingress Receiving System daemon started successfully on %s", addr)

	s.wg.Add(1)
	go s.acceptConnections()

	return nil
}

func (s *Server) acceptConnections() {
	defer s.wg.Done()

	for {
		conn, err := s.listener.Accept()
		if err != nil {
			select {
			case <-s.quit:
				return
			default:
				log.Printf("[SMTP SERVER] Failed accepting client socket handshakes: %v", err)
				continue
			}
		}

		// Throttle limits enforcement
		const maxClients = 1000
		if atomic.LoadInt64(&s.activeClients) >= maxClients {
			log.Printf("[SMTP LIMIT] Concurrency limit of %d clients breached. Temporarily dropping connection from %s", maxClients, conn.RemoteAddr().String())
			conn.Write([]byte("421 4.3.2 System busy, network load limits active\r\n"))
			conn.Close()
			continue
		}

		atomic.AddInt64(&s.activeClients, 1)
		s.wg.Add(1)

		go func(c net.Conn) {
			defer atomic.AddInt64(&s.activeClients, -1)
			defer s.wg.Done()

			session := NewSession(c, s.publisher, s.authenticator, s.config.TLSEnabled)
			session.Handle()
		}(conn)
	}
}

// Stop shuts down the socket daemon, closing the listener and waiting for active sessions to finish.
func (s *Server) Stop() {
	close(s.quit)
	if s.listener != nil {
		s.listener.Close()
	}
	s.wg.Wait()
	log.Println("[SMTP DAEMON] SMTP server daemon shutdown execution verified complete.")
}
