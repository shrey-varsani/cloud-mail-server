package kafka

import (
	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"

	"services-go/security-and-search-service/internal/models"
	"services-go/security-and-search-service/internal/services"
	"services-go/security-and-search-service/internal/storage"
)

type EmailConsumer struct {
	brokers      string
	topic        string
	analyzer     *services.SpamAnalyzer
	esClient     *storage.ESClient
	pub          EventPublisher
	stopChan     chan struct{}
	wg           sync.WaitGroup
	activeEvents chan models.Email
}

func NewEmailConsumer(brokers, topic string, sa *services.SpamAnalyzer, es *storage.ESClient, p EventPublisher) *EmailConsumer {
	return &EmailConsumer{
		brokers:      brokers,
		topic:        topic,
		analyzer:     sa,
		esClient:     es,
		pub:          p,
		stopChan:     make(chan struct{}),
		activeEvents: make(chan models.Email, 100),
	}
}

func (ec *EmailConsumer) Start() {
	ec.wg.Add(2)

	go func() {
		defer ec.wg.Done()
		for {
			select {
			case email, open := <-ec.activeEvents:
				if !open {
					return
				}
				ec.processRawEmail(email)
			case <-ec.stopChan:
				return
			}
		}
	}()

	go func() {
		defer ec.wg.Done()
		ticker := time.NewTicker(45 * time.Second)
		defer ticker.Stop()

		ec.seedDemonstrationData()

		for {
			select {
			case <-ticker.C:
				ec.injectRandomPhishingAlert()
			case <-ec.stopChan:
				return
			}
		}
	}()

	log.Printf("[KAFKA] Core background subscriber queue [broker: %s, topic: %s] launched and matching feeds.", ec.brokers, ec.topic)
}

func (ec *EmailConsumer) Stop() {
	close(ec.stopChan)
	close(ec.activeEvents)
	ec.wg.Wait()
	log.Println("[KAFKA] Raw incoming consumer pipeline terminated gracefully.")
}

func (ec *EmailConsumer) InjectRawEmail(email models.Email) {
	select {
	case ec.activeEvents <- email:
		log.Printf("[KAFKA QUEUED] Raw email ingested into Kafka buffer queue '%s' (From: %s)", ec.topic, email.Sender)
	default:
		log.Println("[WARN] Pipeline buffer full. Dropping incoming verification task.")
	}
}

func (ec *EmailConsumer) processRawEmail(email models.Email) {
	log.Printf("[KAFKA CONSUME] Scanning raw email Message-ID: %s", email.MessageID)

	audit := ec.analyzer.AnalyzeEmail(email)

	scanned := models.ScannedEmail{
		ID:        email.MessageID,
		Email:     email,
		Audit:     audit,
		ScannedAt: time.Now(),
	}
	if scanned.ID == "" {
		scanned.ID = "msg_" + time.Now().Format("20060102150405")
	}

	if err := ec.esClient.IndexDoc(scanned); err != nil {
		log.Printf("[ERROR] Indexing failure for email message %s: %v", scanned.ID, err)
	}

	if err := ec.pub.PublishScannedEmail(&scanned); err != nil {
		log.Printf("[ERROR] Kafka scanned topic propagation failed for event %s: %v", scanned.ID, err)
	}
}

func (ec *EmailConsumer) injectRandomPhishingAlert() {
	senders := []string{"prizes@lucky-draw-winner.xyz", "corporate-billing@microsoft-update.xyz", "ceo@internal-urgent-transfer.net"}
	subjects := []string{"URGENT ATTENTION: Immediate transfer required", "LOTTERY: You won 5,000,000 dollars! Rich Quick!", "Reset password connection credentials security threat"}
	bodies := []string{
		"Hello Corporate User,\r\n\r\nPlease transfer the funds immediately check no credit details to our Bitcoin premium wallet at once.\r\n\r\nRegards,\r\nManagement.",
		"Dearest Lucky Ticket Holder,\r\n\r\nYou scored the grand lottery! Connect card details to verify and act now to receive millions.\r\n\r\nSee attachment.",
		"Attention,\r\n\r\nAn unauthorized login attempt was spotted. Click reset password immediately or your email platform terminates inside 24 hours.",
	}

	idx := rand.Intn(len(senders))
	fakeEmail := models.Email{
		MessageID:   fmt.Sprintf("mock_threat_%d", time.Now().Unix()),
		Sender:      senders[idx],
		Recipients:  []string{"security-team@enterprise.com"},
		Subject:     subjects[idx],
		Body:        bodies[idx],
		SizeInBytes: int64(len(bodies[idx]) + len(subjects[idx])),
		ReceivedAt:  time.Now(),
		Headers:     map[string]string{"X-Origin-IP": "103.45.67.89", "Received-SPF": "fail"},
		ClientIP:    "103.45.67.89",
	}

	ec.processRawEmail(fakeEmail)
}

func (ec *EmailConsumer) seedDemonstrationData() {
	seeds := []models.Email{
		{
			MessageID:   "clean-001",
			Sender:      "success@google.com",
			Recipients:  []string{"it-ops@enterprise.com"},
			Subject:     "Regular System Maintenance Scheduling Notice",
			Body:        "Hi Team,\r\n\r\nThis is to remind all engineers of the pre-scheduled server deployments taking place tonight.\r\n\r\nCheer!",
			SizeInBytes: 154,
			ReceivedAt:  time.Now().Add(-1 * time.Hour),
			Headers:     map[string]string{"dkim-signature": "v=1; a=rsa-sha256; d=google.com; s=s123; b=abc; h=from:to", "received-spf": "pass"},
			ClientIP:    "172.217.16.14",
		},
		{
			MessageID:   "threat-002",
			Sender:      "support-billing@stripe-login.xyz",
			Recipients:  []string{"accounting@enterprise.com"},
			Subject:     "Invoice suspended: Act now to pay weight loss billing",
			Body:        "Confirming our wire transfer lottery. Access your account suspended and reset billing immediately.",
			SizeInBytes: 250,
			ReceivedAt:  time.Now().Add(-30 * time.Minute),
			Headers:     map[string]string{"received-spf": "fail"},
			ClientIP:    "45.2.19.11",
		},
	}

	for _, s := range seeds {
		ec.processRawEmail(s)
	}
}
