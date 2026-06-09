package com.platform.email.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class FolderRequest {

    @NotBlank(message = "Folder name is required")
    private String name;

    @NotNull(message = "Mailbox identifier is required")
    private Long mailboxId;
}
