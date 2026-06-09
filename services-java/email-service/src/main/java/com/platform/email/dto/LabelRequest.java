package com.platform.email.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class LabelRequest {

    @NotBlank(message = "Label name is required")
    private String name;

    @NotBlank(message = "Hex coloration string is required")
    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Must be a valid 6-character hex color (e.g., #FFFFFF)")
    private String colorHex;

    @NotNull(message = "Mailbox identifier is required")
    private Long mailboxId;
}
