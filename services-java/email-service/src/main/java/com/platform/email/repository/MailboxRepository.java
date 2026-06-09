package com.platform.email.repository;

import com.platform.email.entity.Mailbox;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface MailboxRepository extends JpaRepository<Mailbox, Long> {
    Optional<Mailbox> findByEmailAddress(String emailAddress);
    List<Mailbox> findByOwnerId(String ownerId);
}
