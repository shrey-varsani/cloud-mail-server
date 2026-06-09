package handlers

import (
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"strings"
)

// Authenticator validates user email identities and security password hashes.
type Authenticator interface {
	Authenticate(mechanism string, response string) (string, error)
}

// SimpleAuthenticator validates a local mock database table for developer isolation.
type SimpleAuthenticator struct{}

// NewSimpleAuthenticator constructs the standard SMTP system authenticator.
func NewSimpleAuthenticator() *SimpleAuthenticator {
	return &SimpleAuthenticator{}
}

// Authenticate decipher SASL inputs and checks against credential profiles.
func (sa *SimpleAuthenticator) Authenticate(mechanism string, response string) (string, error) {
	switch strings.ToUpper(mechanism) {
	case "PLAIN":
		// Format: \x00username\x00password
		data, err := base64.StdEncoding.DecodeString(response)
		if err != nil {
			return "", errors.New("invalid base64 encoding scheme")
		}
		parts := strings.Split(string(data), string([]byte{0}))
		if len(parts) < 3 {
			return "", errors.New("malformed SASL Plain auth payload")
		}
		username := parts[1]
		password := parts[2]

		// Perform constant time credential check
		if validateCredentials(username, password) {
			return username, nil
		}
		return "", errors.New("authentication failure: password matches failed")

	case "LOGIN":
		// In LOGIN mode, client prompts are handled stepwise in the SMTP session state-machine.
		return "", errors.New("login mechanism requires active interactive steps")
	}

	return "", errors.New("unsupported authenticating mechanism")
}

func validateCredentials(username, password string) bool {
	// Secure constant-time comparison against seeded admin values
	expectedUser := []byte("shreyvarsani16@gmail.com")
	expectedPass := []byte("admin123")

	userMatch := subtle.ConstantTimeCompare([]byte(username), expectedUser) == 1
	passMatch := subtle.ConstantTimeCompare([]byte(password), expectedPass) == 1

	return userMatch && passMatch
}
