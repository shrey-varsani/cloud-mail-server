package config

import (
	"os"
	"strconv"

	"services-go/shared-library/utils"
)

type Config struct {
	ServerPort        int
	KafkaBrokers      string
	RawEmailTopic     string
	AuditTopic        string
	ScheduleIntervalS int
	DebugMode         bool
}

func LoadConfig() Config {
	port := 8083
	if pStr := os.Getenv("ENTERPRISE_SERVICE_PORT"); pStr != "" {
		if val, err := strconv.Atoi(pStr); err == nil {
			port = val
		}
	}

	interval := 5
	if intStr := os.Getenv("SCHEDULE_POLL_INTERVAL_S"); intStr != "" {
		if val, err := strconv.Atoi(intStr); err == nil {
			interval = val
		}
	}

	return Config{
		ServerPort:        port,
		KafkaBrokers:      utils.GetEnv("KAFKA_BROKERS", "localhost:9092"),
		RawEmailTopic:     utils.GetEnv("RAW_EMAIL_TOPIC", "emails.raw.v1"),
		AuditTopic:        utils.GetEnv("AUDIT_LOG_TOPIC", "platform.audit.v1"),
		ScheduleIntervalS: interval,
		DebugMode:         utils.GetEnv("DEBUG_MODE", "true") == "true",
	}
}
