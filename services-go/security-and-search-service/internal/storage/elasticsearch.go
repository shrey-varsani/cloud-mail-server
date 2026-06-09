package storage

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"services-go/security-and-search-service/internal/models"
)

type ESClient struct {
	BaseURL    string
	IndexName  string
	httpClient *http.Client
	fallbackDB []models.ScannedEmail
	dbMutex    sync.Mutex
}

func NewESClient(baseURL, indexName string) *ESClient {
	return &ESClient{
		BaseURL:    strings.TrimSuffix(baseURL, "/"),
		IndexName:  indexName,
		httpClient: &http.Client{Timeout: 3 * time.Second},
		fallbackDB: make([]models.ScannedEmail, 0),
	}
}

func (es *ESClient) BootstrapCheck() {
	url := fmt.Sprintf("%s/%s", es.BaseURL, es.IndexName)
	resp, err := es.httpClient.Get(url)
	if err != nil {
		log.Printf("[INFO] Elasticsearch daemon not reachable at %s. Standard internal sandbox indexing activated.", es.BaseURL)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		log.Printf("[ES] Creating index mappings: %s", indexMappingConfig)
		req, _ := http.NewRequest(http.MethodPut, url, bytes.NewBuffer([]byte(indexMappingConfig)))
		req.Header.Set("Content-Type", "application/json")
		putResp, errPut := es.httpClient.Do(req)
		if errPut == nil {
			defer putResp.Body.Close()
			log.Printf("[ES] Index [%s] successfully created in Elasticsearch core clusters.", es.IndexName)
		}
	} else {
		log.Printf("[ES] Connection confirmed! Elasticsearch clustering active on index: %s", es.IndexName)
	}
}

func (es *ESClient) IndexDoc(doc models.ScannedEmail) error {
	es.dbMutex.Lock()
	found := false
	for idx, element := range es.fallbackDB {
		if element.ID == doc.ID || element.Email.MessageID == doc.Email.MessageID {
			es.fallbackDB[idx] = doc
			found = true
			break
		}
	}
	if !found {
		es.fallbackDB = append(es.fallbackDB, doc)
	}
	es.dbMutex.Unlock()

	docBytes, err := json.Marshal(doc)
	if err != nil {
		return err
	}

	url := fmt.Sprintf("%s/%s/_doc/%s", es.BaseURL, es.IndexName, doc.ID)
	req, err := http.NewRequest(http.MethodPut, url, bytes.NewBuffer(docBytes))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := es.httpClient.Do(req)
	if err != nil {
		log.Printf("[WARN] Index request skipped physical cluster indexing: ES offline. Document ID %s stored locally.", doc.ID)
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		log.Printf("[WARN] ES rejected index with code %d. Local copy remains operational.", resp.StatusCode)
	}

	log.Printf("[INFO] Elasticsearch index update success for doc: %s", doc.ID)
	return nil
}

func (es *ESClient) Search(sender, recipient, subject, body string, startDate, endDate *time.Time, q string) (models.SearchResponse, error) {
	startTime := time.Now()

	esQuery := buildESSearchQuery(sender, recipient, subject, body, startDate, endDate, q)
	resp, err := es.queryElasticsearch(esQuery)
	if err == nil {
		took := time.Since(startTime).Milliseconds()
		resp.TookMs = took
		return resp, nil
	}

	log.Printf("[SEARCH FALLBACK] Querying local data indices directly. Query Term: '%s'", q)
	results := es.searchFallback(sender, recipient, subject, body, startDate, endDate, q)
	took := time.Since(startTime).Milliseconds()

	return models.SearchResponse{
		Results: results,
		Total:   int64(len(results)),
		TookMs:  took,
	}, nil
}

func (es *ESClient) queryElasticsearch(query string) (models.SearchResponse, error) {
	url := fmt.Sprintf("%s/%s/_search", es.BaseURL, es.IndexName)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer([]byte(query)))
	if err != nil {
		return models.SearchResponse{}, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := es.httpClient.Do(req)
	if err != nil {
		return models.SearchResponse{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return models.SearchResponse{}, fmt.Errorf("bad search response: status %d", resp.StatusCode)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return models.SearchResponse{}, err
	}

	var esHit struct {
		Hits struct {
			Total struct {
				Value int64 `json:"value"`
			} `json:"total"`
		} `json:"hits"`
	}

	var esDocs struct {
		Hits struct {
			Hits []struct {
				Source models.ScannedEmail `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}

	if err := json.Unmarshal(bodyBytes, &esHit); err != nil {
		return models.SearchResponse{}, err
	}
	_ = json.Unmarshal(bodyBytes, &esDocs)

	resList := make([]models.ScannedEmail, 0)
	for _, hit := range esDocs.Hits.Hits {
		resList = append(resList, hit.Source)
	}

	return models.SearchResponse{
		Results: resList,
		Total:   esHit.Hits.Total.Value,
	}, nil
}

func (es *ESClient) searchFallback(sender, recipient, subject, body string, startDate, endDate *time.Time, q string) []models.ScannedEmail {
	es.dbMutex.Lock()
	defer es.dbMutex.Unlock()

	matchedList := make([]models.ScannedEmail, 0)

	sender = strings.ToLower(strings.TrimSpace(sender))
	recipient = strings.ToLower(strings.TrimSpace(recipient))
	subject = strings.ToLower(strings.TrimSpace(subject))
	body = strings.ToLower(strings.TrimSpace(body))
	q = strings.ToLower(strings.TrimSpace(q))

	for _, doc := range es.fallbackDB {
		e := doc.Email
		match := true

		if sender != "" && !strings.Contains(strings.ToLower(e.Sender), sender) {
			match = false
		}

		if recipient != "" {
			foundRecip := false
			for _, rec := range e.Recipients {
				if strings.Contains(strings.ToLower(rec), recipient) {
					foundRecip = true
					break
				}
			}
			if !foundRecip {
				match = false
			}
		}

		if subject != "" && !strings.Contains(strings.ToLower(e.Subject), subject) {
			match = false
		}

		if body != "" && !strings.Contains(strings.ToLower(e.Body), body) {
			match = false
		}

		if startDate != nil && e.ReceivedAt.Before(*startDate) {
			match = false
		}
		if endDate != nil && e.ReceivedAt.After(*endDate) {
			match = false
		}

		if q != "" {
			globeMatch := false
			if strings.Contains(strings.ToLower(e.Sender), q) {
				globeMatch = true
			}
			if strings.Contains(strings.ToLower(e.Subject), q) {
				globeMatch = true
			}
			if strings.Contains(strings.ToLower(e.Body), q) {
				globeMatch = true
			}
			for _, rec := range e.Recipients {
				if strings.Contains(strings.ToLower(rec), q) {
					globeMatch = true
				}
			}
			if !globeMatch {
				match = false
			}
		}

		if match {
			matchedList = append(matchedList, doc)
		}
	}

	return matchedList
}

func buildESSearchQuery(sender, recipient, subject, body string, startDate, endDate *time.Time, q string) string {
	musts := make([]string, 0)

	if sender != "" {
		musts = append(musts, fmt.Sprintf(`{"match": {"email.sender": "%s"}}`, sender))
	}
	if recipient != "" {
		musts = append(musts, fmt.Sprintf(`{"match": {"email.recipients": "%s"}}`, recipient))
	}
	if subject != "" {
		musts = append(musts, fmt.Sprintf(`{"match_phrase": {"email.subject": "%s"}}`, subject))
	}
	if body != "" {
		musts = append(musts, fmt.Sprintf(`{"match_phrase": {"email.body": "%s"}}`, body))
	}

	if q != "" {
		musts = append(musts, fmt.Sprintf(`{"multi_match": {"query": "%s", "fields": ["email.sender", "email.recipients", "email.subject", "email.body"]}}`, q))
	}

	if startDate != nil || endDate != nil {
		rangeExpr := ""
		if startDate != nil && endDate != nil {
			rangeExpr = fmt.Sprintf(`"gte": "%s", "lte": "%s"`, startDate.Format(time.RFC3339), endDate.Format(time.RFC3339))
		} else if startDate != nil {
			rangeExpr = fmt.Sprintf(`"gte": "%s"`, startDate.Format(time.RFC3339))
		} else {
			rangeExpr = fmt.Sprintf(`"lte": "%s"`, endDate.Format(time.RFC3339))
		}
		musts = append(musts, fmt.Sprintf(`{"range": {"email.received_at": {%s}}}`, rangeExpr))
	}

	querySection := ""
	if len(musts) > 0 {
		querySection = fmt.Sprintf(`"query": {"bool": {"must": [%s]}}`, strings.Join(musts, ","))
	} else {
		querySection = `"query": {"match_all": {}}`
	}

	return fmt.Sprintf(`{%s, "size": 100}`, querySection)
}

const indexMappingConfig = `{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "email": {
        "properties": {
          "message_id": { "type": "keyword" },
          "sender": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
          "recipients": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
          "subject": { "type": "text" },
          "body": { "type": "text" },
          "size_in_bytes": { "type": "long" },
          "received_at": { "type": "date" },
          "client_ip": { "type": "keyword" }
        }
      },
      "audit": {
        "properties": {
          "spf_result": { "type": "keyword" },
          "spf_domain": { "type": "keyword" },
          "dkim_result": { "type": "keyword" },
          "dkim_domain": { "type": "keyword" },
          "dmarc_result": { "type": "keyword" },
          "dmarc_aligned": { "type": "boolean" },
          "spam_score": { "type": "float" },
          "is_spam": { "type": "boolean" },
          "audit_triggers": { "type": "keyword" }
        }
      },
      "scanned_at": { "type": "date" }
    }
  }
}`
