package com.platform.email.repository;

import com.platform.email.entity.Draft;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DraftRepository extends JpaRepository<Draft, Long> {
    Page<Draft> findByMailboxId(Long mailboxId, Pageable pageable);
}
