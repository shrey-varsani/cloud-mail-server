package com.platform.email.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "folders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Folder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name; // e.g., "Inbox", "Sent", "Trash", "Spam", "Archive" or custom names

    @Column(nullable = false)
    private String type; // SYSTEM or USER_DEFINED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mailbox_id", nullable = false)
    private Mailbox mailbox;

    @Column(nullable = false)
    private Integer unreadCount;

    @Column(nullable = false)
    private Integer totalCount;

    @PrePersist
    protected void onCreate() {
        if (this.unreadCount == null) {
            this.unreadCount = 0;
        }
        if (this.totalCount == null) {
            this.totalCount = 0;
        }
        if (this.type == null) {
            this.type = "USER_DEFINED";
        }
    }
}
