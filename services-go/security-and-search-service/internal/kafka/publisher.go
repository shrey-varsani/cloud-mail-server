package kafka

import (
	"encoding/json"
	"log"

	"services-go/security-and-search-service/internal/models"
)

type EventPublisher interface {
	PublishScannedEmail(event *models.ScannedEmail) error
	Close() error
}

type MockEventPublisher struct {
	Topic string
}

func NewMockEventPublisher(topic string) *MockEventPublisher {
	return &MockEventPublisher{Topic: topic}
}

func (mp *MockEventPublisher) PublishScannedEmail(event *models.ScannedEmail) error {
	payload, err := json.MarshalIndent(event, "", "  ")
	if err != nil {
		return err
	}
	log.Printf("[KAFKA SCAN PUBLISH] Security audit scan successfully dispatched to topic [%s]:\n%s", mp.Topic, string(payload))
	return nil
}

func (mp *MockEventPublisher) Close() error {
	log.Println("[KAFKA] Scanned message publisher connection terminated.")
	return nil
}
