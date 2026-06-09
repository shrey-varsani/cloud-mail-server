package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"services-go/security-and-search-service/internal/config"
	"services-go/security-and-search-service/internal/handlers"
	"services-go/security-and-search-service/internal/kafka"
	"services-go/security-and-search-service/internal/services"
	"services-go/security-and-search-service/internal/storage"
)

func main() {
	log.Println("[INFO] Bootstrapping Email Search & Security Core Daemon...")

	cfg := config.LoadConfig()

	log.Printf("[INFO] Mapping Elasticsearch adapter endpoint at node: %s", cfg.ElasticsearchURL)
	esClient := storage.NewESClient(cfg.ElasticsearchURL, cfg.ElasticsearchIndex)
	esClient.BootstrapCheck()

	log.Printf("[INFO] Instantiating spam scanning threshold limits: %.2f", cfg.SpamThreshold)
	analyzer := services.NewSpamAnalyzer(cfg.SpamThreshold)

	pub := kafka.NewMockEventPublisher(cfg.ScannedEmailTopic)

	log.Printf("[INFO] Hooking Kafka channel consumers to topic feedback queues: %s", cfg.RawEmailTopic)
	consumer := kafka.NewEmailConsumer(cfg.KafkaBrokers, cfg.RawEmailTopic, analyzer, esClient, pub)
	consumer.Start()

	srv := handlers.NewAPIServer(cfg.Port, esClient, analyzer, consumer)
	if err := srv.Start(); err != nil {
		log.Fatalf("[FATAL] API daemon failed to bind listeners: %v", err)
	}

	log.Println("[INFO] Email Search and Security Services successfully operational!")

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	log.Println("[INFO] Termination signal caught. Gracefully shutting down active service handles...")

	srv.Stop()
	consumer.Stop()
	_ = pub.Close()

	log.Println("[INFO] Email Search and Security Services daemon halted successfully.")
}
