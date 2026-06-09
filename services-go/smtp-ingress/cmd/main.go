package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"services-go/smtp-ingress/internal/config"
	"services-go/smtp-ingress/internal/handlers"
	"services-go/smtp-ingress/internal/kafka"
)

func main() {
	log.Println("[BOOT] Initiating Golang Mail Receiving System (SMTP Ingress Daemon)...")

	// 1. Gather configuration parameters
	cfg := config.LoadConfig()
	log.Printf("[BOOT] Loaded Ingress Parameters successfully: Port %d, TLS Active: %t", cfg.SMTPPort, cfg.TLSEnabled)

	// 2. Initialize the Kafka Event Publisher
	log.Printf("[BOOT] Establishing connection properties to Kafka message brokers at [%s] on active topic [%s]", cfg.KafkaBrokers, cfg.KafkaTopic)
	publisher := kafka.NewMockPublisher(cfg.KafkaTopic)
	defer publisher.Close()

	// 3. Setup Authenticator service layer
	authService := handlers.NewSimpleAuthenticator()

	// 4. Instantiate and Boot the SMTP Socket Daemon
	smtpServer := handlers.NewServer(cfg, publisher, authService)
	if err := smtpServer.Start(); err != nil {
		log.Fatalf("[FATAL] SMTP Socket failed binding to physical port %d: %v", cfg.SMTPPort, err)
	}

	// 5. Build Graceful Signal Interceptors
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	interceptedSig := <-sigChan
	log.Printf("[SIGNAL] Received termination interrupt [%v]. Beginning secure microservice teardown...", interceptedSig)

	smtpServer.Stop()
	log.Println("[TEARDOWN] Golang Mail Ingress System gracefully ended.")
}
