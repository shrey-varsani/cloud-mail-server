package models

import "time"

// EmailEvent models standard transactional email envelopes passed over Kafka topic networks.
type EmailEvent struct {
	MessageID   string    `json:"message_id"`
	Sender      string    `json:"sender"`
	Recipients  []string  `json:"recipients"`
	Size        int       `json:"size"`
	Subject     string    `json:"subject"`
	ReceivedAt  time.Time `json:"received_at"`
	IsTLS       bool      `json:"is_tls"`
	ClientIP    string    `json:"client_ip"`
	BodySummary string    `json:"body_summary"`
}
