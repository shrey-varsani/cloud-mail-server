package models

import (
	"time"
)

// Draft represents a complete draft message stage bound to an author user
type Draft struct {
	ID          string    `json:"id"`
	Sender      string    `json:"sender"`
	Recipients  []string  `json:"recipients"`
	Cc          []string  `json:"cc,omitempty"`
	Subject     string    `json:"subject"`
	Body        string    `json:"body"`
	Attachments []string  `json:"attachments,omitempty"`
	UpdatedAt   time.Time `json:"updated_at"`
	IsEncrypted bool      `json:"is_encrypted"`
}

// ScheduledEmail represents a validated message buffered for delivery at a precise future moment
type ScheduledEmail struct {
	ID             string    `json:"id"`
	DraftID        string    `json:"draft_id,omitempty"`
	Sender         string    `json:"sender"`
	Recipients     []string  `json:"recipients"`
	Subject        string    `json:"subject"`
	Body           string    `json:"body"`
	SendAt         time.Time `json:"send_at"`
	Status         string    `json:"status"` // PENDING, SENT, FAILED, CANCELLED
	RetryCount     int       `json:"retry_count"`
	FailureReason  string    `json:"failure_reason,omitempty"`
	ProcessingNode string    `json:"processing_node,omitempty"`
}

// SharedMailbox maps an organization address bound with strict access groups / permission rules
type SharedMailbox struct {
	ID              string    `json:"id"`
	EmailAddress    string    `json:"email_address"`
	DisplayName     string    `json:"display_name"`
	AllowedGroups   []string  `json:"allowed_groups"`
	AllowedUsers    []string  `json:"allowed_users"`
	CreatedAt       time.Time `json:"created_at"`
	AutoArchiving   bool      `json:"auto_archiving"`
	RetentionPeriod int       `json:"retention_period_days"` // e.g., 90 days retention bounding
}

// AutoReplySetting manages automated responder behaviors per recipient path
type AutoReplySetting struct {
	EmailAddress string    `json:"email_address"`
	Subject      string    `json:"subject"`
	Body         string    `json:"body"`
	Enabled      bool      `json:"enabled"`
	StartTime    time.Time `json:"start_time"`
	EndTime      time.Time `json:"end_time"`
	CoolDownMins int       `json:"cooldown_minutes"` // Multi-send throttle bounds
}

// EmailRuleCondition defines routing matching criteria tags for automated incoming mail flows
type EmailRuleCondition struct {
	Field    string   `json:"field"`    // SENDER, RECIPIENT, SUBJECT, BODY, HEADERS
	Operator string   `json:"operator"` // CONTAINS, EQUALS, STARTS_WITH, REGEX
	Value    string   `json:"value"`
}

// EmailRuleAction defines cascading events trigger parameters
type EmailRuleAction struct {
	Type        string `json:"type"`          // DISCARD, FORWARD, MOVE_TO_FOLDER, AUTO_REPLY, RE-ROUTE
	TargetValue string `json:"target_value"` // destination address, custom folder, or setting ID
}

// EmailRule is the atomic configuration representing compliance/routing directives
type EmailRule struct {
	ID          string               `json:"id"`
	MailboxID   string               `json:"mailbox_id"` // Matches standard or shared mailboxes
	Name        string               `json:"name"`
	Priority    int                  `json:"priority"` // Sorting order for sequential evaluation
	Enabled     bool                 `json:"enabled"`
	Conditions  []EmailRuleCondition `json:"conditions"`
	Actions     []EmailRuleAction    `json:"actions"`
	TriggerLogs int64                `json:"trigger_count"`
}

// EmailForwardingRule defines systematic, verified address proxy pipes
type EmailForwardingRule struct {
	ID                 string    `json:"id"`
	SourceAddress      string    `json:"source_address"`
	DestinationAddress string    `json:"destination_address"`
	KeepCopy           bool      `json:"keep_copy"`
	IsVerified         bool      `json:"is_verified"`
	VerificationCode   string    `json:"verification_code,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
}

// AuditLogEntry is a cryptographically signed operational log for full security tracing
type AuditLogEntry struct {
	ID         string    `json:"id"`
	Timestamp  time.Time `json:"timestamp"`
	UserRef    string    `json:"user_ref"`
	ClientIP   string    `json:"client_ip"`
	Action     string    `json:"action"` // e.g., "DRAFT_DELETE", "RULE_MUTATION", "RBAC_OVERRIDE"
	ResourceID string    `json:"resource_id"`
	Status     string    `json:"status"` // SUCCESS, ACCESS_DENIED, EXCEPTION
	AuditHash  string    `json:"audit_hash"` // HMAC SHA256 of log tokens for tampering detection
}

// RBACPolicy defines roles bounding resources permission criteria
type RBACPolicy struct {
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"` // e.g., "shared_mailbox:read", "shared_mailbox:admin"
}
