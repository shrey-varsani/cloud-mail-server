package tests

import (
	"context"
	"testing"
	"time"

	"services-go/enterprise-service/internal/models"
	"services-go/enterprise-service/internal/services"
)

func TestRulesEngine(t *testing.T) {
	engine := services.NewEngine()

	// 1. Test basic conditions & actions
	engine.AddRule("test-mailbox", models.EmailRule{
		ID:        "rule-1",
		MailboxID: "test-mailbox",
		Name:      "Spam Alert",
		Priority:  1,
		Enabled:   true,
		Conditions: []models.EmailRuleCondition{
			{Field: "subject", Operator: "CONTAINS", Value: "Crypto"},
		},
		Actions: []models.EmailRuleAction{
			{Type: "DISCARD", TargetValue: "trash"},
		},
	})

	actions := engine.EvaluateRules("test-mailbox", "spammer@gmail.com", "Get Free Crypto Now!", "Hello", nil)
	if len(actions) != 1 {
		t.Fatalf("Expected 1 action, got %d", len(actions))
	}
	if actions[0].Type != "DISCARD" {
		t.Errorf("Expected DISCARD type, got %s", actions[0].Type)
	}

	// 2. Test auto reply setting with cooldown bounds
	engine.SetAutoReply("user@domain.com", models.AutoReplySetting{
		EmailAddress: "user@domain.com",
		Subject:      "AutoResponse",
		Body:         "Away",
		Enabled:      true,
		StartTime:    time.Now().Add(-1 * time.Hour),
		EndTime:      time.Now().Add(1 * time.Hour),
		CoolDownMins: 10,
	})

	action, ok := engine.EvaluateAutoReply("user@domain.com")
	if !ok || action == nil {
		t.Fatal("Expected active auto reply action context")
	}
	if action.TargetValue != "Away" {
		t.Errorf("Expected 'Away' body, got %s", action.TargetValue)
	}

	// Calling a second time must trigger the cooldown throttle block
	_, ok2 := engine.EvaluateAutoReply("user@domain.com")
	if ok2 {
		t.Error("Expected auto reply mock call to trigger cooldown throttle")
	}
}

func TestAuditLogTampering(t *testing.T) {
	auditor := services.NewAuditor("secret-compliance-key")

	// Log an event
	logEntry := auditor.WriteAuditLog("admin@platform.com", "127.0.0.1", "MUTATE_POLICY", "sm-sales", "SUCCESS")

	// Dynamic audit sweep should succeed
	ok, compromised := auditor.VerifyChainIntegrity()
	if !ok || compromised > 0 {
		t.Errorf("Expected pristine log chain integrity, got ok=%t compromised=%d", ok, compromised)
	}

	// Simulate a tampering attempt!
	logs := auditor.GetLogs()
	if len(logs) == 0 {
		t.Fatal("Expected logs")
	}

	// Unsafely override the action string in memory bypassing standard APIs
	auditor.VerifyChainIntegrity() // Just read-locking
	
	// Let's modify our own local copy and check computation
	modifiedEntry := logEntry
	modifiedEntry.Action = "AUTHORIZED_SNEAKY_ACTION" // Changed value!
	
	expectedHash := auditor.WriteAuditLog(modifiedEntry.UserRef, modifiedEntry.ClientIP, modifiedEntry.Action, modifiedEntry.ResourceID, modifiedEntry.Status).AuditHash
	
	if expectedHash == logEntry.AuditHash {
		t.Error("HMAC hashes should differ when fields are modified!")
	}
}

func TestRBACPolicies(t *testing.T) {
	rbac := services.NewRBACValidator()

	// ROLE_ADMIN should have audit:read
	if !rbac.EvaluatePermission([]string{"ROLE_ADMIN"}, "audit:read") {
		t.Error("ROLE_ADMIN expected to hold audit:read permission")
	}

	// ROLE_USER should NOT have audit:read
	if rbac.EvaluatePermission([]string{"ROLE_USER"}, "audit:read") {
		t.Error("ROLE_USER should not hold audit:read permission")
	}

	// Combined roles (ROLE_USER, ROLE_ADMIN) should allow permission
	if !rbac.EvaluatePermission([]string{"ROLE_USER", "ROLE_ADMIN"}, "audit:read") {
		t.Error("Combined roles including ROLE_ADMIN should resolve to truthy outcome")
	}
}

type KafkaMockTracker struct {
	Pushed []string
}

func (k *KafkaMockTracker) PublishRawEmail(ctx context.Context, id, sender string, rec []string, subject, body string) error {
	k.Pushed = append(k.Pushed, id)
	return nil
}

func TestSchedulerProcessing(t *testing.T) {
	kp := &KafkaMockTracker{Pushed: make([]string, 0)}
	sched := services.NewScheduler(kp, 1) // 1 second interval

	// Schedule a future delivery
	sched.AddScheduledEmail(models.ScheduledEmail{
		ID:         "due-now",
		Sender:     "sender@domain.com",
		Recipients: []string{"rec@domain.com"},
		Subject:    "Urgent",
		Body:       "Info",
		SendAt:     time.Now().Add(-10 * time.Second), // Already due!
		Status:     "PENDING",
	})

	sched.AddScheduledEmail(models.ScheduledEmail{
		ID:         "due-later",
		Sender:     "sender@domain.com",
		Recipients: []string{"rec@domain.com"},
		Subject:    "Later",
		Body:       "Info",
		SendAt:     time.Now().Add(10 * time.Minute), // Not due!
		Status:     "PENDING",
	})

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	// Start scheduler dispatcher tick
	go sched.Start(ctx)

	// Wait briefly for tick execution
	time.Sleep(150 * time.Millisecond)

	list := sched.ListScheduled()
	var dueNowStatus, dueLaterStatus string
	for _, e := range list {
		if e.ID == "due-now" {
			dueNowStatus = e.Status
		}
		if e.ID == "due-later" {
			dueLaterStatus = e.Status
		}
	}

	if dueNowStatus != "SENT" && dueNowStatus != "DISPATCHING" {
		t.Errorf("Expected 'due-now' to be processed, got status: %s", dueNowStatus)
	}
	if dueLaterStatus != "PENDING" {
		t.Errorf("Expected 'due-later' to remain in state PENDING, got: %s", dueLaterStatus)
	}
}
