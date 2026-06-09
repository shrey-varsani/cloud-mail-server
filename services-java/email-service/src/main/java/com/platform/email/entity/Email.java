package com.platform.email.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "emails")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Email {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mailbox_id", nullable = false)
    private Mailbox mailbox;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id", nullable = false)
    private Folder folder;

    @Column(nullable = false)
    private String sender; // e.g. "shreyvarsani16@gmail.com"

    @Column(name = "recipients_to", columnDefinition = "TEXT", nullable = false)
    private String recipientsTo; // Comma separated list of "to" addresses

    @Column(name = "recipients_cc", columnDefinition = "TEXT")
    private String recipientsCc; // Comma separated list of "cc" addresses

    @Column(name = "recipients_bcc", columnDefinition = "TEXT")
    private String recipientsBcc; // Comma separated list of "bcc" addresses

    @Column(nullable = false)
    private String subject;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String body;

    @Column(nullable = false)
    private Long sizeInBytes;

    @Column(nullable = false)
    private Boolean isRead;

    @Column(nullable = false)
    private Boolean isStarred;

    @Column(nullable = false)
    private LocalDateTime receivedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "email_labels",
        joinColumns = @JoinColumn(name = "email_id"),
        inverseJoinColumns = @JoinColumn(name = "label_id")
    )
    @Builder.Default
    private Set<Label> labels = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        this.receivedAt = LocalDateTime.now();
        if (this.isRead == null) {
            this.isRead = false;
        }
        if (this.isStarred == null) {
            this.isStarred = false;
        }
        if (this.sizeInBytes == null) {
            // estimate size based on strings length
            long runningSize = sender.length() + recipientsTo.length();
            if (recipientsCc != null) runningSize += recipientsCc.length();
            if (recipientsBcc != null) runningSize += recipientsBcc.length();
            if (subject != null) runningSize += subject.length();
            if (body != null) runningSize += body.length();
            this.sizeInBytes = Math.max(100L, runningSize);
        }
    }
}
