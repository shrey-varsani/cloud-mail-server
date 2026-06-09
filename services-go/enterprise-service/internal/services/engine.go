package services

import (
	"log"
	"regexp"
	"strings"
	"sync"
	"time"

	"services-go/enterprise-service/internal/models"
)

type Engine struct {
	mu           sync.RWMutex
	rules        map[string][]models.EmailRule // mailbox_id -> rules
	autoReply    map[string]models.AutoReplySetting
	forwarding   map[string][]models.EmailForwardingRule // source_address -> rules
	coolDownLogs map[string]time.Time
}

func NewEngine() *Engine {
	return &Engine{
		rules:        make(map[string][]models.EmailRule),
		autoReply:    make(map[string]models.AutoReplySetting),
		forwarding:   make(map[string][]models.EmailForwardingRule),
		coolDownLogs: make(map[string]time.Time),
	}
}

// AddRule registers a new Rule sequence
func (e *Engine) AddRule(mailboxID string, r models.EmailRule) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.rules[mailboxID] = append(e.rules[mailboxID], r)
	log.Printf("[ENGINE] Registered rule '%s' (Priority %d) for mailbox %s", r.Name, r.Priority, mailboxID)
}

func (e *Engine) SetAutoReply(address string, s models.AutoReplySetting) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.autoReply[address] = s
}

func (e *Engine) AddForwardingRule(f models.EmailForwardingRule) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.forwarding[f.SourceAddress] = append(e.forwarding[f.SourceAddress], f)
}

// EvaluateRules processes incoming emails and determines the list of dynamic actions to issue.
func (e *Engine) EvaluateRules(mailboxID string, sender, subject, body string, headers map[string]string) []models.EmailRuleAction {
	e.mu.RLock()
	defer e.mu.RUnlock()

	var actionsToTake []models.EmailRuleAction
	rulesList, exists := e.rules[mailboxID]
	if !exists {
		return actionsToTake
	}

	for _, r := range rulesList {
		if !r.Enabled {
			continue
		}

		matched := true
		for _, cond := range r.Conditions {
			if !e.evaluateCondition(cond, sender, subject, body, headers) {
				matched = false
				break
			}
		}

		if matched {
			log.Printf("[RULES-ENGINE] Match found for Rule '%s' (ID %s). Processing %d actions...", r.Name, r.ID, len(r.Actions))
			actionsToTake = append(actionsToTake, r.Actions...)
		}
	}

	return actionsToTake
}

// evaluateCondition evaluates matches
func (e *Engine) evaluateCondition(c models.EmailRuleCondition, sender, subject, body string, headers map[string]string) bool {
	var targetVal string
	switch strings.ToUpper(c.Field) {
	case "SENDER":
		targetVal = sender
	case "SUBJECT":
		targetVal = subject
	case "BODY":
		targetVal = body
	default:
		// Attempt reading headers directly
		if val, ok := headers[strings.ToLower(c.Field)]; ok {
			targetVal = val
		}
	}

	switch strings.ToUpper(c.Operator) {
	case "EQUALS":
		return strings.EqualFold(targetVal, c.Value)
	case "CONTAINS":
		return strings.Contains(strings.ToLower(targetVal), strings.ToLower(c.Value))
	case "STARTS_WITH":
		return strings.HasPrefix(strings.ToLower(targetVal), strings.ToLower(c.Value))
	case "REGEX":
		matched, err := regexp.MatchString(c.Value, targetVal)
		if err != nil {
			return false
		}
		return matched
	}

	return false
}

// EvaluateAutoReply checks if an auto-reply trigger is necessary for the given recipient address
func (e *Engine) EvaluateAutoReply(recipient string) (*models.EmailRuleAction, bool) {
	e.mu.Lock()
	defer e.mu.Unlock()

	setting, ok := e.autoReply[recipient]
	if !ok || !setting.Enabled {
		return nil, false
	}

	now := time.Now()
	if now.Before(setting.StartTime) || now.After(setting.EndTime) {
		return nil, false
	}

	// Throttle with Cooldown limit logic to prevent infinite loops of auto-replies
	coolDownKey := recipient
	if lastTrigger, isThrottled := e.coolDownLogs[coolDownKey]; isThrottled {
		coolDownThreshold := time.Duration(setting.CoolDownMins) * time.Minute
		if now.Sub(lastTrigger) < coolDownThreshold {
			log.Printf("[THROTTLE] Auto-reply from %s suppressed due to cooldown boundary.", recipient)
			return nil, false
		}
	}

	e.coolDownLogs[coolDownKey] = now

	return &models.EmailRuleAction{
		Type:        "AUTO_REPLY",
		TargetValue: setting.Body,
	}, true
}

// EvaluateForwarding computes forwarding targets for active, verified forwarding channels
func (e *Engine) EvaluateForwarding(sender string) ([]string, bool) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	rules, exists := e.forwarding[sender]
	if !exists || len(rules) == 0 {
		return nil, false
	}

	var forwardingRecipients []string
	keepCopy := true

	for _, rule := range rules {
		if rule.IsVerified {
			forwardingRecipients = append(forwardingRecipients, rule.DestinationAddress)
			if !rule.KeepCopy {
				keepCopy = false
			}
		}
	}

	return forwardingRecipients, keepCopy
}
