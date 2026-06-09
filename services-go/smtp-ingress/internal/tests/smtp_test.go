package tests

import (
	"bufio"
	"bytes"
	"encoding/base64"
	net "net"
	"strings"
	"testing"

	"services-go/smtp-ingress/internal/handlers"
	"services-go/smtp-ingress/internal/kafka"
)

type MockConn struct {
	net.Conn
	readBuf  bytes.Buffer
	writeBuf bytes.Buffer
}

func (m *MockConn) Read(b []byte) (n int, err error) {
	return m.readBuf.Read(b)
}

func (m *MockConn) Write(b []byte) (n int, err error) {
	return m.writeBuf.Write(b)
}

func (m *MockConn) Close() error {
	return nil
}

func (m *MockConn) RemoteAddr() net.Addr {
	return &net.IPAddr{IP: net.ParseIP("127.0.0.1")}
}

func TestSMTPSessionState(t *testing.T) {
	mockPub := kafka.NewMockPublisher("test.topic")
	mockAuth := handlers.NewSimpleAuthenticator()

	conn := &MockConn{}
	conn.readBuf.WriteString("EHLO localhost\r\n")
	conn.readBuf.WriteString("MAIL FROM:<test@example.com>\r\n")
	conn.readBuf.WriteString("RCPT TO:<recv@example.com>\r\n")
	conn.readBuf.WriteString("DATA\r\n")
	conn.readBuf.WriteString("Subject: Unit Testing Go SMTP\r\n")
	conn.readBuf.WriteString("Hello, this is a validated pipeline test.\r\n")
	conn.readBuf.WriteString(".\r\n")
	conn.readBuf.WriteString("QUIT\r\n")

	session := handlers.NewSession(conn, mockPub, mockAuth, false)
	session.Handle()

	output := conn.writeBuf.String()
	t.Logf("SMTP responses output:\n%s", output)

	// Verify sequential success confirmations in SMTP session pipeline
	if !strings.Contains(output, "220 ") {
		t.Errorf("Expected initial SMTP service banner.")
	}
	if !strings.Contains(output, "250-SIZE") {
		t.Errorf("Expected EHLO feature options enumeration.")
	}
	if !strings.Contains(output, "250 2.1.0 Sender verification complete") {
		t.Errorf("Expected sender registration validation success.")
	}
	if !strings.Contains(output, "250 2.1.5 Recipient verification successful") {
		t.Errorf("Expected recipient verification success.")
	}
	if !strings.Contains(output, "354 Start mail input") {
		t.Errorf("Expected DATA buffer input invitation status.")
	}
	if !strings.Contains(output, "2.0.0 Queue OK ID") {
		t.Errorf("Expected DATA mail body terminal enqueue success.")
	}
}

func TestSMTPAuthModule(t *testing.T) {
	auth := handlers.NewSimpleAuthenticator()

	// Base64 of "\x00shreyvarsani16@gmail.com\x00admin123"
	// Let's build the auth payload: 0 + user + 0 + pass
	raw := []byte{0}
	raw = append(raw, []byte("shreyvarsani16@gmail.com")...)
	raw = append(raw, 0)
	raw = append(raw, []byte("admin123")...)
	encodedPayload := func() string {
		var buf bytes.Buffer
		w := bufio.NewWriter(&buf)
		encoder := base64.NewEncoder(base64.StdEncoding, w)
		encoder.Write(raw)
		encoder.Close()
		w.Flush()
		return buf.String()
	}()

	user, err := auth.Authenticate("PLAIN", encodedPayload)
	if err != nil {
		t.Fatalf("SimpleAuthenticator failed on valid credentials comparison: %v", err)
	}

	if user != "shreyvarsani16@gmail.com" {
		t.Errorf("Expected user back: shreyvarsani16@gmail.com, got %s", user)
	}
}
