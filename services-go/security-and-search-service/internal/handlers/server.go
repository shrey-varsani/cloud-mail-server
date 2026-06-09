package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync/atomic"
	"time"

	"services-go/security-and-search-service/internal/kafka"
	"services-go/security-and-search-service/internal/models"
	"services-go/security-and-search-service/internal/services"
	"services-go/security-and-search-service/internal/storage"
)

type MetricsRegistry struct {
	ScannedTotal      int64
	SpamTotal         int64
	CleanTotal        int64
	SearchQueries     int64
	SpfPass           int64
	SpfFail           int64
	DkimPass          int64
	DkimFail          int64
	DmarcAligned      int64
	DmarcMisaligned   int64
	SpamScoreAccumulator int64
}

type APIServer struct {
	port       string
	esClient   *storage.ESClient
	analyzer   *services.SpamAnalyzer
	consumer   *kafka.EmailConsumer
	metrics    *MetricsRegistry
	httpServer *http.Server
}

func NewAPIServer(port string, es *storage.ESClient, sa *services.SpamAnalyzer, ec *kafka.EmailConsumer) *APIServer {
	return &APIServer{
		port:     port,
		esClient: es,
		analyzer: sa,
		consumer: ec,
		metrics:  &MetricsRegistry{},
	}
}

func (s *APIServer) Start() error {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/v1/health", s.handleHealth)
	mux.HandleFunc("/api/v1/search", s.handleSearch)
	mux.HandleFunc("/api/v1/analyze", s.handleAnalyze)
	mux.HandleFunc("/metrics", s.handleMetrics)

	s.httpServer = &http.Server{
		Addr:    "0.0.0.0:" + s.port,
		Handler: loggerMiddleware(mux),
	}

	log.Printf("[INFO] Search and Security API deployment launching at HTTP bind http://localhost:%s", s.port)
	go func() {
		if err := s.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[FATAL] HTTP API gateway listener crashed: %v", err)
		}
	}()

	return nil
}

func (s *APIServer) Stop() {
	if s.httpServer != nil {
		s.httpServer.Close()
	}
	log.Println("[INFO] API Server stopped cleanly.")
}

func (s *APIServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "UP",
		"timestamp": time.Now().Format(time.RFC3339),
		"service":   "Email Security & Elasticsearch Search Pipeline Core",
	})
}

func (s *APIServer) handleSearch(w http.ResponseWriter, r *http.Request) {
	atomic.AddInt64(&s.metrics.SearchQueries, 1)

	q := r.URL.Query().Get("q")
	sender := r.URL.Query().Get("sender")
	recipient := r.URL.Query().Get("recipient")
	subject := r.URL.Query().Get("subject")
	body := r.URL.Query().Get("body")

	var startDate, endDate *time.Time
	if startStr := r.URL.Query().Get("startDate"); startStr != "" {
		if parsed, err := time.Parse(time.RFC3339, startStr); err == nil {
			startDate = &parsed
		} else if parsedDate, errSimple := time.Parse("2006-01-02", startStr); errSimple == nil {
			startDate = &parsedDate
		}
	}
	if endStr := r.URL.Query().Get("endDate"); endStr != "" {
		if parsed, err := time.Parse(time.RFC3339, endStr); err == nil {
			endDate = &parsed
		} else if parsedDate, errSimple := time.Parse("2006-01-02", endStr); errSimple == nil {
			endDate = &parsedDate
		}
	}

	res, err := s.esClient.Search(sender, recipient, subject, body, startDate, endDate, q)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{"error": "Elasticsearch transaction failure", "details": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(res)
}

func (s *APIServer) handleAnalyze(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var email models.Email
	if err := json.NewDecoder(r.Body).Decode(&email); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request JSON payload body"})
		return
	}

	if email.MessageID == "" {
		email.MessageID = fmt.Sprintf("live_api_%d", time.Now().UnixNano())
	}
	if email.ReceivedAt.IsZero() {
		email.ReceivedAt = time.Now()
	}

	audit := s.analyzer.AnalyzeEmail(email)
	s.consumer.InjectRawEmail(email)

	atomic.AddInt64(&s.metrics.ScannedTotal, 1)
	if audit.IsSpam {
		atomic.AddInt64(&s.metrics.SpamTotal, 1)
	} else {
		atomic.AddInt64(&s.metrics.CleanTotal, 1)
	}

	if audit.SPFResult == "PASS" {
		atomic.AddInt64(&s.metrics.SpfPass, 1)
	} else if audit.SPFResult == "FAIL" {
		atomic.AddInt64(&s.metrics.SpfFail, 1)
	}

	if audit.DKIMResult == "PASS" {
		atomic.AddInt64(&s.metrics.DkimPass, 1)
	} else if audit.DKIMResult == "FAIL" {
		atomic.AddInt64(&s.metrics.DkimFail, 1)
	}

	if audit.DMARCAligned {
		atomic.AddInt64(&s.metrics.DmarcAligned, 1)
	} else {
		atomic.AddInt64(&s.metrics.DmarcMisaligned, 1)
	}

	atomic.AddInt64(&s.metrics.SpamScoreAccumulator, int64(audit.SpamScore*1000))

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(audit)
}

func (s *APIServer) handleMetrics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	w.WriteHeader(http.StatusOK)

	scanned := atomic.LoadInt64(&s.metrics.ScannedTotal)
	spamTotal := atomic.LoadInt64(&s.metrics.SpamTotal)
	cleanTotal := atomic.LoadInt64(&s.metrics.CleanTotal)
	queriesTotal := atomic.LoadInt64(&s.metrics.SearchQueries)
	spfPass := atomic.LoadInt64(&s.metrics.SpfPass)
	spfFail := atomic.LoadInt64(&s.metrics.SpfFail)
	dkimPass := atomic.LoadInt64(&s.metrics.DkimPass)
	dkimFail := atomic.LoadInt64(&s.metrics.DkimFail)
	dmarcAligned := atomic.LoadInt64(&s.metrics.DmarcAligned)
	dmarcMisaligned := atomic.LoadInt64(&s.metrics.DmarcMisaligned)
	milliAccumulator := atomic.LoadInt64(&s.metrics.SpamScoreAccumulator)

	avgSpamScore := 0.0
	if scanned > 0 {
		avgSpamScore = float64(milliAccumulator) / 1000.0 / float64(scanned)
	}

	fmt.Fprintf(w, "# HELP email_search_security_scanned_total Total count of parsed and scanned emails\n")
	fmt.Fprintf(w, "# TYPE email_search_security_scanned_total counter\n")
	fmt.Fprintf(w, "email_search_security_scanned_total{status=\"spam\"} %d\n", spamTotal)
	fmt.Fprintf(w, "email_search_security_scanned_total{status=\"clean\"} %d\n", cleanTotal)
	fmt.Fprintf(w, "email_search_security_scanned_total{status=\"total\"} %d\n", scanned)

	fmt.Fprintf(w, "\n# HELP email_search_queries_total Cumulative query volume directed to search controllers\n")
	fmt.Fprintf(w, "# TYPE email_search_queries_total counter\n")
	fmt.Fprintf(w, "email_search_queries_total %d\n", queriesTotal)

	fmt.Fprintf(w, "\n# HELP email_security_spf_total Total SPF resolution scans categorized by rule\n")
	fmt.Fprintf(w, "# TYPE email_security_spf_total counter\n")
	fmt.Fprintf(w, "email_security_spf_total{result=\"pass\"} %d\n", spfPass)
	fmt.Fprintf(w, "email_security_spf_total{result=\"fail\"} %d\n", spfFail)

	fmt.Fprintf(w, "\n# HELP email_security_dkim_total Total DKIM signature scans\n")
	fmt.Fprintf(w, "# TYPE email_security_dkim_total counter\n")
	fmt.Fprintf(w, "email_security_dkim_total{result=\"pass\"} %d\n", dkimPass)
	fmt.Fprintf(w, "email_security_dkim_total{result=\"fail\"} %d\n", dkimFail)

	fmt.Fprintf(w, "\n# HELP email_security_dmarc_alignment_total DMARC identifier alignment logs\n")
	fmt.Fprintf(w, "# TYPE email_security_dmarc_alignment_total counter\n")
	fmt.Fprintf(w, "email_security_dmarc_alignment_total{aligned=\"true\"} %d\n", dmarcAligned)
	fmt.Fprintf(w, "email_security_dmarc_alignment_total{aligned=\"false\"} %d\n", dmarcMisaligned)

	fmt.Fprintf(w, "\n# HELP email_security_spam_score_average Floating average of security verified spam coefficients\n")
	fmt.Fprintf(w, "# TYPE email_security_spam_score_average gauge\n")
	fmt.Fprintf(w, "email_security_spam_score_average %.3f\n", avgSpamScore)
}

func loggerMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("[REST] IP: %s %s %s | Duration: %v", r.RemoteAddr, r.Method, r.URL.Path, time.Since(t))
	})
}
