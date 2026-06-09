package handlers

import (
	"bufio"
	"fmt"
	"log"
	"net"
	"regexp"
	"strings"
	"time"

	"services-go/smtp-ingress/internal/kafka"
	sharedmodels "services-go/shared-library/models"
)

var (
	mailFromRegex = regexp.MustCompile(`(?i)^MAIL\s+FROM:\s*<([^>]+)>`)
	rcptToRegex   = regexp.MustCompile(`(?i)^RCPT\s+TO:\s*<([^>]+)>`)
)

// Session represents an active TCP SMTP connection with state tracking.
type Session struct {
	conn         net.Conn
	reader       *bufio.Reader
	writer       *bufio.Writer
	state        string // "INIT", "HELO", "MAIL", "RCPT", "DATA"
	heloName     string
	mailFrom     string
	rcptTo       []string
	bodyData     strings.Builder
	publisher    kafka.Publisher
	authProvider Authenticator
	isTLS        bool
	clientIP     string
}

// NewSession creates an initialized SMTP session mapped directly to a client net.Conn.
func NewSession(conn net.Conn, p kafka.Publisher, auth Authenticator, isTLS bool) *Session {
	return &Session{
		conn:         conn,
		reader:       bufio.NewReader(conn),
		writer:       bufio.NewWriter(conn),
		state:        "INIT",
		rcptTo:       make([]string, 0),
		publisher:    p,
		authProvider: auth,
		isTLS:        isTLS,
		clientIP:     conn.RemoteAddr().String(),
	}
}

// Handle runs the main operational loop of the transaction, reading and parsing command by command.
func (s *Session) Handle() {
	defer s.conn.Close()

	// Write Banner Greeting
	s.writeResponse(220, "cloudplatform.identity.smtp ESMTP Secure Ingress Ingestion Server ready")

	for {
		line, err := s.reader.ReadString('\n')
		if err != nil {
			log.Printf("[SMTP SESSION] Finished processing or disconnected from client %s: %v", s.clientIP, err)
			return
		}

		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Quit or Command Routing
		if strings.ToUpper(line) == "QUIT" {
			s.writeResponse(221, "2.0.0 Service closing transmission channel")
			return
		}

		s.processCommand(line)
	}
}

func (s *Session) writeResponse(code int, text string) {
	resp := fmt.Sprintf("%d %s\r\n", code, text)
	s.writer.WriteString(resp)
	s.writer.Flush()
}

func (s *Session) processCommand(line string) {
	parts := strings.Fields(line)
	if len(parts) == 0 {
		s.writeResponse(500, "5.5.2 Syntax error, empty command line")
		return
	}

	command := strings.ToUpper(parts[0])

	switch command {
	case "HELO":
		if len(parts) < 2 {
			s.writeResponse(501, "5.5.4 Syntax: HELO hostname")
			return
		}
		s.heloName = parts[1]
		s.state = "HELO"
		s.mailFrom = ""
		s.rcptTo = nil
		s.writeResponse(250, fmt.Sprintf("cloudplatform.identity.smtp Hello %s, pleased to meet you", s.heloName))

	case "EHLO":
		if len(parts) < 2 {
			s.writeResponse(501, "5.5.4 Syntax: EHLO hostname")
			return
		}
		s.heloName = parts[1]
		s.state = "HELO"
		s.mailFrom = ""
		s.rcptTo = nil
		
		// Send standard EHLO multi-line extensions (TLS capabilities advertise, AUTH PLAIN formats)
		s.writer.WriteString("250-cloudplatform.identity.smtp Hello " + s.heloName + "\r\n")
		s.writer.WriteString("250-SIZE 10485760\r\n") // 10MB size restriction
		s.writer.WriteString("250-8BITMIME\r\n")
		s.writer.WriteString("250-STARTTLS\r\n")
		s.writer.WriteString("250 AUTH PLAIN\r\n")
		s.writer.Flush()

	case "STARTTLS":
		s.writeResponse(502, "STARTTLS is automatically active when wrapping listener in TLS connections")

	case "AUTH":
		if len(parts) < 2 {
			s.writeResponse(501, "Syntax: AUTH mechanism [initial-response]")
			return
		}
		mechanism := parts[1]
		if strings.ToUpper(mechanism) != "PLAIN" {
			s.writeResponse(504, "Unrecognized authentication mechanism")
			return
		}
		
		var response string
		if len(parts) >= 3 {
			response = parts[2]
		} else {
			s.writeResponse(334, "Proceed with base64 credentials challenge")
			respLine, err := s.reader.ReadString('\n')
			if err != nil {
				return
			}
			response = strings.TrimSpace(respLine)
		}

		user, err := s.authProvider.Authenticate(mechanism, response)
		if err != nil {
			s.writeResponse(535, "5.7.8 Authentication credentials invalid: "+err.Error())
			return
		}

		s.writeResponse(235, "2.7.0 Authentication succeeded. Mail routing open for user "+user)

	case "MAIL":
		matches := mailFromRegex.FindStringSubmatch(line)
		if len(matches) < 2 {
			s.writeResponse(501, "Syntax error in parameters. Syntax: MAIL FROM:<sender@address>")
			return
		}
		s.mailFrom = matches[1]
		s.state = "MAIL"
		s.rcptTo = s.rcptTo[:0] // Flush recipients
		s.writeResponse(250, "2.1.0 Sender verification complete: <"+s.mailFrom+"> OK")

	case "RCPT":
		if s.state != "MAIL" && s.state != "RCPT" {
			s.writeResponse(503, "Bad sequence of commands. Declare MAIL FROM first")
			return
		}
		matches := rcptToRegex.FindStringSubmatch(line)
		if len(matches) < 2 {
			s.writeResponse(501, "Syntax error in parameters. Syntax: RCPT TO:<recipient@address>")
			return
		}
		recipient := matches[1]
		s.rcptTo = append(s.rcptTo, recipient)
		s.state = "RCPT"
		s.writeResponse(250, "2.1.5 Recipient verification successful: <"+recipient+"> OK")

	case "DATA":
		if s.state != "RCPT" {
			s.writeResponse(503, "Bad sequence of commands. RCPT TO address arguments required")
			return
		}

		s.writeResponse(354, "Start mail input; end with <CR><LF>.<CR><LF>")
		s.readMailBody()

	case "RSET":
		s.mailFrom = ""
		s.rcptTo = s.rcptTo[:0]
		s.bodyData.Reset()
		s.state = "HELO"
		s.writeResponse(250, "2.0.0 Reset state command successful")

	case "NOOP":
		s.writeResponse(250, "2.0.0 Command successfully completed (Noop)")

	default:
		s.writeResponse(502, "5.5.1 Command unrecognized or not implemented")
	}
}

func (s *Session) readMailBody() {
	s.bodyData.Reset()
	subject := "No Subject"

	for {
		line, err := s.reader.ReadString('\n')
		if err != nil {
			log.Printf("[SMTP SESSION] Reader breakdown with connection %s, purging DATA: %v", s.clientIP, err)
			s.writeResponse(451, "Requested action aborted: local reading thread breakdown")
			return
		}

		// Check for SMTP double blank line escape/indicator: \r\n.\r\n
		trimmed := strings.TrimRight(line, "\r\n")
		if trimmed == "." {
			break
		}

		// Strip leading dot escape
		if strings.HasPrefix(trimmed, "..") {
			trimmed = trimmed[1:]
		}

		// Scan simple subject headers
		if strings.HasPrefix(strings.ToLower(trimmed), "subject:") {
			subject = strings.TrimSpace(trimmed[8:])
		}

		if s.bodyData.Len() < 10485760 { // Prevent resource allocations exhaustions
			s.bodyData.WriteString(trimmed + "\n")
		}
	}

	// Dynamic MIME ID generation
	messageID := fmt.Sprintf("%d-%s@cloudplatform.identity.smtp", time.Now().UnixNano(), s.heloName)

	// Emit Event telemetry pipeline structures
	event := &sharedmodels.EmailEvent{
		MessageID:   messageID,
		Sender:      s.mailFrom,
		Recipients:  s.rcptTo,
		Size:        s.bodyData.Len(),
		Subject:     subject,
		ReceivedAt:  time.Now(),
		IsTLS:       s.isTLS,
		ClientIP:    s.clientIP,
		BodySummary: truncateString(s.bodyData.String(), 200),
	}

	// Dispatch to broker topics
	if err := s.publisher.PublishIncomingEmail(event); err != nil {
		log.Printf("[SMTP ERROR] Failed emitting transaction event for message ID %s: %v", messageID, err)
		s.writeResponse(451, "Data temporary rejected. Messaging queue offline bounds.")
		return
	}

	s.writeResponse(250, "2.0.0 Queue OK ID "+messageID)
	
	// Reset State Context Post Transmit
	s.state = "HELO"
	s.mailFrom = ""
	s.rcptTo = s.rcptTo[:0]
	s.bodyData.Reset()
}

func truncateString(s string, limit int) string {
	if len(s) <= limit {
		return s
	}
	return s[:limit] + "..."
}
