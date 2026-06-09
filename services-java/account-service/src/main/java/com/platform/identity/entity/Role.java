package com.platform.identity.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@RequiredArgsConstructor
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false, unique = true)
    @NonNull
    private RoleEnum name;

    public enum RoleEnum {
        ROLE_USER,
        ROLE_MODERATOR,
        ROLE_ADMIN
    }
}
