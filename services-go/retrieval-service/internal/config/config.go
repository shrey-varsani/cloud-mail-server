package config

import (
	"services-go/shared-library/utils"
)

type Config struct {
	Pop3Port         string
	ImapPort         string
	EmailServiceURL  string
	UseTLS           bool
	TLSCertFile      string
	TLSKeyFile       string
}

func LoadConfig() Config {
	pop3Port := utils.GetEnv("POP3_PORT", "9110")
	imapPort := utils.GetEnv("IMAP_PORT", "9143")
	emailServiceURL := utils.GetEnv("EMAIL_SERVICE_URL", "http://localhost:8082")
	useTLSStr := utils.GetEnv("USE_TLS", "false")
	useTLS := useTLSStr == "true"
	tlsCert := utils.GetEnv("TLS_CERT_FILE", "")
	tlsKey := utils.GetEnv("TLS_KEY_FILE", "")

	return Config{
		Pop3Port:         pop3Port,
		ImapPort:         imapPort,
		EmailServiceURL:  emailServiceURL,
		UseTLS:           useTLS,
		TLSCertFile:      tlsCert,
		TLSKeyFile:       tlsKey,
	}
}
