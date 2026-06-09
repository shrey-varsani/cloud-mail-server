package dto

import "time"

type AttachmentMeta struct {
	ID          string    `json:"id"`
	FileName    string    `json:"file_name"`
	ObjectKey   string    `json:"object_key"`
	Size        int64     `json:"size"`
	ContentType string    `json:"content_type"`
	UploadedAt  time.Time `json:"uploaded_at"`
	EmailID     string    `json:"email_id"`
}

type PresignedURLRequest struct {
	FileName    string `json:"file_name"`
	ContentType string `json:"content_type"`
	ExpiryMins  int    `json:"expiry_mins"` // defaults to 15 if empty or invalid
}

type PresignedURLResponse struct {
	ObjectKey    string `json:"object_key"`
	PresignedURL string `json:"presigned_url"`
	ExpiresAt    string `json:"expires_at"`
}

type PaginationMeta struct {
	TotalCount int `json:"total_count"`
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	TotalPages int `json:"total_pages"`
}

type PaginatedResponse struct {
	Data       []AttachmentMeta `json:"data"`
	Pagination PaginationMeta   `json:"pagination"`
}
