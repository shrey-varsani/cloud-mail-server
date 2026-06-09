package com.platform.email.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class DraftDto {
    private Long id;
    private Long mailboxId;
    private String recipientsTo;
    private String recipientsCc;
    private String recipientsBcc;
    private String subject;
    private String body;
    private LocalDateTime lastModified;
}
