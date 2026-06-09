package com.platform.email.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
public class EmailDto {
    private Long id;
    private Long mailboxId;
    private Long folderId;
    private String sender;
    private String recipientsTo;
    private String recipientsCc;
    private String recipientsBcc;
    private String subject;
    private String body;
    private Long sizeInBytes;
    private Boolean isRead;
    private Boolean isStarred;
    private LocalDateTime receivedAt;
    private Set<LabelDto> labels;
}
