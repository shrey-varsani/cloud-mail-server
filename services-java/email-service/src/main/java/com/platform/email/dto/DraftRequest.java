package com.platform.email.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DraftRequest {

    @NotNull(message = "Mailbox identifier is required")
    private Long mailboxId;

    private String recipientsTo;
    private String recipientsCc;
    private String recipientsBcc;
    private String subject;
    private String body;
}
