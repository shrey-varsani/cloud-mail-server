package config

import (
	"services-go/shared-library/utils"
)

type Config struct {
	Port           string
	MinioEndpoint  string
	MinioAccessKey string
	MinioSecretKey string
	MinioBucket    string
	MinioUseSSL    bool
}

func LoadConfig() Config {
	port := utils.GetEnv("PORT", "8083")
	minioEndpoint := utils.GetEnv("MINIO_ENDPOINT", "localhost:9000")
	minioAccessKey := utils.GetEnv("MINIO_ACCESS_KEY", "minioadmin")
	minioSecretKey := utils.GetEnv("MINIO_SECRET_KEY", "minioadmin")
	minioBucket := utils.GetEnv("MINIO_BUCKET_NAME", "emails-attachments")
	
	useSSLStr := utils.GetEnv("MINIO_USE_SSL", "false")
	useSSL := useSSLStr == "true"

	return Config{
		Port:           port,
		MinioEndpoint:  minioEndpoint,
		MinioAccessKey: minioAccessKey,
		MinioSecretKey: minioSecretKey,
		MinioBucket:    minioBucket,
		MinioUseSSL:    useSSL,
	}
}
