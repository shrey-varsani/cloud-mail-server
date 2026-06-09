package services

import (
	"log"
	"net"
	"strings"

	"services-go/security-and-search-service/internal/models"
)

type SpamAnalyzer struct {
	spamThreshold float64
}

func NewSpamAnalyzer(threshold float64) *SpamAnalyzer {
	return &SpamAnalyzer{
		spamThreshold: threshold,
	}
}

func (sa *SpamAnalyzer) AnalyzeEmail(email models.Email) models.SecurityAudit {
	var audit models.SecurityAudit
	audit.AuditTriggers = make([]string, 0)

	fromDomain := extractDomain(email.Sender)
	audit.SPFDomain = fromDomain
	audit.DKIMDomain = fromDomain

	spfResult := sa.verifySPF(email, fromDomain)
	audit.SPFResult = spfResult
	if spfResult == "FAIL" {
		audit.AuditTriggers = append(audit.AuditTriggers, "SPF_RANGES_UNAUTHORIZED")
	} else if spfResult == "NONE" {
		audit.AuditTriggers = append(audit.AuditTriggers, "NO_SPF_DNS_RECORD")
	}

	dkimResult, dkimSigDom := sa.verifyDKIM(email)
	audit.DKIMResult = dkimResult
	if dkimSigDom != "" {
		audit.DKIMDomain = dkimSigDom
	}
	if dkimResult == "FAIL" {
		audit.AuditTriggers = append(audit.AuditTriggers, "DKIM_SIGNATURE_INVALID")
	} else if dkimResult == "NONE" {
		audit.AuditTriggers = append(audit.AuditTriggers, "DKIM_SIGNATURE_MISSING")
	}

	dmarcResult, aligned := sa.verifyDMARC(fromDomain, spfResult, dkimResult, dkimSigDom)
	audit.DMARCResult = dmarcResult
	audit.DMARCAligned = aligned
	if !aligned {
		audit.AuditTriggers = append(audit.AuditTriggers, "DMARC_ALIGNMENT_FAILURE")
	}

	spamKeywordsScore, triggeredKeywords := sa.scanTextPatterns(email.Subject, email.Body)
	audit.AuditTriggers = append(audit.AuditTriggers, triggeredKeywords...)

	score := 0.0

	if spfResult == "FAIL" {
		score += 3.0
	} else if spfResult == "NONE" {
		score += 1.0
	}

	if dkimResult == "FAIL" {
		score += 2.5
	} else if dkimResult == "NONE" {
		score += 1.5
	}

	if !aligned {
		score += 1.5
	}

	if email.ClientIP == "127.0.0.1" || email.ClientIP == "" {
	} else if strings.HasPrefix(email.ClientIP, "192.168.") {
	} else {
		score += 0.5
	}

	score += spamKeywordsScore

	if score > 10.0 {
		score = 10.0
	}
	audit.SpamScore = score
	audit.IsSpam = score >= sa.spamThreshold

	log.Printf("[SECURITY SCANNED] Sender: %s, SPF: %s, DKIM: %s, DMARC: %s, Score: %.2f, Spam: %t",
		email.Sender, spfResult, dkimResult, dmarcResult, score, audit.IsSpam)

	return audit
}

func (sa *SpamAnalyzer) verifySPF(email models.Email, domain string) string {
	if rawSpf, has := email.Headers["received-spf"]; has {
		rawSpf = strings.ToUpper(rawSpf)
		if strings.Contains(rawSpf, "PASS") {
			return "PASS"
		} else if strings.Contains(rawSpf, "FAIL") {
			return "FAIL"
		}
	}

	if domain == "" {
		return "NONE"
	}

	txtRecords, err := net.LookupTXT(domain)
	if err != nil {
		return simulateSPFOnDomainFallback(domain)
	}

	hasSPF := false
	for _, record := range txtRecords {
		if strings.HasPrefix(strings.TrimSpace(record), "v=spf1") {
			hasSPF = true
			if strings.Contains(record, "-all") || strings.Contains(record, "~all") {
				return "PASS"
			}
		}
	}

	if hasSPF {
		return "PASS"
	}
	return "NONE"
}

func (sa *SpamAnalyzer) verifyDKIM(email models.Email) (string, string) {
	dkimHeader, found := email.Headers["dkim-signature"]
	if !found {
		for k, v := range email.Headers {
			if strings.EqualFold(k, "dkim-signature") {
				dkimHeader = v
				found = true
				break
			}
		}
	}

	if !found {
		return "NONE", ""
	}

	tags := parseDKIMTags(dkimHeader)
	domainSigner := tags["d"]
	selector := tags["s"]

	if domainSigner == "" || selector == "" {
		return "FAIL", ""
	}

	if _, ok := tags["b"]; !ok {
		return "FAIL", domainSigner
	}

	return "PASS", domainSigner
}

func (sa *SpamAnalyzer) verifyDMARC(fromDomain, spfRes, dkimRes, dkimDomain string) (string, bool) {
	if fromDomain == "" {
		return "NONE", false
	}

	spfAligned := strings.EqualFold(fromDomain, dkimDomain)
	dkimAligned := strings.EqualFold(fromDomain, dkimDomain)
	aligned := spfAligned || dkimAligned

	p := "none"
	txtDmarc, err := net.LookupTXT("_dmarc." + fromDomain)
	if err == nil {
		for _, rec := range txtDmarc {
			if strings.Contains(rec, "v=DMARC1") {
				if strings.Contains(rec, "p=reject") {
					p = "reject"
				} else if strings.Contains(rec, "p=quarantine") {
					p = "quarantine"
				}
				break
			}
		}
	}

	if aligned && (spfRes == "PASS" || dkimRes == "PASS") {
		return "PASS", true
	}

	if p == "reject" || p == "quarantine" {
		return "FAIL", aligned
	}

	return "NONE", aligned
}

func (sa *SpamAnalyzer) scanTextPatterns(subj, body string) (float64, []string) {
	score := 0.0
	triggers := make([]string, 0)

	subjLower := strings.ToLower(subj)
	bodyLower := strings.ToLower(body)

	heavyMatches := map[string]float64{
		"viagra":             3.0,
		"lottery":            2.5,
		"winner":             2.0,
		"earn cash":          2.5,
		"rich quick":         3.0,
		"weight loss":        1.5,
		"crypto moon":        2.0,
		"credit card bill":   1.5,
		"millions of dollar": 3.0,
		"account suspended":  1.5,
		"act now":            1.0,
		"free gift":          2.0,
	}

	foundSubj := false
	for term, weight := range heavyMatches {
		if strings.Contains(subjLower, term) {
			score += weight
			if !foundSubj {
				triggers = append(triggers, "SPAMMY_SUBJECT_TERMS")
				foundSubj = true
			}
		}
	}

	badBodyTerms := []string{
		"urgent attention", "bitcoin premium", "wire transfer",
		"reset password immediately", "no credit check", "pharmaceutical online",
	}

	foundBody := false
	for _, term := range badBodyTerms {
		if strings.Contains(bodyLower, term) {
			score += 1.5
			if !foundBody {
				triggers = append(triggers, "SPAMMY_BODY_PATTERNS")
				foundBody = true
			}
		}
	}

	sketchyTLDs := []string{".xyz", ".club", ".click", ".win", ".space"}
	foundLink := false
	for _, tld := range sketchyTLDs {
		if strings.Contains(bodyLower, tld+"/") || strings.Contains(bodyLower, tld+" ") {
			score += 2.0
			if !foundLink {
				triggers = append(triggers, "UNTRUSTED_TLD_LINKS")
				foundLink = true
			}
		}
	}

	if len(subj) > 5 && subj == strings.ToUpper(subj) {
		score += 1.5
		triggers = append(triggers, "ALL_CAPS_SUBJECT")
	}

	return score, triggers
}

func extractDomain(emailAddr string) string {
	parts := strings.Split(emailAddr, "@")
	if len(parts) == 2 {
		return strings.TrimSpace(parts[1])
	}
	return ""
}

func parseDKIMTags(headerVal string) map[string]string {
	tags := make(map[string]string)
	elements := strings.Split(headerVal, ";")
	for _, elem := range elements {
		parts := strings.SplitN(strings.TrimSpace(elem), "=", 2)
		if len(parts) == 2 {
			tags[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
		}
	}
	return tags
}

func simulateSPFOnDomainFallback(domain string) string {
	domain = strings.ToLower(domain)
	knownBadDomains := []string{"spam.com", "phishmail.net", "scamartist.xyz", "tempmail.club"}
	for _, bad := range knownBadDomains {
		if strings.Contains(domain, bad) {
			return "FAIL"
		}
	}

	knownGoodDomains := []string{"gmail.com", "yahoo.com", "outlook.com", "google.com", "stripe.com", "github.com"}
	for _, good := range knownGoodDomains {
		if strings.Contains(domain, good) {
			return "PASS"
		}
	}

	if domain == "localhost" || domain == "" {
		return "NONE"
	}
	return "PASS"
}
