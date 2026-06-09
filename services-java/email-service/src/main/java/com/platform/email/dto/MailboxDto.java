package com.platform.email.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class MailboxDto {
    private Long id;
    private String emailAddress;
    private String ownerId;
    private Long storageCapacityBytes;
    private Long storageUsedBytes;
    private LocalDateTime createdAt;
    private Boolean active;
}
