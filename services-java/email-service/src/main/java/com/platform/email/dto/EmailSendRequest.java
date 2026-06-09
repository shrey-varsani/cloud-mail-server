package com.platform.email.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

@Data
public class EmailSendRequest {

    @NotNull(message = "Mailbox identifier is required")
    private Long mailboxId;

    @NotBlank(message = "Sender address is required")
    @Email(message = "Sender must be valid email format")
    private String sender;

    @NotBlank(message = "Recipient addresses list is required")
    private String recipientsTo; // Comma separated

    private String recipientsCc; // Comma separated
    private String recipientsBcc; // Comma separated

    @NotBlank(message = "Email subject is required")
    private String subject;

    @NotBlank(message = "Email body text content is required")
    private String body;

    private Long folderId; // Optional, defaults to Inbox if not defined

    private List<Long> labelIds; // Optional labels association
}
