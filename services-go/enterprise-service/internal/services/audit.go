package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"sync"
	"time"

	"services-go/enterprise-service/internal/models"
)

type Auditor struct {
	mu        sync.RWMutex
	logs      []models.AuditLogEntry
	secretKey []byte
}

func NewAuditor(secret string) *Auditor {
	return &Auditor{
		logs:      make([]models.AuditLogEntry, 0),
		secretKey: []byte(secret),
	}
}

// WriteAuditLog structures, signs, and records an enterprise compliance trail entry
func (a *Auditor) WriteAuditLog(user, ip, action, resourceID, status string) models.AuditLogEntry {
	a.mu.Lock()
	defer a.mu.Unlock()

	id := fmt.Sprintf("audit-%d", time.Now().UnixNano())
	now := time.Now()

	entry := models.AuditLogEntry{
		ID:         id,
		Timestamp:  now,
		UserRef:    user,
		ClientIP:   ip,
		Action:     action,
		ResourceID: resourceID,
		Status:     status,
	}

	entry.AuditHash = a.computeSignature(entry)
	a.logs = append(a.logs, entry)

	log.Printf("[AUDIT] [%s] %s user=%s ip=%s status=%s resource=%s hash=%s", 
		now.Format(time.RFC3339), action, user, ip, status, resourceID, entry.AuditHash[:8])

	return entry
}

func (a *Auditor) GetLogs() []models.AuditLogEntry {
	a.mu.RLock()
	defer a.mu.RUnlock()
	
	copied := make([]models.AuditLogEntry, len(a.logs))
	copy(copied, a.logs)
	return copied
}

// VerifyChainIntegrity runs a complete cryptographic sweep across all records detecting unauthorized edits
func (a *Auditor) VerifyChainIntegrity() (bool, int) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	compromisedCount := 0
	for _, entry := range a.logs {
		expectedHash := a.computeSignature(entry)
		if entry.AuditHash != expectedHash {
			compromisedCount++
			log.Printf("[AUDIT-ALERT] LOG INTEGRITY EXCEPTION DETECTED: Log %s has invalid signature!", entry.ID)
		}
	}

	return compromisedCount == 0, compromisedCount
}

func (a *Auditor) computeSignature(e models.AuditLogEntry) string {
	rawString := fmt.Sprintf("%s|%s|%s|%s|%s|%s|%s", 
		e.ID, e.Timestamp.Format(time.RFC3339), e.UserRef, e.ClientIP, e.Action, e.ResourceID, e.Status)

	mac := hmac.New(sha256.New, a.secretKey)
	mac.Write([]byte(rawString))
	return hex.EncodeToString(mac.Sum(nil))
}

// RBACValidator handles Role-Based Access Control and policy definitions
type RBACValidator struct {
	mu       sync.RWMutex
	policies map[string][]string // role -> permissions list
}

func NewRBACValidator() *RBACValidator {
	r := &RBACValidator{
		policies: make(map[string][]string),
	}
	r.seedDefaultPolicies()
	return r
}

func (r *RBACValidator) seedDefaultPolicies() {
	r.policies["ROLE_ADMIN"] = []string{
		"shared_mailbox:read", "shared_mailbox:write", "shared_mailbox:admin",
		"rules:create", "rules:delete", "rules:evaluate",
		"audit:read", "audit:write",
		"draft:create", "draft:edit", "draft:delete",
		"scheduler:create", "scheduler:delete", "scheduler:read",
	}
	r.policies["ROLE_MODERATOR"] = []string{
		"shared_mailbox:read", "shared_mailbox:write",
		"rules:evaluate",
		"draft:create", "draft:edit",
		"scheduler:read",
	}
	r.policies["ROLE_USER"] = []string{
		"draft:create", "draft:edit", "draft:delete",
		"shared_mailbox:read",
		"scheduler:create", "scheduler:read",
	}
}

// EvaluatePermission verifies if a user's role list allows the designated permission operation
func (r *RBACValidator) EvaluatePermission(roles []string, permission string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, userRole := range roles {
		perms, ok := r.policies[userRole]
		if !ok {
			continue
		}
		for _, p := range perms {
			if p == permission {
				return true
			}
		}
	}
	return false
}
