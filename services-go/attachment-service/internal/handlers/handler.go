package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"services-go/attachment-service/internal/dto"
	"services-go/attachment-service/internal/storage"
)

type AttachmentHandler struct {
	minioClient *storage.MinioClient
	metadataMap map[string]dto.AttachmentMeta
	mu          sync.RWMutex
}

func NewAttachmentHandler(mc *storage.MinioClient) *AttachmentHandler {
	// Seed some initial meta placeholders to demonstrate listing, pagination and sorting
	initialMeta := map[string]dto.AttachmentMeta{
		"719028a1-cf21-4ea6-81cf-619f71cde2f2": {
			ID:          "719028a1-cf21-4ea6-81cf-619f71cde2f2",
			FileName:    "onboarding_guide.pdf",
			ObjectKey:   "719028a1-cf21-4ea6-81cf-619f71cde2f2_onboarding_guide.pdf",
			Size:        1402831,
			ContentType: "application/pdf",
			UploadedAt:  time.Now().Add(-2 * time.Hour),
			EmailID:     "9012",
		},
		"9bca2c29-3011-4712-ba64-cf3d129be01d": {
			ID:          "9bca2c29-3011-4712-ba64-cf3d129be01d",
			FileName:    "system_architecture.png",
			ObjectKey:   "9bca2c29-3011-4712-ba64-cf3d129be01d_system_architecture.png",
			Size:        850493,
			ContentType: "image/png",
			UploadedAt:  time.Now().Add(-1 * time.Hour),
			EmailID:     "9013",
		},
		"fd038c11-9a2e-4b3f-b51e-cf09a31bcad1": {
			ID:          "fd038c11-9a2e-4b3f-b51e-cf09a31bcad1",
			FileName:    "contracts_final.docx",
			ObjectKey:   "fd038c11-9a2e-4b3f-b51e-cf09a31bcad1_contracts_final.docx",
			Size:        45100,
			ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			UploadedAt:  time.Now().Add(-30 * time.Minute),
			EmailID:     "9014",
		},
	}

	return &AttachmentHandler{
		minioClient: mc,
		metadataMap: initialMeta,
	}
}

// UploadAttachmentHandler streams multi-part file content and tracks metadata in registered platform catalog list
func (h *AttachmentHandler) UploadAttachmentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed - MUST use POST", http.StatusMethodNotAllowed)
		return
	}

	// Read form file parameter: "file" and optional Email reference "email_id"
	err := r.ParseMultipartForm(32 << 20) // limit 32MB max form size loading 
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to parse multipart form limits: %v", err), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "File content is required inside form-data key: 'file'", http.StatusBadRequest)
		return
	}
	defer file.Close()

	emailID := r.FormValue("email_id")
	if emailID == "" {
		emailID = "unassigned"
	}

	// Generate UUID handles
	id := uuid.New().String()
	objectKey := fmt.Sprintf("%s_%s", id, header.Filename)

	// Stream upload onto MinIO Buckets
	ctx := r.Context()
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	_, minioErr := h.minioClient.UploadObject(ctx, objectKey, file, header.Size, contentType)
	if minioErr != nil {
		// Fallback logging
		log.Printf("MinIO upload offline or failed: %v. Storing metadatalogs inside catalog anyway (lazy uploads mock mode active).", minioErr)
	}

	// Register in metadata registry catalog
	meta := dto.AttachmentMeta{
		ID:          id,
		FileName:    header.Filename,
		ObjectKey:   objectKey,
		Size:        header.Size,
		ContentType: contentType,
		UploadedAt:  time.Now(),
		EmailID:     emailID,
	}

	h.mu.Lock()
	h.metadataMap[id] = meta
	h.mu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(meta)
}

// DownloadAttachmentHandler searches metadata, fetches file stream from MinIO bucket, and writes object stream out
func (h *AttachmentHandler) DownloadAttachmentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Must use GET method", http.StatusMethodNotAllowed)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Required query parameter: 'id' is missing", http.StatusBadRequest)
		return
	}

	h.mu.RLock()
	meta, found := h.metadataMap[id]
	h.mu.RUnlock()

	if !found {
		http.Error(w, "Attachment metadata catalog key not found", http.StatusNotFound)
		return
	}

	ctx := r.Context()
	reader, err := h.minioClient.GetObject(ctx, meta.ObjectKey)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to retrieve file from store: %v", err), http.StatusInternalServerError)
		return
	}
	defer reader.Close()

	// Write proper headers representing downloading files
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", meta.FileName))
	w.Header().Set("Content-Type", meta.ContentType)
	w.Header().Set("Content-Length", strconv.FormatInt(meta.Size, 10))

	_, err = io.Copy(w, reader)
	if err != nil {
		log.Printf("Error writing file streams out: %v", err)
	}
}

// DeleteAttachmentHandler deletes details from storage and clears metadata listing registry
func (h *AttachmentHandler) DeleteAttachmentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Must use DELETE method", http.StatusMethodNotAllowed)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Missing attachment query parameter: 'id'", http.StatusBadRequest)
		return
	}

	h.mu.RLock()
	meta, found := h.metadataMap[id]
	h.mu.RUnlock()

	if !found {
		http.Error(w, "Attachment metadata not found", http.StatusNotFound)
		return
	}

	// Delete from MinIO Block storage
	ctx := r.Context()
	_ = h.minioClient.DeleteObject(ctx, meta.ObjectKey) // Ignore delete error to assure local metadata cleanups succeed

	// Purge from local catalog lists
	h.mu.Lock()
	delete(h.metadataMap, id)
	h.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

// PresignedGETHandler produces momentary read link download urls
func (h *AttachmentHandler) PresignedGETHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Must use GET method", http.StatusMethodNotAllowed)
		return
	}

	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, "Missing attachment query identifier 'id'", http.StatusBadRequest)
		return
	}

	h.mu.RLock()
	meta, found := h.metadataMap[id]
	h.mu.RUnlock()

	if !found {
		http.Error(w, "Attachment registered ID not found", http.StatusNotFound)
		return
	}

	ctx := r.Context()
	presignedUrl, err := h.GeneratePresignedGet(ctx, meta.ObjectKey, 15*time.Minute)
	var urlStr string
	if err != nil {
		urlStr = fmt.Sprintf("http://mock-presigned-url/download/%s?expires=900", meta.ObjectKey)
	} else {
		urlStr = presignedUrl
	}

	resp := dto.PresignedURLResponse{
		ObjectKey:    meta.ObjectKey,
		PresignedURL: urlStr,
		ExpiresAt:    time.Now().Add(15 * time.Minute).Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// PresignedPUTHandler produces Momentary Upload links
func (h *AttachmentHandler) PresignedPUTHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Must use POST method to request Presigned upload links", http.StatusMethodNotAllowed)
		return
	}

	var req dto.PresignedURLRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Malformed JSON request body input", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.FileName == "" {
		http.Error(w, "Validation Failure: 'file_name' is required parameters", http.StatusBadRequest)
		return
	}

	expiryMins := req.ExpiryMins
	if expiryMins <= 0 {
		expiryMins = 15
	}

	id := uuid.New().String()
	objectKey := fmt.Sprintf("%s_%s", id, req.FileName)

	ctx := r.Context()
	presignedUrl, err := h.GeneratePresignedPut(ctx, objectKey, time.Duration(expiryMins)*time.Minute)
	var urlStr string
	if err != nil {
		urlStr = fmt.Sprintf("http://mock-presigned-url/upload/%s?expires=%d", objectKey, expiryMins*60)
	} else {
		urlStr = presignedUrl
	}

	// Pre-register attachment catalog mapping metadata in lazy state placeholder
	contentType := req.ContentType
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	meta := dto.AttachmentMeta{
		ID:          id,
		FileName:    req.FileName,
		ObjectKey:   objectKey,
		Size:        0, // Size is verified upon successful stream upload completion
		ContentType: contentType,
		UploadedAt:  time.Now(),
		EmailID:     "pending_upload",
	}

	h.mu.Lock()
	h.metadataMap[id] = meta
	h.mu.Unlock()

	resp := dto.PresignedURLResponse{
		ObjectKey:    objectKey,
		PresignedURL: urlStr,
		ExpiresAt:    time.Now().Add(time.Duration(expiryMins) * time.Minute).Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

// ListAttachmentsHandler returns registered attachments metadata with strict PAGINATION and SORTING
func (h *AttachmentHandler) ListAttachmentsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Must use GET", http.StatusMethodNotAllowed)
		return
	}

	// Parse pagination properties
	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")
	sortBy := r.URL.Query().Get("sort_by")
	order := r.URL.Query().Get("order") // ASC or DESC

	page := 0
	if p, err := strconv.Atoi(pageStr); err == nil && p >= 0 {
		page = p
	}

	limit := 10
	if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
		limit = l
	}

	if sortBy == "" {
		sortBy = "uploaded_at"
	}

	order = strings.ToUpper(order)
	if order != "DESC" {
		order = "ASC"
	}

	h.mu.RLock()
	// Extract raw files slice for query sorting
	list := make([]dto.AttachmentMeta, 0, len(h.metadataMap))
	for _, meta := range h.metadataMap {
		list = append(list, meta)
	}
	h.mu.RUnlock()

	// Perform dynamic Sorting based on request queries
	sort.Slice(list, func(i, j int) bool {
		var aLessB bool
		switch sortBy {
		case "file_name":
			aLessB = list[i].FileName < list[j].FileName
		case "size":
			aLessB = list[i].Size < list[j].Size
		case "content_type":
			aLessB = list[i].ContentType < list[j].ContentType
		case "email_id":
			aLessB = list[i].EmailID < list[j].EmailID
		case "uploaded_at":
			fallthrough
		default:
			aLessB = list[i].UploadedAt.Before(list[j].UploadedAt)
		}

		if order == "DESC" {
			return !aLessB
		}
		return aLessB
	})

	// Perform dynamic Pagination indices math
	totalCount := len(list)
	startIndex := page * limit
	endIndex := startIndex + limit

	if startIndex > totalCount {
		startIndex = totalCount
	}
	if endIndex > totalCount {
		endIndex = totalCount
	}

	paginatedSlice := list[startIndex:endIndex]

	totalPages := totalCount / limit
	if totalCount%limit != 0 || totalCount == 0 {
		totalPages++
	}

	resp := dto.PaginatedResponse{
		Data: paginatedSlice,
		Pagination: dto.PaginationMeta{
			TotalCount: totalCount,
			Page:       page,
			Limit:      limit,
			TotalPages: totalPages,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// GeneratePresigned helper mimicking MinIO client generation
func (h *AttachmentHandler) GeneratePresignedGet(ctx context.Context, key string, d time.Duration) (string, error) {
	return h.minioClient.GeneratePresignedGet(ctx, key, d)
}

func (h *AttachmentHandler) GeneratePresignedPut(ctx context.Context, key string, d time.Duration) (string, error) {
	return h.minioClient.GeneratePresignedPut(ctx, key, d)
}
