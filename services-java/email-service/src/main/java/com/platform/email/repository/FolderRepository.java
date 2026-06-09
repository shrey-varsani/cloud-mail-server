package com.platform.email.repository;

import com.platform.email.entity.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findByMailboxId(Long mailboxId);
    Optional<Folder> findByMailboxIdAndName(Long mailboxId, String name);
}
