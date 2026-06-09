package config

import (
	"services-go/shared-library/utils"
)

type Config struct {
	Port               string
	ElasticsearchURL   string
	ElasticsearchIndex string
	KafkaBrokers       string
	RawEmailTopic      string
	ScannedEmailTopic  string
	SpamThreshold      float64
}

func LoadConfig() Config {
	port := utils.GetEnv("PORT", "9090")
	esURL := utils.GetEnv("ELASTICSEARCH_URL", "http://localhost:9200")
	esIndex := utils.GetEnv("ELASTICSEARCH_INDEX", "emails")
	kafkaBrokers := utils.GetEnv("KAFKA_BROKERS", "localhost:9092")
	rawTopic := utils.GetEnv("RAW_EMAIL_TOPIC", "emails-raw")
	scannedTopic := utils.GetEnv("SCANNED_EMAIL_TOPIC", "emails-scanned")
	
	return Config{
		Port:               port,
		ElasticsearchURL:   esURL,
		ElasticsearchIndex: esIndex,
		KafkaBrokers:       kafkaBrokers,
		RawEmailTopic:      rawTopic,
		ScannedEmailTopic:  scannedTopic,
		SpamThreshold:      5.0,
	}
}
