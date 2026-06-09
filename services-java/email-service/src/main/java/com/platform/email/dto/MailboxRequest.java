package com.platform.email.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class MailboxRequest {

    @NotBlank(message = "Email address is required")
    @Email(message = "Format must be a valid email address")
    private String emailAddress;

    @NotBlank(message = "Owner identity ID is required")
    private String ownerId;

    @NotNull(message = "Capacity size limits is required")
    private Long storageCapacityBytes;
}
