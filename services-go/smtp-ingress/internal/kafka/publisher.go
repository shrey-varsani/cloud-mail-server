package kafka

import (
	"encoding/json"
	"log"

	sharedmodels "services-go/shared-library/models"
)

// Publisher abstracts interactions with the distributed messaging backbone (Kafka).
type Publisher interface {
	PublishIncomingEmail(event *sharedmodels.EmailEvent) error
	Close() error
}

// MockPublisher logs transactions in a highly structured JSON format when Kafka is offline.
type MockPublisher struct {
	Topic string
}

// NewMockPublisher instantiates the default structured console log-based message pipeline.
func NewMockPublisher(topic string) *MockPublisher {
	return &MockPublisher{Topic: topic}
}

// PublishIncomingEmail prints the marshalled JSON event as a proxy for physical Kafka brokers.
func (mp *MockPublisher) PublishIncomingEmail(event *sharedmodels.EmailEvent) error {
	payload, err := json.MarshalIndent(event, "", "  ")
	if err != nil {
		return err
	}
	log.Printf("[KAFKA PUBLISH] Dynamic event dispatched directly to pipeline topic [%s]:\n%s", mp.Topic, string(payload))
	return nil
}

// Close flushes active connections.
func (mp *MockPublisher) Close() error {
	log.Println("[KAFKA] Closing active Mock Broker connection handles cleanly.")
	return nil
}
