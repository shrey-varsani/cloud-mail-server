package storage

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/url"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"services-go/attachment-service/internal/config"
)

type MinioClient struct {
	client *minio.Client
	bucket string
}

func NewMinioClient(cfg config.Config) (*MinioClient, error) {
	log.Printf("Initializing MinIO client connection to endpoint: %s", cfg.MinioEndpoint)
	minioClient, err := minio.New(cfg.MinioEndpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.MinioAccessKey, cfg.MinioSecretKey, ""),
		Secure: cfg.MinioUseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MinIO: %w", err)
	}

	ctx := context.Background()
	exists, err := minioClient.BucketExists(ctx, cfg.MinioBucket)
	if err != nil {
		// Log warning, might be offline but connection schema registered
		log.Printf("Warning: Failed to check bucket existence: %v. Running lazy broker check later.", err)
	} else if !exists {
		log.Printf("Bucket '%s' does not exist. Creating it now...", cfg.MinioBucket)
		err = minioClient.MakeBucket(ctx, cfg.MinioBucket, minio.MakeBucketOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to create bucket '%s': %w", cfg.MinioBucket, err)
		}
		log.Printf("Successfully created bucket '%s'", cfg.MinioBucket)
	} else {
		log.Printf("Verified bucket '%s' exists successfully", cfg.MinioBucket)
	}

	return &MinioClient{
		client: minioClient,
		bucket: cfg.MinioBucket,
	}, nil
}

func (m *MinioClient) UploadObject(ctx context.Context, objectName string, reader io.Reader, size int64, contentType string) (string, error) {
	opts := minio.PutObjectOptions{
		ContentType: contentType,
	}
	info, err := m.client.PutObject(ctx, m.bucket, objectName, reader, size, opts)
	if err != nil {
		return "", fmt.Errorf("failed to put object '%s' inside MinIO: %w", objectName, err)
	}
	log.Printf("Successfully uploaded object %s - size %d bytes", info.Key, info.Size)
	return info.Key, nil
}

func (m *MinioClient) GetObject(ctx context.Context, objectName string) (io.ReadCloser, error) {
	object, err := m.client.GetObject(ctx, m.bucket, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get object reader '%s': %w", objectName, err)
	}
	return object, nil
}

func (m *MinioClient) DeleteObject(ctx context.Context, objectName string) error {
	err := m.client.RemoveObject(ctx, m.bucket, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed to remove object '%s': %w", objectName, err)
	}
	log.Printf("Successfully deleted object %s from bucket %s", objectName, m.bucket)
	return nil
}

func (m *MinioClient) GeneratePresignedGet(ctx context.Context, objectName string, expires time.Duration) (string, error) {
	reqParams := make(url.Values)
	presignedURL, err := m.client.PresignedGetObject(ctx, m.bucket, objectName, expires, reqParams)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned GET URL for '%s': %w", objectName, err)
	}
	return presignedURL.String(), nil
}

func (m *MinioClient) GeneratePresignedPut(ctx context.Context, objectName string, expires time.Duration) (string, error) {
	presignedURL, err := m.client.PresignedPutObject(ctx, m.bucket, objectName, expires)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned PUT URL for '%s': %w", objectName, err)
	}
	return presignedURL.String(), nil
}
