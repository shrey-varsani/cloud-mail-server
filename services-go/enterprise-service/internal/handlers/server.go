package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"services-go/enterprise-service/internal/models"
	"services-go/enterprise-service/internal/services"
)

type Server struct {
	addr      string
	rules     *services.Engine
	scheduler *services.Scheduler
	auditor   *services.Auditor
	rbac      *services.RBACValidator
	draftStore map[string]models.Draft
	draftMu    sync.RWMutex
	smStore    map[string]models.SharedMailbox
	smMu       sync.RWMutex
}

func NewServer(addr string, r *services.Engine, s *services.Scheduler, au *services.Auditor, rbac *services.RBACValidator) *Server {
	return &Server{
		addr:       addr,
		rules:      r,
		scheduler:  s,
		auditor:    au,
		rbac:       rbac,
		draftStore: make(map[string]models.Draft),
		smStore:    make(map[string]models.SharedMailbox),
	}
}

func (s *Server) Start(ctx context.Context) error {
	mux := http.NewServeMux()

	// Draft endpoints
	mux.HandleFunc("/api/enterprise/drafts", s.handleDrafts)
	mux.HandleFunc("/api/enterprise/drafts/delete", s.handleDeleteDraft)

	// Scheduling endpoints
	mux.HandleFunc("/api/enterprise/schedule", s.handleSchedule)
	mux.HandleFunc("/api/enterprise/schedule/list", s.handleScheduleList)

	// Shared mailboxes endpoints
	mux.HandleFunc("/api/enterprise/shared-mailboxes", s.handleSharedMailboxes)

	// Rules, Auto replies, and Forwarding
	mux.HandleFunc("/api/enterprise/auto-reply", s.handleAutoReply)
	mux.HandleFunc("/api/enterprise/rules", s.handleEmailRules)
	mux.HandleFunc("/api/enterprise/forwarding", s.handleForwarding)

	// Audit Logs and Verification
	mux.HandleFunc("/api/enterprise/audit-logs", s.handleAuditLogs)
	mux.HandleFunc("/api/enterprise/audit-logs/verify", s.handleVerifyAuditLogs)

	// RBAC queries
	mux.HandleFunc("/api/enterprise/rbac/permissions", s.handleCheckPermissions)

	srv := &http.Server{
		Addr:    s.addr,
		Handler: s.loggingMiddleware(mux),
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		srv.Shutdown(shutdownCtx)
	}()

	fmt.Printf("[API-SERVER] Enterprise Capabilities REST Server binding to %s...\n", s.addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}

func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Log the incoming requests for standard observability metrics
		start := time.Now()
		next.ServeHTTP(w, r)
		fmt.Printf("[API] %s %s - Processed in %v\n", r.Method, r.RequestURI, time.Since(start))
	})
}

// Extract credentials simulation from a simulated header array
func (s *Server) extractUserRoles(r *http.Request) (string, []string, string) {
	authHeader := r.Header.Get("Authorization")
	clientIP := r.RemoteAddr
	if idx := strings.Index(clientIP, ":"); idx != -1 {
		clientIP = clientIP[:idx]
	}

	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		return "anonymous", []string{"ROLE_ANONYMOUS"}, clientIP
	}

	tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
	// Mock decoding token schemas
	if strings.Contains(tokenStr, "admin") {
		return "admin@platform.com", []string{"ROLE_ADMIN"}, clientIP
	} else if strings.Contains(tokenStr, "moderator") {
		return "moderator@platform.com", []string{"ROLE_MODERATOR"}, clientIP
	}

	return "user@platform.com", []string{"ROLE_USER"}, clientIP
}

func (s *Server) handleDrafts(w http.ResponseWriter, r *http.Request) {
	user, roles, ip := s.extractUserRoles(r)

	if r.Method == http.MethodGet {
		if !s.rbac.EvaluatePermission(roles, "shared_mailbox:read") {
			s.auditor.WriteAuditLog(user, ip, "DRAFT_READ", "all", "ACCESS_DENIED")
			http.Error(w, "Access Denied: Missing permission standard rules.", http.StatusForbidden)
			return
		}

		s.draftMu.RLock()
		defer s.draftMu.RUnlock()

		list := make([]models.Draft, 0, len(s.draftStore))
		for _, d := range s.draftStore {
			if d.Sender == user || s.rbac.EvaluatePermission(roles, "shared_mailbox:read") {
				list = append(list, d)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(list)
		return
	}

	if r.Method == http.MethodPost {
		if !s.rbac.EvaluatePermission(roles, "draft:create") {
			s.auditor.WriteAuditLog(user, ip, "DRAFT_CREATE", "none", "ACCESS_DENIED")
			http.Error(w, "Access Denied: Cannot compose draft.", http.StatusForbidden)
			return
		}

		var d models.Draft
		if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		d.ID = fmt.Sprintf("draft-%d", time.Now().UnixNano())
		d.UpdatedAt = time.Now()
		d.Sender = user

		s.draftMu.Lock()
		s.draftStore[d.ID] = d
		s.draftMu.Unlock()

		s.auditor.WriteAuditLog(user, ip, "DRAFT_CREATE", d.ID, "SUCCESS")

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(d)
		return
	}

	http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
}

func (s *Server) handleDeleteDraft(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	user, roles, ip := s.extractUserRoles(r)
	if !s.rbac.EvaluatePermission(roles, "draft:delete") {
		s.auditor.WriteAuditLog(user, ip, "DRAFT_DELETE", "unknown", "ACCESS_DENIED")
		http.Error(w, "Access Denied", http.StatusForbidden)
		return
	}

	var req struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s.draftMu.Lock()
	_, exists := s.draftStore[req.ID]
	if exists {
		delete(s.draftStore, req.ID)
	}
	s.draftMu.Unlock()

	if !exists {
		http.Error(w, "Draft not found", http.StatusNotFound)
		return
	}

	s.auditor.WriteAuditLog(user, ip, "DRAFT_DELETE", req.ID, "SUCCESS")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

func (s *Server) handleSchedule(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	user, roles, ip := s.extractUserRoles(r)
	if !s.rbac.EvaluatePermission(roles, "scheduler:create") {
		s.auditor.WriteAuditLog(user, ip, "SCHEDULE_CREATE", "none", "ACCESS_DENIED")
		http.Error(w, "Access Denied: Missing scheduler boundaries privileges.", http.StatusForbidden)
		return
	}

	var req models.ScheduledEmail
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	req.ID = fmt.Sprintf("sched-%d", time.Now().UnixNano())
	req.Sender = user
	req.Status = "PENDING"
	if req.SendAt.IsZero() {
		req.SendAt = time.Now().Add(10 * time.Minute)
	}

	s.scheduler.AddScheduledEmail(req)
	s.auditor.WriteAuditLog(user, ip, "SCHEDULE_CREATE", req.ID, "SUCCESS")

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(req)
}

func (s *Server) handleScheduleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	user, roles, ip := s.extractUserRoles(r)
	if !s.rbac.EvaluatePermission(roles, "scheduler:read") {
		s.auditor.WriteAuditLog(user, ip, "SCHEDULE_LIST", "all", "ACCESS_DENIED")
		http.Error(w, "Access Denied", http.StatusForbidden)
		return
	}

	list := s.scheduler.ListScheduled()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func (s *Server) handleSharedMailboxes(w http.ResponseWriter, r *http.Request) {
	user, roles, ip := s.extractUserRoles(r)

	if r.Method == http.MethodGet {
		if !s.rbac.EvaluatePermission(roles, "shared_mailbox:read") {
			s.auditor.WriteAuditLog(user, ip, "SM_READ", "all", "ACCESS_DENIED")
			http.Error(w, "Access Denied", http.StatusForbidden)
			return
		}

		s.smMu.RLock()
		defer s.smMu.RUnlock()

		var results []models.SharedMailbox
		for _, sm := range s.smStore {
			results = append(results, sm)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(results)
		return
	}

	if r.Method == http.MethodPost {
		if !s.rbac.EvaluatePermission(roles, "shared_mailbox:admin") {
			s.auditor.WriteAuditLog(user, ip, "SM_ADMIN_CREATE", "none", "ACCESS_DENIED")
			http.Error(w, "Access Denied", http.StatusForbidden)
			return
		}

		var m models.SharedMailbox
		if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		m.ID = fmt.Sprintf("sm-%d", time.Now().UnixNano())
		m.CreatedAt = time.Now()

		s.smMu.Lock()
		s.smStore[m.ID] = m
		s.smMu.Unlock()

		s.auditor.WriteAuditLog(user, ip, "SM_CREATE", m.ID, "SUCCESS")

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(m)
		return
	}

	http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
}

func (s *Server) handleAutoReply(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	user, roles, ip := s.extractUserRoles(r)
	if !s.rbac.EvaluatePermission(roles, "shared_mailbox:write") {
		s.auditor.WriteAuditLog(user, ip, "AUTO_REPLY_SET", "none", "ACCESS_DENIED")
		http.Error(w, "Access Denied", http.StatusForbidden)
		return
	}

	var setting models.AutoReplySetting
	if err := json.NewDecoder(r.Body).Decode(&setting); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s.rules.SetAutoReply(user, setting)
	s.auditor.WriteAuditLog(user, ip, "AUTO_REPLY_SET", user, "SUCCESS")

	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "setting": setting})
}

func (s *Server) handleEmailRules(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	user, roles, ip := s.extractUserRoles(r)
	if !s.rbac.EvaluatePermission(roles, "rules:create") {
		s.auditor.WriteAuditLog(user, ip, "RULE_CREATE", "none", "ACCESS_DENIED")
		http.Error(w, "Access Denied", http.StatusForbidden)
		return
	}

	var rule models.EmailRule
	if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	rule.ID = fmt.Sprintf("rule-%d", time.Now().UnixNano())
	s.rules.AddRule(rule.MailboxID, rule)
	s.auditor.WriteAuditLog(user, ip, "RULE_CREATE", rule.ID, "SUCCESS")

	json.NewEncoder(w).Encode(rule)
}

func (s *Server) handleForwarding(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	user, roles, ip := s.extractUserRoles(r)
	if !s.rbac.EvaluatePermission(roles, "shared_mailbox:write") {
		s.auditor.WriteAuditLog(user, ip, "FORWARD_CREATE", "none", "ACCESS_DENIED")
		http.Error(w, "Access Denied", http.StatusForbidden)
		return
	}

	var rule models.EmailForwardingRule
	if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	rule.ID = fmt.Sprintf("fwd-%d", time.Now().UnixNano())
	rule.SourceAddress = user
	rule.CreatedAt = time.Now()
	rule.IsVerified = true // Auto-verifying in simulated enterprise environment bounds

	s.rules.AddForwardingRule(rule)
	s.auditor.WriteAuditLog(user, ip, "FORWARD_CREATE", rule.ID, "SUCCESS")

	json.NewEncoder(w).Encode(rule)
}

func (s *Server) handleAuditLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	user, roles, ip := s.extractUserRoles(r)
	if !s.rbac.EvaluatePermission(roles, "audit:read") {
		s.auditor.WriteAuditLog(user, ip, "AUDIT_READ", "all", "ACCESS_DENIED")
		http.Error(w, "Access Denied: Insufficient rights.", http.StatusForbidden)
		return
	}

	logs := s.auditor.GetLogs()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}

func (s *Server) handleVerifyAuditLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	user, roles, ip := s.extractUserRoles(r)
	if !s.rbac.EvaluatePermission(roles, "audit:write") {
		s.auditor.WriteAuditLog(user, ip, "AUDIT_VERIFY", "chain", "ACCESS_DENIED")
		http.Error(w, "Access Denied", http.StatusForbidden)
		return
	}

	valid, count := s.auditor.VerifyChainIntegrity()
	s.auditor.WriteAuditLog(user, ip, "AUDIT_VERIFY", "chain", "SUCCESS")

	json.NewEncoder(w).Encode(map[string]interface{}{
		"valid":             valid,
		"compromised_count": count,
		"checked_at":        time.Now(),
	})
}

func (s *Server) handleCheckPermissions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	_, roles, _ := s.extractUserRoles(r)
	perm := r.URL.Query().Get("perm")

	allowed := s.rbac.EvaluatePermission(roles, perm)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"roles":      roles,
		"permission": perm,
		"authorized": allowed,
	})
}
