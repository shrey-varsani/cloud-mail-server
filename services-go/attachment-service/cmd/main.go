package main

import (
	"log"
	"net/http"

	"services-go/attachment-service/internal/config"
	"services-go/attachment-service/internal/handlers"
	"services-go/attachment-service/internal/storage"
)

func main() {
	log.Println("[INFO] Starting Attachment Service Daemon...")

	// 1. Load Configurations
	cfg := config.LoadConfig()

	// 2. Setup MinIO Connection Adapter
	mc, err := storage.NewMinioClient(cfg)
	if err != nil {
		log.Printf("[WARN] MinIO connector could not verify connection: %v. Proceeding with mocking capabilities for local testing environments.", err)
	}

	// 3. Initiate HTTP Layer handlers
	h := handlers.NewAttachmentHandler(mc)

	// 4. Map API Route structures
	mux := http.NewServeMux()
	
	// REST endpoints
	mux.HandleFunc("/api/v1/attachments/upload", h.UploadAttachmentHandler)       // POST upload (form-data multipart)
	mux.HandleFunc("/api/v1/attachments/download", h.DownloadAttachmentHandler)   // GET download by id
	mux.HandleFunc("/api/v1/attachments/delete", h.DeleteAttachmentHandler)       // DELETE purge by id
	mux.HandleFunc("/api/v1/attachments/list", h.ListAttachmentsHandler)           // GET paginated listing with sorting
	
	// Presigned URL integrations
	mux.HandleFunc("/api/v1/attachments/presigned/download", h.PresignedGETHandler) // GET generating temporary read link
	mux.HandleFunc("/api/v1/attachments/presigned/upload", h.PresignedPUTHandler)   // POST generating presigned PUT url

	// Global Health check
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"healthy","service":"attachment-service"}`))
	})

	log.Printf("[INFO] Attachment REST Inbound Gateways bound successfully on 0.0.0.0:%s", cfg.Port)
	if listenErr := http.ListenAndServe("0.0.0.0:"+cfg.Port, mux); listenErr != nil {
		log.Fatalf("[FATAL] Server listener crashed during execution: %v", listenErr)
	}
}
