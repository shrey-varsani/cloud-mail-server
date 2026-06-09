package com.platform.email.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FolderDto {
    private Long id;
    private String name;
    private String type;
    private Long mailboxId;
    private Integer unreadCount;
    private Integer totalCount;
}
