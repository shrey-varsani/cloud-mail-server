package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"services-go/enterprise-service/internal/config"
	"services-go/enterprise-service/internal/handlers"
	"services-go/enterprise-service/internal/models"
	"services-go/enterprise-service/internal/services"
)

// MockProducer maps mock Kafka routing
type MockProducer struct {
	topic string
}

func (m *MockProducer) PublishRawEmail(ctx context.Context, emailID string, sender string, rec []string, subject string, body string) error {
	log.Printf("[KAFKA_PRODUCER] Successfully emmited message to TOPIC '%s' -- Email ID: %s, Sender: %s, Recipients: %v, Subject: '%s'", 
		m.topic, emailID, sender, rec, subject)
	return nil
}

func main() {
	log.Println("[BOOT] Launching Enterprise Capabilities Core Service Daemon...")

	cfg := config.LoadConfig()

	// 1. Instantiate Core components
	engine := services.NewEngine()
	auditor := services.NewAuditor("audit-secret-hmac-key")
	rbac := services.NewRBACValidator()

	producer := &MockProducer{topic: cfg.RawEmailTopic}
	schedulerInst := services.NewScheduler(producer, cfg.ScheduleIntervalS)

	// Context context
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 2. Start background components
	go schedulerInst.Start(ctx)

	// Seed some initial data to facilitate UI simulations
	log.Println("[BOOT] Seeding mock enterprise data parameters...")
	engine.SetAutoReply("shreyvarsani16@gmail.com", models.AutoReplySetting{
		EmailAddress: "shreyvarsani16@gmail.com",
		Subject:      "Automatic reply: Out of office",
		Body:         "Hello! Thank you for your email. I am currently out of office with limited access to email. I will respond as soon as I return.",
		Enabled:      true,
		StartTime:    time.Now().Add(-1 * time.Hour),
		EndTime:      time.Now().Add(48 * time.Hour),
		CoolDownMins: 5,
	})

	engine.AddRule("sm-corporate", models.EmailRule{
		ID:        "rule-compliance",
		MailboxID: "sm-corporate",
		Name:      "Compliance Dispatcher",
		Priority:  1,
		Enabled:   true,
		Conditions: []models.EmailRuleCondition{
			{Field: "subject", Operator: "CONTAINS", Value: "CONFIDENTIAL"},
		},
		Actions: []models.EmailRuleAction{
			{Type: "FORWARD", TargetValue: "compliance@enterprise-platform.com"},
			{Type: "MOVE_TO_FOLDER", TargetValue: "Archive/Compliance"},
		},
	})

	auditor.WriteAuditLog("system@platform.com", "127.0.0.1", "SERVICE_INIT", "platform", "SUCCESS")

	// 3. Start REST APIs
	serverAddr := ":8083"
	server := handlers.NewServer(serverAddr, engine, schedulerInst, auditor, rbac)

	go func() {
		if err := server.Start(ctx); err != nil {
			log.Fatalf("[FATAL] Core API Engine failed binding socket parameters: %v", err)
		}
	}()

	// 4. Trap system kills
	shutdownSig := make(chan os.Signal, 1)
	signal.Notify(shutdownSig, syscall.SIGINT, syscall.SIGTERM)

	<-shutdownSig
	log.Println("[SHUTDOWN] Interrupted! Initiating graceful shutdown sequences.")
	cancel()
	time.Sleep(1 * time.Second)
	log.Println("[SHUTDOWN] Enterprise service closed completely.")
}
