package com.platform.email.repository;

import com.platform.email.entity.Email;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EmailRepository extends JpaRepository<Email, Long> {
    Page<Email> findByFolderId(Long folderId, Pageable pageable);
    Page<Email> findByMailboxId(Long mailboxId, Pageable pageable);

    @Query("SELECT e FROM Email e JOIN e.labels l WHERE l.id = :labelId")
    Page<Email> findByLabelId(@Param("labelId") Long labelId, Pageable pageable);
}
