package models

import (
	"time"
)

type Email struct {
	MessageID   string            `json:"message_id"`
	Sender      string            `json:"sender"`
	Recipients  []string          `json:"recipients"`
	Subject     string            `json:"subject"`
	Body        string            `json:"body"`
	SizeInBytes int64             `json:"size_in_bytes"`
	ReceivedAt  time.Time         `json:"received_at"`
	Headers     map[string]string `json:"headers"`
	ClientIP    string            `json:"client_ip"`
}

type SecurityAudit struct {
	SPFResult     string    `json:"spf_result"`
	SPFDomain     string    `json:"spf_domain"`
	DKIMResult    string    `json:"dkim_result"`
	DKIMDomain    string    `json:"dkim_domain"`
	DMARCResult   string    `json:"dmarc_result"`
	DMARCAligned  bool      `json:"dmarc_aligned"`
	SpamScore     float64   `json:"spam_score"`
	IsSpam        bool      `json:"is_spam"`
	AuditTriggers []string  `json:"audit_triggers"`
}

type ScannedEmail struct {
	ID          string        `json:"id"`
	Email       Email         `json:"email"`
	Audit       SecurityAudit `json:"audit"`
	ScannedAt   time.Time     `json:"scanned_at"`
}

type SearchResponse struct {
	Results []ScannedEmail `json:"results"`
	Total   int64          `json:"total"`
	TookMs  int64          `json:"took_ms"`
}
