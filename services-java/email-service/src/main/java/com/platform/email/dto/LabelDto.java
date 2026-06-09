package com.platform.email.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LabelDto {
    private Long id;
    private String name;
    private String colorHex;
    private Long mailboxId;
}
