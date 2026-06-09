package com.platform.email.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mailboxes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Mailbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String emailAddress;

    @Column(nullable = false)
    private String ownerId; // User reference from Identity Service

    @Column(nullable = false)
    private Long storageCapacityBytes;

    @Column(nullable = false)
    private Long storageUsedBytes;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private Boolean active;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.storageUsedBytes == null) {
            this.storageUsedBytes = 0L;
        }
        if (this.active == null) {
            this.active = true;
        }
    }
}
