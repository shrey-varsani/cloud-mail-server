module services-go/attachment-service

go 1.21

require (
	github.com/google/uuid v1.6.0
	github.com/minio/minio-go/v7 v7.0.66
	services-go/shared-library v0.0.0
)

replace services-go/shared-library => ../shared-library
