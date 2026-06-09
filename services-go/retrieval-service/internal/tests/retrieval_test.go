package tests

import (
	"bufio"
	"fmt"
	"net"
	"strings"
	"testing"
	"time"

	"services-go/retrieval-service/internal/config"
	"services-go/retrieval-service/internal/handlers"
	"services-go/retrieval-service/internal/repositories"
)

func TestRetrievalServers(t *testing.T) {
	// 1. Initial configuration set (on custom testing ports free of bounds conflicts)
	cfg := config.Config{
		Pop3Port:        "19110",
		ImapPort:        "19143",
		EmailServiceURL: "http://mock-offline-backend",
		UseTLS:          false,
	}

	// 2. Instantiate backend client (mock adapters automatically active)
	bc := repositories.NewBackendClient(cfg.EmailServiceURL)

	// 3. Start servers
	pop3Srv := handlers.NewPOP3Server(cfg, bc)
	if err := pop3Srv.Start(); err != nil {
		t.Fatalf("Failed starting testing POP3 Server: %v", err)
	}
	defer pop3Srv.Stop()

	imapSrv := handlers.NewIMAPServer(cfg, bc)
	if err := imapSrv.Start(); err != nil {
		t.Fatalf("Failed starting testing IMAP Server: %v", err)
	}
	defer imapSrv.Stop()

	// Give a tiny buffer for TCP listener binds
	time.Sleep(100 * time.Millisecond)

	// 4. Test POP3 State Machine via net.Dial socket
	t.Run("POP3 Protocol State Check", func(t *testing.T) {
		conn, err := net.Dial("tcp", "127.0.0.1:19110")
		if err != nil {
			t.Fatalf("POP3 TCP Connection failure: %v", err)
		}
		defer conn.Close()

		reader := bufio.NewReader(conn)

		// Read welcome slogan banner
		welcome, _ := reader.ReadString('\n')
		if !strings.HasPrefix(welcome, "+OK") {
			t.Errorf("Unexpected POP3 welcome response: %s", welcome)
		}

		// USER authentication
		fmt.Fprintf(conn, "USER test@example.com\r\n")
		resp, _ := reader.ReadString('\n')
		if !strings.HasPrefix(resp, "+OK") {
			t.Errorf("Unexpected USER response: %s", resp)
		}

		// PASS authentication
		fmt.Fprintf(conn, "PASS secret\r\n")
		resp, _ = reader.ReadString('\n')
		if !strings.HasPrefix(resp, "+OK") {
			t.Errorf("Unexpected PASS response: %s", resp)
		}

		// STAT check
		fmt.Fprintf(conn, "STAT\r\n")
		resp, _ = reader.ReadString('\n')
		if !strings.HasPrefix(resp, "+OK") {
			t.Errorf("Unexpected STAT metrics response: %s", resp)
		}

		// QUIT connection
		fmt.Fprintf(conn, "QUIT\r\n")
		resp, _ = reader.ReadString('\n')
		if !strings.HasPrefix(resp, "+OK") {
			t.Errorf("Unexpected QUIT checkout response: %s", resp)
		}
	})

	// 5. Test IMAP State Machine via net.Dial socket
	t.Run("IMAP Protocol State Check", func(t *testing.T) {
		conn, err := net.Dial("tcp", "127.0.0.1:19143")
		if err != nil {
			t.Fatalf("IMAP TCP Dial failure: %v", err)
		}
		defer conn.Close()

		reader := bufio.NewReader(conn)

		// Welcome banner line
		welcome, _ := reader.ReadString('\n')
		if !strings.HasPrefix(welcome, "* OK") {
			t.Errorf("Unexpected IMAP welcome header: %s", welcome)
		}

		// CAPABILITY checking
		fmt.Fprintf(conn, "A001 CAPABILITY\r\n")
		
		// Loop untagged lines until tagged OK arrives
		for {
			line, _ := reader.ReadString('\n')
			if strings.HasPrefix(line, "A001 OK") {
				break
			}
		}

		// LOGIN execution
		fmt.Fprintf(conn, "A002 LOGIN test@example.com secretPassword\r\n")
		for {
			line, _ := reader.ReadString('\n')
			if strings.HasPrefix(line, "A002 OK") {
				break
			} else if strings.HasPrefix(line, "A002 NO") || strings.HasPrefix(line, "A002 BAD") {
				t.Fatalf("IMAP LOGIN failed unexpectedly: %s", line)
			}
		}

		// SELECT folder Checking
		fmt.Fprintf(conn, "A003 SELECT INBOX\r\n")
		for {
			line, _ := reader.ReadString('\n')
			if strings.HasPrefix(line, "A003 OK") {
				break
			}
		}

		// LOGOUT gracefully
		fmt.Fprintf(conn, "A004 LOGOUT\r\n")
		for {
			line, _ := reader.ReadString('\n')
			if strings.HasPrefix(line, "A004 OK") {
				break
			}
		}
	})
}
