package config

import (
	"log"
	"strconv"

	"services-go/shared-library/utils"
)

// Config represents the system parameters for the Go SMTP Ingress server.
type Config struct {
	SMTPPort       int
	HTTPPort       int
	TLSEnabled     bool
	TLSCertPath    string
	TLSKeyPath     string
	KafkaBrokers   string
	KafkaTopic     string
	AuthServiceURL string
}

// LoadConfig gathers config from environment variables with sensible defaults.
func LoadConfig() *Config {
	smtpPort := getEnvInt("SMTP_PORT", 2525) // Low-privilege port for local development
	httpPort := getEnvInt("HTTP_PORT", 8080)
	tlsEnabled := getEnvBool("TLS_ENABLED", false)

	return &Config{
		SMTPPort:       smtpPort,
		HTTPPort:       httpPort,
		TLSEnabled:     tlsEnabled,
		TLSCertPath:    utils.GetEnv("TLS_CERT_PATH", "/etc/smtp/certs/tls.crt"),
		TLSKeyPath:     utils.GetEnv("TLS_KEY_PATH", "/etc/smtp/certs/tls.key"),
		KafkaBrokers:   utils.GetEnv("KAFKA_BROKERS", "localhost:9092"),
		KafkaTopic:     utils.GetEnv("KAFKA_TOPIC", "email.raw.ingress"),
		AuthServiceURL: utils.GetEnv("AUTH_SERVICE_URL", "http://localhost:8081"),
	}
}

func getEnvInt(key string, fallback int) int {
	valueStr := utils.GetEnv(key, "")
	if valueStr == "" {
		return fallback
	}
	val, err := strconv.Atoi(valueStr)
	if err != nil {
		log.Printf("Warning: Invalid value for env %s, reverting to fallback: %d", key, fallback)
		return fallback
	}
	return val
}

func getEnvBool(key string, fallback bool) bool {
	valueStr := utils.GetEnv(key, "")
	if valueStr == "" {
		return fallback
	}
	val, err := strconv.ParseBool(valueStr)
	if err != nil {
		log.Printf("Warning: Invalid Boolean representation for %s, using fallback.", key)
		return fallback
	}
	return val
}
