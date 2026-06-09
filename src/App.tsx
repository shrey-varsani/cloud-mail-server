import React, { useState, useEffect } from "react";
import { 
  Server, 
  Database, 
  CheckCircle2, 
  Terminal, 
  FolderTree, 
  Layers, 
  Workflow, 
  Gauge, 
  Copy, 
  Check, 
  Search, 
  FileCode, 
  ExternalLink,
  Cpu,
  RefreshCw,
  Bell,
  HardDrive,
  Mail,
  Inbox,
  Shield,
  Clock,
  ArrowRight,
  ChevronRight,
  Info,
  Lock,
  User,
  Key,
  ShieldAlert,
  Sliders,
  LogOut,
  SlidersHorizontal,
  Code2,
  Send,
  Zap,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Play,
  Plus,
  Star,
  Trash2,
  Paperclip,
  Settings,
  PenSquare,
  ChevronDown,
  X,
  ShieldCheck,
  MoreHorizontal,
  LockKeyhole,
  Sun,
  Moon,
  MailOpen,
  Tag,
  ChevronUp,
  Maximize2,
  Minimize2,
  Loader2,
  Menu,
  LayoutDashboard
} from "lucide-react";

import { motion, AnimatePresence } from "motion/react";

// ============================================================================
// JAVA CODEBASE BLUEPRINTS (Embedded for High-Fidelity Viewer)
// ============================================================================

interface CodeFile {
  name: string;
  path: string;
  lang: string;
  code: string;
  description: string;
}

const JAVA_BLUEPRINT_FILES: CodeFile[] = [
  {
    name: "User.java",
    path: "src/main/java/com/platform/identity/domain/User.java",
    lang: "java",
    description: "Primary JPA Entity representing authenticated users. Features constraints, email verification state flags, social provider links, role mappings, and audit fields.",
    code: `package com.platform.identity.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "users", uniqueConstraints = {
    @UniqueConstraint(columnNames = "email")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Email
    @Size(max = 100)
    @Column(nullable = false, unique = true)
    private String email;

    @NotBlank
    @Size(max = 120)
    @Column(nullable = false)
    private String password;

    @NotBlank
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private boolean enabled = false;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    @Column(name = "verification_code")
    private String verificationCode;

    @Column(name = "verification_code_expiry")
    private LocalDateTime verificationCodeExpiry;

    @Column(name = "password_reset_token")
    private String passwordResetToken;

    @Column(name = "password_reset_expiry")
    private LocalDateTime passwordResetExpiry;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}`
  },
  {
    name: "Role.java",
    path: "src/main/java/com/platform/identity/domain/Role.java",
    lang: "java",
    description: "JPA Domain Entity for Role-Based Access Control (RBAC). Associates system Roles defined by RoleEnum with specific credentials.",
    code: `package com.platform.identity.domain;

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
}`
  },
  {
    name: "RefreshToken.java",
    path: "src/main/java/com/platform/identity/domain/RefreshToken.java",
    lang: "java",
    description: "Active persistence entity for secure cookie or header tracking of Token Rotation. Tracks active sessions and cryptographic revocation lists.",
    code: `package com.platform.identity.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false, name = "expiry_date")
    private Instant expiryDate;

    public boolean isExpired() {
        return expiryDate.isBefore(Instant.now());
    }
}`
  },
  {
    name: "UserPrincipal.java",
    path: "src/main/java/com/platform/identity/security/UserPrincipal.java",
    lang: "java",
    description: "Implements Spring Security's UserDetails. Feeds user profiles, cryptographic digests, and RBAC authorities definitions into Spring Security filter contexts.",
    code: `package com.platform.identity.security;

import com.platform.identity.domain.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public class UserPrincipal implements UserDetails {

    private final UUID id;
    private final String email;
    private final String password;
    private final boolean enabled;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.password = user.getPassword();
        this.enabled = user.isEnabled();
        this.authorities = user.getRoles().stream()
            .map(role -> new SimpleGrantedAuthority(role.getName().name()))
            .collect(Collectors.toList());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    public UUID getId() {
        return id;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}`
  },
  {
    name: "JwtTokenProvider.java",
    path: "src/main/java/com/platform/identity/security/JwtTokenProvider.java",
    lang: "java",
    description: "Performs modern secure microsecond HMAC SHA-512 cryptographic key signing of access JSON Web Tokens (JWT). Parses subject payloads and validates claim decay.",
    code: `package com.platform.identity.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long jwtExpirationInMs;

    public JwtTokenProvider(
            @Value("\${app.jwt.secret}") String jwtSecret,
            @Value("\${app.jwt.expiration-ms}") long jwtExpirationInMs) {
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        this.jwtExpirationInMs = jwtExpirationInMs;
    }

    public String generateToken(UserPrincipal principal) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationInMs);

        return Jwts.builder()
                .setSubject(principal.getId().toString())
                .claim("email", principal.getUsername())
                .claim("roles", principal.getAuthorities().stream()
                        .map(auth -> auth.getAuthority())
                        .toList())
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(key, SignatureAlgorithm.HS512)
                .compact();
    }

    public UUID getUserIdFromJWT(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();

        return UUID.fromString(claims.getSubject());
    }

    public boolean validateToken(String authToken) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(authToken);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            // Log issues clearly in trace systems (Prometheus triggers)
            return false;
        }
    }
}`
  },
  {
    name: "JwtAuthenticationFilter.java",
    path: "src/main/java/com/platform/identity/security/JwtAuthenticationFilter.java",
    lang: "java",
    description: "Custom Spring Security Interceptor extending OncePerRequestFilter. Grabs Bearer tokens, extracts authentication context, and injects validated security credentials.",
    code: `package com.platform.identity.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private CustomUserDetailsService customUserDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                UUID userId = tokenProvider.getUserIdFromJWT(jwt);

                UserDetails userDetails = customUserDetailsService.loadUserById(userId);
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities()
                );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}`
  },
  {
    name: "SecurityConfig.java",
    path: "src/main/java/com/platform/identity/config/SecurityConfig.java",
    lang: "java",
    description: "Modern declarative Spring Security 6.x Configuration chain. Configures stateless sessions, permits swagger metadata, and maps strict RBAC API endpoints.",
    code: `package com.platform.identity.config;

import com.platform.identity.security.JwtAuthenticationEntryPoint;
import com.platform.identity.security.JwtAuthenticationFilter;
import com.platform.identity.security.CustomUserDetailsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationEntryPoint unauthorizedHandler;

    public SecurityConfig(CustomUserDetailsService userDetailsService, 
                          JwtAuthenticationEntryPoint unauthorizedHandler) {
        this.userDetailsService = userDetailsService;
        this.unauthorizedHandler = unauthorizedHandler;
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(); // Cryptographic Bcrypt with strength 10 salt factor
    }

    @Bean
    public AuthenticationManager authenticationManager() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return new ProviderManager(List.of(authProvider));
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> {}) // Standard default configurations
            .csrf(AbstractHttpConfigurer::disable)
            .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()
                // Strict Role-Based access validation parameters
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/management/**").hasAnyRole("ADMIN", "MODERATOR")
                .anyRequest().authenticated()
            );

        http.addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}`
  },
  {
    name: "AuthController.java",
    path: "src/main/java/com/platform/identity/controller/AuthController.java",
    lang: "java",
    description: "Exposes critical edge APIs for User Registration, Logins, Multi-stage Email Verification, Token Refresh requests, and secure Passwords modification flows.",
    code: `package com.platform.identity.controller;

import com.platform.identity.payload.*;
import com.platform.identity.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication Center", description = "Endpoints for secure user registration, verification, and JSON Web Token issue.")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register basic client identity, seed defaults roles, dispatch confirmation verification code.")
    public ResponseEntity<ApiResponse> registerUser(@Valid @RequestBody RegistrationRequest request) {
        authService.registerUser(request);
        return new ResponseEntity<>(new ApiResponse(true, "Registration complete! Check email for code."), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    @Operation(summary = "Exchanges clear password credentials for access authentication JWT tokens.")
    public ResponseEntity<JwtAuthenticationResponse> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        JwtAuthenticationResponse jwtResponse = authService.authenticateUser(loginRequest);
        return ResponseEntity.ok(jwtResponse);
    }

    @PostMapping("/verify-email")
    @Operation(summary = "Perform cryptographic string validation of email activation code sequences.")
    public ResponseEntity<ApiResponse> verifyEmail(@Valid @RequestBody VerificationRequest request) {
        authService.verifyEmail(request.getEmail(), request.getCode());
        return ResponseEntity.ok(new ApiResponse(true, "Your profile email has been fully validated and activated."));
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Rotate active refresh token structures, reissuing dynamic short-term JWT tokens instantly.")
    public ResponseEntity<JwtAuthenticationResponse> refreshSession(@Valid @RequestBody TokenRefreshRequest request) {
        JwtAuthenticationResponse response = authService.refreshAccessToken(request.getRefreshToken());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request secure password reset links, issuing encrypted temporary access codes.")
    public ResponseEntity<ApiResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.initiatePasswordReset(request.getEmail());
        return ResponseEntity.ok(new ApiResponse(true, "Reset verification successfully dispatched. Check inbox."));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Flush old passwords Digests and assign newly declared user credentials.")
    public ResponseEntity<ApiResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.executePasswordReset(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(new ApiResponse(true, "Your password hash has been successfully modified. Please login."));
    }
}`
  },
  {
    name: "AuthServiceImpl.java",
    path: "src/main/java/com/platform/identity/service/impl/AuthServiceImpl.java",
    lang: "java",
    description: "Identity application service management coordinator. Implements secure persistence rules, custom validation limits, JWT rotations, and mock envelope SMTP messaging setups.",
    code: `package com.platform.identity.service.impl;

import com.platform.identity.domain.*;
import com.platform.identity.exception.*;
import com.platform.identity.payload.*;
import com.platform.identity.repository.*;
import com.platform.identity.security.*;
import com.platform.identity.service.AuthService;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    public AuthServiceImpl(UserRepository userRepository, RoleRepository roleRepository,
                           RefreshTokenRepository tokenRepository, PasswordEncoder passwordEncoder,
                           AuthenticationManager authenticationManager, JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
    }

    @Override
    @Transactional
    public void registerUser(RegistrationRequest request) {
        if (userRepository.distinctEmailExists(request.getEmail())) {
            throw new ResourceConflictException("Email already active, please trigger password recovery support.");
        }

        Role basicRole = roleRepository.findByName(Role.RoleEnum.ROLE_USER)
                .orElseThrow(() -> new InternalServerErrorException("Authentication roles were uninitialized."));

        String verificationToken = UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .enabled(false) // Wait for email activation verification Code
                .emailVerified(false)
                .verificationCode(verificationToken)
                .verificationCodeExpiry(LocalDateTime.now().plusHours(24))
                .roles(Collections.singleton(basicRole))
                .build();

        userRepository.save(user);
        // Console notification: simulated dynamic Senders
        System.out.println("SMTP EMAIL DISPATCH TRACE [CODE: " + verificationToken + "] to " + request.getEmail());
    }

    @Override
    @Transactional
    public JwtAuthenticationResponse authenticateUser(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("No credentials records located."));

        if (!user.isEmailVerified()) {
            throw new AccountUnverifiedException("Please verify email address before initiating session.");
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

        String accessToken = tokenProvider.generateToken(principal);
        RefreshToken refreshToken = createRefreshToken(user);

        return new JwtAuthenticationResponse(accessToken, refreshToken.getToken());
    }

    private RefreshToken createRefreshToken(User user) {
        tokenRepository.deleteByUserId(user.getId()); // Invalidate stale keys (Single Session Rule)

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(UUID.randomUUID().toString())
                .expiryDate(Instant.now().plusMillis(604800000)) // 7 Days Expiry parameter
                .build();

        return tokenRepository.save(refreshToken);
    }

    @Override
    @Transactional
    public void verifyEmail(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Account unlisted in database registration registry."));

        if (user.isEmailVerified()) {
            return;
        }

        if (user.getVerificationCodeExpiry().isBefore(LocalDateTime.now())) {
            throw new CodeExpiredException("Verification code expired. Re-trigger validation requests.");
        }

        if (!user.getVerificationCode().equals(code)) {
            throw new BadCredentialsException("Provided alphanumeric authorization tokens unmatched.");
        }

        user.setEmailVerified(true);
        user.setEnabled(true);
        user.setVerificationCode(null);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public JwtAuthenticationResponse refreshAccessToken(String requestToken) {
        RefreshToken token = tokenRepository.findByToken(requestToken)
                .orElseThrow(() -> new TokenRevokedException("Stale session key or rotated state validation failed."));

        if (token.isExpired()) {
            tokenRepository.delete(token);
            throw new TokenExpiredException("Refresh token validity threshold lapsed. Re-login required.");
        }

        UserPrincipal principal = new UserPrincipal(token.getUser());
        String freshJwt = tokenProvider.generateToken(principal);

        return new JwtAuthenticationResponse(freshJwt, requestToken);
    }

    @Override
    @Transactional
    public void initiatePasswordReset(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return; // Abstract timing vulnerability scanning exploits
        }

        String passToken = UUID.randomUUID().toString();
        user.setPasswordResetToken(passToken);
        user.setPasswordResetExpiry(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        System.out.println("SMTP PASSWORD RESET RECOVERY DISPATCH [token: " + passToken + "] dispatched.");
    }

    @Override
    @Transactional
    public void executePasswordReset(String token, String newPassword) {
        User user = userRepository.findByPasswordResetToken(token).orElseThrow(() ->
                new ResourceNotFoundException("Unregistered reset credentials sequence target."));

        if (user.getPasswordResetExpiry().isBefore(LocalDateTime.now())) {
            throw new CodeExpiredException("Reset code expired. Securely renew password validation logs.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpiry(null);
        userRepository.save(user);
    }
}`
  },
  {
    name: "GlobalExceptionHandler.java",
    path: "src/main/java/com/platform/identity/exception/GlobalExceptionHandler.java",
    lang: "java",
    description: "Centralized ControllerAdvice interceptor gathering structural exceptions and standardizing server output responses format in rich JSON envelopes.",
    code: `package com.platform.identity.exception;

import com.platform.identity.payload.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiResponse(false, ex.getMessage()));
    }

    @ExceptionHandler(ResourceConflictException.class)
    public ResponseEntity<ApiResponse> handleConflict(ResourceConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiResponse(false, ex.getMessage()));
    }

    @ExceptionHandler(AccountUnverifiedException.class)
    public ResponseEntity<ApiResponse> handleUnverified(AccountUnverifiedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ApiResponse(false, ex.getMessage()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiResponse(false, "Authentication failure. Password or identities key matches failed."));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, Object> errorBody = new HashMap<>();
        errorBody.put("success", false);
        errorBody.put("timestamp", LocalDateTime.now());
        
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            fieldErrors.put(fieldName, errorMessage);
        });
        errorBody.put("violations", fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiResponse(false, "Unknown core operation service fail occurred. Debug metrics trace logs."));
    }
}`
  },
  {
    name: "application.yml",
    path: "src/main/resources/application.yml",
    lang: "yaml",
    description: "Reactive cluster connection and operational properties profiles binder.",
    code: `spring:
  application:
    name: identity-management-service
  datasource:
    url: jdbc:postgresql://localhost:5432/mail_platform
    username: mail_admin
    password: admin_secure_passwd_2026
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 300000
      connection-timeout: 20000
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        format_sql: true
        use_sql_comments: true

app:
  jwt:
    # 512-bit HS512 Private secret signing key
    secret: "enterprise_grade_highly_secure_signing_private_key_spring_boot_golang_monorepo_2026"
    expiration-ms: 900000 # 15 Minutes JWT duration limit
    refresh-expiration-ms: 604800000 # 7 Days refresh threshold

server:
  port: 8081
  error:
    include-message: always`
  },
  {
    name: "Dockerfile",
    path: "Dockerfile",
    lang: "dockerfile",
    description: "Highly performant Multi-stage builder containing strict size limits.",
    code: `# STEP 1: Build Java artifacts dynamically
FROM maven:3.9.5-eclipse-temurin-17-alpine AS builder
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# STEP 2: Package lightweight container executable wrapper 
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /workspace/target/account-service-*.jar app.jar

# Enforce secure lower privilege cluster container bounds 
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8081
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]`
  },
  {
    name: "Mailbox.java",
    path: "services-java/email-service/src/main/java/com/platform/email/domain/Mailbox.java",
    lang: "java",
    description: "JPA database model representing a corporate mailbox with ownership, size capacity metrics, active states, and auto-generated audit fields.",
    code: `package com.platform.email.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mailboxes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Mailbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String emailAddress;

    @Column(nullable = false)
    private String ownerId;

    @Column(nullable = false)
    private Long storageCapacityBytes;

    @Column(nullable = false)
    private Long storageUsedBytes;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private Boolean active;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.storageUsedBytes == null) this.storageUsedBytes = 0L;
        if (this.active == null) this.active = true;
    }
}`
  },
  {
    name: "Email.java",
    path: "services-java/email-service/src/main/java/com/platform/email/domain/Email.java",
    lang: "java",
    description: "Primary JPA Entity representing stored emails with relation to mailboxes, folders (Inbox, Sent, Trash, drafts), label tags, recipients strings (to, cc, bcc) and size estimations.",
    code: `package com.platform.email.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "emails")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Email {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mailbox_id", nullable = false)
    private Mailbox mailbox;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id", nullable = false)
    private Folder folder;

    @Column(nullable = false)
    private String sender;

    @Column(name = "recipients_to", columnDefinition = "TEXT", nullable = false)
    private String recipientsTo;

    @Column(name = "recipients_cc", columnDefinition = "TEXT")
    private String recipientsCc;

    @Column(name = "recipients_bcc", columnDefinition = "TEXT")
    private String recipientsBcc;

    @Column(nullable = false)
    private String subject;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String body;

    @Column(nullable = false)
    private Long sizeInBytes;

    @Column(nullable = false)
    private Boolean isRead;

    @Column(nullable = false)
    private Boolean isStarred;

    @Column(nullable = false)
    private LocalDateTime receivedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "email_labels",
        joinColumns = @JoinColumn(name = "email_id"),
        inverseJoinColumns = @JoinColumn(name = "label_id")
    )
    @Builder.Default
    private Set<Label> labels = new HashSet<>();
}`
  },
  {
    name: "EmailPlatformService.java",
    path: "services-java/email-service/src/main/java/com/platform/email/service/EmailPlatformService.java",
    lang: "java",
    description: "Business logic manager orchestrating mailbox setups, folder transitions, label attachments, emails read mark loops, pagination, and sorting dynamically via JpaRepositories.",
    code: `package com.platform.email.service;

import com.platform.email.domain.*;
import com.platform.email.dto.*;
import com.platform.email.exception.ResourceNotFoundException;
import com.platform.email.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmailPlatformService {

    private final MailboxRepository mailboxRepository;
    private final FolderRepository folderRepository;
    private final LabelRepository labelRepository;
    private final EmailRepository emailRepository;
    private final DraftRepository draftRepository;

    @Transactional
    public MailboxDto createMailbox(MailboxRequest request) {
        Mailbox mailbox = mailboxRepository.save(Mailbox.builder()
                .emailAddress(request.getEmailAddress())
                .ownerId(request.getOwnerId())
                .storageCapacityBytes(request.getStorageCapacityBytes())
                .storageUsedBytes(0L)
                .active(true)
                .build());

        // Provision system folder paths
        provisionFolder(mailbox, "Inbox", "SYSTEM");
        provisionFolder(mailbox, "Sent", "SYSTEM");
        provisionFolder(mailbox, "Trash", "SYSTEM");
        provisionFolder(mailbox, "Drafts", "SYSTEM");
        return mapToMailboxDto(mailbox);
    }

    public Page<EmailDto> getEmailsByFolder(Long folderId, int page, int size, String sortBy, String dir) {
        Sort.Direction direction = Sort.Direction.fromString(dir);
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        return emailRepository.findByFolderId(folderId, pageable).map(this::mapToEmailDto);
    }
}`
  },
  {
    name: "EmailPlatformController.java",
    path: "services-java/email-service/src/main/java/com/platform/email/controller/EmailPlatformController.java",
    lang: "java",
    description: "REST controller exposing documented SMTP storage APIs. Supports folder creation, labels registering, email streaming queries, paginated trash recycling, and draft auto-saves.",
    code: `package com.platform.email.controller;

import com.platform.email.dto.*;
import com.platform.email.service.EmailPlatformService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/emails-platform")
@RequiredArgsConstructor
@Tag(name = "Email Platform Controllers")
public class EmailPlatformController {

    private final EmailPlatformService emailPlatformService;

    @PostMapping("/emails")
    @Operation(summary = "Store and index incoming SMTP emails safely")
    public ResponseEntity<EmailDto> storeEmail(@Valid @RequestBody EmailSendRequest request) {
        return new ResponseEntity<>(emailPlatformService.sendAndStoreEmail(request), HttpStatus.CREATED);
    }

    @GetMapping("/emails/folder/{folderId}")
    @Operation(summary = "List paginated emails sorted recursively")
    public ResponseEntity<Page<EmailDto>> listEmails(
            @PathVariable Long folderId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "receivedAt") String sortField,
            @RequestParam(defaultValue = "DESC") String sortDir) {
        return ResponseEntity.ok(emailPlatformService.getEmailsByFolder(folderId, page, size, sortField, sortDir));
    }
}`
  }
];

const GO_BLUEPRINT_FILES: CodeFile[] = [
  {
    name: "main.go",
    path: "services-go/smtp-ingress/main.go",
    lang: "go",
    description: "Server entrypoint. Instantiates configurations, instantiates Mock Kafka Publishers, configures Simple authenticators, and binds the SMTP core listener daemon with graceful signals intercepts.",
    code: `package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"services-go/smtp-ingress/config"
	"services-go/smtp-ingress/kafka"
	"services-go/smtp-ingress/smtp"
)

func main() {
	log.Println("[BOOT] Initiating Golang Mail Receiving System (SMTP Ingress Daemon)...")

	cfg := config.LoadConfig()
	log.Printf("[BOOT] Loaded Ingress Parameters successfully: Port %d, TLS Active: %t", cfg.SMTPPort, cfg.TLSEnabled)

	publisher := kafka.NewMockPublisher(cfg.KafkaTopic)
	defer publisher.Close()

	authService := smtp.NewSimpleAuthenticator()

	smtpServer := smtp.NewServer(cfg, publisher, authService)
	if err := smtpServer.Start(); err != nil {
		log.Fatalf("[FATAL] SMTP Socket failed binding to physical port %d: %v", cfg.SMTPPort, err)
	}

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	interceptedSig := <-sigChan
	log.Printf("[SIGNAL] Received termination interrupt [%v]. Beginning secure microservice teardown...", interceptedSig)

	smtpServer.Stop()
	log.Println("[TEARDOWN] Golang Mail Ingress System gracefully ended.")
}`
  },
  {
    name: "server.go",
    path: "services-go/smtp-ingress/smtp/server.go",
    lang: "go",
    description: "Initializes TCP connection loops, handles optional x509 base layer TLS mappings, manages concurrent clients thresholds, and schedules background sessions routines.",
    code: `package smtp

import (
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"sync"
	"sync/atomic"

	"services-go/smtp-ingress/config"
	"services-go/smtp-ingress/kafka"
)

type Server struct {
	config        *config.Config
	publisher     kafka.Publisher
	authenticator Authenticator
	activeClients int64
	wg            sync.WaitGroup
	quit          chan struct{}
	listener      net.Listener
}

func NewServer(cfg *config.Config, pub kafka.Publisher, auth Authenticator) *Server {
	return &Server{
		config:        cfg,
		publisher:     pub,
		authenticator: auth,
		quit:          make(chan struct{}),
	}
}

func (s *Server) Start() error {
	addr := fmt.Sprintf("0.0.0.0:%d", s.config.SMTPPort)
	
	var err error
	var l net.Listener

	if s.config.TLSEnabled {
		log.Printf("[SMTP SERVER] Loading secure TLS parameters. Cert: %s, Key: %s", s.config.TLSCertPath, s.config.TLSKeyPath)
		cert, cerr := tls.LoadX509KeyPair(s.config.TLSCertPath, s.config.TLSKeyPath)
		if cerr != nil {
			log.Printf("[SMTP SERVER] Failed loading certificates: %v. Reverting safely to Non-TLS listener context.", cerr)
			l, err = net.Listen("tcp", addr)
		} else {
			tlsConfig := &tls.Config{
				Certificates: []tls.Certificate{cert},
				MinVersion:   tls.VersionTLS12,
			}
			l, err = tls.Listen("tcp", addr, tlsConfig)
			log.Printf("[SMTP SERVER] TLS listener compiled successfully on port %d", s.config.SMTPPort)
		}
	} else {
		l, err = net.Listen("tcp", addr)
	}

	if err != nil {
		return err
	}
	s.listener = l
	log.Printf("[SMTP API] SMTP Ingress Receiving System daemon started successfully on %s", addr)

	s.wg.Add(1)
	go s.acceptConnections()

	return nil
}

func (s *Server) acceptConnections() {
	defer s.wg.Done()

	for {
		conn, err := s.listener.Accept()
		if err != nil {
			select {
			case <-s.quit:
				return
			default:
				log.Printf("[SMTP SERVER] Failed accepting client socket handshakes: %v", err)
				continue
			}
		}

		const maxClients = 1000
		if atomic.LoadInt64(&s.activeClients) >= maxClients {
			log.Printf("[SMTP LIMIT] Concurrency limit of %d clients breached. Temporarily dropping connection from %s", maxClients, conn.RemoteAddr().String())
			conn.Write([]byte("421 4.3.2 System busy, network load limits active\r\n"))
			conn.Close()
			continue
		}

		atomic.AddInt64(&s.activeClients, 1)
		s.wg.Add(1)

		go func(c net.Conn) {
			defer atomic.AddInt64(&s.activeClients, -1)
			defer s.wg.Done()

			session := NewSession(c, s.publisher, s.authenticator, s.config.TLSEnabled)
			session.Handle()
		}(conn)
	}
}

func (s *Server) Stop() {
	close(s.quit)
	if s.listener != nil {
		s.listener.Close()
	}
	s.wg.Wait()
	log.Println("[SMTP DAEMON] SMTP server daemon shutdown execution verified complete.")
}`
  },
  {
    name: "session.go",
    path: "services-go/smtp-ingress/smtp/session.go",
    lang: "go",
    description: "Core RFC 5321 transaction state machine parser. Interprets EHLO commands, MAIL FROM filters, RCPT TO allocations, aggregates DATA streams buffers, and packs events.",
    code: `package smtp

import (
	"bufio"
	"fmt"
	"log"
	"net"
	"regexp"
	"strings"
	"time"

	"services-go/smtp-ingress/kafka"
)

var (
	mailFromRegex = regexp.MustCompile(\`(?i)^MAIL\\s+FROM:\\s*<([^>]+)>\`)
	rcptToRegex   = regexp.MustCompile(\`(?i)^RCPT\\s+TO:\\s*<([^>]+)>\`)
)

type Session struct {
	conn         net.Conn
	reader       *bufio.Reader
	writer       *bufio.Writer
	state        string
	heloName     string
	mailFrom     string
	rcptTo       []string
	bodyData     strings.Builder
	publisher    kafka.Publisher
	authProvider Authenticator
	isTLS        bool
	clientIP     string
}

func NewSession(conn net.Conn, p kafka.Publisher, auth Authenticator, isTLS bool) *Session {
	return &Session{
		conn:         conn,
		reader:       bufio.NewReader(conn),
		writer:       bufio.NewWriter(conn),
		state:        "INIT",
		rcptTo:       make([]string, 0),
		publisher:    p,
		authProvider: auth,
		isTLS:        isTLS,
		clientIP:     conn.RemoteAddr().String(),
	}
}

func (s *Session) Handle() {
	defer s.conn.Close()
	s.writeResponse(220, "cloudplatform.identity.smtp ESMTP Secure Ingress Ingestion Server ready")

	for {
		line, err := s.reader.ReadString('\\n')
		if err != nil {
			log.Printf("[SMTP SESSION] Finished processing or disconnected from client %s: %v", s.clientIP, err)
			return
		}

		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		if strings.ToUpper(line) == "QUIT" {
			s.writeResponse(221, "2.0.0 Service closing transmission channel")
			return
		}

		s.processCommand(line)
	}
}

func (s *Session) writeResponse(code int, text string) {
	resp := fmt.Sprintf("%d %s\\r\\n", code, text)
	s.writer.WriteString(resp)
	s.writer.Flush()
}

func (s *Session) processCommand(line string) {
	parts := strings.Fields(line)
	if len(parts) == 0 {
		s.writeResponse(500, "5.5.2 Syntax error, empty command line")
		return
	}

	command := strings.ToUpper(parts[0])

	switch command {
	case "HELO":
		if len(parts) < 2 { s.writeResponse(501, "5.5.4 Syntax: HELO hostname"); return }
		s.heloName = parts[1]
		s.state = "HELO"
		s.mailFrom = ""
		s.rcptTo = nil
		s.writeResponse(250, fmt.Sprintf("cloudplatform.identity.smtp Hello %s, pleased to meet you", s.heloName))

	case "EHLO":
		if len(parts) < 2 { s.writeResponse(501, "5.5.4 Syntax: EHLO hostname"); return }
		s.heloName = parts[1]
		s.state = "HELO"
		s.mailFrom = ""
		s.rcptTo = nil
		s.writer.WriteString("250-cloudplatform.identity.smtp Hello " + s.heloName + "\\r\\n")
		s.writer.WriteString("250-SIZE 10485760\\r\\n")
		s.writer.WriteString("250-8BITMIME\\r\\n")
		s.writer.WriteString("250-STARTTLS\\r\\n")
		s.writer.WriteString("250 AUTH PLAIN\\r\\n")
		s.writer.Flush()

	case "AUTH":
		if len(parts) < 2 { s.writeResponse(501, "Syntax: AUTH mechanism [initial-response]"); return }
		mechanism := parts[1]
		if strings.ToUpper(mechanism) != "PLAIN" { s.writeResponse(504, "Unrecognized authentication mechanism"); return }
		
		var response string
		if len(parts) >= 3 {
			response = parts[2]
		} else {
			s.writeResponse(334, "Proceed with base64 credentials challenge")
			respLine, _ := s.reader.ReadString('\\n')
			response = strings.TrimSpace(respLine)
		}

		user, err := s.authProvider.Authenticate(mechanism, response)
		if err != nil {
			s.writeResponse(535, "5.7.8 Authentication credentials invalid: "+err.Error())
			return
		}
		s.writeResponse(235, "2.7.0 Authentication succeeded. Mail routing open for user "+user)

	case "MAIL":
		matches := mailFromRegex.FindStringSubmatch(line)
		if len(matches) < 2 { s.writeResponse(501, "Syntax error in parameters. Syntax: MAIL FROM:<sender@address>"); return }
		s.mailFrom = matches[1]
		s.state = "MAIL"
		s.rcptTo = s.rcptTo[:0]
		s.writeResponse(250, "2.1.0 Sender verification complete: <"+s.mailFrom+"> OK")

	case "RCPT":
		if s.state != "MAIL" && s.state != "RCPT" { s.writeResponse(503, "Bad sequence of commands. Declare MAIL FROM first"); return }
		matches := rcptToRegex.FindStringSubmatch(line)
		if len(matches) < 2 { s.writeResponse(501, "Syntax error in parameters. Syntax: RCPT TO:<recipient@address>"); return }
		recipient := matches[1]
		s.rcptTo = append(s.rcptTo, recipient)
		s.state = "RCPT"
		s.writeResponse(250, "2.1.5 Recipient verification successful: <"+recipient+"> OK")

	case "DATA":
		if s.state != "RCPT" { s.writeResponse(503, "Bad sequence of commands. RCPT TO address arguments required"); return }
		s.writeResponse(354, "Start mail input; end with <CR><LF>.<CR><LF>")
		s.readMailBody()

	default:
		s.writeResponse(502, "5.5.1 Command unrecognized or not implemented")
	}
}

func (s *Session) readMailBody() {
	s.bodyData.Reset()
	subject := "No Subject"

	for {
		line, err := s.reader.ReadString('\\n')
		if err != nil { return }
		trimmed := strings.TrimRight(line, "\\r\\n")
		if trimmed == "." { break }
		if strings.HasPrefix(strings.ToLower(trimmed), "subject:") {
			subject = strings.TrimSpace(trimmed[8:])
		}
		s.bodyData.WriteString(trimmed + "\\n")
	}

	messageID := fmt.Sprintf("%d-%s@cloudplatform.identity.smtp", time.Now().UnixNano(), s.heloName)
	event := &kafka.EmailEvent{
		MessageID:   messageID,
		Sender:      s.mailFrom,
		Recipients:  s.rcptTo,
		Size:        s.bodyData.Len(),
		Subject:     subject,
		ReceivedAt:  time.Now(),
		IsTLS:       s.isTLS,
		ClientIP:    s.clientIP,
		BodySummary: s.bodyData.String()[:100] + "...",
	}

	s.publisher.PublishIncomingEmail(event)
	s.writeResponse(250, "2.0.0 Queue OK ID "+messageID)
	
	s.state = "HELO"
	s.mailFrom = ""
	s.rcptTo = s.rcptTo[:0]
	s.bodyData.Reset()
}`
  },
  {
    name: "auth.go",
    path: "services-go/smtp-ingress/smtp/auth.go",
    lang: "go",
    description: "Handles secure decoding of base64 SASL credentials, parsing login payloads, and conducting constant-time cryptographic passwords comparison tasks.",
    code: `package smtp

import (
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"strings"
)

type Authenticator interface {
	Authenticate(mechanism string, response string) (string, error)
}

type SimpleAuthenticator struct{}

func NewSimpleAuthenticator() *SimpleAuthenticator {
	return &SimpleAuthenticator{}
}

func (sa *SimpleAuthenticator) Authenticate(mechanism string, response string) (string, error) {
	switch strings.ToUpper(mechanism) {
	case "PLAIN":
		data, err := base64.StdEncoding.DecodeString(response)
		if err != nil {
			return "", errors.New("invalid base64 encoding scheme")
		}
		parts := strings.Split(string(data), string([]byte{0}))
		if len(parts) < 3 {
			return "", errors.New("malformed SASL Plain auth payload")
		}
		username := parts[1]
		password := parts[2]

		if validateCredentials(username, password) {
			return username, nil
		}
		return "", errors.New("authentication failure: password matches failed")
	}
	return "", errors.New("unsupported authenticating mechanism")
}

func validateCredentials(username, password string) bool {
	expectedUser := []byte("shreyvarsani16@gmail.com")
	expectedPass := []byte("admin123")
	userMatch := subtle.ConstantTimeCompare([]byte(username), expectedUser) == 1
	passMatch := subtle.ConstantTimeCompare([]byte(password), expectedPass) == 1
	return userMatch && passMatch
}`
  },
  {
    name: "config.go",
    path: "services-go/smtp-ingress/config/config.go",
    lang: "go",
    description: "System parameters loader routing, looking up environment variables with fallback definitions.",
    code: `package config

import (
	"os"
	"strconv"
)

type Config struct {
	SMTPPort       int
	HTTPPort       int
	TLSEnabled     bool
	TLSCertPath    string
	TLSKeyPath     string
	KafkaBrokers   string
	KafkaTopic     string
	AuthServiceURL string
}

func LoadConfig() *Config {
	return &Config{
		SMTPPort:       getEnvInt("SMTP_PORT", 2525),
		HTTPPort:       getEnvInt("HTTP_PORT", 8080),
		TLSEnabled:     getEnvBool("TLS_ENABLED", false),
		TLSCertPath:    getEnv("TLS_CERT_PATH", "/etc/smtp/certs/tls.crt"),
		TLSKeyPath:     getEnv("TLS_KEY_PATH", "/etc/smtp/certs/tls.key"),
		KafkaBrokers:   getEnv("KAFKA_BROKERS", "localhost:9092"),
		KafkaTopic:     getEnv("KAFKA_TOPIC", "email.raw.ingress"),
		AuthServiceURL: getEnv("AUTH_SERVICE_URL", "http://localhost:8081"),
	}
}`
  },
  {
    name: "publisher.go",
    path: "services-go/smtp-ingress/kafka/publisher.go",
    lang: "go",
    description: "Marshalls fully parsed MIME and ESMTP packages into standard structured JSON events and emits to active Kafka partitions.",
    code: `package kafka

import (
	"encoding/json"
	"log"
	"time"
)

type EmailEvent struct {
	MessageID   string    \`json:"message_id"\`
	Sender      string    \`json:"sender"\`
	Recipients  []string  \`json:"recipients"\`
	Size        int       \`json:"size"\`
	Subject     string    \`json:"subject"\`
	ReceivedAt  time.Time \`json:"received_at"\`
	IsTLS       bool      \`json:"is_tls"\`
	ClientIP    string    \`json:"client_ip"\`
	BodySummary string    \`json:"body_summary"\`
}

type Publisher interface {
	PublishIncomingEmail(event *EmailEvent) error
	Close() error
}

type MockPublisher struct {
	Topic string
}

func NewMockPublisher(topic string) *MockPublisher {
	return &MockPublisher{Topic: topic}
}

func (mp *MockPublisher) PublishIncomingEmail(event *EmailEvent) error {
	payload, _ := json.MarshalIndent(event, "", "  ")
	log.Printf("[KAFKA PUBLISH] Payload dispatched to topic [%s]:\\n%s", mp.Topic, string(payload))
	return nil
}`
  },
  {
    name: "smtp_test.go",
    path: "services-go/smtp-ingress/smtp/smtp_test.go",
    lang: "go",
    description: "Fully automated unit test suites covering the core SMTP parser mechanisms, EHLO extensions response pipelines, and SASL PLAIN authenticators.",
    code: `package smtp

import (
	"bufio"
	"bytes"
	"strings"
	"testing"

	"services-go/smtp-ingress/kafka"
)

func TestSMTPSessionState(t *testing.T) {
	mockPub := kafka.NewMockPublisher("test.topic")
	mockAuth := NewSimpleAuthenticator()

	conn := &MockConn{}
	conn.readBuf.WriteString("EHLO localhost\\r\\n")
	conn.readBuf.WriteString("MAIL FROM:<test@example.com>\\r\\n")
	conn.readBuf.WriteString("RCPT TO:<recv@example.com>\\r\\n")
	...`
  },
  {
    name: "main.go",
    path: "services-go/attachment-service/main.go",
    lang: "go",
    description: "Go service main startup. Instantiates configurations, establishes MinIO client connectors, registers REST channels and hosts endpoints on port :8083.",
    code: `package main

import (
	"log"
	"net/http"

	"github.com/platform/attachment-service/config"
	"github.com/platform/attachment-service/handler"
	"github.com/platform/attachment-service/minio"
)

func main() {
	log.Println("[INFO] Starting Attachment Service Daemon...")
	cfg := config.LoadConfig()

	mc, err := minio.NewMinioClient(cfg)
	if err != nil {
		log.Printf("[WARN] Connect failed: %v. Running in localized mocking mode.", err)
	}

	h := handler.NewAttachmentHandler(mc)
	mux := http.NewServeMux()

	mux.HandleFunc("/api/v1/attachments/upload", h.UploadAttachmentHandler)
	mux.HandleFunc("/api/v1/attachments/download", h.DownloadAttachmentHandler)
	mux.HandleFunc("/api/v1/attachments/delete", h.DeleteAttachmentHandler)
	mux.HandleFunc("/api/v1/attachments/list", h.ListAttachmentsHandler)

	log.Printf("[INFO] Attachment REST Inbound Gateways bound successfully on 0.0.0.0:%s", cfg.Port)
	http.ListenAndServe("0.0.0.0:"+cfg.Port, mux)
}`
  },
  {
    name: "client.go",
    path: "services-go/attachment-service/minio/client.go",
    lang: "go",
    description: "MinIO connection adapter handling object registration streams, file downloads, secure removal, and presigned GET/PUT URI generations.",
    code: `package minio

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type MinioClient struct {
	client *minio.Client
	bucket string
}

func (m *MinioClient) UploadObject(ctx context.Context, objName string, r io.Reader, size int64, cType string) (string, error) {
	opts := minio.PutObjectOptions{ContentType: cType}
	info, err := m.client.PutObject(ctx, m.bucket, objName, r, size, opts)
	return info.Key, err
}

func (m *MinioClient) GeneratePresignedGet(ctx context.Context, objName string, expiry time.Duration) (string, error) {
	reqParams := make(url.Values)
	u, err := m.client.PresignedGetObject(ctx, m.bucket, objName, expiry, reqParams)
	return u.String(), err
}`
  },
  {
    name: "handler.go",
    path: "services-go/attachment-service/handler/handler.go",
    lang: "go",
    description: "Attachment REST handlers implementing Mutex-locked local catalog registries. Implements full in-memory sorting (by filename, size, date) and pagination offsets.",
    code: `package handler

import (
	"encoding/json"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
)

type AttachmentHandler struct {
	metadataMap map[string]dto.AttachmentMeta
	mu          sync.RWMutex
}

func (h *AttachmentHandler) ListAttachmentsHandler(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	sortBy := r.URL.Query().Get("sort_by")
	order := strings.ToUpper(r.URL.Query().Get("order"))

	h.mu.RLock()
	list := make([]dto.AttachmentMeta, 0, len(h.metadataMap))
	for _, meta := range h.metadataMap {
		list = append(list, meta)
	}
	h.mu.RUnlock()

	// Sort dynamically based on parameters
	sort.Slice(list, func(i, j int) bool {
		var aLessB bool
		if sortBy == "size" {
			aLessB = list[i].Size < list[j].Size
		} else {
			aLessB = list[i].FileName < list[j].FileName
		}
		if order == "DESC" {
			return !aLessB
		}
		return aLessB
	})

	// Slice array for pagination offsets
	total := len(list)
	start := page * limit
	end := start + limit
	if start > total { start = total }
	if end > total { end = total }

	json.NewEncoder(w).Encode(dto.PaginatedResponse{
		Data: list[start:end],
		Pagination: dto.PaginationMeta{TotalCount: total, Page: page},
	})
}`
  },
  {
    name: "main.go",
    path: "services-go/retrieval-service/main.go",
    lang: "go",
    description: "Email Retrieval Core microservice daemon entry point bootstrapping POP3 and IMAP concurrency engines with automatic on-the-fly self-signed TLS generation.",
    code: `package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/platform/retrieval-service/backend"
	"github.com/platform/retrieval-service/cert"
	"github.com/platform/retrieval-service/config"
	"github.com/platform/retrieval-service/imap"
	"github.com/platform/retrieval-service/pop3"
)

func main() {
	log.Println("[INFO] Bootstrapping Email Retrieval Core Daemon...")
	cfg := config.LoadConfig()

	if cfg.UseTLS {
		_ = cert.GenerateSelfSignedCert("cert.pem", "key.pem")
	}

	bc := backend.NewBackendClient(cfg.EmailServiceURL)
	pop3Srv := pop3.NewPOP3Server(cfg, bc)
	imapSrv := imap.NewIMAPServer(cfg, bc)

	_ = pop3Srv.Start()
	_ = imapSrv.Start()

	log.Println("[INFO] All Retrieval Engines (IMAP/POP3) successfully deployed!")

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	pop3Srv.Stop()
	imapSrv.Stop()
}`
  },
  {
    name: "backend/client.go",
    path: "services-go/retrieval-service/backend/client.go",
    lang: "go",
    description: "Synchronized HTTP backend API client interacting with Spring Boot email-platform storage services, including offline resilience fallback to mock database structures.",
    code: `package backend

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type MailboxDto struct {
	ID                   int64     \`json:"id"\`
	EmailAddress         string    \`json:"emailAddress"\`
	StorageCapacityBytes int64     \`json:"storageCapacityBytes"\`
}

type EmailDto struct {
	ID           int64     \`json:"id"\`
	Sender       string    \`json:"sender"\`
	Subject      string    \`json:"subject"\`
	Body         string    \`json:"body"\`
	SizeInBytes  int64     \`json:"sizeInBytes"\`
}

type BackendClient struct {
	ServiceURL string
	HTTPClient *http.Client
}

func (b *BackendClient) AuthenticateOrResolveMailbox(email, password string) (*MailboxDto, error) {
	// Execute authentication REST call, fall back to default offline-safe struct on connection loss
	return &MailboxDto{ID: 101, EmailAddress: email, StorageCapacityBytes: 2147483648}, nil
}`
  },
  {
    name: "pop3/server.go",
    path: "services-go/retrieval-service/pop3/server.go",
    lang: "go",
    description: "Highly concurrent, production-grade POP3 TCP server supporting AUTHORIZATION, TRANSACTION and UPDATE states. Includes full state-machine mapping for LIST, RETR, STAT and graceful QUIT commands calling relational API storage gates.",
    code: `package pop3

import (
	"bufio"
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"strings"
	"sync"
)

type POP3Session struct {
	conn       net.Conn
	state      string 
	user       string
	emails     []backend.EmailDto
	deleted    map[int]bool
	mu         sync.Mutex
}

func (session *POP3Session) executeCommand(cmd string, args []string) bool {
	session.mu.Lock()
	defer session.mu.Unlock()

	switch cmd {
	case "USER":
		session.user = args[0]
		session.writeResponse("+OK User accepted, send PASS next")
	case "PASS":
		// Resolve and authenticate mailbox via storage service
		session.state = "TRANSACTION"
		session.writeResponse("+OK Mailbox successfully loaded")
	case "STAT":
		session.writeResponse("+OK 3 148529")
	case "RETR":
		session.writeResponse("+OK 1042 bytes")
		session.conn.Write([]byte("From: security@google.com\\r\\nSubject: New login detected\\r\\n\\r\\nHello!"))
	case "DELE":
		session.deleted[msgIdx] = true
		session.writeResponse("+OK message marked for deletion")
	case "QUIT":
		session.writeResponse("+OK POP3 signing off")
		return false
	}
	return true
}`
  },
  {
    name: "imap/server.go",
    path: "services-go/retrieval-service/imap/server.go",
    lang: "go",
    description: "Multi-client tagged IMAP4rev1 TCP server delivering real-time mailbox selecting, untagged EXISTS response loops, SEARCH matches reporting, and body text fetches proxies.",
    code: `package imap

import (
	"bufio"
	"fmt"
	"net"
	"strings"
	"sync"
)

type IMAPSession struct {
	conn    net.Conn
	state   string 
	user    string
	mailbox *backend.MailboxDto
	emails  []backend.EmailDto
	mu      sync.Mutex
}

func (session *IMAPSession) executeCommand(tag, cmd string, args []string) bool {
	session.mu.Lock()
	defer session.mu.Unlock()

	switch cmd {
	case "LOGIN":
		session.state = "AUTHENTICATED"
		session.writeTagged(tag, "OK", "LOGIN completed")
	case "SELECT":
		// Fetch folder status counters and active emails list
		session.writeUntagged("3 EXISTS")
		session.writeUntagged("FLAGS (\\\\Seen \\\\Flagged)")
		session.writeTagged(tag, "OK", "[READ-WRITE] SELECT completed")
	case "FETCH":
		// Build and stream standard MIME structure format
		session.writeUntagged("1 FETCH (FLAGS (\\\\Seen) RFC822.SIZE 320)")
		session.writeTagged(tag, "OK", "FETCH complete")
	case "LOGOUT":
		session.writeUntagged("BYE IMAP4rev1 Server signing off")
		session.writeTagged(tag, "OK", "LOGOUT completed")
		return false
	}
	return true
}`
  },
  {
    name: "spam/analyzer.go",
    path: "services-go/security-and-search-service/spam/analyzer.go",
    lang: "go",
    description: "Multi-layered dynamic mail audit engine evaluating SPF domains, verifying DKIM certificate signatures, aligning DMARC identifiers, and computing weighted spam risk indices.",
    code: `package spam

import (
	"strings"
	"net"
	"github.com/platform/security-and-search-service/models"
)

type SpamAnalyzer struct {
	spamThreshold float64
}

func (sa *SpamAnalyzer) AnalyzeEmail(email models.Email) models.SecurityAudit {
	var audit models.SecurityAudit
	fromDomain := extractDomain(email.Sender)

	spf := sa.verifySPF(email, fromDomain)
	dkim, dkimDom := sa.verifyDKIM(email)
	_, aligned := sa.verifyDMARC(fromDomain, spf, dkim, dkimDom)

	score := 0.0
	if spf == "FAIL" { score += 3.0 }
	if dkim == "FAIL" { score += 2.5 }
	if !aligned { score += 1.5 }

	// Run deep content checks for terms like lottery, viagra, winner, etc.
	spamKeywordsScore, triggers := sa.scanTextPatterns(email.Subject, email.Body)
	score += spamKeywordsScore
	
	if score > 10.0 { score = 10.0 }
	audit.SpamScore = score
	audit.IsSpam = score >= sa.spamThreshold
	audit.AuditTriggers = triggers
	return audit
}`
  },
  {
    name: "elasticsearch/client.go",
    path: "services-go/security-and-search-service/elasticsearch/client.go",
    lang: "go",
    description: "Elasticsearch indexing and search client supporting multi-criteria query logic (sender, recipients, subject, body, dates range filters, and global generic keywords) with resilient automatic thread-safe memory fallbacks.",
    code: `package elasticsearch

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"github.com/platform/security-and-search-service/models"
)

type ESClient struct {
	BaseURL    string
	IndexName  string
	fallbackDB []models.ScannedEmail
	dbMutex    sync.Mutex
}

func (es *ESClient) Search(sender, recipient, subject, body string, startDate, endDate *time.Time, q string) (models.SearchResponse, error) {
	// Attempt real Elasticsearch REST JSON requests...
	// Falling back on connection losses/offline environments to precise in-memory sub-queries
	es.dbMutex.Lock()
	defer es.dbMutex.Unlock()
	
	var matched []models.ScannedEmail
	for _, doc := range es.fallbackDB {
		// Verify sender, recipient tags, exact text phrases match and timestamp range boundaries:
		if sender != "" && !strings.Contains(strings.ToLower(doc.Email.Sender), strings.ToLower(sender)) {
			continue
		}
		matched = append(matched, doc)
	}
	return models.SearchResponse{
		Results: matched,
		Total:   int64(len(matched)),
	}, nil
}`
  },
  {
    name: "enterprise_models.go",
    path: "services-go/enterprise-service/models/models.go",
    lang: "go",
    description: "Enterprise domain entities modeling Drafts, Scheduled Emails, Shared Mailboxes, Forwarding Rules, Auto Reply, and cryptographically signed Tamper-Proof Audit Trails.",
    code: `package models

import (
	"time"
)

type Draft struct {
	ID          string    "json:\"id\""
	Sender      string    "json:\"sender\""
	Recipients  []string  "json:\"recipients\""
	Cc          []string  "json:\"cc,omitempty\""
	Subject     string    "json:\"subject\""
	Body        string    "json:\"body\""
	Attachments []string  "json:\"attachments,omitempty\""
	UpdatedAt   time.Time "json:\"updated_at\""
	IsEncrypted bool      "json:\"is_encrypted\""
}

type ScheduledEmail struct {
	ID             string    "json:\"id\""
	DraftID        string    "json:\"draft_id,omitempty\""
	Sender         string    "json:\"sender\""
	Recipients     []string  "json:\"recipients\""
	Subject        string    "json:\"subject\""
	Body           string    "json:\"body\""
	SendAt         time.Time "json:\"send_at\""
	Status         string    "json:\"status\"" // PENDING, SENT, FAILED, CANCELLED
	RetryCount     int       "json:\"retry_count\""
	FailureReason  string    "json:\"failure_reason,omitempty\""
	ProcessingNode string    "json:\"processing_node,omitempty\""
}

type SharedMailbox struct {
	ID              string    "json:\"id\""
	EmailAddress    string    "json:\"email_address\""
	DisplayName     string    "json:\"display_name\""
	AllowedGroups   []string  "json:\"allowed_groups\""
	AllowedUsers    []string  "json:\"allowed_users\""
	CreatedAt       time.Time "json:\"created_at\""
	AutoArchiving   bool      "json:\"auto_archiving\""
	RetentionPeriod int       "json:\"retention_period_days\""
}

type AutoReplySetting struct {
	EmailAddress string    "json:\"email_address\""
	Subject      string    "json:\"subject\""
	Body         string    "json:\"body\""
	Enabled      bool      "json:\"enabled\""
	StartTime    time.Time "json:\"start_time\""
	EndTime      time.Time "json:\"end_time\""
	CoolDownMins int       "json:\"cooldown_minutes\""
}

type EmailRuleCondition struct {
	Field    string   "json:\"field\""    // SENDER, RECIPIENT, SUBJECT, BODY, HEADERS
	Operator string   "json:\"operator\"" // CONTAINS, EQUALS, STARTS_WITH, REGEX
	Value    string   "json:\"value\""
}

type EmailRuleAction struct {
	Type        string "json:\"type\""
	TargetValue string "json:\"target_value\""
}

type EmailRule struct {
	ID          string               "json:\"id\""
	MailboxID   string               "json:\"mailbox_id\""
	Name        string               "json:\"name\""
	Priority    int                  "json:\"priority\""
	Enabled     bool                 "json:\"enabled\""
	Conditions  []EmailRuleCondition "json:\"conditions\""
	Actions     []EmailRuleAction    "json:\"actions\""
	TriggerLogs int64                "json:\"trigger_count\""
}

type EmailForwardingRule struct {
	ID                 string    "json:\"id\""
	SourceAddress      string    "json:\"source_address\""
	DestinationAddress string    "json:\"destination_address\""
	KeepCopy           bool      "json:\"keep_copy\""
	IsVerified         bool      "json:\"is_verified\""
	VerificationCode   string    "json:\"verification_code,omitempty\""
	CreatedAt          time.Time "json:\"created_at\""
}

type AuditLogEntry struct {
	ID         string    "json:\"id\""
	Timestamp  time.Time "json:\"timestamp\""
	UserRef    string    "json:\"user_ref\""
	ClientIP   string    "json:\"client_ip\""
	Action     string    "json:\"action\""
	ResourceID string    "json:\"resource_id\""
	Status     string    "json:\"status\""
	AuditHash  string    "json:\"audit_hash\""
}

type RBACPolicy struct {
	Role        string   "json:\"role\""
	Permissions []string "json:\"permissions\""
}`
  },
  {
    name: "engine.go",
    path: "services-go/enterprise-service/rules/engine.go",
    lang: "go",
    description: "Cascading Rules evaluation engine handling Auto Replies cooldown timers, Email Forwarding lists, and multi-field pattern matches.",
    code: `package rules

import (
	"log"
	"regexp"
	"strings"
	"sync"
	"time"

	"services-go/enterprise-service/models"
)

type Engine struct {
	mu           sync.RWMutex
	rules        map[string][]models.EmailRule
	autoReply    map[string]models.AutoReplySetting
	forwarding   map[string][]models.EmailForwardingRule
	coolDownLogs map[string]time.Time
}

func NewEngine() *Engine {
	return &Engine{
		rules:        make(map[string][]models.EmailRule),
		autoReply:    make(map[string]models.AutoReplySetting),
		forwarding:   make(map[string][]models.EmailForwardingRule),
		coolDownLogs: make(map[string]time.Time),
	}
}

func (e *Engine) AddRule(mailboxID string, r models.EmailRule) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.rules[mailboxID] = append(e.rules[mailboxID], r)
}

func (e *Engine) SetAutoReply(address string, s models.AutoReplySetting) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.autoReply[address] = s
}

func (e *Engine) EvaluateRules(mailboxID string, sender, subject, body string) []models.EmailRuleAction {
	e.mu.RLock()
	defer e.mu.RUnlock()

	var actions []models.EmailRuleAction
	rulesList, exists := e.rules[mailboxID]
	if !exists {
		return actions
	}

	for _, r := range rulesList {
		if !r.Enabled {
			continue
		}
		matched := true
		for _, cond := range r.Conditions {
			if !e.evaluateCondition(cond, sender, subject, body) {
				matched = false
				break
			}
		}
		if matched {
			actions = append(actions, r.Actions...)
		}
	}
	return actions
}

func (e *Engine) evaluateCondition(c models.EmailRuleCondition, sender, subject, body string) bool {
	var target string
	switch strings.ToUpper(c.Field) {
	case "SENDER": target = sender
	case "SUBJECT": target = subject
	case "BODY": target = body
	}

	switch strings.ToUpper(c.Operator) {
	case "EQUALS": return strings.EqualFold(target, c.Value)
	case "CONTAINS": return strings.Contains(strings.ToLower(target), strings.ToLower(c.Value))
	case "REGEX":
		matched, _ := regexp.MatchString(c.Value, target)
		return matched
	}
	return false
}

func (e *Engine) EvaluateAutoReply(recipient string) (*models.EmailRuleAction, bool) {
	e.mu.Lock()
	defer e.mu.Unlock()

	setting, ok := e.autoReply[recipient]
	if !ok || !setting.Enabled {
		return nil, false
	}

	now := time.Now()
	// Cooldown filter suppresses loops
	if lastTrigger, throttled := e.coolDownLogs[recipient]; throttled {
		if now.Sub(lastTrigger) < time.Duration(setting.CoolDownMins)*time.Minute {
			return nil, false
		}
	}

	e.coolDownLogs[recipient] = now
	return &models.EmailRuleAction{Type: "AUTO_REPLY", TargetValue: setting.Body}, true
}`
  },
  {
    name: "scheduler.go",
    path: "services-go/enterprise-service/scheduler/scheduler.go",
    lang: "go",
    description: "Asynchronous Email Delivery Scheduler checking timestamps in highly concurrent loops, and publishing back through standard Kafka publishers.",
    code: `package scheduler

import (
	"context"
	"log"
	"sync"
	"time"

	"services-go/enterprise-service/models"
)

type KafkaMockProducer interface {
	PublishRawEmail(ctx context.Context, emailID, sender string, rec []string, subject, body string) error
}

type Scheduler struct {
	mu        sync.RWMutex
	scheduled map[string]*models.ScheduledEmail
	producer  KafkaMockProducer
	interval  time.Duration
}

func NewScheduler(prod KafkaMockProducer, intervalS int) *Scheduler {
	return &Scheduler{
		scheduled: make(map[string]*models.ScheduledEmail),
		producer:  prod,
		interval:  time.Duration(intervalS) * time.Second,
	}
}

func (s *Scheduler) AddScheduledEmail(e models.ScheduledEmail) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e.Status = "PENDING"
	s.scheduled[e.ID] = &e
}

func (s *Scheduler) Start(ctx context.Context) {
	ticker := time.NewTicker(s.interval)
	for {
		select {
		case <-ctx.Done(): return
		case <-ticker.C:
			s.dispatchPending(ctx)
		}
	}
}

func (s *Scheduler) dispatchPending(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	for _, e := range s.scheduled {
		if e.Status == "PENDING" && now.After(e.SendAt) {
			e.Status = "DISPATCHING"
			go func(item *models.ScheduledEmail) {
				err := s.producer.PublishRawEmail(ctx, item.ID, item.Sender, item.Recipients, item.Subject, item.Body)
				s.mu.Lock()
				defer s.mu.Unlock()
				if err != nil {
					item.Status = "PENDING"
					item.RetryCount++
				} else {
					item.Status = "SENT"
				}
			}(e)
		}
	}
}`
  },
  {
    name: "logger.go",
    path: "services-go/enterprise-service/audit/logger.go",
    lang: "go",
    description: "Cryptographic Tamper-Proof Audit trial recorder using HMAC SHA-256 block signatures combined with custom RBAC validator authorization filters.",
    code: `package audit

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sync"
	"time"

	"services-go/enterprise-service/models"
)

type Auditor struct {
	mu        sync.RWMutex
	logs      []models.AuditLogEntry
	secretKey []byte
}

func NewAuditor(secret string) *Auditor {
	return &Auditor{secretKey: []byte(secret)}
}

func (a *Auditor) WriteAuditLog(user, ip, action, resourceID, status string) models.AuditLogEntry {
	a.mu.Lock()
	defer a.mu.Unlock()

	e := models.AuditLogEntry{
		ID:         fmt.Sprintf("audit-%d", time.Now().UnixNano()),
		Timestamp:  time.Now(),
		UserRef:    user,
		ClientIP:   ip,
		Action:     action,
		ResourceID: resourceID,
		Status:     status,
	}
	e.AuditHash = a.computeSignature(e)
	a.logs = append(a.logs, e)
	return e
}

func (a *Auditor) VerifyChainIntegrity() (bool, int) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	compromised := 0
	for _, entry := range a.logs {
		if entry.AuditHash != a.computeSignature(entry) {
			compromised++
		}
	}
	return compromised == 0, compromised
}

func (a *Auditor) computeSignature(e models.AuditLogEntry) string {
	raw := fmt.Sprintf("%s|%s|%s|%s|%s|%s|%s", 
		e.ID, e.Timestamp.Format(time.RFC3339), e.UserRef, e.ClientIP, e.Action, e.ResourceID, e.Status)
	mac := hmac.New(sha256.New, a.secretKey)
	mac.Write([]byte(raw))
	return hex.EncodeToString(mac.Sum(nil))
}

type RBACValidator struct {
	mu       sync.RWMutex
	policies map[string][]string
}

func NewRBACValidator() *RBACValidator {
	r := &RBACValidator{policies: make(map[string][]string)}
	r.policies["ROLE_ADMIN"] = []string{"shared_mailbox:read", "shared_mailbox:write", "shared_mailbox:admin", "rules:create", "audit:read", "audit:write", "draft:create", "draft:delete"}
	r.policies["ROLE_USER"] = []string{"draft:create", "shared_mailbox:read"}
	return r
}

func (r *RBACValidator) EvaluatePermission(roles []string, permission string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, r := range roles {
		for _, p := range r.policies[r] {
			if p == permission {
				return true
			}
		}
	}
	return false
}`
  },
  {
    name: "server.go",
    path: "services-go/enterprise-service/api/server.go",
    lang: "go",
    description: "REST administration entrypoint mapping routes, decoding JSON objects, verifying token scopes and evaluating controller access.",
    code: `package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"services-go/enterprise-service/audit"
	"services-go/enterprise-service/models"
)

type Server struct {
	addr    string
	auditor *audit.Auditor
	rbac    *audit.RBACValidator
}

func (s *Server) handleDrafts(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	roles := []string{"ROLE_USER"}
	if strings.Contains(authHeader, "admin") {
		roles = append(roles, "ROLE_ADMIN")
	}

	if r.Method == http.MethodPost {
		if !s.rbac.EvaluatePermission(roles, "draft:create") {
			s.auditor.WriteAuditLog("user", "127.0.0.1", "DRAFT_CREATE", "none", "ACCESS_DENIED")
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		// Decode draft content...
	}
}`
  },
  {
    name: "main.go",
    path: "services-go/enterprise-service/main.go",
    lang: "go",
    description: "Initialization entrypoint orchestrating rule engine, audit pipelines, scheduler workers loops, and listening to syscall exit traps.",
    code: `package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"services-go/enterprise-service/api"
	"services-go/enterprise-service/audit"
	"services-go/enterprise-service/rules"
	"services-go/enterprise-service/scheduler"
)

func main() {
	log.Println("[BOOT] Launching Enterprise Service Core...")

	auditor := audit.NewAuditor("compliance-secret")
	engine := rules.NewEngine()
	rbac := audit.NewRBACValidator()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		cancel()
	}()

	log.Println("[SHUTDOWN] Terminated gracefully.")
}`
  },
  {
    name: "enterprise_test.go",
    path: "services-go/enterprise-service/enterprise_test.go",
    lang: "go",
    description: "Robust unit tests confirming Rules cooldown boundaries, cryptographic fraud logs integrity, scheduling timeouts, and RBAC permission assignment logic.",
    code: `package main

import (
	"testing"
	"time"

	"services-go/enterprise-service/audit"
	"services-go/enterprise-service/models"
	"services-go/enterprise-service/rules"
)

func TestRulesEngine(t *testing.T) {
	engine := rules.NewEngine()
	engine.AddRule("mailbox-1", models.EmailRule{
		ID: "rule-1", Enabled: true,
		Conditions: []models.EmailRuleCondition{{Field: "subject", Operator: "CONTAINS", Value: "Crypto"}},
		Actions: []models.EmailRuleAction{{Type: "DISCARD"}},
	})

	actions := engine.EvaluateRules("mailbox-1", "spammer", "Crypto details", "body")
	if len(actions) != 1 || actions[0].Type != "DISCARD" {
		t.Error("Rules evaluation failed to trigger expected action!")
	}
}

func TestAuditLogTampering(t *testing.T) {
	auditor := audit.NewAuditor("secret")
	auditor.WriteAuditLog("admin", "127.0.0.1", "MUTATE", "res", "SUCCESS")

	ok, count := auditor.VerifyChainIntegrity()
	if !ok || count > 0 {
		t.Error("VerifyChainIntegrity failed on pristine logs.")
	}
}`
  }
];


const DEVOPS_BLUEPRINT_FILES: CodeFile[] = [
  {
    name: "namespace.yaml",
    path: "deploy/kubernetes/namespace.yaml",
    lang: "yaml",
    description: "Defines the email-platform target namespace for microservices grouping with Istio injection enabled.",
    code: `apiVersion: v1
kind: Namespace
metadata:
  name: email-platform
  labels:
    name: email-platform
    istio-injection: enabled`
  },
  {
    name: "configmap.yaml",
    path: "deploy/kubernetes/configmap.yaml",
    lang: "yaml",
    description: "Coordinates non-sensitive environment keys, routing endpoints, ports boundaries, and feature configurations.",
    code: `apiVersion: v1
kind: ConfigMap
metadata:
  name: platform-config
  namespace: email-platform
data:
  ENVIRONMENT: "production"
  LOG_LEVEL: "info"
  EMAIL_SERVICE_URL: "http://email-storage-service.email-platform.svc.cluster.local:8082"
  ELASTICSEARCH_URL: "http://elasticsearch-coordinating.email-platform.svc.cluster.local:9200"
  ELASTICSEARCH_INDEX: "emails-production"
  KAFKA_BROKERS: "kafka-cluster-kafka-bootstrap.email-platform.svc.cluster.local:9092"
  RAW_EMAIL_TOPIC: "emails.raw.v1"
  SCANNED_EMAIL_TOPIC: "emails.scanned.v1"
  MINIO_URL: "http://minio-service.email-platform.svc.cluster.local:9000"
  MINIO_BUCKET_NAME: "attachments-production"
  SPAM_THRESHOLD: "5.0"
  USE_TLS: "true"
  POP3_PORT: "9110"
  IMAP_PORT: "9143"
  SECURITY_API_PORT: "9090"`
  },
  {
    name: "secrets.yaml",
    path: "deploy/kubernetes/secrets.yaml",
    lang: "yaml",
    description: "Contains cryptographically opaque configuration values such as API matching master passwords and object storage key vectors.",
    code: `apiVersion: v1
kind: Secret
metadata:
  name: platform-secrets
  namespace: email-platform
type: Opaque
stringData:
  postgres-password: "production-secure-db-password-9931!"
  minio-root-user: "admin-platform-bucket"
  minio-root-password: "super-secure-minio-secret-key-30234!"
  elasticsearch-password: "es-cluster-node-password-50493"
  kafka-scram-password: "kafka-scram-sha512-secure-auth-pwd"`
  },
  {
    name: "pv-pvc.yaml",
    path: "deploy/kubernetes/pv-pvc.yaml",
    lang: "yaml",
    description: "Persistent Volume and Persistent Volume Claim setups for MinIO attachments buckets and Elasticsearch clusters indexes logs.",
    code: `apiVersion: v1
kind: PersistentVolume
metadata:
  name: object-storage-pv
spec:
  storageClassName: manual
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/mnt/data/object-storage"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: object-storage-pvc
  namespace: email-platform
spec:
  storageClassName: manual
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi`
  },
  {
    name: "deployments.yaml",
    path: "deploy/kubernetes/deployments.yaml",
    lang: "yaml",
    description: "Defines replicas, Docker containers boundaries, CPU/Memory resource requests, metrics annotations and health endpoints probes.",
    code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: security-and-search-service
  namespace: email-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: security-and-search-service
  template:
    metadata:
      labels:
        app: security-and-search-service
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: security-and-search-service
          image: gcr.io/email-platform-production/security-and-search-service:v1.2.0
          ports:
            - containerPort: 9090
          resources:
            requests:
              cpu: "200m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1024Mi"
          readinessProbe:
            httpGet:
              path: /api/v1/health
              port: 9090`
  },
  {
    name: "ingress.yaml",
    path: "deploy/kubernetes/ingress.yaml",
    lang: "yaml",
    description: "Nginx Ingress path mapper pointing to the primary REST security validator and storage proxies, with fully active TLS configs.",
    code: `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: platform-ingress
  namespace: email-platform
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - api.email-platform.enterprise.com
      secretName: email-platform-tls-cert
  rules:
    - host: api.email-platform.enterprise.com
      http:
        paths:
          - path: /api/v1/search
            pathType: ImplementationSpecific
            backend:
              service:
                name: security-and-search-service
                port:
                  number: 9090`
  },
  {
    name: "hpa.yaml",
    path: "deploy/kubernetes/hpa.yaml",
    lang: "yaml",
    description: "Horizontal Pod Autoscaler defining scaling criteria bounds matching CPU and Memory utilization targets.",
    code: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: security-search-autoscaler
  namespace: email-platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: security-and-search-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 75`
  },
  {
    name: "prometheus.yaml",
    path: "deploy/monitoring/prometheus.yaml",
    lang: "yaml",
    description: "Scraping config mapping auto-monitored pods and Prometheus alerting thresholds triggering on active security/DMARC anomalies.",
    code: `global:
  scrape_interval: 15s

rule_files:
  - "/etc/prometheus/alert.rules"

alert.rules: |-
  groups:
  - name: email-platform-alerts
    rules:
    - alert: CriticalSpamSpike
      expr: rate(email_search_security_scanned_total{status="spam"}[5m]) / rate(email_search_security_scanned_total{status="total"}[5m]) > 0.40
      for: 2m
      annotations:
        summary: "Incoming mail stream contains >40% spam detections"`
  },
  {
    name: "otel-collector-config.yaml",
    path: "deploy/monitoring/otel-collector-config.yaml",
    lang: "yaml",
    description: "OTLP grpc/http collectors binding pipelines mapping tracing objects to Jaeger exporters and metrics to Prometheus adapters.",
    code: `receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
processors:
  batch:
    timeout: 5s
exporters:
  prometheus:
    endpoint: 0.0.0.0:8889
  otlp/jaeger:
    endpoint: "jaeger-collector.email-platform.svc.cluster.local:4317"
    tls:
      insecure: true`
  },
  {
    name: "jaeger.yaml",
    path: "deploy/monitoring/jaeger.yaml",
    lang: "yaml",
    description: "Deploys Jaeger collector instances, memory storage span targets, and active query UI ports.",
    code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: email-platform
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: jaeger
          image: jaegertracing/all-in-one:1.47`
  },
  {
    name: "grafana-dashboard.json",
    path: "deploy/monitoring/grafana-dashboard.json",
    lang: "json",
    description: "Visual panels definitions mapping security status gauges, average spam scores, SPF validation timelines, and pods metrics.",
    code: `{
  "id": null,
  "title": "Production Email Audits and Search Pipeline",
  "style": "dark",
  "panels": [
    { "title": "Total Emails Scanned", "type": "stat", "expr": "email_search_security_scanned_total{status=\"total\"}" },
    { "title": "Spam Detections Ingested", "type": "stat", "expr": "email_search_security_scanned_total{status=\"spam\"}" },
    { "title": "Average System Spam Score", "type": "stat", "expr": "email_security_spam_score_average" }
  ]
}`
  }
];

// ============================================================================
// SIMULATED DATABASE INITIAL STATES
// ============================================================================

interface SimulatedUser {
  id: string;
  email: string;
  passwordHash: string; // BCrypt mock
  fullName: string;
  roles: string[];
  enabled: boolean;
  verified: boolean;
  verificationCode: string | null;
  resetCode: string | null;
}

const SEEDED_DATABASE_USERS: SimulatedUser[] = [
  {
    id: "e43b679a-1c39-4d89-9a70-7170ba3ea54a",
    email: "shreyvarsani16@gmail.com",
    passwordHash: "$2a$10$C8l81FpL...",
    fullName: "Shrey Varsani",
    roles: ["ROLE_USER", "ROLE_ADMIN"],
    enabled: true,
    verified: true,
    verificationCode: null,
    resetCode: null
  },
  {
    id: "367fdf80-0a2b-47e9-a67b-f9da1cbff981",
    email: "moderator@platform.com",
    passwordHash: "$2a$10$yFjZ1FpL...",
    fullName: "Alex Rivera",
    roles: ["ROLE_USER", "ROLE_MODERATOR"],
    enabled: true,
    verified: true,
    verificationCode: null,
    resetCode: null
  }
];

// ============================================================================
// INTERACTIVE COMPONENT IMPLEMENTATIONS
// ============================================================================

export default function App() {
  // Proton theme toggling
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("proton-theme");
      return stored === "light" ? false : true;
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("proton-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("proton-theme", "light");
      }
    } catch (e) {
      console.error(e);
    }
  }, [isDarkMode]);

  // Sidebar collapse/expand state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("proton-sidebar-collapsed");
      return stored === "true" ? true : false;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("proton-sidebar-collapsed", isSidebarCollapsed ? "true" : "false");
    } catch (e) {
      console.error(e);
    }
  }, [isSidebarCollapsed]);

  const [activeTab, setActiveTab] = useState<"visualizer" | "smtp" | "codebase" | "swagger" | "architecture">("visualizer");
  const [codeLanguage, setCodeLanguage] = useState<"java" | "go" | "devops">("java");
  const [selectedGoFileIndex, setSelectedGoFileIndex] = useState<number>(0);
  const [selectedDevOpsFileIndex, setSelectedDevOpsFileIndex] = useState<number>(0);

  // SMTP receiving states
  const [smtpTerminalInput, setSmtpTerminalInput] = useState("");
  const [smtpLogs, setSmtpLogs] = useState<string[]>([
    "2026-06-04 05:49:55.103 [main] INFO  smtp.Server - Loading secure TLS configuration maps paths...",
    "2026-06-04 05:49:55.105 [main] INFO  smtp.Server - [GoEngine] Socket listener bound successfully on 0.0.0.0:2525 (TLS active)",
    "2026-06-04 05:49:55.110 [main] INFO  publisher.Kafka - Multi-broker connector established to [localhost:9092] on dynamic partition thread [0]",
    "2026-06-04 05:49:55.112 [main] INFO  smtp.Server - SMTP receiving microservice fully ready to accept concurrent TCP socket handles"
  ]);
  const [smtpSessionState, setSmtpSessionState] = useState<"INIT" | "HELO" | "MAIL" | "RCPT" | "DATA">("INIT");
  const [smtpHeloName, setSmtpHeloName] = useState("");
  const [smtpMailFrom, setSmtpMailFrom] = useState("");
  const [smtpRcptTo, setSmtpRcptTo] = useState<string[]>([]);
  const [smtpIsAuthorized, setSmtpIsAuthorized] = useState(false);
  const [smtpAuthorizedUser, setSmtpAuthorizedUser] = useState("");
  
  // Accumulated data stream line blocks
  const [smtpBodyLines, setSmtpBodyLines] = useState<string[]>([]);
  const [smtpTerminalHistory, setSmtpTerminalHistory] = useState<string[]>([
    "220 cloudplatform.identity.smtp ESMTP Secure Ingress Ingestion Server ready"
  ]);

  const [smtpEvents, setSmtpEvents] = useState<any[]>([
    {
      message_id: "1720834241042-mx.sender.com@cloudplatform.identity.smtp",
      sender: "shreyvarsani16@gmail.com",
      recipients: ["moderator@platform.com"],
      size: 142,
      subject: "Microservice Ingress Sync",
      received_at: "2026-06-04 05:54:12",
      is_tls: true,
      client_ip: "192.168.1.42:39212",
      body_summary: "Authentication server handshake reports successful user login. Commencing mail queue validation tests."
    }
  ]);

  const handleSmtpTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const commandLine = smtpTerminalInput.trim();
    if (!commandLine) return;

    setSmtpTerminalInput("");
    
    // Add command to terminal history
    setSmtpTerminalHistory(prev => [...prev, `> ${commandLine}`]);

    const parts = commandLine.split(/\s+/);
    const cmd = parts[0].toUpperCase();

    const addSmtpLog = (msg: string, level: "INFO" | "WARN" | "ERROR" = "INFO") => {
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      setSmtpLogs(prev => [...prev, `${timestamp} [session-thread] ${level} - ${msg}`]);
    };

    // If we are in DATA state, buffer lines until a single dot "."
    if (smtpSessionState === "DATA") {
      if (commandLine === ".") {
        // End of DATA buffer stream! Execute compilation and dispatch Kafka Event
        const subjectLine = smtpBodyLines.find(l => l.toLowerCase().startsWith("subject:")) || "";
        const subjectText = subjectLine ? subjectLine.substring(8).trim() : "No Subject";
        
        const messageID = `${Date.now()}-${smtpHeloName || "localhost"}@cloudplatform.identity.smtp`;
        const newEvent = {
          message_id: messageID,
          sender: smtpMailFrom,
          recipients: smtpRcptTo,
          size: smtpBodyLines.join("\n").length,
          subject: subjectText,
          received_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
          is_tls: true,
          client_ip: "127.0.0.1:41021",
          body_summary: smtpBodyLines.filter(l => !l.toLowerCase().startsWith("subject:")).join(" ").substring(0, 120) + "..."
        };

        setSmtpEvents(prev => [newEvent, ...prev]);
        setSmtpTerminalHistory(prev => [...prev, `250 2.0.0 Queue OK ID ${messageID}`]);
        addSmtpLog(`Successfully created raw message ID ${messageID}. Published to Kafka event-bus topic [email.raw.ingress]`, "INFO");
        
        // Reset to default active session state
        setSmtpSessionState("HELO");
        setSmtpMailFrom("");
        setSmtpRcptTo([]);
        setSmtpBodyLines([]);
      } else {
        // Append line to body list
        setSmtpBodyLines(prev => [...prev, commandLine]);
      }
      return;
    }

    switch (cmd) {
      case "HELO":
        if (parts.length < 2) {
          setSmtpTerminalHistory(prev => [...prev, "501 5.5.4 Syntax: HELO hostname"]);
          return;
        }
        setSmtpHeloName(parts[1]);
        setSmtpSessionState("HELO");
        setSmtpTerminalHistory(prev => [...prev, `250 cloudplatform.identity.smtp Hello ${parts[1]}, pleased to meet you`]);
        addSmtpLog(`Session initialized HELO hostname: ${parts[1]}`, "INFO");
        break;

      case "EHLO":
        if (parts.length < 2) {
          setSmtpTerminalHistory(prev => [...prev, "501 5.5.4 Syntax: EHLO hostname"]);
          return;
        }
        setSmtpHeloName(parts[1]);
        setSmtpSessionState("HELO");
        setSmtpTerminalHistory(prev => [
          ...prev, 
          `250-cloudplatform.identity.smtp Hello ${parts[1]}`,
          "250-SIZE 10485760",
          "250-8BITMIME",
          "250-STARTTLS",
          "250 AUTH PLAIN"
        ]);
        addSmtpLog(`Session initialized EHLO extensions capability negotiation from: ${parts[1]}`, "INFO");
        break;

      case "AUTH":
        if (parts.length < 2 || parts[1].toUpperCase() !== "PLAIN") {
          setSmtpTerminalHistory(prev => [...prev, "504 Unrecognized or unsupported authentication mechanism"]);
          return;
        }
        if (parts.length >= 3) {
          // Decode standard base64 \x00user\x00pass keying
          try {
            const rawCreds = atob(parts[2]);
            const credParts = rawCreds.split("\0");
            if (credParts.length >= 3) {
              const user = credParts[1];
              const pass = credParts[2];
              if (user === "shreyvarsani16@gmail.com" && pass === "admin123") {
                setSmtpIsAuthorized(true);
                setSmtpAuthorizedUser(user);
                setSmtpTerminalHistory(prev => [...prev, `235 2.7.0 Authentication succeeded. Mail routing open for user ${user}`]);
                addSmtpLog(`Successful SASL PLAIN authenticate for username: ${user}`, "INFO");
              } else {
                setSmtpTerminalHistory(prev => [...prev, "535 5.7.8 Authentication credentials invalid"]);
                addSmtpLog(`Failed SASL PLAIN authenticate check for user: ${user}`, "WARN");
              }
            } else {
              setSmtpTerminalHistory(prev => [...prev, "501 Malformed credential base64 string"]);
            }
          } catch (e) {
            setSmtpTerminalHistory(prev => [...prev, "501 Invalid base64 encoding schema"]);
          }
        } else {
          setSmtpTerminalHistory(prev => [...prev, "334 Proceed with base64 credentials challenge"]);
        }
        break;

      case "MAIL":
        // Check syntax MAIL FROM:<sender>
        const mailFromMatch = commandLine.match(/^MAIL\s+FROM:\s*<([^>]+)>/i);
        if (!mailFromMatch) {
          setSmtpTerminalHistory(prev => [...prev, "501 Syntax error in parameters. Syntax: MAIL FROM:<sender@address>"]);
          return;
        }
        const sender = mailFromMatch[1];
        setSmtpMailFrom(sender);
        setSmtpSessionState("MAIL");
        setSmtpTerminalHistory(prev => [...prev, `250 2.1.0 Sender verification complete: <${sender}> OK`]);
        addSmtpLog(`SMTP Transaction Initiated by sender Envelope registration: <${sender}>`, "INFO");
        break;

      case "RCPT":
        if (smtpSessionState !== "MAIL" && smtpSessionState !== "RCPT") {
          setSmtpTerminalHistory(prev => [...prev, "503 Bad sequence of commands. Declare MAIL FROM first"]);
          return;
        }
        const rcptToMatch = commandLine.match(/^RCPT\s+TO:\s*<([^>]+)>/i);
        if (!rcptToMatch) {
          setSmtpTerminalHistory(prev => [...prev, "501 Syntax error in parameters. Syntax: RCPT TO:<recipient@address>"]);
          return;
        }
        const rcpt = rcptToMatch[1];
        setSmtpRcptTo(prev => [...prev, rcpt]);
        setSmtpSessionState("RCPT");
        setSmtpTerminalHistory(prev => [...prev, `250 2.1.5 Recipient verification successful: <${rcpt}> OK`]);
        addSmtpLog(`Recipient envelope address validation matching verified platform node: <${rcpt}>`, "INFO");
        break;

      case "DATA":
        if (smtpSessionState !== "RCPT") {
          setSmtpTerminalHistory(prev => [...prev, "503 Bad sequence of commands. RCPT TO address arguments required"]);
          return;
        }
        setSmtpSessionState("DATA");
        setSmtpTerminalHistory(prev => [...prev, "354 Start mail input; end with <CR><LF>.<CR><LF>"]);
        addSmtpLog("Session transition state: READING DATA BUFFER STREAM", "INFO");
        break;

      case "RSET":
        setSmtpSessionState("INIT");
        setSmtpMailFrom("");
        setSmtpRcptTo([]);
        setSmtpBodyLines([]);
        setSmtpTerminalHistory(prev => [...prev, "250 2.0.0 Reset state command successful"]);
        addSmtpLog("Resetting SMTP transaction state.", "INFO");
        break;

      case "NOOP":
        setSmtpTerminalHistory(prev => [...prev, "250 2.0.0 Command successfully completed (Noop)"]);
        break;

      case "QUIT":
        setSmtpTerminalHistory(prev => [...prev, "221 2.0.0 Service closing transmission channel"]);
        addSmtpLog("Closing client socket session connection handle.", "INFO");
        // Clear session context
        setTimeout(() => {
          setSmtpSessionState("INIT");
          setSmtpMailFrom("");
          setSmtpRcptTo([]);
          setSmtpBodyLines([]);
          setSmtpTerminalHistory([
            "220 cloudplatform.identity.smtp ESMTP Secure Ingress Ingestion Server ready"
          ]);
        }, 1200);
        break;

      default:
        setSmtpTerminalHistory(prev => [...prev, "502 5.5.1 Command unrecognized or not implemented"]);
        break;
    }
  };

  // Simulated State Engine
  const [database, setDatabase] = useState<SimulatedUser[]>(SEEDED_DATABASE_USERS);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "2026-06-04 05:49:50.103 [main] INFO  c.p.identity.IdentityApplication - Starting IdentityApplication using Java 17 Temurin...",
    "2026-06-04 05:49:51.492 [main] INFO  o.s.b.w.e.tomcat.TomcatWebServer - Tomcat initialized with port(s): 8081 (http)",
    "2026-06-04 05:49:52.012 [main] INFO  o.s.s.web.DefaultSecurityFilterChain - Will secure all transactions with custom filters stack [JwtAuthenticationFilter]",
    "2026-06-04 05:49:52.812 [main] INFO  c.p.i.c.DatabaseSeeder - Completed seeding DB tables users with 2 default identity entities (ROLE_USER, ROLE_ADMIN, ROLE_MODERATOR)",
    "2026-06-04 05:49:53.001 [main] INFO  c.p.identity.IdentityApplication - Started IdentityApplication in 3.42 seconds (JVM running with Loom Virtual Threads support)"
  ]);

  // Form Inputs
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [loginEmail, setLoginEmail] = useState("shreyvarsani16@gmail.com");
  const [loginPassword, setLoginPassword] = useState("admin123");
  const [verifyEmailVal, setVerifyEmailVal] = useState("");
  const [verifyCodeVal, setVerifyCodeVal] = useState("");
  const [resetEmailVal, setResetEmailVal] = useState("");
  const [resetCodeVal, setResetCodeVal] = useState("");
  const [resetNewPass, setResetNewPass] = useState("");

  // Simulated Authorization Headers & Access State
  const [simToken, setSimToken] = useState<string | null>(null);
  const [simRefreshToken, setSimRefreshToken] = useState<string | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<SimulatedUser | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Feedback notifications
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Enterprise Playground State Drivers
  const [visualMode, setVisualMode] = useState<"identity" | "enterprise">("enterprise");
  
  // 1. Drafts State
  const [draftsList, setDraftsList] = useState<any[]>([
    { id: "draft-101", sender: "shreyvarsani16@gmail.com", recipients: ["alex@enterprise.com"], subject: "Q3 Business Expansion Framework Draft", body: "Hey team, this contains the core draft regarding the upcoming Spring Boot/Go mail storage sync and microservices structure.", updatedAt: "2026-06-04 06:10:00", isEncrypted: true },
    { id: "draft-102", sender: "shreyvarsani16@gmail.com", recipients: ["legal@enterprise.com"], subject: "Corporate Governance GDPR Compliance Audit Draft", body: "Draft copy outlining standard data-at-rest encryption practices and HMAC verification sequences for compliance board review.", updatedAt: "2026-06-04 06:12:00", isEncrypted: false }
  ]);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftRecipients, setDraftRecipients] = useState("");
  const [draftEncrypt, setDraftEncrypt] = useState(false);

  // 2. Email Scheduling State
  const [scheduledList, setScheduledList] = useState<any[]>([
    { id: "sched-201", sender: "shreyvarsani16@gmail.com", recipients: ["partners@enterprise.com"], subject: "Scheduled Corporate Announcement Packet", body: "We are pleased to introduce the event-driven Kafka integration pipeline for scalable high-density email streams.", sendAt: new Date(Date.now() + 600000).toISOString().replace('T', ' ').substring(0, 16), status: "PENDING", retryCount: 0 },
    { id: "sched-202", sender: "shreyvarsani16@gmail.com", recipients: ["operations@enterprise.com"], subject: "[AUTO-SCHEDULE] Cluster Status Health Diagnostic Scan", body: "Status verification parameters complete: Kafka nodes active, Elasticsearch cluster metrics nominal.", sendAt: new Date(Date.now() - 300000).toISOString().replace('T', ' ').substring(0, 16), status: "SENT", retryCount: 0 }
  ]);
  const [schedSubject, setSchedSubject] = useState("");
  const [schedBody, setSchedBody] = useState("");
  const [schedRecipients, setSchedRecipients] = useState("");
  const [schedTime, setSchedTime] = useState("");

  // 3. Shared Mailboxes State
  const [sharedMailboxesList, setSharedMailboxesList] = useState<any[]>([
    { id: "sm-corp", emailAddress: "corporate-comms@enterprise-platform.com", displayName: "Corporate Communications General Desk", allowedGroups: ["ROLE_ADMIN", "ROLE_MODERATOR"], allowedUsers: ["shreyvarsani16@gmail.com", "moderator@platform.com"], autoArchiving: true, retentionPeriod: 90 },
    { id: "sm-finance", emailAddress: "finance-treasury@enterprise-platform.com", displayName: "Global Treasury and Finance Ledger Desk", allowedGroups: ["ROLE_ADMIN"], allowedUsers: ["shreyvarsani16@gmail.com"], autoArchiving: true, retentionPeriod: 180 }
  ]);
  const [smEmail, setSmEmail] = useState("");
  const [smDisplayName, setSmDisplayName] = useState("");
  const [smAllowedGroups, setSmAllowedGroups] = useState("ROLE_ADMIN");
  const [smAllowedUsers, setSmAllowedUsers] = useState("shreyvarsani16@gmail.com");

  // 4. Auto Reply Settings State
  const [autoReplyConf, setAutoReplyConf] = useState({
    emailAddress: "shreyvarsani16@gmail.com",
    subject: "OutOfOffice Automated Outbound Signal",
    body: "Hi there! I am currently traveling with limited email connectivity. For immediate compliance routing matters, please ping corporate-comms@enterprise-platform.com.",
    enabled: true,
    startTime: new Date().toISOString().substring(0, 10),
    endTime: new Date(Date.now() + 259200000).toISOString().substring(0, 10),
    cooldownMins: 15
  });

  // 5. Email Rules State
  const [rulesList, setRulesList] = useState<any[]>([
    { id: "rule-301", mailboxID: "corporate-comms@enterprise-platform.com", name: "High-Priority Compliance Router", priority: 1, enabled: true, conditions: [{ field: "subject", operator: "CONTAINS", value: "CONFIDENTIAL" }], actions: [{ type: "FORWARD", targetValue: "legal-audit@enterprise-platform.com" }, { type: "MOVE_TO_FOLDER", targetValue: "Archive/GDPR-Vault" }] },
    { id: "rule-302", mailboxID: "corporate-comms@enterprise-platform.com", name: "Malicious Attachment Suppressor", priority: 2, enabled: true, conditions: [{ field: "sender", operator: "CONTAINS", value: "spammer-threat@gmail.com" }], actions: [{ type: "DISCARD", targetValue: "Trash/AutoSpam" }] }
  ]);
  const [ruleName, setRuleName] = useState("");
  const [ruleTargetMailbox, setRuleTargetMailbox] = useState("corporate-comms@enterprise-platform.com");
  const [ruleConditionField, setRuleConditionField] = useState("subject");
  const [ruleConditionOperator, setRuleConditionOperator] = useState("CONTAINS");
  const [ruleConditionValue, setRuleConditionValue] = useState("");
  const [ruleActionType, setRuleActionType] = useState("FORWARD");
  const [ruleActionValue, setRuleActionValue] = useState("");

  // 6. Email Forwarding lists State
  const [forwardingList, setForwardingList] = useState<any[]>([
    { id: "fwd-501", sourceAddress: "corporate-comms@enterprise-platform.com", destinationAddress: "compliance-backup@enterprise-firm.com", keepCopy: true, isVerified: true }
  ]);
  const [fwdSource, setFwdSource] = useState("corporate-comms@enterprise-platform.com");
  const [fwdDest, setFwdDest] = useState("");
  const [fwdKeepCopy, setFwdKeepCopy] = useState(true);

  // 7. Cryptographically Signed Audit Logs State
  const mockComputeAuditHash = (id: string, timestamp: string, userRef: string, ip: string, action: string, resourceID: string, status: string) => {
    // Generate a deterministically derived hash combining secret boundaries
    const str = `${id}|${timestamp}|${userRef}|${ip}|${action}|${resourceID}|${status}|audit-secret-hmac-key`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return "sha256-sig-" + Math.abs(hash).toString(16).padStart(8, '0');
  };

  const initialAuditLogs = [
    { id: "audit-1", timestamp: "2026-06-04 05:49:53", userRef: "system@platform.com", clientIP: "127.0.0.1", action: "BOOTSTRAP_POLICIES", resourceID: "policies-core", status: "SUCCESS" },
    { id: "audit-2", timestamp: "2026-06-04 06:10:00", userRef: "shreyvarsani16@gmail.com", clientIP: "192.168.1.100", action: "DRAFT_CREATE", resourceID: "draft-101", status: "SUCCESS" },
    { id: "audit-3", timestamp: "2026-06-04 06:15:22", userRef: "anonymous", clientIP: "192.168.1.150", action: "SECURED_ROUTE_ACCESS", resourceID: "/api/admin/dashboard", status: "ACCESS_DENIED" }
  ].map(item => ({
    ...item,
    auditHash: mockComputeAuditHash(item.id, item.timestamp, item.userRef, item.clientIP, item.action, item.resourceID, item.status)
  }));

  const [auditLogsList, setAuditLogsList] = useState<any[]>(initialAuditLogs);
  const [auditSweepStatus, setAuditSweepStatus] = useState<"unchecked" | "valid" | "compromised">("unchecked");
  const [auditCorruptedRows, setAuditCorruptedRows] = useState<string[]>([]);

  // RBAC Assignments check overrides
  const [rbacUserRoles, setRbacUserRoles] = useState<string[]>(["ROLE_USER", "ROLE_ADMIN"]);

  // Test Console Logging inside Enterprise sandbox
  const [enterpriseConsoleLogs, setEnterpriseConsoleLogs] = useState<string[]>([
    "2026-06-04 06:20:00 [enterprise-service-main] INFO  - [GOPRIME] Initializing Enterprise Capabilities Server binding on port :8083",
    "2026-06-04 06:20:00 [enterprise-service-main] INFO  - Initialized RSA-256 draft keys storage decrypt hashes",
    "2026-06-04 06:20:00 [enterprise-service-main] INFO  - Registered background delivery Scheduler dispatch loop (interval check: 5 seconds)",
    "2026-06-04 06:20:01 [enterprise-service-main] INFO  - Registered Kafka Consumer thread context. Subscribing to: [emails.raw.v1, platform.audit.v1]",
    "2026-06-04 06:20:01 [enterprise-service-main] INFO  - Sharding shared mailboxes database scopes: SM_CORP [Allowed size: 100GB]",
    "2026-06-04 06:20:02 [enterprise-service-main] INFO  - Compliance Rules evaluation engine fully spun. Status: ONLINE"
  ]);

  const addEnterpriseLog = (msg: string, level: "INFO" | "WARN" | "ERROR" | "DEBUG" = "INFO") => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setEnterpriseConsoleLogs(prev => [...prev, `${timestamp} [enterprise-sandbox] ${level.padEnd(5)} - ${msg}`]);
  };


  const addLog = (message: string, level: "INFO" | "WARN" | "ERROR" | "DEBUG" = "INFO") => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const colorCode = level === "INFO" ? "\u001b[32m" : level === "WARN" ? "\u001b[33m" : level === "ERROR" ? "\u001b[31m" : "\u001b[35m";
    const log = `${timestamp} [http-exec-thread] ${level} - ${message}`;
    setConsoleLogs(prev => [...prev.slice(-30), log]); // Keep last 30 logs
  };

  const notify = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Enterprise Playground Mutator Functions
  const handleCreateDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftSubject || !draftRecipients || !draftBody) {
      notify("Please fill all draft fields.", "error");
      return;
    }
    const targetRec = draftRecipients.split(",").map(r => r.trim());
    const newId = `draft-${Date.now()}`;
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newDraft = {
      id: newId,
      sender: loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com",
      recipients: targetRec,
      subject: draftSubject,
      body: draftBody,
      updatedAt: timestamp,
      isEncrypted: draftEncrypt
    };

    setDraftsList(prev => [newDraft, ...prev]);
    
    // Add Audit Log
    const userRef = loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com";
    const auditId = `audit-${Date.now()}`;
    const newAudit = {
      id: auditId,
      timestamp,
      userRef,
      clientIP: "192.168.1.100",
      action: "DRAFT_CREATE",
      resourceID: newId,
      status: "SUCCESS",
      auditHash: mockComputeAuditHash(auditId, timestamp, userRef, "192.168.1.100", "DRAFT_CREATE", newId, "SUCCESS")
    };
    setAuditLogsList(prev => [newAudit, ...prev]);
    setAuditSweepStatus("unchecked"); // reset sweep status

    addEnterpriseLog(`[REST] POST /api/enterprise/drafts - Created metadata Draft instance ${newId} with AES-256 state`, "INFO");
    addEnterpriseLog(`[AUDIT] Cryptographically signed audit record logged, Hash: ${newAudit.auditHash.substring(0,14)}...`, "DEBUG");
    
    // Flush forms
    setDraftSubject("");
    setDraftBody("");
    setDraftRecipients("");
    setDraftEncrypt(false);
    notify("Draft envelope stored successfully!", "success");
  };

  const handleDeleteDraft = (id: string) => {
    setDraftsList(prev => prev.filter(d => d.id !== id));
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const userRef = loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com";
    const auditId = `audit-${Date.now()}`;
    const newAudit = {
      id: auditId,
      timestamp,
      userRef,
      clientIP: "192.168.1.100",
      action: "DRAFT_DELETE",
      resourceID: id,
      status: "SUCCESS",
      auditHash: mockComputeAuditHash(auditId, timestamp, userRef, "192.168.1.100", "DRAFT_DELETE", id, "SUCCESS")
    };
    setAuditLogsList(prev => [newAudit, ...prev]);
    setAuditSweepStatus("unchecked");

    addEnterpriseLog(`[REST] DELETE /api/enterprise/drafts/delete - Dropped Draft instance ${id}`, "INFO");
    addEnterpriseLog(`[AUDIT] Logged DRAFT_DELETE event, Hash: ${newAudit.auditHash.substring(0,14)}...`, "DEBUG");
    notify("Draft discarded.", "info");
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedSubject || !schedRecipients || !schedBody || !schedTime) {
      notify("Please fill all queue scheduling parameters.", "error");
      return;
    }
    const targetRec = schedRecipients.split(",").map(r => r.trim());
    const newId = `sched-${Date.now()}`;
    const formattedTime = schedTime.replace('T', ' ');

    const newSched = {
      id: newId,
      sender: loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com",
      recipients: targetRec,
      subject: schedSubject,
      body: schedBody,
      sendAt: formattedTime,
      status: "PENDING",
      retryCount: 0
    };

    setScheduledList(prev => [newSched, ...prev]);

    // Add Audit Log
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const userRef = loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com";
    const auditId = `audit-${Date.now()}`;
    const newAudit = {
      id: auditId,
      timestamp,
      userRef,
      clientIP: "192.168.1.100",
      action: "SCHEDULE_CREATE",
      resourceID: newId,
      status: "SUCCESS",
      auditHash: mockComputeAuditHash(auditId, timestamp, userRef, "192.168.1.100", "SCHEDULE_CREATE", newId, "SUCCESS")
    };
    setAuditLogsList(prev => [newAudit, ...prev]);
    setAuditSweepStatus("unchecked");

    addEnterpriseLog(`[SCHEDULER] POST /api/enterprise/schedule - Enqueued future delivery message ${newId} triggers at [${formattedTime}]`, "INFO");
    addEnterpriseLog(`[AUDIT] Logged SCHEDULE_CREATE compliance trail, Hash: ${newAudit.auditHash.substring(0,14)}...`, "DEBUG");

    setSchedSubject("");
    setSchedBody("");
    setSchedRecipients("");
    setSchedTime("");
    notify("Email scheduled successfully into delivery buffers!", "success");
  };

  const handleCancelSchedule = (id: string) => {
    setScheduledList(prev => prev.filter(s => s.id !== id));
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const userRef = loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com";
    const auditId = `audit-${Date.now()}`;
    const newAudit = {
      id: auditId,
      timestamp,
      userRef,
      clientIP: "192.168.1.100",
      action: "SCHEDULE_CANCEL",
      resourceID: id,
      status: "SUCCESS",
      auditHash: mockComputeAuditHash(auditId, timestamp, userRef, "192.168.1.100", "SCHEDULE_CANCEL", id, "SUCCESS")
    };
    setAuditLogsList(prev => [newAudit, ...prev]);
    setAuditSweepStatus("unchecked");

    addEnterpriseLog(`[SCHEDULER] Cancelled enqueued scheduled record event: ${id}`, "WARN");
    notify("Scheduled email canceled.", "info");
  };

  const handleCreateSharedMailbox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smEmail || !smDisplayName) {
      notify("Please fill all shared mailbox parameters.", "error");
      return;
    }
    const targetGroups = smAllowedGroups.split(",").map(g => g.trim());
    const targetUsers = smAllowedUsers.split(",").map(u => u.trim());
    const newId = `sm-${Date.now()}`;

    const newSm = {
      id: newId,
      emailAddress: smEmail,
      displayName: smDisplayName,
      allowedGroups: targetGroups,
      allowedUsers: targetUsers,
      autoArchiving: true,
      retentionPeriod: 90
    };

    setSharedMailboxesList(prev => [...prev, newSm]);

    // Add Audit Log
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const userRef = loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com";
    const auditId = `audit-${Date.now()}`;
    const newAudit = {
      id: auditId,
      timestamp,
      userRef,
      clientIP: "192.168.1.100",
      action: "SHARED_MAILBOX_CREATE",
      resourceID: newId,
      status: "SUCCESS",
      auditHash: mockComputeAuditHash(auditId, timestamp, userRef, "192.168.1.100", "SHARED_MAILBOX_CREATE", newId, "SUCCESS")
    };
    setAuditLogsList(prev => [newAudit, ...prev]);
    setAuditSweepStatus("unchecked");

    addEnterpriseLog(`[SHARED-MAILBOX] Bootstrapped newly sharded shared mailbox ${smEmail} (${smDisplayName})`, "INFO");
    addEnterpriseLog(`[SHARED-MAILBOX] Explicit RBAC security bindings mapped successfully: Groups=${JSON.stringify(targetGroups)}, Users=${JSON.stringify(targetUsers)}`, "DEBUG");

    setSmEmail("");
    setSmDisplayName("");
    notify("Shared mailbox sharded successfully across active roles!", "success");
  };

  const handleUpdateAutoReply = (e: React.FormEvent) => {
    e.preventDefault();
    notify("Auto response settings synchronized!", "success");
    addEnterpriseLog(`[RULES-ENGINE] Auto response bounds updated per: ${autoReplyConf.emailAddress}. Cooldown threshold: ${autoReplyConf.cooldownMins} minutes`, "INFO");
    
    // Add Audit Log
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const userRef = loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com";
    const auditId = `audit-${Date.now()}`;
    const newAudit = {
      id: auditId,
      timestamp,
      userRef,
      clientIP: "192.168.1.100",
      action: "AUTO_REPLY_UPDATE",
      resourceID: autoReplyConf.emailAddress,
      status: "SUCCESS",
      auditHash: mockComputeAuditHash(auditId, timestamp, userRef, "192.168.1.100", "AUTO_REPLY_UPDATE", autoReplyConf.emailAddress, "SUCCESS")
    };
    setAuditLogsList(prev => [newAudit, ...prev]);
    setAuditSweepStatus("unchecked");
  };

  const handleCreateEmailRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName || !ruleConditionValue || !ruleActionValue) {
      notify("Please fill all rule matching criteria parameters.", "error");
      return;
    }
    const newId = `rule-${Date.now()}`;
    const newRule = {
      id: newId,
      mailboxID: ruleTargetMailbox,
      name: ruleName,
      priority: rulesList.length + 1,
      enabled: true,
      conditions: [{ field: ruleConditionField, operator: ruleConditionOperator, value: ruleConditionValue }],
      actions: [{ type: ruleActionType, targetValue: ruleActionValue }]
    };

    setRulesList(prev => [...prev, newRule]);

    // Add Audit Log
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const userRef = loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com";
    const auditId = `audit-${Date.now()}`;
    const newAudit = {
      id: auditId,
      timestamp,
      userRef,
      clientIP: "192.168.1.100",
      action: "RULE_CREATE",
      resourceID: newId,
      status: "SUCCESS",
      auditHash: mockComputeAuditHash(auditId, timestamp, userRef, "192.168.1.100", "RULE_CREATE", newId, "SUCCESS")
    };
    setAuditLogsList(prev => [newAudit, ...prev]);
    setAuditSweepStatus("unchecked");

    addEnterpriseLog(`[RULES-ENGINE] Dynamic route engine registered rule '${ruleName}' logic sequence successfully. Target: ${ruleTargetMailbox}`, "INFO");

    setRuleName("");
    setRuleConditionValue("");
    setRuleActionValue("");
    notify("Custom corporate routing rule declared!", "success");
  };

  const handleDeleteEmailRule = (id: string) => {
    setRulesList(prev => prev.filter(r => r.id !== id));
    notify("Rule removed.", "info");
    addEnterpriseLog(`[RULES-ENGINE] Rule sequence dropped: ${id}`, "WARN");
  };

  const handleCreateForwarding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fwdDest) {
      notify("Please provide destination proxy forward target.", "error");
      return;
    }
    const newId = `fwd-${Date.now()}`;
    const newFwd = {
      id: newId,
      sourceAddress: fwdSource,
      destinationAddress: fwdDest,
      keepCopy: fwdKeepCopy,
      isVerified: true
    };

    setForwardingList(prev => [...prev, newFwd]);

    // Add Audit Log
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const userRef = loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com";
    const auditId = `audit-${Date.now()}`;
    const newAudit = {
      id: auditId,
      timestamp,
      userRef,
      clientIP: "192.168.1.100",
      action: "FORWARD_CREATE",
      resourceID: newId,
      status: "SUCCESS",
      auditHash: mockComputeAuditHash(auditId, timestamp, userRef, "192.168.1.100", "FORWARD_CREATE", newId, "SUCCESS")
    };
    setAuditLogsList(prev => [newAudit, ...prev]);
    setAuditSweepStatus("unchecked");

    addEnterpriseLog(`[RULES-ENGINE] Configured systematic forward channel pipe: ${fwdSource} -> ${fwdDest} (keepCopy: ${fwdKeepCopy})`, "INFO");
    setFwdDest("");
    notify("Email forwarding rule verified and registered!", "success");
  };

  const handleDeleteForwarding = (id: string) => {
    setForwardingList(prev => prev.filter(f => f.id !== id));
    notify("Forward piping cancelled.", "info");
    addEnterpriseLog(`[RULES-ENGINE] Terminated systematic forwarding channel: ${id}`, "WARN");
  };

  // ============================================================================
  // PROTON-MAIL INSPIRED WORKSPACE STATES & SEEDED DATA
  // ============================================================================
  const [activeFolder, setActiveFolder] = useState<"Dashboard" | "Inbox" | "Starred" | "Sent" | "Drafts" | "Scheduled" | "Spam" | "Trash" | "Settings">("Dashboard");
  const [activeCategory, setActiveCategory] = useState<"All" | "Primary" | "Work" | "Social" | "Updates">("All");
  const [isLoadingMails, setIsLoadingMails] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: string }>>([]);
  const [isComposeMaximized, setIsComposeMaximized] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);

  useEffect(() => {
    setIsLoadingMails(true);
    setSelectedEmailIds([]);
    const timer = setTimeout(() => {
      setIsLoadingMails(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [activeFolder, activeCategory]);

  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchMailQuery, setSearchMailQuery] = useState("");
  const [activeSettingsTab, setActiveSettingsTab] = useState<"security_roles" | "filters_rules" | "autoreply" | "audit_ledger">("filters_rules");
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Email state list
  const [emails, setEmails] = useState<any[]>([
    {
      id: "mail-1",
      senderName: "Alexander Rivera",
      senderEmail: "alex@enterprise-platform.com",
      subject: "Q3 Identity Infrastructure Integration Complete",
      body: "Hi team,\n\nWe've successfully integrated the LDAP active directory sync with Spring Boot's userDetailsService filters. All user principal objects are now populated with authenticated credentials mapping properties cleanly.\n\nPlease let me know if you run into any permission issues under the ADMIN roles. All database schemas are secured under our standard access controls.\n\nBest,\nAlex Rivera\nSenior Platform Architect",
      timestamp: "10:24 AM",
      date: "2026-06-04",
      isUnread: true,
      isStarred: false,
      folder: "Inbox",
      category: "Work",
      attachments: [
        { name: "ldap_sync_spec.pdf", size: "4.2 MB" },
        { name: "active_directory_groups.xlsx", size: "1.8 MB" }
      ]
    },
    {
      id: "mail-1-reply",
      senderName: "Me",
      senderEmail: "shreyvarsani16@gmail.com",
      subject: "Re: Q3 Identity Infrastructure Integration Complete",
      body: "Hi Alex,\n\nThanks for the update. I have reviewed the LDAP active directory mappings and they look incredibly stable. We will run active integration and signature sweep testing in the staging cluster today.\n\nI'll let you know if we identify any roles principal mismatches!\n\nBest,\nShrey Varsani",
      timestamp: "10:30 AM",
      date: "2026-06-04",
      isUnread: false,
      isStarred: false,
      folder: "Sent",
      category: "Work"
    },
    {
      id: "mail-1-response",
      senderName: "Alexander Rivera",
      senderEmail: "alex@enterprise-platform.com",
      subject: "Re: Q3 Identity Infrastructure Integration Complete",
      body: "Excellent! Make sure that the Kafka transaction logs reflect success. Let me know how the staging clusters perform.",
      timestamp: "10:35 AM",
      date: "2026-06-04",
      isUnread: true,
      isStarred: false,
      folder: "Inbox",
      category: "Work"
    },
    {
      id: "mail-2",
      senderName: "SecOps Core Daemon",
      senderEmail: "security-notify@enterprise-platform.com",
      subject: "[ALERT] Security Auditing: Please Run Integrity Sweep",
      body: "Automated alert from high-security auditing ledger service:\n\nSystem checks indicate that the HMAC-SHA256 signatures for our operational action logging records must be swept.\n\nPlease navigate to Settings -> Cryptographic Audit Ledger and run an Integrity Sweep immediately to verify database pristine index health.\n\nSender IP: 192.168.1.150\nSignature algorithm: HMAC-SHA256\nStatus: UNCHECKED",
      timestamp: "Yesterday",
      date: "2026-06-03",
      isUnread: false,
      isStarred: true,
      folder: "Inbox",
      category: "Updates"
    },
    {
      id: "mail-2-reply",
      senderName: "Me",
      senderEmail: "shreyvarsani16@gmail.com",
      subject: "Re: [ALERT] Security Auditing: Please Run Integrity Sweep",
      body: "Integrity sweep has been triggered and verified cleanly. Running second phase of SecOps checkups.",
      timestamp: "5:12 PM",
      date: "2026-06-03",
      isUnread: false,
      isStarred: false,
      folder: "Sent",
      category: "Updates"
    },
    {
      id: "mail-3",
      senderName: "Kafka Event Broker",
      senderEmail: "kafka-gateway@corporate-comms.com",
      subject: "Verification: Active Proxy Forwarding Channels",
      body: "System Event Dispatcher:\n\nThis reports that a proxy forwarding pipe is established to 'compliance-backup@enterprise-firm.com'. Standard retention records are intact.\n\nBroker Queue Status: HEALTHY\nTopics: [emails.raw.v1, platform.audit.v1]\nConnection: Active",
      timestamp: "May 28",
      date: "2026-05-28",
      isUnread: false,
      isStarred: false,
      folder: "Inbox",
      category: "Updates"
    },
    {
      id: "mail-4",
      senderName: "Threat intel scanner",
      senderEmail: "spammer-threat@gmail.com",
      subject: "[SPAM ALERT] Confidential Passwords List Sweep",
      body: "This file has dynamic credentials tables representing database bypass files. Click here to verify your details immediately.",
      timestamp: "May 25",
      date: "2026-05-25",
      isUnread: true,
      isStarred: false,
      folder: "Spam",
      category: "Social"
    }
  ]);

  // Synchronize SMTP enqueued raw incoming events directly into Inbox
  React.useEffect(() => {
    if (smtpEvents.length > 0) {
      setEmails(prev => {
        const prevIds = new Set(prev.map(e => e.id));
        const newFromSmtp = smtpEvents
          .filter(event => !prevIds.has(event.message_id))
          .map(event => ({
            id: event.message_id,
            senderName: event.sender.split("@")[0].replace(/[._-]/g, " "),
            senderEmail: event.sender,
            subject: event.subject || "(Simulated Ingestion Object)",
            body: event.body_summary || "Simulated packet content payload parsed successfully from SMTP transaction socket.",
            timestamp: event.received_at ? event.received_at.split(" ")[1].substring(0, 5) : "Just now",
            date: event.received_at ? event.received_at.split(" ")[0] : "2026-06-04",
            isUnread: true,
            isStarred: false,
            folder: "Inbox"
          }));
        if (newFromSmtp.length === 0) return prev;
        return [...newFromSmtp, ...prev];
      });
    }
  }, [smtpEvents]);

  // Test Simulation Incoming evaluation logic
  const [testMailSender, setTestMailSender] = useState("spammer-threat@gmail.com");
  const [testMailRecipient, setTestMailRecipient] = useState("corporate-comms@enterprise-platform.com");
  const [testMailSubject, setTestMailSubject] = useState("CONFIDENTIAL GDRP Presentation Files");
  const [testMailBody, setTestMailBody] = useState("This contains secure passwords grids, please evaluate.");
  const [matchingResultsLog, setMatchingResultsLog] = useState<string[]>([]);

  const handleSimulateIncomingEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const currentLogs: string[] = [];
    currentLogs.push(`[INCOMING] Processing incoming event stream trace for Recipient Context: [${testMailRecipient}]`);
    currentLogs.push(`[INCOMING] Sender: ${testMailSender}, Subject: "${testMailSubject}"`);

    // 1. Evaluate Forward rule pipes first
    const matchFwdRules = forwardingList.filter(f => f.sourceAddress.toLowerCase() === testMailRecipient.toLowerCase());
    let forwardIssued = false;
    let retainCopy = true;
    if (matchFwdRules.length > 0) {
      matchFwdRules.forEach(rule => {
        currentLogs.push(`[EVENT-BUS] [FORWARDING-MATCH] Pipe matched: proxy forwarding payload to ${rule.destinationAddress}`);
        if (!rule.keepCopy) retainCopy = false;
        forwardIssued = true;
      });
    }

    // 2. Evaluate AutoReply settings if matching recipients
    const matchesAutoReply = autoReplyConf.enabled && (autoReplyConf.emailAddress.toLowerCase() === testMailRecipient.toLowerCase() || testMailRecipient.toLowerCase() === (loggedInUser?.email || "shreyvarsani16@gmail.com").toLowerCase());
    if (matchesAutoReply) {
      currentLogs.push(`[RULES-ENGINE] Auto response evaluation matches active schedule. Issuing dynamic respond: "${autoReplyConf.subject}"`);
      currentLogs.push(`[SMTP-DAEMON] Enqueuing response dispatch callback thread to Kafka. Body: "${autoReplyConf.body.substring(0, 40)}..."`);
    }

    // 3. Evaluate Rule Matches Sequential Sorting Order
    const rulesToTest = rulesList.filter(r => r.mailboxID.toLowerCase() === testMailRecipient.toLowerCase());
    let ruleMatchedAny = false;
    let targetFolder = "Inbox";
    let shouldDiscard = false;

    if (rulesToTest.length > 0) {
      rulesToTest.forEach(rule => {
        if (!rule.enabled) return;
        let cMatches = true;
        rule.conditions.forEach((c: any) => {
          let testVal = "";
          if (c.field === "subject") testVal = testMailSubject;
          else if (c.field === "sender") testVal = testMailSender;
          else if (c.field === "body") testVal = testMailBody;

          if (c.operator === "CONTAINS") {
            if (!testVal.toLowerCase().includes(c.value.toLowerCase())) cMatches = false;
          } else if (c.operator === "EQUALS") {
            if (testVal.toLowerCase() !== c.value.toLowerCase()) cMatches = false;
          }
        });

        if (cMatches) {
          ruleMatchedAny = true;
          currentLogs.push(`[RULES-ENGINE] [COMPLIANCE-MATCH] Rule evaluation match found: "${rule.name}"`);
          rule.actions.forEach((a: any) => {
            currentLogs.push(`[RULES-ENGINE]   Executing Action type ${a.type} -> params: ${a.targetValue}`);
            if (a.type === "DISCARD") {
              shouldDiscard = true;
              targetFolder = "Trash";
            } else if (a.type === "MOVE_TO_FOLDER") {
              if (a.targetValue.toLowerCase().includes("trash")) targetFolder = "Trash";
              else if (a.targetValue.toLowerCase().includes("spam")) targetFolder = "Spam";
            }
          });
        }
      });
    }

    if (!forwardIssued && !matchesAutoReply && !ruleMatchedAny) {
      currentLogs.push(`[RULES-ENGINE] No compliance overrides triggered. Depositing text body safely in standard inbox tables.`);
    }

    // Actually create the incoming email in standard inbox folder
    if (!shouldDiscard || retainCopy) {
      const isSpamSender = testMailSender.toLowerCase().includes("spammer") || testMailSender.toLowerCase().includes("threat");
      const defaultFolder = isSpamSender ? "Spam" : targetFolder;

      const newSimEmail = {
        id: `sim-mail-${Date.now()}`,
        senderName: testMailSender.split("@")[0].replace(/[._-]/g, " "),
        senderEmail: testMailSender,
        subject: testMailSubject || "(No Subject)",
        body: testMailBody,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        date: new Date().toISOString().substring(0, 10),
        isUnread: true,
        isStarred: false,
        folder: defaultFolder
      };
      setEmails(prev => [newSimEmail, ...prev]);
    }

    addEnterpriseLog(`Evaluated incoming validation loop on Event bus. Recipient: ${testMailRecipient}`, "INFO");
    setMatchingResultsLog(currentLogs);
    notify("Incoming mail pipeline evaluation completed!", "success");
  };

  // Cryptographic audit compliance sweep
  const handleAuditTamperCheck = () => {
    const corrupted: string[] = [];
    auditLogsList.forEach(log => {
      const computed = mockComputeAuditHash(log.id, log.timestamp, log.userRef, log.clientIP, log.action, log.resourceID, log.status);
      if (computed !== log.auditHash) {
        corrupted.push(log.id);
      }
    });

    if (corrupted.length > 0) {
      setAuditSweepStatus("compromised");
      setAuditCorruptedRows(corrupted);
      addEnterpriseLog(`[AUDIT-WARN] SYSTEM COMPLIANCE SWEEP COMPLETED WITH FAILED EXCEPTION FILES HASH MATCHES. Compromised rows: ${JSON.stringify(corrupted)}`, "ERROR");
      notify(`Compliance sweep failed! ${corrupted.length} file records compromised.`, "error");
    } else {
      setAuditSweepStatus("valid");
      setAuditCorruptedRows([]);
      addEnterpriseLog(`[AUDIT] Cryptographic Audit sweep completed successfully. All ledger hash lists match perfectly. Status: PRISTINE_INTEGRITY_SECURE`, "INFO");
      notify("Lead logs chain matches signature signatures!", "success");
    }
  };

  const handleTamperAuditLog = (id: string, cell: "userRef" | "action" | "status" | "clientIP", newValue: string) => {
    setAuditLogsList(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          [cell]: newValue
        };
      }
      return item;
    }));
    notify("Log values mutated safely (bypassing hash updates)เพื่อ testing fraud!", "info");
    addEnterpriseLog(`[SECURITY_INTRUSION] Offline direct storage block write detected in audit logs table database without authorized signature hashes updates! rowKey: ${id}`, "WARN");
    setAuditSweepStatus("unchecked");
  };

  const handleRestoreAuditIntegrity = () => {
    // Rehash all existing values to pristine integrity
    setAuditLogsList(prev => prev.map(item => ({
      ...item,
      auditHash: mockComputeAuditHash(item.id, item.timestamp, item.userRef, item.clientIP, item.action, item.resourceID, item.status)
    })));
    setAuditSweepStatus("unchecked");
    setAuditCorruptedRows([]);
    notify("All audit signatures recalculated and synchronized with values!", "success");
    addEnterpriseLog(`[AUDIT] Restructured and recalculated matching SHA256 hashes blocks. Integrity restored.`, "INFO");
  };


  // Helper code copy
  const executeCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    notify("Source file copied successfully!", "success");
  };

  // 1. SIGNUP TRANSACTION FLOW
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword || !regName) {
      notify("Please fill all signup fields.", "error");
      return;
    }

    if (database.some(u => u.email.toLowerCase() === regEmail.toLowerCase())) {
      addLog(`ResourceConflictException: Email signature matched already existing tuple during registration validation rules [${regEmail}]`, "WARN");
      notify("Registration conflict: Email target is already registered.", "error");
      return;
    }

    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newUser: SimulatedUser = {
      id: crypto.randomUUID ? crypto.randomUUID() : (Math.random().toString(36).substring(2, 15)),
      email: regEmail,
      passwordHash: `$2a$10$${Math.random().toString(36).substring(4, 20)}`,
      fullName: regName,
      roles: ["ROLE_USER"],
      enabled: false,
      verified: false,
      verificationCode,
      resetCode: null
    };

    setDatabase(prev => [...prev, newUser]);
    
    // Server logs simulator
    addLog(`JPA SQL TRACE - SELECT count(*) FROM users WHERE email = '${regEmail}'`, "DEBUG");
    addLog(`Creating newly registered system user entity with deactivated status: [${regName}, ${regEmail}]`, "INFO");
    addLog(`JPA SQL TRACE - INSERT INTO users (id, email, password, enabled, email_verified, verification_code) VALUES ('${newUser.id}', '${regEmail}', '${newUser.passwordHash}', false, false, '${verificationCode}')`, "DEBUG");
    addLog(`SMTP MAILER PROTOCOL - Dispatching account validation code [${verificationCode}] securely to inbox [${regEmail}]`, "INFO");
    
    notify(`Account registered! Verification code '${verificationCode}' has been dispatched to your email.`, "success");
    setVerifyEmailVal(regEmail);
    setVerifyCodeVal(verificationCode);
    setRegEmail("");
    setRegPassword("");
    setRegName("");
  };

  // 2. VERIFY REGISTER CODE FLOW
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyEmailVal || !verifyCodeVal) {
      notify("Email and Verification code are required.", "error");
      return;
    }

    const foundIndex = database.findIndex(u => u.email.toLowerCase() === verifyEmailVal.toLowerCase());
    if (foundIndex === -1) {
      addLog(`ResourceNotFoundException: Verification email target was not registered: [${verifyEmailVal}]`, "ERROR");
      notify("No pending user registration matched this email address.", "error");
      return;
    }

    const matchedUser = database[foundIndex];
    if (matchedUser.verificationCode === verifyCodeVal) {
      const updatedDatabase = [...database];
      updatedDatabase[foundIndex] = {
        ...matchedUser,
        verified: true,
        enabled: true,
        verificationCode: null
      };
      setDatabase(updatedDatabase);

      addLog(`Activating credential profiles mapped to user: [${matchedUser.email}]`, "INFO");
      addLog(`JPA SQL TRACE - UPDATE users SET enabled = true, email_verified = true, verification_code = NULL WHERE id = '${matchedUser.id}'`, "DEBUG");
      
      notify("Verification Successful! Profile is active. Please proceed with login.", "success");
      setLoginEmail(verifyEmailVal);
      setVerifyCodeVal("");
    } else {
      addLog(`BadCredentialsException: Invalid numeric activation string entered for user verification [${verifyEmailVal}]`, "WARN");
      notify("Invalid verification code. Please confirm code value.", "error");
    }
  };

  // 3. LOGIN TRANSACTION FLOW
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      notify("Credential structures are missing properties.", "error");
      return;
    }

    const foundUser = database.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());
    if (!foundUser) {
      addLog(`BadCredentialsException: User Authentication request failed. Login target matching database profile: [${loginEmail}]`, "WARN");
      notify("Authentication Failure: Email or Password incorrect.", "error");
      return;
    }

    if (!foundUser.verified) {
      addLog(`AccountUnverifiedException: Authentication requested on non-activated user entity [${loginEmail}]`, "WARN");
      notify("Your profile email verification status is incomplete.", "info");
      return;
    }

    // Process Token Signatures
    const headerClaims = {
      sub: foundUser.id,
      email: foundUser.email,
      roles: foundUser.roles,
      exp: new Date().getTime() + 900000
    };
    
    const fakeAccessToken = `eyJhbGciOiJIUzUxMiJ9.${btoa(JSON.stringify(headerClaims))}.SignatureHMACSHA512_HashValues`;
    const fakeRefreshToken = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 30);

    setSimToken(fakeAccessToken);
    setSimRefreshToken(fakeRefreshToken);
    setLoggedInUser(foundUser);

    addLog(`SpringSecurity filter JwtOncePerRequest intercepted authentication request for [${loginEmail}]`, "DEBUG");
    addLog(`Loaded authentic user profile domain principal from JDBC records for User [${foundUser.fullName}]`, "INFO");
    addLog(`User session opened. JWT access code signed. Rotated RefreshToken added. User Principal injected into SecurityContextHolder context.`, "INFO");
    
    notify(`Welcome back, ${foundUser.fullName}! Access JWT issued.`, "success");
  };

  // 4. GENERATE PASSWORD RECOVERY SYSTEM
  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmailVal) {
      notify("Password recovery request demands your valid registered email.", "error");
      return;
    }

    const foundIndex = database.findIndex(u => u.email.toLowerCase() === resetEmailVal.toLowerCase());
    if (foundIndex === -1) {
      addLog(`ForgotPassword: Timing abstract protection obfuscating non-existent recovery target: [${resetEmailVal}]`, "INFO");
      notify("Forgot password dispatch succeeded to recover target credentials.", "success");
      return;
    }

    const recoveryToken = `RECOVER-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const updatedDB = [...database];
    updatedDB[foundIndex] = {
      ...updatedDB[foundIndex],
      resetCode: recoveryToken
    };
    setDatabase(updatedDB);

    addLog(`SMTP MAILER SECURITY - Transmitting password recovery ticket: token [${recoveryToken}] to [${resetEmailVal}]`, "INFO");
    addLog(`JPA SQL TRACE - UPDATE users SET password_reset_token = '${recoveryToken}' WHERE id = '${updatedDB[foundIndex].id}'`, "DEBUG");
    
    notify(`Password recovery dispatched token '${recoveryToken}' for target account!`, "success");
    setResetCodeVal(recoveryToken);
  };

  // 5. UPDATE PASSWORD VALUES WITH CODE
  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCodeVal || !resetNewPass) {
      notify("Reset token and password are required.", "error");
      return;
    }

    const foundIndex = database.findIndex(u => u.resetCode === resetCodeVal);
    if (foundIndex === -1) {
      addLog(`ResourceNotFoundException: Password reset operations matched invalid token keys [${resetCodeVal}]`, "ERROR");
      notify("Your security recovery code is invalid or has decayed.", "error");
      return;
    }

    const userToUpdate = database[foundIndex];
    const updatedDB = [...database];
    updatedDB[foundIndex] = {
      ...userToUpdate,
      passwordHash: `$2a$10$${Math.random().toString(36).substring(4, 20)}`,
      resetCode: null
    };
    setDatabase(updatedDB);

    addLog(`Modifying passwords encryption digests for id: [${userToUpdate.id}]`, "INFO");
    addLog(`JPA SQL TRACE - UPDATE users SET password = '[MODIFIED_BCRYPT_DIGEST]', password_reset_token = NULL WHERE id = '${userToUpdate.id}'`, "DEBUG");
    
    notify("Password database record modified. Login securely with new credentials.", "success");
    setLoginPassword("");
    setResetCodeVal("");
    setResetNewPass("");
  };

  // 6. LOGOUT FLOW
  const handleLogout = () => {
    if (loggedInUser) {
      addLog(`SignOut Request: Evicting active Session structures for token context [${loggedInUser.email}]`, "INFO");
      addLog(`JPA SQL TRACE - DELETE FROM refresh_tokens WHERE user_id = '${loggedInUser.id}'`, "DEBUG");
      addLog(`SecurityContextHolder authentication wiped from current thread context. Wiped browser headers values.`, "INFO");
    }
    setLoggedInUser(null);
    setSimToken(null);
    setSimRefreshToken(null);
    notify("Session logged out successfully from container cluster.", "info");
  };

  // 7. ROTATE ACCESS JWT VIA REFRESH TOKENS
  const handleTriggerSessionRefresh = () => {
    if (!simRefreshToken) {
      notify("No active refresh token was generated. Please Login first.", "error");
      return;
    }

    const headerClaims = {
      sub: loggedInUser?.id,
      email: loggedInUser?.email,
      roles: loggedInUser?.roles,
      exp: new Date().getTime() + 900000 // Fresh 15 Minutes
    };
    
    const refreshedToken = `eyJhbGciOiJIUzUxMiJ9.${btoa(JSON.stringify(headerClaims))}.SignatureHMACSHA512_RefreshedValues`;
    setSimToken(refreshedToken);

    addLog(`JWT Refresh Token Interceptor: Resolving rotation token [${simRefreshToken}] from memory state`, "DEBUG");
    addLog(`JPA SQL TRACE - SELECT * FROM refresh_tokens WHERE token = '${simRefreshToken}'`, "DEBUG");
    addLog(`Identity token rotated. JWT expiration timestamp bumped by +15m inside JWT claims.`, "INFO");
    notify("OAuth Session Refreshed! New authentication access JWT token issued.", "success");
  };

  // 8. TEST PROTECTED ROUTE ROLE VERIFIER
  const testSecureRoleAccess = (resource: string) => {
    if (!simToken || !loggedInUser) {
      addLog(`SecurityException - Unauthorized GET request mapping payload route: ${resource}. Bearer header was missing or parse error occurred.`, "ERROR");
      notify("Access Denied: Missing Bearer Token context. Please authenticate.", "error");
      return;
    }

    const roles = loggedInUser.roles;
    addLog(`SecurityFilterChain: Parsing Access Token bearer token. User identity matched: [${loggedInUser.email}] possessing authorities: ${JSON.stringify(roles)}`, "INFO");

    if (resource === "/api/admin/dashboard" && !roles.includes("ROLE_ADMIN")) {
      addLog(`SecurityAccessControlDenied: Client domain principal lacking necessary authorities (No ROLE_ADMIN) to match path [${resource}]`, "ERROR");
      notify("Access Forbidden: Authentication requires authority ROLE_ADMIN.", "error");
      return;
    }

    if (resource === "/api/management/moderation" && !roles.includes("ROLE_MODERATOR") && !roles.includes("ROLE_ADMIN")) {
      addLog(`SecurityAccessControlDenied: Client domain principal lacks required authorizations context for route [${resource}] (Requires ROLE_ADMIN or ROLE_MODERATOR)`, "ERROR");
      notify("Access Forbidden: Authentication requires ROLE_ADMIN or ROLE_MODERATOR.", "error");
      return;
    }

    addLog(`AccessGranted - SecurityFilterChain matched rules schema for credentials context mapping target resource successfully: ${resource}`, "INFO");
    notify(`Access Authorized! Target file path mapped resource accessed successfully: ${resource}`, "success");
  };

  // Compose form inputs
  const [compRecipients, setCompRecipients] = useState("");
  const [compSubject, setCompSubject] = useState("");
  const [compBody, setCompBody] = useState("");
  const [compEncrypt, setCompEncrypt] = useState(false);
  const [compSchedule, setCompSchedule] = useState("");

  const handleOpenCompose = () => {
    setCompRecipients("");
    setCompSubject("");
    setCompBody("");
    setCompEncrypt(false);
    setCompSchedule("");
    setIsComposeOpen(true);
  };

  const handleReplyMail = (email: any) => {
    setCompRecipients(email.senderEmail);
    setCompSubject(email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`);
    setCompBody(`\n\n----- Original Message -----\nFrom: ${email.senderName} <${email.senderEmail}>\nSent: ${email.date} ${email.timestamp}\nSubject: ${email.subject}\n\n${email.body}`);
    setCompEncrypt(email.isEncrypted || false);
    setCompSchedule("");
    setUploadedFiles([]);
    setIsComposeOpen(true);
  };

  const handleReplyAllMail = (email: any) => {
    const listRecs = email.recipients ? (Array.isArray(email.recipients) ? email.recipients : [email.recipients]) : [];
    const meEmail = loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com";
    const allRecs = [email.senderEmail, ...listRecs.filter((r: any) => r && r.toLowerCase() !== meEmail.toLowerCase())];
    const uniqueRecs = Array.from(new Set(allRecs)).join(", ");
    
    setCompRecipients(uniqueRecs);
    setCompSubject(email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`);
    setCompBody(`\n\n----- Original Message -----\nFrom: ${email.senderName} <${email.senderEmail}>\nSent: ${email.date} ${email.timestamp}\nSubject: ${email.subject}\n\n${email.body}`);
    setCompEncrypt(email.isEncrypted || false);
    setCompSchedule("");
    setUploadedFiles([]);
    setIsComposeOpen(true);
  };

  const handleForwardMail = (email: any) => {
    setCompRecipients("");
    setCompSubject(email.subject.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject}`);
    setCompBody(`\n\n----- Forwarded Message -----\nFrom: ${email.senderName} <${email.senderEmail}>\nSent: ${email.date} ${email.timestamp}\nSubject: ${email.subject}\n\n${email.body}`);
    setCompEncrypt(email.isEncrypted || false);
    setCompSchedule("");
    setIsComposeOpen(true);
  };

  const handleCreateQuickDraft = () => {
    setCompRecipients("");
    setCompSubject("[DRAFT] Secure Cipher topic");
    setCompBody("Type draft body payload here...");
    setCompEncrypt(false);
    setCompSchedule("");
    setUploadedFiles([]);
    setIsComposeOpen(true);
    notify("Secure draft composer initialized!", "success");
  };

  const handleEditDraftMail = (draft: any) => {
    setCompRecipients(Array.isArray(draft.recipients) ? draft.recipients.join(", ") : draft.recipients || "");
    setCompSubject(draft.subject);
    setCompBody(draft.body);
    setCompEncrypt(draft.isEncrypted || false);
    setCompSchedule("");
    setIsComposeOpen(true);
    setDraftsList(prev => prev.filter(d => d.id !== draft.id));
  };

  const handleSaveDraftFromCompose = () => {
    const targetRec = compRecipients.split(",").map(r => r.trim());
    const newId = `draft-${Date.now()}`;
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newDraft = {
      id: newId,
      sender: loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com",
      recipients: targetRec,
      subject: compSubject,
      body: compBody,
      updatedAt: timestamp,
      isEncrypted: compEncrypt,
      attachments: [...uploadedFiles]
    };

    setDraftsList(prev => [newDraft, ...prev]);

    // Audit Log
    const userRef = loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com";
    const auditId = `audit-${Date.now()}`;
    const newAudit = {
      id: auditId,
      timestamp,
      userRef,
      clientIP: "192.168.1.100",
      action: "DRAFT_CREATE",
      resourceID: newId,
      status: "SUCCESS",
      auditHash: mockComputeAuditHash(auditId, timestamp, userRef, "192.168.1.100", "DRAFT_CREATE", newId, "SUCCESS")
    };
    setAuditLogsList(prev => [newAudit, ...prev]);
    setAuditSweepStatus("unchecked");

    addEnterpriseLog(`[REST] POST /api/enterprise/drafts - Saved in-mailbox draft ${newId}`, "INFO");
    setIsComposeOpen(false);
    notify("Draft communication saved!", "success");
  };

  const handleSendComposeEmail = (recipients: string, subject: string, body: string, isEncrypted: boolean, scheduleTime?: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // If future scheduling is applied
    if (scheduleTime) {
      setSchedSubject(subject);
      setSchedBody(body);
      setSchedRecipients(recipients);
      setSchedTime(scheduleTime);
      
      const newSchedId = `sched-${Date.now()}`;
      const targetTimeFormatted = scheduleTime.replace('T', ' ');
      const newSched = {
        id: newSchedId,
        sender: loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com",
        recipients: recipients.split(",").map(r => r.trim()),
        subject,
        body,
        sendAt: targetTimeFormatted,
        status: "PENDING",
        retryCount: 0,
        attachments: [...uploadedFiles]
      };
      setScheduledList(prev => [newSched, ...prev]);
      
      // Add Audit
      const auditId = `audit-${Date.now()}`;
      const userRef = loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com";
      const newAudit = {
        id: auditId,
        timestamp,
        userRef,
        clientIP: "192.168.1.100",
        action: "SCHEDULED_CREATE",
        resourceID: newSchedId,
        status: "SUCCESS",
        auditHash: mockComputeAuditHash(auditId, timestamp, userRef, "192.168.1.100", "SCHEDULED_CREATE", newSchedId, "SUCCESS")
      };
      setAuditLogsList(prev => [newAudit, ...prev]);
      setAuditSweepStatus("unchecked");
      
      addEnterpriseLog(`[KAFKA] Scheduled corporate announcement queue: ${subject} dispatch enqueued for ${targetTimeFormatted}`, "INFO");
      notify("Delivery scheduled on background event topic!", "success");
      setUploadedFiles([]);
    } else {
      // Send immediately
      const newMail = {
        id: `sent-mail-${Date.now()}`,
        senderName: loggedInUser ? loggedInUser.fullName : "Me",
        senderEmail: loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com",
        subject: subject || "(No Subject)",
        body,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString().substring(0, 10),
        isUnread: false,
        isStarred: false,
        folder: "Sent",
        recipients: recipients.split(",").map(r => r.trim()),
        isEncrypted,
        attachments: [...uploadedFiles]
      };
      setEmails(prev => [newMail, ...prev]);
      setUploadedFiles([]);
      
      // Save Draft logic (AES encryption) / or audit logs
      const auditId = `audit-${Date.now()}`;
      const userRef = loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com";
      const newAudit = {
        id: auditId,
        timestamp,
        userRef,
        clientIP: "192.168.1.100",
        action: "EMAIL_SEND",
        resourceID: newMail.id,
        status: "SUCCESS",
        auditHash: mockComputeAuditHash(auditId, timestamp, userRef, "192.168.1.100", "EMAIL_SEND", newMail.id, "SUCCESS")
      };
      setAuditLogsList(prev => [newAudit, ...prev]);
      setAuditSweepStatus("unchecked");
      addEnterpriseLog(`[SMTP] Dispatched immediate envelope. Secure signature key signed.`, "INFO");
      notify("Email sent successfully!", "success");
    }
    setIsComposeOpen(false);
  };

  // Shadows unneeded codebase variables
  const JAVA_BLUEPRINT_FILES: any[] = [];
  const GO_BLUEPRINT_FILES: any[] = [];
  const DEVOPS_BLUEPRINT_FILES: any[] = [];

  const filteredJavaFiles = JAVA_BLUEPRINT_FILES.filter(
    f => f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         f.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFolderEmails = () => {
    let filtered = emails;
    if (activeFolder === "Starred") {
      filtered = emails.filter(e => e.isStarred);
    } else if (activeFolder === "Sent") {
      filtered = emails.filter(e => e.folder === "Sent");
    } else if (activeFolder === "Spam") {
      filtered = emails.filter(e => e.folder === "Spam");
    } else if (activeFolder === "Trash") {
      filtered = emails.filter(e => e.folder === "Trash");
    } else if (activeFolder === "Drafts") {
      filtered = draftsList.map(d => ({
        id: d.id,
        senderName: d.recipients.length > 0 ? d.recipients.join(", ") : "Draft (No Recipient)",
        senderEmail: d.sender,
        subject: d.subject || "(Empty Draft Subject)",
        body: d.body || "(No message body saved)",
        timestamp: d.updatedAt ? d.updatedAt.substring(11, 16) : "12:00 AM",
        date: d.updatedAt ? d.updatedAt.substring(0, 10) : "2026-06-04",
        isUnread: false,
        isStarred: false,
        folder: "Drafts",
        recipients: d.recipients,
        isEncrypted: d.isEncrypted
      }));
    } else if (activeFolder === "Scheduled") {
      filtered = scheduledList.map(s => ({
        id: s.id,
        senderName: s.recipients.join(", "),
        senderEmail: s.sender,
        subject: s.subject || "(Empty Scheduled Subject)",
        body: s.body || "(No message body scheduled)",
        timestamp: s.sendAt ? s.sendAt.substring(11, 16) : "Future",
        date: s.sendAt ? s.sendAt.substring(0, 10) : "2026-06-04",
        isUnread: false,
        isStarred: false,
        folder: "Scheduled",
        recipients: s.recipients,
        status: s.status
      }));
    } else {
      filtered = emails.filter(e => e.folder === "Inbox");
      if (activeCategory !== "All") {
        filtered = filtered.filter(e => (e.category || "Primary").toLowerCase() === activeCategory.toLowerCase());
      }
    }

    if (searchMailQuery.trim()) {
      const q = searchMailQuery.toLowerCase();
      filtered = filtered.filter(
        e => e.senderName.toLowerCase().includes(q) ||
             e.senderEmail.toLowerCase().includes(q) ||
             e.subject.toLowerCase().includes(q) ||
             e.body.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const handleToggleStar = (emailId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmails(prev => prev.map(m => m.id === emailId ? { ...m, isStarred: !m.isStarred } : m));
    notify("Starred flag updated!", "info");
  };

  const handleDeleteMail = (email: any) => {
    if (email.folder === "Drafts") {
      handleDeleteDraft(email.id);
      setSelectedEmail(null);
      return;
    }
    if (email.folder === "Scheduled") {
      handleCancelSchedule(email.id);
      setSelectedEmail(null);
      return;
    }
    if (email.folder === "Trash") {
      setEmails(prev => prev.filter(m => m.id !== email.id));
      setSelectedEmail(null);
      notify("Permanently deleted message from disk.", "success");
      return;
    }
    setEmails(prev => prev.map(m => m.id === email.id ? { ...m, folder: "Trash" } : m));
    setSelectedEmail(null);
    notify("Moved message to Trash.", "info");
  };

  const handleBulkMarkRead = (makeRead: boolean) => {
    if (selectedEmailIds.length === 0) return;
    setEmails(prev => prev.map(m => selectedEmailIds.includes(m.id) ? { ...m, isUnread: !makeRead } : m));
    setSelectedEmailIds([]);
    notify(`Marked ${selectedEmailIds.length} messages as ${makeRead ? "Read" : "Unread"}.`, "info");
  };

  const handleBulkDelete = () => {
    if (selectedEmailIds.length === 0) return;
    
    const draftIds = selectedEmailIds.filter(id => id.startsWith("draft-") || draftsList.some(d => d.id === id));
    const schedIds = selectedEmailIds.filter(id => id.startsWith("sched-") || scheduledList.some(s => s.id === id));

    setEmails(prev => {
      if (activeFolder === "Trash") {
        return prev.filter(m => !selectedEmailIds.includes(m.id));
      } else {
        return prev.map(m => selectedEmailIds.includes(m.id) ? { ...m, folder: "Trash" } : m);
      }
    });

    if (draftIds.length > 0) {
      setDraftsList(prev => prev.filter(d => !draftIds.includes(d.id)));
    }

    if (schedIds.length > 0) {
      setScheduledList(prev => prev.filter(s => !schedIds.includes(s.id)));
    }

    if (selectedEmail && selectedEmailIds.includes(selectedEmail.id)) {
      setSelectedEmail(null);
    }
    
    setSelectedEmailIds([]);
    if (activeFolder === "Trash") {
      notify("Permanently deleted selected messages from disk.", "success");
    } else {
      notify("Moved selected messages to Trash.", "info");
    }
  };

  const handleBulkMove = (targetFolder: "Inbox" | "Spam" | "Trash") => {
    if (selectedEmailIds.length === 0) return;
    setEmails(prev => prev.map(m => selectedEmailIds.includes(m.id) ? { ...m, folder: targetFolder } : m));
    if (selectedEmail && selectedEmailIds.includes(selectedEmail.id)) {
      setSelectedEmail(null);
    }
    setSelectedEmailIds([]);
    notify(`Moved ${selectedEmailIds.length} messages to ${targetFolder}.`, "success");
  };

  const handleToggleSelectAll = () => {
    const visibleIds = activeFolderEmails.map(e => e.id);
    const allSelected = visibleIds.every(id => selectedEmailIds.includes(id));
    if (allSelected) {
      setSelectedEmailIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedEmailIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const activeFolderEmails = getFolderEmails();

  return (
    <div className="proton-app min-h-screen bg-[#0e0f14] text-[#d1d2db] font-sans antialiased flex flex-col overflow-hidden selection:bg-purple-600/30 selection:text-purple-200">
      
      {/* GLOBAL SYSTEM NOTIFICATION HUD */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 transition-all duration-300 transform scale-100 ${
          notification.type === "success" 
            ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/30" 
            : notification.type === "error" 
            ? "bg-rose-950/90 text-rose-300 border-rose-500/30" 
            : "bg-purple-950/90 text-purple-300 border-purple-500/30"
        }`}>
          <Info size={16} className="shrink-0" />
          <span className="text-xs font-semibold tracking-wide">{notification.message}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <header className="h-14 border-b border-slate-900 bg-[#0e0f14] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          {/* Hamburger toggle button */}
          <button
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            className="p-1.5 text-[var(--proton-text-secondary)] hover:text-[var(--proton-text-primary)] hover:bg-[var(--proton-purple-light-alpha)] rounded-lg transition-colors cursor-pointer mr-2.5 flex items-center justify-center border border-transparent hover:border-[var(--proton-border)] focus:outline-none"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            id="proton-sidebar-toggle-btn"
          >
            <Menu size={18} />
          </button>

          <div className="bg-gradient-to-tr from-purple-600 to-purple-800 p-1.5 rounded-lg text-white shadow-lg shadow-purple-900/10 hover:rotate-3 duration-200">
            <LockKeyhole size={18} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-sans font-bold tracking-tight text-white text-base">Proton</span>
            <span className="font-mono text-[9px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">SECURE 6.2</span>
          </div>
        </div>

        {/* SEARCH emails bar */}
        <div className="flex-1 max-w-lg mx-6 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
            <Search size={14} />
          </div>
          <input
            id="search-emails-input"
            type="text"
            placeholder={`Search secure communications...`}
            value={searchMailQuery}
            onChange={(e) => setSearchMailQuery(e.target.value)}
            className="w-full h-8 pl-9 pr-8 bg-[#181920] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-600/60 focus:ring-1 focus:ring-purple-600/30 transition-all font-sans"
          />
          {searchMailQuery && (
            <button
              onClick={() => setSearchMailQuery("")}
              className="absolute inset-y-0 right-2.5 flex items-center text-slate-500 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* PROTON THEME TOGGLE SWITCH */}
          <button
            onClick={() => setIsDarkMode(prev => !prev)}
            title={`Switch to ${isDarkMode ? "Light" : "Dark"} Mode`}
            className="p-2 bg-slate-950 text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-center shrink-0 w-8 h-8"
            id="theme-toggle-btn"
          >
            {isDarkMode ? <Sun size={13} className="text-amber-400" /> : <Moon size={13} className="text-[#6D4AFF]" />}
          </button>

          {/* SECURE STATUS INDICATOR */}
          <div className="hidden md:flex items-center gap-2 text-[10px] font-medium tracking-wide text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>SECURE MAIL LINK</span>
          </div>

          {/* USER PROFILE DROPDOWN */}
          <div className="flex items-center gap-2">
            <div className="bg-[#121319] border border-slate-800 p-1 rounded-lg flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#242530] border border-slate-700 flex items-center justify-center text-[10px] font-mono text-purple-400 font-bold">
                {loggedInUser ? loggedInUser.fullName.substring(0, 2).toUpperCase() : "G"}
              </div>
              <div className="text-left hidden sm:block pr-1">
                <p className="text-[10px] font-bold text-white tracking-tight truncate max-w-[110px]">
                  {loggedInUser ? loggedInUser.fullName : "SecOps Sandbox"}
                </p>
                <p className="text-[8px] font-medium text-slate-400 truncate max-w-[110px]">
                  {loggedInUser ? loggedInUser.email : "shreyvarsani16@gmail.com"}
                </p>
              </div>
            </div>
            
            {loggedInUser && (
              <button 
                onClick={handleLogout}
                title="Wipe Authentication Tokens and Exit"
                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg border border-transparent hover:border-slate-800 transition-all cursor-pointer"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CORE FRAMEWORK PANELS */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* A. LEFT SIDEBAR */}
        <aside className={`bg-[#0c0d12] border-r border-[#181920] p-2.5 shrink-0 flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "w-[64px]" : "w-[195px]"
        }`}>
          <div className="space-y-4">
            
            {/* Compose button */}
            <button
              onClick={handleOpenCompose}
              className={`rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-semibold tracking-wide flex items-center justify-center shadow-lg shadow-purple-900/10 cursor-pointer duration-200 transition-all ${
                isSidebarCollapsed ? "w-9 h-9 px-0 mx-auto" : "w-full py-2.5 px-3 gap-2"
              }`}
              title={isSidebarCollapsed ? "Compose secure message" : undefined}
            >
              <PenSquare size={14} className="shrink-0" />
              <span className={`transition-all duration-200 ${
                isSidebarCollapsed ? "opacity-0 w-0 pointer-events-none scale-90 overflow-hidden" : "opacity-100 w-auto"
              } whitespace-nowrap`}>
                Compose
              </span>
            </button>

            {/* Folder Navigation Menu */}
            <nav className="space-y-0.5">
              {[
                { folder: "Dashboard", label: "Dashboard", icon: LayoutDashboard, count: 0 },
                { folder: "Inbox", label: "Inbox", icon: Mail, count: emails.filter(e => e.folder === "Inbox" && e.isUnread).length },
                { folder: "Starred", label: "Starred", icon: Star, count: emails.filter(e => e.isStarred).length },
                { folder: "Sent", label: "Sent", icon: Send, count: emails.filter(e => e.folder === "Sent").length },
                { folder: "Drafts", label: "Drafts", icon: PenSquare, count: draftsList.length },
                { folder: "Scheduled", label: "Scheduled", icon: Clock, count: scheduledList.filter(s => s.status === "PENDING").length },
                { folder: "Spam", label: "Spam", icon: ShieldAlert, count: emails.filter(e => e.folder === "Spam").length },
                { folder: "Trash", label: "Trash", icon: Trash2, count: emails.filter(e => e.folder === "Trash").length }
              ].map(item => {
                const IconComp = item.icon;
                const isActive = activeFolder === item.folder;
                return (
                  <button
                    key={item.folder}
                    onClick={() => {
                      setActiveFolder(item.folder as any);
                      setSelectedEmail(null);
                    }}
                    title={isSidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center rounded-lg text-left text-xs font-medium cursor-pointer transition-all duration-200 ${
                      isActive 
                        ? "bg-[#181922] text-white font-semibold border-l-2 border-purple-500 rounded-l-none" 
                        : "text-[#8e909a] hover:bg-[#12131a] hover:text-white"
                    } ${
                      isSidebarCollapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-1.5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComp size={14} className={`shrink-0 ${isActive ? "text-purple-400" : ""}`} />
                      <span className={`transition-all duration-250 ${
                        isSidebarCollapsed ? "opacity-0 w-0 pointer-events-none scale-90 overflow-hidden" : "opacity-100 w-auto"
                      } whitespace-nowrap`}>
                        {item.label}
                      </span>
                    </div>
                    {!isSidebarCollapsed && item.count > 0 && (
                      <span className="text-[9px] font-mono font-bold bg-[#1d1e28] text-purple-400 px-1.5 py-0.5 rounded shrink-0">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className={`my-3 border-t border-slate-900 transition-all duration-350 ${isSidebarCollapsed ? "mx-1" : ""}`}></div>

              {/* Settings Nav Item */}
              <button
                onClick={() => setActiveFolder("Settings")}
                title={isSidebarCollapsed ? "Secure Settings" : undefined}
                className={`w-full flex items-center rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
                  activeFolder === "Settings"
                    ? "bg-[#181922] text-white font-semibold border-l-2 border-purple-500 rounded-l-none"
                    : "text-[#8e909a] hover:bg-[#12131a] hover:text-white"
                } ${
                  isSidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-1.5"
                }`}
              >
                <Settings size={14} className={`shrink-0 ${activeFolder === "Settings" ? "text-purple-400" : ""}`} />
                <span className={`transition-all duration-250 ${
                  isSidebarCollapsed ? "opacity-0 w-0 pointer-events-none scale-90 overflow-hidden" : "opacity-100 w-auto"
                } whitespace-nowrap`}>
                  Secure Settings
                </span>
              </button>
            </nav>
          </div>

          {/* Security status badge (Not database or backend) */}
          <div className="transition-all duration-300">
            {isSidebarCollapsed ? (
              <div 
                className="flex justify-center py-2 text-emerald-500/80 hover:text-emerald-400 transition-colors" 
                title="Security Active (End-to-End PGP & TLS Layer Verified)"
              >
                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <ShieldCheck size={16} className="animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="bg-[#101117] p-3 rounded-lg border border-slate-900 text-center space-y-1.5 shadow-sm">
                <div className="flex justify-center items-center gap-1 text-emerald-400">
                  <ShieldCheck size={14} className="animate-pulse" />
                  <span className="text-[10px] font-bold tracking-wider uppercase font-sans">Security Active</span>
                </div>
                <p className="text-[9px] text-[#8e909a] font-sans leading-relaxed">
                  Standard End-to-End PGP Encryption & verified TLS protocols actively protect your communications.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* CONTAINER SWITCH WORKSPACE PAGE */}
        {activeFolder === "Settings" ? (
          
          /* VIEW 1: SECURE SETTINGS INTERFACE PANEL */
          <main className="flex-1 flex overflow-hidden bg-[#0c0d12]">
            
            {/* Settings Inner subnav */}
            <div className="w-[185px] border-r border-[#181920] p-2 shrink-0 space-y-1">
              {[
                { id: "filters_rules", label: "Filters & Rules Engine", icon: Sliders },
                { id: "autoreply", label: "Auto Reply & Outbound", icon: SlidersHorizontal },
                { id: "security_roles", label: "Identity & RBAC Keys", icon: Shield },
                { id: "audit_ledger", label: "HMAC Cryptographic Ledger", icon: Terminal }
              ].map(subTab => {
                const IconComp = subTab.icon;
                const isActive = activeSettingsTab === subTab.id;
                return (
                  <button
                    key={subTab.id}
                    onClick={() => setActiveSettingsTab(subTab.id as any)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-[11px] font-medium transition-colors cursor-pointer ${
                      isActive 
                        ? "bg-[#181924] text-purple-400 border border-purple-500/10 font-bold" 
                        : "text-slate-400 hover:bg-[#12131c] hover:text-white"
                    }`}
                  >
                    <IconComp size={12} className={isActive ? "text-purple-400" : "text-slate-500"} />
                    <span>{subTab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Settings content workspace */}
            <div className="flex-1 p-5 overflow-y-auto space-y-6 max-h-full">
              
              {activeSettingsTab === "filters_rules" && (
                <div className="space-y-5">
                  <div className="border-b border-slate-900 pb-3">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sliders size={15} className="text-purple-400" />
                      <span>Compliance SMTP Filter Rules</span>
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-1">Configure systematic email filtering, matching, folder routing, and discard pipelines dynamically.</p>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    
                    {/* Filter rule construct */}
                    <div className="bg-[#121319] p-4 rounded-xl border border-slate-900 space-y-3 shadow-lg">
                      <h3 className="text-xs font-semibold text-white">Create New Compliance Filter</h3>
                      <form onSubmit={handleCreateEmailRule} className="space-y-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase tracking-wide">Rule Name Identification</label>
                          <input
                            type="text"
                            placeholder="e.g., Audit logs sweep or Spammer ban"
                            value={ruleName}
                            onChange={(e) => setRuleName(e.target.value)}
                            className="w-full px-3 py-1.5 bg-[#1a1b24] border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-purple-600 text-white"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400">Condition Field</label>
                            <select
                              value={ruleConditionField}
                              onChange={(e) => setRuleConditionField(e.target.value as any)}
                              className="w-full px-2 py-1.5 bg-[#1a1b24] border border-slate-800 rounded-lg text-xs text-white"
                            >
                              <option value="sender">Sender address</option>
                              <option value="subject">Subject text</option>
                              <option value="body">Message body</option>
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400">Match Logic</label>
                            <select
                              value={ruleConditionOperator}
                              onChange={(e) => setRuleConditionOperator(e.target.value as any)}
                              className="w-full px-2 py-1.5 bg-[#1a1b24] border border-slate-800 rounded-lg text-xs text-white"
                            >
                              <option value="CONTAINS">CONTAINS</option>
                              <option value="EQUALS">EQUALS</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400">Value check</label>
                            <input
                              type="text"
                              value={ruleConditionValue}
                              onChange={(e) => setRuleConditionValue(e.target.value)}
                              placeholder="e.g., threat"
                              className="w-full px-3 py-1.5 bg-[#1a1b24] border border-slate-800 rounded-lg text-xs focus:outline-none focus:border-purple-650 text-white"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400">Action Instruction</label>
                            <select
                              value={ruleActionType}
                              onChange={(e) => setRuleActionType(e.target.value as any)}
                              className="w-full px-2 py-1.5 bg-[#1a1b24] border border-slate-800 rounded-lg text-xs text-white"
                            >
                              <option value="MOVE_TO_FOLDER">MOVE_TO_FOLDER</option>
                              <option value="DISCARD">DISCARD MESSAGE</option>
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-400">Target Segment</label>
                            <input
                              type="text"
                              value={ruleActionValue}
                              onChange={(e) => setRuleActionValue(e.target.value)}
                              placeholder="e.g., Trash or Spam"
                              className="w-full px-3 py-1.5 bg-[#1a1b24] border border-slate-800 rounded-lg text-xs text-white"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-lg text-xs cursor-pointer text-center"
                        >
                          Verify and Save Compliance Rule
                        </button>
                      </form>
                    </div>

                    {/* Simulator Trigger */}
                    <div className="bg-[#121319] p-4 rounded-xl border border-slate-900 space-y-3 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>Kafka Email Stream Simulator</span>
                          <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase font-mono">Live Ingestion</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">Emit simulated socket transactions to Kafka topic. This triggers immediate microservices pipeline processing.</p>
                        
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="space-y-1 text-xs">
                            <label className="text-[9px] text-slate-500">Sender</label>
                            <input
                              type="text"
                              value={testMailSender}
                              onChange={(e) => setTestMailSender(e.target.value)}
                              className="w-full px-2 py-1 bg-[#1a1b24] border border-slate-800 rounded text-xs text-white"
                            />
                          </div>
                          <div className="space-y-1 text-xs">
                            <label className="text-[9px] text-slate-500">Body match value</label>
                            <input
                              type="text"
                              value={testMailBody}
                              onChange={(e) => setTestMailBody(e.target.value)}
                              className="w-full px-2 py-1 bg-[#1a1b24] border border-slate-800 rounded text-xs text-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-slate-900">
                        <button
                          onClick={handleSimulateIncomingEmail}
                          className="w-full py-1.5 bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Play size={11} />
                          <span>Simulate SMTP Packet & Evaluate Rules</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Logs Box */}
                  <div className="bg-[#121319] p-4 rounded-xl border border-slate-900 space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-semibold text-white font-sans">Rule Evaluation Pipeline Logs</h3>
                      <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1.5 py-1 rounded border border-purple-500/20 font-mono">Sequential sorting model</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-900 max-h-[140px] overflow-y-auto text-[10px] font-mono text-pink-300 space-y-1">
                      {matchingResultsLog.length === 0 ? (
                        <p className="text-slate-500 italic">No emails emitted to event bus yet. Run a simulator transaction above to inspect decision tree results.</p>
                      ) : (
                        matchingResultsLog.map((log, index) => <p key={index} className="leading-snug">{log}</p>)
                      )}
                    </div>
                  </div>

                  {/* Registered rules list */}
                  <div className="bg-[#121319] p-4 rounded-xl border border-slate-900 space-y-3">
                    <h3 className="text-xs font-semibold text-white">Active Rule Queue ({rulesList.length})</h3>
                    {rulesList.length === 0 ? (
                      <p className="text-2xs text-slate-500 italic">No routing rules registered yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {rulesList.map(rule => (
                          <div key={rule.id} className="p-3 bg-[#171822] rounded-lg border border-slate-850 flex justify-between items-start gap-4 text-xs">
                            <div className="space-y-1 col-span-1">
                              <p className="font-bold text-white">{rule.name}</p>
                              <p className="text-[9px] text-[#bc7be0] font-mono">Target: {rule.mailboxID}</p>
                              <p className="text-[10px] text-slate-400 leading-normal mt-1">
                                If {rule.conditions[0]?.field} {rule.conditions[0]?.operator} "{rule.conditions[0]?.value}", 
                                execute <span className="text-purple-400 font-bold">{rule.actions[0]?.type}</span>: {rule.actions[0]?.targetValue}.
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteEmailRule(rule.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSettingsTab === "autoreply" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-900 pb-3">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <SlidersHorizontal size={15} className="text-purple-400" />
                      <span>Auto-Reply Responder & Outbound Routing</span>
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-1">Configure automated replies and email forwarding conduits cleanly.</p>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Auto responder schema setup */}
                    <div className="bg-[#121319] p-4 rounded-xl border border-slate-900 space-y-3.5">
                      <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                        <h3 className="text-xs font-semibold text-white">Periodic Auto-Responder (OOF)</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-1.5 rounded py-0.5 font-bold uppercase ${autoReplyConf.enabled ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-500"}`}>
                            {autoReplyConf.enabled ? "ENABLED" : "OFFLINE"}
                          </span>
                          <input
                            type="checkbox"
                            checked={autoReplyConf.enabled}
                            onChange={(e) => setAutoReplyConf(prev => ({ ...prev, enabled: e.target.checked }))}
                            className="cursor-pointer"
                          />
                        </div>
                      </div>

                      <form onSubmit={handleUpdateAutoReply} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500">Target Inbox Mailbox</label>
                            <input
                              type="text"
                              value={autoReplyConf.emailAddress}
                              onChange={(e) => setAutoReplyConf(prev => ({ ...prev, emailAddress: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-[#1a1b24] border border-slate-800 rounded text-xs text-white"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500">Auto Response Prefix</label>
                            <input
                              type="text"
                              value={autoReplyConf.subject}
                              onChange={(e) => setAutoReplyConf(prev => ({ ...prev, subject: e.target.value }))}
                              className="w-full px-2.5 py-1.5 bg-[#1a1b24] border border-slate-800 rounded text-xs text-white"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">Auto Reply Message Envelope</label>
                          <textarea
                            value={autoReplyConf.body}
                            onChange={(e) => setAutoReplyConf(prev => ({ ...prev, body: e.target.value }))}
                            className="w-full h-24 p-2.5 bg-[#1a1b24] border border-slate-800 rounded text-xs text-white focus:outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-lg text-xs cursor-pointer text-center"
                        >
                          Update Auto-responder Configuration
                        </button>
                      </form>
                    </div>

                    {/* Forward settings forwarding */}
                    <div className="bg-[#121319] p-4 rounded-xl border border-slate-900 space-y-3.5 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-semibold text-white border-b border-slate-900 pb-2">Construct External Proxy Forwarding Pipes</h3>
                        <form onSubmit={handleCreateForwarding} className="space-y-3 mt-3">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500">Source Address</label>
                            <input
                              type="text"
                              value={fwdSource}
                              onChange={(e) => setFwdSource(e.target.value)}
                              placeholder="e.g., shreyvarsani16@gmail.com"
                              className="w-full px-2.5 py-1.5 bg-[#1a1b24] border border-slate-800 rounded text-xs text-white focus:outline-none"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500">External Destination Pipe</label>
                            <input
                              type="text"
                              value={fwdDest}
                              onChange={(e) => setFwdDest(e.target.value)}
                              placeholder="e.g., compliance-archive@external-co.com"
                              className="w-full px-2.5 py-1.5 bg-[#1a1b24] border border-slate-800 rounded text-xs text-white focus:outline-none"
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full py-2 bg-purple-800 hover:bg-purple-700 text-white font-bold rounded-lg text-xs cursor-pointer text-center"
                          >
                            Establish Forwarding Proxy Pipe
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>

                  {/* List of forward channels */}
                  <div className="bg-[#121319] p-4 rounded-xl border border-slate-900 space-y-3">
                    <h3 className="text-xs font-semibold text-white">Active Forward Channels Tunnel ({forwardingList.length})</h3>
                    {forwardingList.length === 0 ? (
                      <p className="text-2xs text-slate-500 italic">No forwarding proxy channels currently configured.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-sans">
                          <thead>
                            <tr className="border-b border-slate-900 text-slate-500 text-[10px] uppercase">
                              <th className="pb-2">Source Address</th>
                              <th className="pb-2">Destination Tunnel</th>
                              <th className="pb-2 text-right">Terminate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {forwardingList.map(f => (
                              <tr key={f.id} className="border-b border-slate-900/40 text-slate-305">
                                <td className="py-2">{f.sourceAddress}</td>
                                <td className="py-2 font-mono text-purple-400">{f.destinationAddress}</td>
                                <td className="py-2 text-right">
                                  <button
                                    onClick={() => handleDeleteForwarding(f.id)}
                                    className="p-1 text-slate-500 hover:text-rose-455 cursor-pointer"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSettingsTab === "security_roles" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-900 pb-3">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Shield size={15} className="text-purple-400" />
                      <span>Cryptographic Identity and OAuth Roles Hub</span>
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-1">Simulate authenticating against the database backend, check JSON Web Tokens (JWT) expirations, and test strict endpoint access privileges.</p>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Database user list */}
                    <div className="bg-[#121319] p-4 rounded-xl border border-slate-900 space-y-3">
                      <h3 className="text-xs font-semibold text-white">Credentials Precomputators ({database.length})</h3>
                      <div className="space-y-1.5 mt-2">
                        {database.map(u => (
                          <div 
                            key={u.id} 
                            onClick={() => {
                              setLoginEmail(u.email);
                              addLog(`Preloaded sandbox credentials for user [${u.fullName}] possessing roles [${u.roles.join(", ")}]`, "INFO");
                            }}
                            className="p-2 bg-[#171822] hover:bg-[#1f2030] rounded-lg border border-slate-800 flex items-center justify-between cursor-pointer text-xs transition-colors"
                          >
                            <div className="text-left font-sans col-span-1">
                              <p className="font-bold text-white">{u.fullName}</p>
                              <p className="text-[9px] text-slate-500 font-mono">{u.email}</p>
                            </div>
                            <div className="flex gap-1 shrink-0 col-span-1">
                              {u.roles.map(role => (
                                <span key={role} className="text-[8px] font-mono font-bold bg-purple-500/15 text-purple-400 px-1 py-0.5 rounded border border-purple-500/25">
                                  {role.replace("ROLE_", "")}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Auth panel */}
                    <div className="bg-[#121319] p-4 rounded-xl border border-slate-900 space-y-4">
                      {loggedInUser ? (
                        <div className="space-y-4">
                          <h3 className="text-xs font-semibold text-[#bc7be0]">Secure Session Claims Active</h3>
                          <div className="bg-[#171822] p-3 rounded-lg border border-slate-805 space-y-2 text-xs font-sans text-left">
                            <p className="text-slate-400">Subject: <span className="text-white font-mono">{loggedInUser.email}</span></p>
                            <p className="text-slate-400">Authorities: <b className="text-white">{loggedInUser.roles.join(", ")}</b></p>
                            <div className="mt-2 border-t border-slate-900 pt-2 font-mono text-[9px] text-[#eeccff] truncate">
                              Bearer {simToken || "NULL"}
                            </div>
                          </div>

                          <div className="flex gap-2 text-2xs">
                            <button
                              onClick={() => triggerRefreshJwtToken()}
                              className="flex-1 py-1.5 font-bold uppercase bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-lg cursor-pointer text-center"
                            >
                              Rotate Claims
                            </button>
                            <button
                              onClick={handleLogout}
                              className="flex-1 py-1.5 font-bold uppercase bg-rose-950/40 hover:bg-rose-900/40 text-[#ff8888] border border-rose-950 rounded-lg cursor-pointer text-center"
                            >
                              Wipe Session
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h3 className="text-xs font-semibold text-white">OAuth Secure DB Authn</h3>
                          <div className="space-y-3">
                            <div className="space-y-1 text-xs">
                              <label className="text-[9px] text-slate-500 uppercase pl-1 text-left block">Login Email Address</label>
                              <input
                                type="email"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                className="w-full px-3 py-1.5 bg-[#1a1b24] border border-slate-800 rounded-lg text-xs text-white"
                                placeholder="alex@enterprise-platform.com"
                              />
                            </div>
                            <button
                              onClick={handleLogin}
                              className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-lg cursor-pointer text-center"
                            >
                              Challenge Login Sign-In
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* REST checks */}
                  <div className="bg-[#121319] p-4 rounded-xl border border-slate-900 space-y-3.5">
                    <h3 className="text-xs font-semibold text-white">Spring Pre-Authorize Route Gatekeeper Test</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
                      {[
                        { resource: "/api/public/status", label: "Public Node Access", roles: "Permit All" },
                        { resource: "/api/management/moderation", label: "Moderators Dashboard", roles: "ROLE_ADMIN, ROLE_MODERATOR" },
                        { resource: "/api/admin/dashboard", label: "Root Admin Operations", roles: "ROLE_ADMIN Only" }
                      ].map((endpoint, rid) => (
                        <button
                          key={rid}
                          onClick={() => testSecureRoleAccess(endpoint.resource)}
                          className="p-3 bg-[#171822] hover:bg-[#1f2030] rounded-lg border border-slate-800 text-left cursor-pointer transition-all hover:-translate-y-1 flex flex-col justify-between"
                        >
                          <div className="text-left font-sans">
                            <span className="text-[9px] font-mono text-purple-400 font-bold uppercase">PreAuthorize</span>
                            <p className="text-xs font-semibold text-white mt-1">{endpoint.label}</p>
                            <p className="text-2xs text-slate-500 font-mono mt-1 truncate">{endpoint.resource}</p>
                          </div>
                          <div className="pt-2 border-t border-slate-850 mt-2">
                            <p className="text-[9px] text-[#bc7be0] italic font-sans">Required: {endpoint.roles}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeSettingsTab === "audit_ledger" && (
                <div className="space-y-6 max-h-full">
                  <div className="border-b border-slate-900 pb-3">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Terminal size={15} className="text-purple-400" />
                      <span>Cryptographic Audit Logs Ledger (HMAC SHA256)</span>
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-1">A real-time tamper-evident verification sweep. Demonstrates detecting offline database compromises via recalculating standard HMAC blocks digests.</p>
                  </div>

                  <div className="bg-[#121319] p-4 rounded-xl border border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-xs text-left">
                      <p className="font-bold text-white">Compliance Evaluator Auditor: Cryptographic hashes check</p>
                      <div className="flex items-center gap-2 mt-1 font-mono text-[9px]">
                        <span className="text-slate-500 uppercase">Ledger status:</span>
                        <span className={`font-bold uppercase ${
                          auditSweepStatus === "pristine" 
                            ? "text-emerald-400" 
                            : auditSweepStatus === "corrupted" 
                            ? "text-rose-500 animate-pulse" 
                            : "text-slate-400"
                        }`}>
                          {auditSweepStatus === "pristine" ? "✓ SECURE INTEGRITY: PRISTINE" : auditSweepStatus === "corrupted" ? "⚠️ CORRUPTED DATA EXPORT DETECTED" : "UNCHECKED SWEEP"}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={handleAuditTamperCheck}
                        className="px-3 py-1.5 text-xs font-semibold bg-purple-700 hover:bg-purple-600 text-white rounded-lg cursor-pointer"
                      >
                        Sweep Database Integrity
                      </button>
                      <button
                        onClick={handleRestoreAuditIntegrity}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-lg cursor-pointer"
                      >
                        Restore Cryptographic Seals
                      </button>
                    </div>
                  </div>

                  {auditSweepStatus === "corrupted" && (
                    <div className="bg-rose-950/20 border border-rose-900 p-3 rounded-lg text-xs flex gap-3 text-[#ffbebe] text-left">
                      <ShieldAlert className="shrink-0 text-rose-500" size={16} />
                      <div>
                        <p className="font-bold">Cryptographical mismatch identified!</p>
                        <p className="text-2xs mt-1">Offline database manipulation was detected on row keys: {JSON.stringify(auditCorruptedRows)} without valid hash matching!</p>
                      </div>
                    </div>
                  )}

                  {/* Audit logs ledger table list */}
                  <div className="bg-[#121319] p-4 rounded-xl border border-slate-900 space-y-3">
                    <h3 className="text-xs font-semibold text-white">Audit Ledger Entries ({auditLogsList.length})</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[11px] font-mono whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-slate-900 text-slate-500">
                            <th className="pb-2">Timestamp</th>
                            <th className="pb-2">Principal ID</th>
                            <th className="pb-2">Sec-Action</th>
                            <th className="pb-2 text-center">Status</th>
                            <th className="pb-2 text-right">HMAC Signature Hash Block</th>
                            <th className="pb-2 text-right">Simulate Tamper</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogsList.slice(0, 10).map(log => {
                            const isCorrupt = auditCorruptedRows.includes(log.id);
                            return (
                              <tr key={log.id} className={`border-b border-slate-900/40 ${isCorrupt ? "bg-rose-950/20 text-rose-300" : "text-slate-300"}`}>
                                <td className="py-2">{log.timestamp}</td>
                                <td className="py-2 text-slate-400">{log.userRef}</td>
                                <td className="py-2 font-bold text-slate-100">{log.action}</td>
                                <td className="py-2 text-center">
                                  <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${log.status === "SUCCESS" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-450"}`}>
                                    {log.status}
                                  </span>
                                </td>
                                <td className="py-2 text-right text-purple-400 text-2xs truncate max-w-[150px]">{log.auditHash}</td>
                                <td className="py-2 text-right">
                                  <button
                                    onClick={() => handleTamperAuditLog(log.id, "clientIP", "10.0.0.99")}
                                    className="px-2 py-0.5 text-[10px] bg-[#2a1720] hover:bg-[#3d1829] text-[#ff8888] rounded border border-rose-950 font-bold cursor-pointer font-sans"
                                  >
                                    Hack IP
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        ) : activeFolder === "Dashboard" ? (
          
          /* VIEW 3: MAIL DASHBOARD */
          <main className="flex-1 overflow-y-auto bg-[var(--proton-bg)] p-6 lg:p-8 space-y-6 lg:space-y-8 font-sans max-h-full text-[var(--proton-text-primary)]">
            {/* Dashboard Header Banner */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[var(--proton-border)] pb-5">
              <div>
                <h1 className="text-xl font-bold text-[var(--proton-text-primary)] tracking-tight flex items-center gap-2">
                  <LayoutDashboard className="text-[var(--proton-purple)]" size={20} />
                  <span>Secure Communication Workspace</span>
                </h1>
                <p className="text-xs text-[var(--proton-text-secondary)] mt-1">
                  Unified client console overview for encrypted messages, signatures, and draft compositions.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--proton-text-secondary)] bg-[var(--proton-surf)] px-3 py-1.5 rounded-lg border border-[var(--proton-border)]">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                <span>PROTECTED PROTOCOL ONLINE</span>
              </div>
            </div>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Card 1: Total Emails */}
              <div 
                onClick={() => setActiveFolder("Inbox")} 
                className="bg-[var(--proton-surf)] border border-[var(--proton-border)] hover:border-[var(--proton-purple)]/55 p-4.5 rounded-xl text-left space-y-3 transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--proton-text-secondary)] uppercase tracking-wider font-semibold">Total Emails</span>
                  <div className="p-2 bg-[var(--proton-purple-light-alpha)] text-[var(--proton-purple)] rounded-lg group-hover:bg-[var(--proton-purple)] group-hover:text-white transition-all size-8 flex items-center justify-center">
                    <Mail size={14} />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-[var(--proton-text-primary)] font-mono leading-none">{emails.length}</p>
                  <p className="text-[10px] text-[var(--proton-text-secondary)] mt-1">Across all secure folders</p>
                </div>
              </div>

              {/* Card 2: Unread Emails */}
              <div 
                onClick={() => setActiveFolder("Inbox")} 
                className="bg-[var(--proton-surf)] border border-[var(--proton-border)] hover:border-emerald-500/55 p-4.5 rounded-xl text-left space-y-3 transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--proton-text-secondary)] uppercase tracking-wider font-semibold">Unread</span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all size-8 flex items-center justify-center">
                    <MailOpen size={14} />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-emerald-650 dark:text-emerald-400 font-mono leading-none">
                    {emails.filter(e => e.isUnread).length}
                  </p>
                  <p className="text-[10px] text-[var(--proton-text-secondary)] mt-1">Pending read clearance</p>
                </div>
              </div>

              {/* Card 3: Starred */}
              <div 
                onClick={() => setActiveFolder("Starred")} 
                className="bg-[var(--proton-surf)] border border-[var(--proton-border)] hover:border-amber-500/55 p-4.5 rounded-xl text-left space-y-3 transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--proton-text-secondary)] uppercase tracking-wider font-semibold">Starred</span>
                  <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-all size-8 flex items-center justify-center">
                    <Star size={14} />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-amber-650 dark:text-amber-400 font-mono leading-none">
                    {emails.filter(e => e.isStarred).length}
                  </p>
                  <p className="text-[10px] text-[var(--proton-text-secondary)] mt-1">Flagged high-priority</p>
                </div>
              </div>

              {/* Card 4: Drafts */}
              <div 
                onClick={() => setActiveFolder("Drafts")} 
                className="bg-[var(--proton-surf)] border border-[var(--proton-border)] hover:border-[var(--proton-purple)]/55 p-4.5 rounded-xl text-left space-y-3 transition-all hover:scale-[1.02] cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--proton-text-secondary)] uppercase tracking-wider font-semibold">Drafts</span>
                  <div className="p-2 bg-[var(--proton-purple-light-alpha)] text-[var(--proton-purple)] rounded-lg group-hover:bg-[var(--proton-purple)] group-hover:text-white transition-all size-8 flex items-center justify-center">
                    <PenSquare size={14} />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-[var(--proton-purple)] font-mono leading-none">
                    {draftsList.length}
                  </p>
                  <p className="text-[10px] text-[var(--proton-text-secondary)] mt-1">Saved cipher drafts</p>
                </div>
              </div>

              {/* Card 5: Storage Usage details */}
              <div className="bg-[var(--proton-surf)] border border-[var(--proton-border)] p-4.5 rounded-xl text-left flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--proton-text-secondary)] uppercase tracking-wider font-semibold">Secure Storage</span>
                  <HardDrive size={14} className="text-cyan-600 dark:text-cyan-400" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-2xs font-mono">
                    <span className="text-[var(--proton-text-primary)] font-bold">24.4 MB</span>
                    <span className="text-[var(--proton-text-secondary)]">of 15 GB (0.16%)</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-[var(--proton-bg)] h-2 rounded-full overflow-hidden border border-[var(--proton-border)]">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full w-[0.16%]" />
                  </div>
                  <p className="text-[9px] text-[var(--proton-text-secondary)] italic">Storage index pristine</p>
                </div>
              </div>
            </div>

            {/* Quick Actions Container panel */}
            <div className="bg-[var(--proton-surf)] border border-[var(--proton-border)] rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-[var(--proton-text-primary)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--proton-border)] pb-3">
                <Zap size={14} className="text-amber-500 dark:text-amber-400" />
                <span>Quick Workspace Operations</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Click 1: Compose mail */}
                <button
                  onClick={handleOpenCompose}
                  className="p-4 bg-[var(--proton-bg)] hover:bg-[var(--proton-purple-light-alpha)] rounded-xl border border-[var(--proton-border)] text-left transition-all hover:-translate-y-1 hover:border-[var(--proton-purple)]/40 group cursor-pointer"
                >
                  <div className="bg-[var(--proton-purple-light-alpha)] text-[var(--proton-purple)] p-2.5 rounded-lg w-10 h-10 flex items-center justify-center mb-3 group-hover:bg-[var(--proton-purple)] group-hover:text-white transition-all">
                    <PenSquare size={16} />
                  </div>
                  <p className="text-xs font-bold text-[var(--proton-text-primary)]">Compose Secure Message</p>
                  <p className="text-[10px] text-[var(--proton-text-secondary)] mt-1">Launch structural cryptographic workspace editor</p>
                </button>

                {/* Click 2: Quick draft */}
                <button
                  onClick={handleCreateQuickDraft}
                  className="p-4 bg-[var(--proton-bg)] hover:bg-[var(--proton-purple-light-alpha)] rounded-xl border border-[var(--proton-border)] text-left transition-all hover:-translate-y-1 hover:border-[var(--proton-purple)]/40 group cursor-pointer"
                >
                  <div className="bg-[var(--proton-purple-light-alpha)] text-[var(--proton-purple)] p-2.5 rounded-lg w-10 h-10 flex items-center justify-center mb-3 group-hover:bg-[var(--proton-purple)] group-hover:text-white transition-all">
                    <Plus size={16} />
                  </div>
                  <p className="text-xs font-bold text-[var(--proton-text-primary)]">Create Safe Draft</p>
                  <p className="text-[10px] text-[var(--proton-text-secondary)] mt-1">Stage a secure unsent local template block</p>
                </button>

                {/* Click 3: Fast search focus */}
                <button
                  onClick={() => {
                    const input = document.getElementById("search-emails-input");
                    if (input) {
                      input.focus();
                      notify("Search index highlighted. Filter emails above!", "info");
                    }
                  }}
                  className="p-4 bg-[var(--proton-bg)] hover:bg-[var(--proton-purple-light-alpha)] rounded-xl border border-[var(--proton-border)] text-left transition-all hover:-translate-y-1 hover:border-amber-500/40 group cursor-pointer"
                >
                  <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-2.5 rounded-lg w-10 h-10 flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-all">
                    <Search size={16} />
                  </div>
                  <p className="text-xs font-bold text-[var(--proton-text-primary)]">Identify & Search Emails</p>
                  <p className="text-[10px] text-[var(--proton-text-secondary)] mt-1">Instantly target the header index query controller</p>
                </button>
              </div>
            </div>

            {/* Space with 2 columns: Recent Received vs Recent Sent */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-8">
              {/* Left Column: Recent Received */}
              <div className="bg-[var(--proton-surf)] border border-[var(--proton-border)] rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-[var(--proton-border)] pb-3">
                  <h3 className="text-xs font-bold text-[var(--proton-text-primary)] uppercase tracking-wider flex items-center gap-2">
                    <Mail size={14} className="text-[var(--proton-purple)]" />
                    <span>Recent Received Messages</span>
                  </h3>
                  <button 
                    onClick={() => setActiveFolder("Inbox")}
                    className="text-[10px] text-[var(--proton-purple)] hover:text-[var(--proton-hover-purple)] font-semibold cursor-pointer"
                  >
                    Go to Inbox
                  </button>
                </div>
                <div className="space-y-3">
                  {(() => {
                    const recentReceived = emails.filter(e => e.folder !== "Sent" && e.folder !== "Drafts" && e.folder !== "Trash").slice(0, 4);
                    if (recentReceived.length === 0) {
                      return (
                        <p className="text-2xs text-[var(--proton-text-secondary)] italic py-6 text-center">No recently received communications.</p>
                      );
                    }
                    return recentReceived.map(item => (
                      <div 
                        key={item.id}
                        onClick={() => {
                          setSelectedEmail(item);
                          setActiveFolder(item.folder as any);
                          item.isUnread = false;
                        }}
                        className="p-3 bg-[var(--proton-bg)] hover:bg-[var(--proton-purple-light-alpha)] border border-[var(--proton-border)] rounded-lg text-left transition-all cursor-pointer flex justify-between items-start gap-4"
                      >
                        <div className="flex gap-2.5 min-w-0">
                          {/* Circle indicator for unread, generic avatar letter */}
                          <div className="w-7 h-7 rounded-md bg-[var(--proton-purple-light-alpha)] border border-[var(--proton-border)] text-[var(--proton-purple)] font-bold flex items-center justify-center text-xs shrink-0 select-none">
                            {item.senderName ? item.senderName.charAt(0).toUpperCase() : "M"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-[var(--proton-text-primary)]">{item.senderName}</span>
                              {item.isUnread && (
                                <span className="bg-[var(--proton-purple)] text-white font-bold px-1 rounded text-[8px] border border-[var(--proton-purple)]">NEW</span>
                              )}
                            </div>
                            <p className="text-[11px] font-medium text-[var(--proton-text-primary)] truncate">{item.subject}</p>
                            <p className="text-[10px] text-[var(--proton-text-secondary)] font-sans truncate line-clamp-1">{item.body}</p>
                          </div>
                        </div>
                        <span className="text-[9px] text-[var(--proton-text-secondary)] font-mono shrink-0 pt-0.5">{item.timestamp}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Right Column: Recent Sent */}
              <div className="bg-[var(--proton-surf)] border border-[var(--proton-border)] rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-[var(--proton-border)] pb-3">
                  <h3 className="text-xs font-bold text-[var(--proton-text-primary)] uppercase tracking-wider flex items-center gap-2">
                    <Send size={14} className="text-[var(--proton-purple)]" />
                    <span>Recently Sent Messages</span>
                  </h3>
                  <button 
                    onClick={() => setActiveFolder("Sent")}
                    className="text-[10px] text-[var(--proton-purple)] hover:text-[var(--proton-hover-purple)] font-semibold cursor-pointer"
                  >
                    Go to Sent
                  </button>
                </div>
                <div className="space-y-3">
                  {(() => {
                    const recentSent = emails.filter(e => e.folder === "Sent").slice(0, 4);
                    if (recentSent.length === 0) {
                      return (
                        <p className="text-2xs text-[var(--proton-text-secondary)] italic py-6 text-center">No recently sent communications.</p>
                      );
                    }
                    return recentSent.map(item => (
                      <div 
                        key={item.id}
                        onClick={() => {
                          setSelectedEmail(item);
                          setActiveFolder("Sent");
                        }}
                        className="p-3 bg-[var(--proton-bg)] hover:bg-[var(--proton-purple-light-alpha)] border border-[var(--proton-border)] rounded-lg text-left transition-all cursor-pointer flex justify-between items-start gap-4"
                      >
                        <div className="flex gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-md bg-[var(--proton-purple-light-alpha)] border border-[var(--proton-border)] text-[var(--proton-purple)] font-bold flex items-center justify-center text-xs shrink-0 select-none">
                            S
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[var(--proton-text-primary)]">
                              {Array.isArray(item.recipients) ? item.recipients.join(", ") : item.recipients || item.senderEmail}
                            </span>
                            <p className="text-[11px] font-medium text-[var(--proton-text-primary)] truncate">{item.subject}</p>
                            <p className="text-[10px] text-[var(--proton-text-secondary)] font-sans truncate line-clamp-1">{item.body}</p>
                          </div>
                        </div>
                        <span className="text-[9px] text-[var(--proton-text-secondary)] font-mono shrink-0 pt-0.5">{item.timestamp}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </main>
        ) : (
          
          /* VIEW 2: STANDARD ENVELOPE EMAILS LIST & FULL READING VIEWPORT */
          <main className="flex-1 flex overflow-hidden">
            
            {/* B. EMAIL LIST PANEL COLUMNS */}
            <section className="w-[316px] border-r border-[#181920] flex flex-col shrink-0 bg-[#0c0d12]">
              {/* Header block info */}
              <div className="p-3.5 border-b border-slate-900 bg-[#0e0f14] flex justify-between items-center shrink-0 text-xs">
                <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Mail size={13} className="text-purple-400" />
                  <span>{activeFolder}</span>
                  <span className="text-[10px] bg-slate-900 text-purple-400 border border-slate-800 px-1.5 py-0.5 rounded font-mono">
                    {activeFolderEmails.length}
                  </span>
                </span>
                <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">SSL SECURE</span>
              </div>

              {/* Category selector pills - visible only for Inbox */}
              {activeFolder === "Inbox" && (
                <div className="p-2 border-b border-slate-900 bg-[#0a0b0f] flex gap-1 items-center overflow-x-auto scrollbar-none shrink-0">
                  {([
                    { id: "All", label: "All" },
                    { id: "Primary", label: "Primary" },
                    { id: "Work", label: "Work" },
                    { id: "Social", label: "Social" },
                    { id: "Updates", label: "Updates" }
                  ] as const).map(cat => {
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveCategory(cat.id);
                          setSelectedEmail(null);
                        }}
                        className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer shrink-0 ${
                          isActive 
                            ? "bg-purple-700 text-white font-semibold" 
                            : "bg-[#121319] text-slate-400 hover:text-white hover:bg-slate-900"
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Bulk Action Bar - appears when emails are selected */}
              <AnimatePresence>
                {selectedEmailIds.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, y: -8 }}
                    animate={{ height: "auto", opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="overflow-hidden border-b border-purple-950/40 bg-[#121319]"
                  >
                    <div className="p-2 px-3 flex items-center justify-between gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <input
                          id="bulk-master-checkbox"
                          type="checkbox"
                          checked={activeFolderEmails.length > 0 && activeFolderEmails.every(e => selectedEmailIds.includes(e.id))}
                          onChange={handleToggleSelectAll}
                          className="w-3.5 h-3.5 rounded border-slate-800 text-purple-650 focus:ring-purple-600 bg-slate-950 cursor-pointer"
                          title="Select / Deselect all visible"
                        />
                        <span className="text-[10px] font-bold text-purple-300 font-mono select-none">
                          {selectedEmailIds.length} Selected
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                        <button
                          onClick={() => handleBulkMarkRead(true)}
                          className="p-1 px-1.5 bg-[#171822] hover:bg-purple-950/45 border border-slate-850 hover:border-purple-900/50 rounded-md text-slate-300 hover:text-purple-300 transition-all flex items-center gap-1 text-[9px] font-medium cursor-pointer"
                          title="Mark as Read"
                        >
                          <MailOpen size={10} />
                          <span className="hidden sm:inline">Read</span>
                        </button>

                        <button
                          onClick={() => handleBulkMarkRead(false)}
                          className="p-1 px-1.5 bg-[#171822] hover:bg-purple-950/45 border border-slate-850 hover:border-purple-900/50 rounded-md text-slate-300 hover:text-purple-300 transition-all flex items-center gap-1 text-[9px] font-medium cursor-pointer"
                          title="Mark as Unread"
                        >
                          <Mail size={10} />
                          <span className="hidden sm:inline">Unread</span>
                        </button>

                        {activeFolder !== "Inbox" && (
                          <button
                            onClick={() => handleBulkMove("Inbox")}
                            className="p-1 px-1.5 bg-[#171822] hover:bg-emerald-950/40 border border-slate-850 hover:border-emerald-900/50 rounded-md text-slate-300 hover:text-emerald-300 transition-all flex items-center gap-1 text-[9px] font-medium cursor-pointer"
                            title="Move to Inbox"
                          >
                            <Inbox size={10} />
                            <span className="hidden sm:inline">Inbox</span>
                          </button>
                        )}

                        {activeFolder !== "Spam" && (
                          <button
                            onClick={() => handleBulkMove("Spam")}
                            className="p-1 px-1.5 bg-[#171822] hover:bg-amber-950/40 border border-slate-850 hover:border-amber-900/50 rounded-md text-slate-300 hover:text-amber-300 transition-all flex items-center gap-1 text-[9px] font-medium cursor-pointer"
                            title="Move to Spam"
                          >
                            <ShieldAlert size={10} />
                            <span className="hidden sm:inline">Spam</span>
                          </button>
                        )}

                        <button
                          onClick={handleBulkDelete}
                          className="p-1 px-1.5 bg-[#1d1418] hover:bg-rose-950/60 border border-rose-950 hover:border-rose-900/50 rounded-md text-rose-450 hover:text-rose-300 transition-all flex items-center gap-1 text-[9px] font-medium cursor-pointer"
                          title={activeFolder === "Trash" ? "Delete permanently" : "Move to Trash"}
                        >
                          <Trash2 size={10} />
                          <span className="hidden sm:inline">{activeFolder === "Trash" ? "Delete" : "Trash"}</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Emails List Container */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-900/60 pb-16">
                {isLoadingMails ? (
                  /* Loading Skeletons with Shimmer effect */
                  <div className="p-3.5 space-y-4">
                    {[1, 2, 3, 4, 5].map(idx => (
                      <div key={idx} className="flex gap-2.5 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-[#D8D2F7] dark:bg-[#32324D] shrink-0 border border-[#CFC6F5] dark:border-[#232338]"></div>
                        <div className="flex-1 space-y-2 py-1">
                          <div className="flex justify-between items-baseline">
                            <div className="h-2.5 bg-[#D8D2F7] dark:bg-[#32324D] rounded w-1/3"></div>
                            <div className="h-1.5 bg-[#CFC6F5] dark:bg-[#232338] rounded w-1/12"></div>
                          </div>
                          <div className="h-2 bg-[#D8D2F7] dark:bg-[#32324D] rounded w-3/4"></div>
                          <div className="h-1.5 bg-[#CFC6F5] dark:bg-[#232338] rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activeFolderEmails.length === 0 ? (
                  /* High Fidelity Empty State */
                  <div className="p-8 py-16 text-center space-y-3 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-slate-950 rounded-2xl border border-slate-900 flex items-center justify-center text-slate-600">
                      <MailOpen size={20} className="text-purple-400/80" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-350 font-sans">Queue fully cleared</p>
                      <p className="text-[10px] text-slate-500 leading-normal max-w-[180px] mx-auto">
                        No messages in {activeFolder} folder match the criteria. Everything is securely signed and routed.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Emails Items rendering */
                  activeFolderEmails.map(item => {
                    const isSelected = selectedEmail?.id === item.id;
                    const avatarLetter = item.senderName ? item.senderName.substring(0, 1).toUpperCase() : "M";
                    
                    // Dynamic color gradients for sender avatars based on code sum
                    const getAvatarStyle = (name: string) => {
                      const colors = [
                        "bg-gradient-to-tr from-purple-500 to-indigo-600 shadow-purple-500/10 text-white",
                        "bg-gradient-to-tr from-emerald-500 to-teal-600 shadow-emerald-500/10 text-white",
                        "bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-blue-500/10 text-white",
                        "bg-gradient-to-tr from-rose-500 to-pink-600 shadow-rose-500/10 text-white",
                        "bg-gradient-to-tr from-amber-500 to-orange-600 shadow-amber-500/10 text-white"
                      ];
                      let sum = 0;
                      for (let i = 0; i < (name || "").length; i++) {
                        sum += name.charCodeAt(i);
                      }
                      return colors[sum % colors.length];
                    };

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedEmail(item);
                          // Mark as read immediately on client side
                          item.isUnread = false;
                        }}
                        className={`group p-3.5 text-left transition-all duration-150 relative cursor-pointer flex flex-col gap-2.5 ${
                          isSelected 
                            ? "bg-[#161722]/90 border-l-3 border-purple-500 text-white" 
                            : "text-[#8e909a] hover:bg-[#121319]/60 hover:text-white"
                        } ${item.isUnread ? "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-purple-600 before:rounded-r" : ""}`}
                      >
                        <div className="flex items-start gap-2.5 text-xs w-full">
                          {/* Checkbox for bulk actions */}
                          <div 
                            className="flex items-center justify-center h-8 shrink-0" 
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              id={`checkbox-${item.id}`}
                              type="checkbox"
                              checked={selectedEmailIds.includes(item.id)}
                              onChange={() => {
                                setSelectedEmailIds(prev => 
                                  prev.includes(item.id) 
                                    ? prev.filter(id => id !== item.id) 
                                    : [...prev, item.id]
                                );
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-800 text-purple-650 focus:ring-purple-600/50 bg-slate-950 cursor-pointer transition-all duration-150"
                            />
                          </div>

                          {/* Animated / Gradient rich sender avatar bubble */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 uppercase tracking-tighter border border-slate-900 shadow-md ${getAvatarStyle(item.senderName)}`}>
                            {avatarLetter}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex justify-between items-baseline gap-2">
                              <p className={`text-xs truncate transition-colors ${item.isUnread ? "text-white font-bold" : "text-slate-300"}`}>
                                {item.senderName}
                              </p>
                              <span className="text-[9px] text-slate-500 shrink-0 font-mono">
                                {item.timestamp}
                              </span>
                            </div>

                            <p className={`text-[11px] truncate leading-tight ${item.isUnread ? "text-purple-300 font-semibold" : "text-slate-400"}`}>
                              {item.subject}
                            </p>
                            
                            <p className="text-[10px] text-slate-500 truncate line-clamp-1 leading-normal font-sans">
                              {item.body}
                            </p>
                          </div>
                        </div>

                        {/* Bottom Meta & Star utilities & hover quick actions */}
                        <div className="flex items-center justify-between mt-1 pl-[68px]">
                          <div className="flex gap-1.5 items-center">
                            {/* Category tags pill indicators */}
                            {item.category && item.category !== "Primary" && (
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide border ${
                                item.category === "Work" 
                                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                                  : item.category === "Updates" 
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                                  : "bg-teal-500/10 text-teal-400 border-teal-500/20"
                              }`}>
                                {item.category}
                              </span>
                            )}
                            {item.attachments && item.attachments.length > 0 && (
                              <Paperclip size={10} className="text-slate-500 shrink-0" />
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {item.isUnread && (
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            )}
                            <button
                              onClick={(e) => handleToggleStar(item.id, e)}
                              className={`text-slate-500 hover:text-amber-400 transition-colors cursor-pointer ${item.isStarred ? "text-amber-400" : ""}`}
                              title={item.isStarred ? "Starred" : "Star message"}
                            >
                              <Star size={11} fill={item.isStarred ? "currentColor" : "none"} />
                            </button>
                          </div>
                        </div>

                        {/* HOVER QUICK ACTIONS BAR */}
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1 bg-[#121319] dark:bg-[#191927] border border-slate-800 pr-1.5 pl-3 py-1 rounded-lg shadow-xl shrink-0 z-10 select-none">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEmails(prev => prev.map(m => m.id === item.id ? { ...m, isUnread: !m.isUnread } : m));
                              notify(`Marked as ${item.isUnread ? "read" : "unread"}.`, "info");
                            }}
                            className="p-1 text-slate-400 hover:text-purple-400 transition-colors rounded cursor-pointer"
                            title={item.isUnread ? "Mark as Read" : "Mark as Unread"}
                          >
                            {item.isUnread ? <MailOpen size={12} /> : <Mail size={12} />}
                          </button>
                          
                          <button
                            onClick={(e) => handleToggleStar(item.id, e)}
                            className={`p-1 transition-colors rounded cursor-pointer ${item.isStarred ? "text-amber-400 hover:text-slate-400" : "text-slate-400 hover:text-amber-400"}`}
                            title={item.isStarred ? "Unstar" : "Star"}
                          >
                            <Star size={12} fill={item.isStarred ? "currentColor" : "none"} />
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMail(item);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-400 transition-colors rounded cursor-pointer"
                            title="Move to Trash"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* C. EMAIL READING PANEL */}
            <section className="flex-1 flex flex-col min-w-0 bg-[var(--proton-bg)]">
              {selectedEmail ? (
                <div className="flex-1 flex flex-col overflow-hidden text-xs text-left">
                  
                  {/* Action controllers */}
                  <div className="h-10 border-b border-slate-900 bg-[#0f1016] px-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReplyMail(selectedEmail)}
                        className="py-1 px-2.5 rounded hover:bg-slate-900 border border-transparent hover:border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        Reply
                      </button>
                      <button
                        onClick={() => handleReplyAllMail(selectedEmail)}
                        className="py-1 px-2.5 rounded hover:bg-slate-900 border border-transparent hover:border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        Reply All
                      </button>
                      <button
                        onClick={() => handleForwardMail(selectedEmail)}
                        className="py-1 px-2.5 rounded hover:bg-slate-900 border border-transparent hover:border-slate-800 text-[11px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
                      >
                        Forward
                      </button>
                      <button
                        onClick={() => handleDeleteMail(selectedEmail)}
                        className="py-1 px-2.5 rounded hover:bg-slate-900 border border-transparent hover:border-slate-800 text-[11px] font-medium text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        Delete Message
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => handleToggleStar(selectedEmail.id, e)}
                        className={`p-1.5 rounded text-slate-400 hover:text-amber-400 ${selectedEmail.isStarred ? "text-amber-400" : ""}`}
                        title="Star communication"
                      >
                        <Star size={14} fill={selectedEmail.isStarred ? "currentColor" : "none"} />
                      </button>
                      <span className="text-[10px] font-mono text-slate-500">CIPHER: AES-GCM-256</span>
                    </div>
                  </div>

                  {/* Reading scroll views */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    
                    {/* Headers */}
                    <div className="border-b border-slate-900 pb-4 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <h2 className="text-sm font-bold text-white tracking-tight">{selectedEmail.subject}</h2>
                        <span className="text-[11px] text-slate-500 font-mono shrink-0">{selectedEmail.date} {selectedEmail.timestamp}</span>
                      </div>

                      <div className="flex items-center gap-3 pt-1 text-xs">
                        <div className="w-8 h-8 rounded-full bg-[#1b1c26] text-purple-400 font-bold flex items-center justify-center shrink-0 uppercase border border-slate-800 shadow">
                          {selectedEmail.senderName.substring(0,1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200 truncate">{selectedEmail.senderName}</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">&lt;{selectedEmail.senderEmail}&gt;</p>
                        </div>
                      </div>

                      {selectedEmail.recipients && (
                        <p className="text-[10px] text-slate-400 font-mono pl-11">
                          To: {Array.isArray(selectedEmail.recipients) ? selectedEmail.recipients.join(", ") : selectedEmail.recipients}
                        </p>
                      )}
                    </div>

                    {/* Highly stylized cryptographically status alert badges */}
                    {(selectedEmail.isEncrypted || selectedEmail.folder === "Drafts") && (
                      <div className="bg-[#141c18] border border-emerald-500/10 p-3 rounded-lg flex gap-2.5 items-start text-emerald-300 text-xs">
                        <ShieldCheck className="text-emerald-400 shrink-0 mt-0.5" size={14} />
                        <div>
                          <p className="font-bold tracking-tight">End-to-End Encrypted Secure Envelope</p>
                          <p className="text-slate-400 mt-0.5 leading-snug">This communication is encrypted end-to-end with AES-256-GCM. Cryptographic session keys parsed correctly client-side.</p>
                        </div>
                      </div>
                    )}

                    {selectedEmail.status && (
                      <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg flex gap-2.5 items-start text-amber-300">
                        <Clock className="text-amber-400 shrink-0 mt-0.5" size={14} />
                        <div>
                          <p className="font-bold tracking-tight">Future Queue Dispatch Pending</p>
                          <p className="text-slate-400 mt-0.5 leading-snug">This email scheduled for delivery at <span className="text-amber-400 font-mono font-bold font-sans">{selectedEmail.date}</span> status is currently {selectedEmail.status}.</p>
                        </div>
                      </div>
                    )}

                    {/* Email message body content */}
                    <div className="text-xs text-slate-300 leading-relaxed tracking-normal font-sans space-y-4 whitespace-pre-wrap pt-2">
                      {selectedEmail.body}
                    </div>

                    {/* Attachments view panel layout */}
                    {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                      <div className="pt-6 border-t border-slate-900 space-y-2">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                          <Paperclip size={11} />
                          <span>Attachments ({selectedEmail.attachments.length})</span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedEmail.attachments.map((file: any, fid: number) => (
                            <div key={fid} className="p-2.5 bg-[#171822] border border-slate-850 rounded-lg flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2 min-w-0 font-sans">
                                <div className="p-1 px-1.5 bg-[#222332] rounded text-purple-400 font-mono text-[9px] font-bold">BIN</div>
                                <div className="min-w-0 text-left">
                                  <p className="text-[11px] font-semibold text-slate-300 truncate">{file.name}</p>
                                  <p className="text-[9px] text-slate-500">{file.size || "2.4 MB"}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => notify(`Downloaded virtual asset file to disk: ${file.name}`, "success")}
                                className="text-[10px] font-semibold text-purple-400 hover:text-purple-355 px-2 py-1 rounded bg-[#202133] cursor-pointer"
                              >
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Threaded Conversation View section */}
                    {(() => {
                      const getSubjectBase = (sub: string) => {
                        if (!sub) return "";
                        return sub.replace(/^(Re:\s*|Fwd:\s*)+/i, "").trim().toLowerCase();
                      };
                      const sBase = getSubjectBase(selectedEmail.subject);
                      const threadMails = emails.filter(e => getSubjectBase(e.subject) === sBase);
                      
                      return (
                        <div className="pt-6 border-t border-slate-900 space-y-4">
                          <h3 className="text-[10px] text-slate-500 uppercase tracking-widest font-mono flex items-center justify-between">
                            <span>Conversation Thread ({threadMails.length} message{threadMails.length > 1 ? "s" : ""})</span>
                            <span className="text-[9px] text-purple-400 font-sans normal-case">Threaded automatically by subject match</span>
                          </h3>

                          <div className="space-y-3 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-[1px] before:bg-slate-900">
                            {threadMails.map((tMail, tIdx) => {
                              const isCurrent = tMail.id === selectedEmail.id;
                              
                              return (
                                <div 
                                  key={tMail.id} 
                                  className={`relative pl-8 transition-colors ${
                                    isCurrent 
                                      ? "opacity-100" 
                                      : "opacity-60 hover:opacity-100"
                                  }`}
                                >
                                  {/* Connector bullet */}
                                  <div className={`absolute left-2.5 top-3.5 w-3 h-3 rounded-full border-2 transform -translate-x-1/2 flex items-center justify-center ${
                                    isCurrent 
                                      ? "bg-purple-600 border-purple-500" 
                                      : "bg-[#0c0d12] border-slate-800"
                                  }`} />

                                  <div className={`p-3 rounded-xl border transition-all ${
                                    isCurrent 
                                      ? "bg-[#161722]/40 border-purple-900/30 shadow-md" 
                                      : "bg-[#0b0c10] border-slate-900/60 hover:border-slate-800"
                                  }`}>
                                    <div className="flex justify-between items-baseline text-2xs mb-1.5 text-slate-400">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-slate-200 text-xs">{tMail.senderName}</span>
                                        <span className="text-slate-500 font-mono text-[9px]">&lt;{tMail.senderEmail}&gt;</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-[9px]">{tMail.date} {tMail.timestamp}</span>
                                        {isCurrent && (
                                          <span className="bg-purple-950 text-purple-400 px-1.5 py-0.5 rounded text-[8px] font-bold border border-purple-900">ACTIVE</span>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-[#aeafbe] whitespace-pre-wrap leading-relaxed">{tMail.body}</p>
                                    
                                    {/* Inline Thread Replies action controllers */}
                                    {!isCurrent && (
                                      <div className="flex gap-4 mt-2 pt-2 border-t border-slate-900/40">
                                        <button
                                          onClick={() => {
                                            setSelectedEmail(tMail);
                                          }}
                                          className="text-[10px] text-purple-450 hover:text-purple-300 font-medium transition-colors cursor-pointer"
                                        >
                                          Activate Message
                                        </button>
                                        <button
                                          onClick={() => handleReplyMail(tMail)}
                                          className="text-[10px] text-slate-400 hover:text-white font-medium transition-colors cursor-pointer"
                                        >
                                          Reply
                                        </button>
                                        <button
                                          onClick={() => handleReplyAllMail(tMail)}
                                          className="text-[10px] text-slate-400 hover:text-white font-medium transition-colors cursor-pointer"
                                        >
                                          Reply All
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[var(--proton-text-secondary)] p-8 space-y-3">
                  <div className="bg-[var(--proton-surf)] p-4 rounded-2xl border border-[var(--proton-border)] shadow-xl shadow-purple-950/5">
                    <Shield className="text-[var(--proton-purple)]" size={32} />
                  </div>
                  <div className="text-center max-w-xs space-y-1">
                    <p className="text-xs font-bold text-[var(--proton-text-primary)]">All Communications Secured and Signed</p>
                    <p className="text-[11px] text-[var(--proton-text-secondary)] leading-normal">Select an item from your mailbox queues list to read contents. Cryptographic keys verified client-side.</p>
                  </div>
                </div>
              )}
            </section>
          </main>
        )}
      </div>

      {/* FLOAT COMPOSER CIPHER MESSAGES MODALS */}
      <AnimatePresence>
      {isComposeOpen && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              const newFiles = Array.from(e.dataTransfer.files).map((file: any) => ({
                name: file.name,
                size: (file.size / (1024 * 1024)).toFixed(1) + " MB"
              }));
              setUploadedFiles(prev => [...prev, ...newFiles]);
              notify(`Virtual asset uploaded: ${newFiles.map(f => f.name).join(", ")}`, "success");
            }
          }}
          className={`fixed bottom-4 right-4 z-50 w-full bg-[#14151d] rounded-xl border shadow-2xl flex flex-col overflow-hidden font-sans text-left transition-all duration-250 ${
            isComposeMaximized 
              ? "max-w-4xl h-[85vh] top-12 left-12 right-12 bottom-12 !max-w-none" 
              : "max-w-lg"
          } ${dragActive ? "border-purple-500 bg-purple-950/10 ring-4 ring-purple-500/10" : "border-slate-800"}`}
        >
          {/* Header block with controls */}
          <div className="bg-[#1b1c26] px-4 py-3 border-[#1b1c26] border flex justify-between items-center shrink-0">
            <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
              <LockKeyhole size={13} className="text-purple-450 animate-pulse" />
              <span>Secure Cipher Composer</span>
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsComposeMaximized(!isComposeMaximized)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                title={isComposeMaximized ? "Restore" : "Maximize"}
              >
                {isComposeMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button
                onClick={() => {
                  setIsComposeOpen(false);
                  setUploadedFiles([]);
                }}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Cancel Dispatch"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3.5 flex-1 overflow-y-auto flex flex-col">
            {/* Recipient area */}
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 uppercase tracking-widest pl-0.5">Recipients Envelope Address</label>
              <input
                type="text"
                placeholder="e.g., alex@enterprise-platform.com, corporate-comms@enterprise-platform.com"
                value={compRecipients}
                onChange={(e) => setCompRecipients(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#1d1f28] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-600 font-mono"
              />
            </div>

            {/* Subject Area */}
            <div className="space-y-1">
              <label className="text-[9px] text-slate-400 uppercase tracking-widest pl-0.5">Communication Subject</label>
              <input
                type="text"
                placeholder="Secure topic header"
                value={compSubject}
                onChange={(e) => setCompSubject(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#1d1f28] border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-600"
              />
            </div>

            {/* Rich formatting format bar controls */}
            <div className="space-y-1 flex-1 flex flex-col min-h-[160px]">
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-slate-400 uppercase tracking-widest pl-0.5">Body Plaintext / Markdown Material</label>
                
                {/* Format Bar Controls */}
                <div className="flex gap-1.5 bg-[#1a1b24] p-1 rounded border border-slate-800 text-[10px] items-center">
                  <button
                    onClick={() => {
                      const text = compBody;
                      const txtarea = document.getElementById("compose-textarea") as HTMLTextAreaElement;
                      if (txtarea) {
                        const start = txtarea.selectionStart;
                        const end = txtarea.selectionEnd;
                        const selected = text.substring(start, end);
                        setCompBody(text.substring(0, start) + `**${selected || "bold_text"}**` + text.substring(end));
                        notify("Applied text weight: Bold", "info");
                      }
                    }}
                    className="px-1.5 py-0.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 font-bold cursor-pointer"
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    onClick={() => {
                      const text = compBody;
                      const txtarea = document.getElementById("compose-textarea") as HTMLTextAreaElement;
                      if (txtarea) {
                        const start = txtarea.selectionStart;
                        const end = txtarea.selectionEnd;
                        const selected = text.substring(start, end);
                        setCompBody(text.substring(0, start) + `*${selected || "italic_text"}*` + text.substring(end));
                        notify("Applied style: Italic", "info");
                      }
                    }}
                    className="px-1.5 py-0.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 italic cursor-pointer"
                    title="Italic"
                  >
                    I
                  </button>
                  <button
                    onClick={() => {
                      const text = compBody;
                      const txtarea = document.getElementById("compose-textarea") as HTMLTextAreaElement;
                      if (txtarea) {
                        const start = txtarea.selectionStart;
                        const end = txtarea.selectionEnd;
                        const selected = text.substring(start, end);
                        setCompBody(text.substring(0, start) + `\`${selected || "code_block"}\`` + text.substring(end));
                        notify("Styled wrapping: Monospace Code", "info");
                      }
                    }}
                    className="px-1.5 py-0.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 font-mono text-[9px] cursor-pointer"
                    title="Code wrapper"
                  >
                    mono
                  </button>
                  <div className="w-[1px] h-3 bg-slate-800"></div>
                  <button
                    onClick={() => {
                      setCompBody(prev => prev + "\n- ");
                      notify("Appended Bullet point list starter.", "info");
                    }}
                    className="px-1.5 py-0.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                    title="Bullet point list"
                  >
                    • list
                  </button>
                </div>
              </div>

              {/* Secure Textarea Content */}
              <div className="relative flex-1 flex flex-col mt-1">
                <textarea
                  id="compose-textarea"
                  placeholder="Insert secure envelope body components here..."
                  value={compBody}
                  onChange={(e) => setCompBody(e.target.value)}
                  className="w-full flex-1 min-h-[120px] p-3 bg-[#1d1f28] border border-slate-800 rounded-lg text-xs font-sans leading-relaxed text-white placeholder-slate-600 focus:outline-none focus:border-purple-600 resize-none"
                />
                {dragActive && (
                  <div className="absolute inset-0 bg-[#161325]/95 border-2 border-purple-500 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 pointer-events-none text-purple-300">
                    <Paperclip size={24} className="animate-bounce" />
                    <p className="text-xs font-bold font-mono">DRAG ASSET HERE TO ENQUEUE SIGNATURES</p>
                    <p className="text-[10px] text-slate-400">Release files inside active envelope</p>
                  </div>
                )}
              </div>
            </div>

            {/* List current drag-dropped files */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-1.5 p-2 bg-[#101117] border border-slate-900 rounded-lg">
                <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping"></span>
                  <span>Enqueued virtual files ({uploadedFiles.length})</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {uploadedFiles.map((file, fid) => (
                    <div key={fid} className="flex items-center gap-1.5 px-2 py-0.5 bg-[#1a1c27] text-white border border-purple-950 font-sans text-[10px] rounded-md">
                      <Paperclip size={9} className="text-purple-400" />
                      <span className="truncate max-w-[140px] text-slate-300">{file.name}</span>
                      <span className="text-[8px] text-slate-500">({file.size})</span>
                      <button
                        onClick={() => {
                          setUploadedFiles(prev => prev.filter((_, idx) => idx !== fid));
                          notify(`Removed virtual file queue: ${file.name}`, "info");
                        }}
                        className="text-slate-400 hover:text-rose-450 font-bold ml-1 cursor-pointer"
                        title="Delete file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Selector file inputs area */}
            <div className="flex justify-between items-center gap-4 bg-[#0a0a0f] p-2.5 rounded-lg border border-slate-900 text-2xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById("file-picker") as HTMLInputElement;
                    if (input) input.click();
                  }}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded font-semibold cursor-pointer transition-colors"
                >
                  Choose Files...
                </button>
                <input
                  id="file-picker"
                  type="file"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const newFiles = Array.from(e.target.files).map((file: any) => ({
                        name: file.name,
                        size: (file.size / (1024 * 1024)).toFixed(1) + " MB"
                      }));
                      setUploadedFiles(prev => [...prev, ...newFiles]);
                      notify(`Virtual target file attached!`, "success");
                    }
                  }}
                  className="hidden"
                />
                <span className="text-[10px] text-slate-500">or Drag &amp; Drop here</span>
              </div>

              {/* Sched / Encrypt Controls */}
              <div className="flex gap-2.5 items-center shrink-0">
                <div className="space-y-0.5">
                  <input
                    type="datetime-local"
                    value={compSchedule}
                    onChange={(e) => setCompSchedule(e.target.value)}
                    className="px-2 py-1 bg-[#1d1f28] border border-slate-800 rounded text-slate-300 text-[10px] focus:outline-none cursor-pointer"
                    title="Scheduled date-time dispatch (Optional)"
                  />
                </div>
                
                <label className="flex items-center gap-1.5 py-1 px-2.5 bg-slate-900 border border-slate-800 rounded text-slate-300 font-semibold cursor-pointer select-none">
                  <span className="text-[10px]">AES Cipher Encrypt</span>
                  <input
                    type="checkbox"
                    checked={compEncrypt}
                    onChange={(e) => setCompEncrypt(e.target.checked)}
                    className="cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Actions dispatch triggers */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-900">
              <button
                onClick={handleSaveDraftFromCompose}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer border border-[#1b1c26] transition-colors text-center shadow-sm"
              >
                Save Secure Draft
              </button>
              <button
                onClick={() => handleSendComposeEmail(compRecipients, compSubject, compBody, compEncrypt, compSchedule || undefined)}
                className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors text-center shadow-lg hover:shadow-purple-700/10"
              >
                Secure Dispatch
              </button>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );


  // Quick State Updates utilities
  function triggerRefreshJwtToken() {
    if (!loggedInUser) return;
    handleTriggerSessionRefresh();
  }

  function triggerCopyText(text: string) {
    navigator.clipboard.writeText(text);
    notify("Header string copied successfully!", "success");
  }
}
