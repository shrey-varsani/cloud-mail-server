package services

import (
	"context"
	"log"
	"sync"
	"time"

	"services-go/enterprise-service/internal/models"
)

type KafkaMockProducer interface {
	PublishRawEmail(ctx context.Context, emailID string, sender string, rec []string, subject string, body string) error
}

type Scheduler struct {
	mu        sync.RWMutex
	scheduled map[string]*models.ScheduledEmail
	producer  KafkaMockProducer
	interval  time.Duration
}

func NewScheduler(prod KafkaMockProducer, intervalS int) *Scheduler {
	return &Scheduler{
		scheduled: make(map[string]*models.ScheduledEmail),
		producer:  prod,
		interval:  time.Duration(intervalS) * time.Second,
	}
}

func (s *Scheduler) AddScheduledEmail(e models.ScheduledEmail) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e.Status = "PENDING"
	s.scheduled[e.ID] = &e
	log.Printf("[SCHEDULER] Registered email %s to go out at %s to: %v", e.ID, e.SendAt.Format(time.RFC3339), e.Recipients)
}

func (s *Scheduler) GetScheduledEmail(id string) (models.ScheduledEmail, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	email, ok := s.scheduled[id]
	if !ok {
		return models.ScheduledEmail{}, false
	}
	return *email, true
}

func (s *Scheduler) ListScheduled() []models.ScheduledEmail {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := make([]models.ScheduledEmail, 0, len(s.scheduled))
	for _, email := range s.scheduled {
		list = append(list, *email)
	}
	return list
}

func (s *Scheduler) Start(ctx context.Context) {
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	log.Printf("[SCHEDULER] Starting scheduled email dispatcher loop (Interval: %v)...", s.interval)

	for {
		select {
		case <-ctx.Done():
			log.Println("[SCHEDULER] Shutting down email scheduler dispatcher worker loop.")
			return
		case <-ticker.C:
			s.dispatchPending(ctx)
		}
	}
}

func (s *Scheduler) dispatchPending(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	for _, e := range s.scheduled {
		if e.Status == "PENDING" && now.After(e.SendAt) {
			log.Printf("[SCHEDULER] Delivering pending scheduled email %s to Kafka topic context: %s", e.ID, e.Subject)
			e.Status = "DISPATCHING"

			go func(item *models.ScheduledEmail) {
				err := s.producer.PublishRawEmail(ctx, item.ID, item.Sender, item.Recipients, item.Subject, item.Body)
				s.mu.Lock()
				defer s.mu.Unlock()
				if err != nil {
					log.Printf("[SCHEDULER-ERROR] Delivery of %s failed: %v. Retrying.", item.ID, err)
					item.Status = "PENDING"
					item.RetryCount++
					if item.RetryCount > 3 {
						item.Status = "FAILED"
						item.FailureReason = "Max retry thresholds exceeded."
					}
				} else {
					log.Printf("[SCHEDULER-SUCCESS] Email %s sent successfully to Kafka routing index.", item.ID)
					item.Status = "SENT"
				}
			}(e)
		}
	}
}
