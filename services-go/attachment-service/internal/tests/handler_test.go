package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"services-go/attachment-service/internal/dto"
	"services-go/attachment-service/internal/handlers"
)

func TestListAttachmentsHandler(t *testing.T) {
	// Instantiate handler with nil Go MinIO client (which handles testing safely)
	h := handlers.NewAttachmentHandler(nil)

	req, err := http.NewRequest("GET", "/api/v1/attachments/list?page=0&limit=2&sort_by=size&order=ASC", nil)
	if err != nil {
		t.Fatalf("Failed to create mock HTTP Request: %v", err)
	}

	rr := httptest.NewRecorder()
	h.ListAttachmentsHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", rr.Code)
	}

	var resp dto.PaginatedResponse
	err = json.Unmarshal(rr.Body.Bytes(), &resp)
	if err != nil {
		t.Fatalf("Failed to unmarshal response payload: %v", err)
	}

	// Verify pagination limit worked correctly inside handler 
	if len(resp.Data) > 2 {
		t.Errorf("Expected maximum 2 items, got %d", len(resp.Data))
	}

	// Verify pagination meta is accurate
	if resp.Pagination.Limit != 2 {
		t.Errorf("Expected page limit configuration to represent 2, got %d", resp.Pagination.Limit)
	}

	// Verify order sorting structure (first should be smallest in ASC sizes)
	if len(resp.Data) == 2 {
		smallest := resp.Data[0].Size
		next := resp.Data[1].Size
		if smallest > next {
			t.Errorf("Expected Ascending size ordering, but first was %d, second was %d", smallest, next)
		}
	}
}
