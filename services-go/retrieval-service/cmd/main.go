package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"services-go/retrieval-service/internal/config"
	"services-go/retrieval-service/internal/handlers"
	"services-go/retrieval-service/internal/repositories"
	"services-go/retrieval-service/internal/utils"
)

func main() {
	log.Println("[INFO] Bootstrapping Email Retrieval Core Daemon (IMAP/POP3)...")

	// 1. Load Configurations
	cfg := config.LoadConfig()

	// 2. Validate TLS/SSL setup
	if cfg.UseTLS {
		if cfg.TLSCertFile == "" {
			cfg.TLSCertFile = "cert.pem"
		}
		if cfg.TLSKeyFile == "" {
			cfg.TLSKeyFile = "key.pem"
		}
		log.Printf("[INFO] TLS active. Verifying cert: %s and key: %s...", cfg.TLSCertFile, cfg.TLSKeyFile)
		err := utils.GenerateSelfSignedCert(cfg.TLSCertFile, cfg.TLSKeyFile)
		if err != nil {
			log.Fatalf("[FATAL] Failed to configure TLS certificates: %v", err)
		}
		log.Println("[INFO] TLS certificates successfully verified and ready.")
	}

	// 3. Setup backend client to fetch and synchronize state with PostgreSQL storage layer
	log.Printf("[INFO] Connecting backend adapter layer with Spring Boot at: %s", cfg.EmailServiceURL)
	bc := repositories.NewBackendClient(cfg.EmailServiceURL)

	// 4. Initiate POP3 and IMAP TCP server engines
	pop3Srv := handlers.NewPOP3Server(cfg, bc)
	imapSrv := handlers.NewIMAPServer(cfg, bc)

	// 5. Concurrently boot POP3 daemon
	if err := pop3Srv.Start(); err != nil {
		log.Fatalf("[FATAL] POP3 server failed to launch: %v", err)
	}

	// 6. Concurrently boot IMAP daemon
	if err := imapSrv.Start(); err != nil {
		log.Fatalf("[FATAL] IMAP server failed to launch: %v", err)
	}

	log.Println("[INFO] All Retrieval Engines (IMAP/POP3) successfully deployed!")

	// Block main thread and listen to SIGTERM / SIGINT shutdown signals
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("[INFO] Received termination interrupt signal. Turning off daemon...")

	pop3Srv.Stop()
	imapSrv.Stop()

	log.Println("[INFO] Email Retrieval Platform shut down successfully.")
}
