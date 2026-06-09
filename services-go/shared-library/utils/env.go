package utils

import "os"

// GetEnv retrieves the environment variable, returning a default value if missing.
func GetEnv(key, defaultVal string) string {
	if val, exists := os.LookupEnv(key); exists {
		return val
	}
	return defaultVal
}
