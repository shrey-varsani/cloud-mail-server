package tests

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"services-go/security-and-search-service/internal/handlers"
	"services-go/security-and-search-service/internal/kafka"
	"services-go/security-and-search-service/internal/models"
	"services-go/security-and-search-service/internal/services"
	"services-go/security-and-search-service/internal/storage"
)

func TestSearchAndSecurityService(t *testing.T) {
	esClient := storage.NewESClient("http://localhost:19200", "test_emails")
	analyzer := services.NewSpamAnalyzer(5.0)
	pub := kafka.NewMockEventPublisher("test-scanned")
	
	consumer := kafka.NewEmailConsumer("localhost:19092", "test-raw", analyzer, esClient, pub)
	consumer.Start()
	defer consumer.Stop()

	srv := handlers.NewAPIServer("29090", esClient, analyzer, consumer)
	if err := srv.Start(); err != nil {
		t.Fatalf("Failed starting testing Server: %v", err)
	}
	defer srv.Stop()

	time.Sleep(100 * time.Millisecond)

	cleanEmail := models.Email{
		MessageID:   "test-clean-01",
		Sender:      "billing@stripe.com",
		Recipients:  []string{"finance@example.com"},
		Subject:     "Your Monthly Enterprise Invoice For Stripe Billing Platforms",
		Body:        "Hello finance team,\r\n\r\nYour subscription invoice of $250.00 is settled successfully.\r\n\r\nBest regards,\r\nStripe Payments Core Team.",
		SizeInBytes: 250,
		ReceivedAt:  time.Now().Add(-10 * time.Minute),
		Headers:     map[string]string{"received-spf": "pass", "dkim-signature": "v=1; d=stripe.com"},
		ClientIP:    "3.23.45.67",
	}

	spamEmail := models.Email{
		MessageID:   "test-spam-02",
		Sender:      "rich-millions@lotterywire-win.xyz",
		Recipients:  []string{"target-recipient@example.com"},
		Subject:     "URGENT ATTENTION REQUIRED: WINNER OF MILLIONS LOTTERY ACT NOW",
		Body:        "Congratulations Winner!\r\n\r\nYou won millions of dollar! Act now to secure cash transfer of cryptocurrency bitcoin prize. Reset password check.",
		SizeInBytes: 310,
		ReceivedAt:  time.Now(),
		Headers:     map[string]string{"received-spf": "fail"},
		ClientIP:    "185.220.101.4",
	}

	t.Run("Analyzer Detections Evaluation", func(t *testing.T) {
		cleanAudit := analyzer.AnalyzeEmail(cleanEmail)
		if cleanAudit.IsSpam || cleanAudit.SpamScore >= 5.0 {
			t.Errorf("Clean invoice falsely tagged as spam: spamscore = %.2f", cleanAudit.SpamScore)
		}
		if cleanAudit.SPFResult != "PASS" {
			t.Errorf("Expected SPF PASS, got: %s", cleanAudit.SPFResult)
		}

		spamAudit := analyzer.AnalyzeEmail(spamEmail)
		if !spamAudit.IsSpam || spamAudit.SpamScore < 5.0 {
			t.Errorf("Expected phishing alert to be tagged spam, score: %.2f", spamAudit.SpamScore)
		}
		if spamAudit.SPFResult != "FAIL" {
			t.Errorf("Expected SPF FAIL on threat domain, got: %s", spamAudit.SPFResult)
		}

		hasTrigger := false
		for _, tag := range spamAudit.AuditTriggers {
			if tag == "SPAMMY_SUBJECT_TERMS" {
				hasTrigger = true
			}
		}
		if !hasTrigger {
			t.Error("Phishing keywords in subject failed to trigger SPAMMY_SUBJECT_TERMS")
		}
	})

	t.Run("REST Call Live Scan Integration", func(t *testing.T) {
		payload, _ := json.Marshal(cleanEmail)
		resp, err := http.Post("http://localhost:29090/api/v1/analyze", "application/json", bytes.NewBuffer(payload))
		if err != nil {
			t.Fatalf("POST analyse endpoint failed: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected HTTP 200, got: %d", resp.StatusCode)
		}

		var rep models.SecurityAudit
		_ = json.NewDecoder(resp.Body).Decode(&rep)
		if rep.SPFResult != "PASS" {
			t.Errorf("Expected live audit returns SPF pass, got: %s", rep.SPFResult)
		}

		spamPayload, _ := json.Marshal(spamEmail)
		respSpam, _ := http.Post("http://localhost:29090/api/v1/analyze", "application/json", bytes.NewBuffer(spamPayload))
		respSpam.Body.Close()

		time.Sleep(50 * time.Millisecond)
	})

	t.Run("REST Search Filter Coordinates Checks", func(t *testing.T) {
		resp, _ := http.Get("http://localhost:29090/api/v1/search?sender=stripe")
		defer resp.Body.Close()
		var res models.SearchResponse
		_ = json.NewDecoder(resp.Body).Decode(&res)
		if len(res.Results) != 1 || res.Results[0].Email.MessageID != "test-clean-01" {
			t.Errorf("Expected sender match for Stripe, got total match elements: %d", len(res.Results))
		}

		respRec, _ := http.Get("http://localhost:29090/api/v1/search?recipient=target-recipient")
		defer respRec.Body.Close()
		_ = json.NewDecoder(respRec.Body).Decode(&res)
		if len(res.Results) != 1 || res.Results[0].Email.MessageID != "test-spam-02" {
			t.Error("Expected recipient match fails for custom address test-spam-02")
		}

		respSubj, _ := http.Get("http://localhost:29090/api/v1/search?subject=Enterprise%20Invoice")
		defer respSubj.Body.Close()
		_ = json.NewDecoder(respSubj.Body).Decode(&res)
		if len(res.Results) != 1 {
			t.Error("Subject phrase match fails to locate correct email document")
		}

		respBody, _ := http.Get("http://localhost:29090/api/v1/search?body=cryptocurrency")
		defer respBody.Body.Close()
		_ = json.NewDecoder(respBody.Body).Decode(&res)
		if len(res.Results) != 1 || res.Results[0].ID != "test-spam-02" {
			t.Error("Body keyword scan match failed finding matching threat records")
		}

		respGen, _ := http.Get("http://localhost:29090/api/v1/search?q=Congratulations")
		defer respGen.Body.Close()
		_ = json.NewDecoder(respGen.Body).Decode(&res)
		if len(res.Results) != 1 {
			t.Errorf("Generic q wildcard query failed. Got total matches: %d", len(res.Results))
		}

		startStr := time.Now().Add(-30 * time.Minute).Format(time.RFC3339)
		endStr := time.Now().Add(5 * time.Minute).Format(time.RFC3339)
		respDates, _ := http.Get("http://localhost:29090/api/v1/search?startDate=" + startStr + "&endDate=" + endStr)
		defer respDates.Body.Close()
		_ = json.NewDecoder(respDates.Body).Decode(&res)
		if len(res.Results) < 2 {
			t.Errorf("Dates range boundaries failed to filter matches, got: %d", len(res.Results))
		}
	})

	t.Run("REST Prometheus Telemetry Validation", func(t *testing.T) {
		resp, err := http.Get("http://localhost:29090/metrics")
		if err != nil {
			t.Fatalf("Metrics endpoint failed: %v", err)
		}
		defer resp.Body.Close()

		bodyText, _ := io.ReadAll(resp.Body)
		content := string(bodyText)

		if !strings.Contains(content, "email_search_security_scanned_total") {
			t.Error("Expected metric key 'email_search_security_scanned_total' missing in output.")
		}
		if !strings.Contains(content, "email_security_spam_score_average") {
			t.Error("Expected structural metric 'email_security_spam_score_average' missing in output.")
		}
	})
}
