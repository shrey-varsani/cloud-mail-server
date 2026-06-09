package com.platform.email.controller;

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

import java.util.List;

@RestController
@RequestMapping("/api/v1/emails-platform")
@RequiredArgsConstructor
@Tag(name = "Email Storage Platform Engine", description = "Endpoints for managing corporate Mailboxes, Foldering states, Tag labels, Emails flow, and draft workspaces")
public class EmailPlatformController {

    private final EmailPlatformService emailPlatformService;

    // =========================================================================
    // MAILBOX CONTROLLERS
    // =========================================================================

    @PostMapping("/mailboxes")
    @Operation(summary = "Register a new mailbox", description = "Creates a corporate mailbox, initiating default standard folder bundles")
    public ResponseEntity<MailboxDto> createMailbox(@Valid @RequestBody MailboxRequest request) {
        return new ResponseEntity<>(emailPlatformService.createMailbox(request), HttpStatus.CREATED);
    }

    @GetMapping("/mailboxes/{id}")
    @Operation(summary = "Get specific mailbox details", description = "Fetches mailbox registration, metadata, and actual storage usages")
    public ResponseEntity<MailboxDto> getMailbox(@PathVariable Long id) {
        return ResponseEntity.ok(emailPlatformService.getMailbox(id));
    }

    @GetMapping("/mailboxes/owner/{ownerId}")
    @Operation(summary = "Get mailboxes owned by a specific identity identifier", description = "Locate all domains/boxes belonging to a user ID")
    public ResponseEntity<List<MailboxDto>> getMailboxesByOwner(@PathVariable String ownerId) {
        return ResponseEntity.ok(emailPlatformService.getMailboxesByOwner(ownerId));
    }

    // =========================================================================
    // FOLDER CONTROLLERS
    // =========================================================================

    @PostMapping("/folders")
    @Operation(summary = "Create custom mailbox folder context", description = "Creates custom user-defined folder bounds inside selected Mailbox")
    public ResponseEntity<FolderDto> createFolder(@Valid @RequestBody FolderRequest request) {
        return new ResponseEntity<>(emailPlatformService.createFolder(request), HttpStatus.CREATED);
    }

    @GetMapping("/folders/mailbox/{mailboxId}")
    @Operation(summary = "List folders in mailbox", description = "Returns system and user-defined folder details with exact counts")
    public ResponseEntity<List<FolderDto>> getFoldersInMailbox(@PathVariable Long mailboxId) {
        return ResponseEntity.ok(emailPlatformService.getFoldersByMailboxId(mailboxId));
    }

    // =========================================================================
    // LABEL CONTROLLERS
    // =========================================================================

    @PostMapping("/labels")
    @Operation(summary = "Provision a categorization label tag", description = "Register custom tagging label name and HEX color limits")
    public ResponseEntity<LabelDto> createLabel(@Valid @RequestBody LabelRequest request) {
        return new ResponseEntity<>(emailPlatformService.createLabel(request), HttpStatus.CREATED);
    }

    @GetMapping("/labels/mailbox/{mailboxId}")
    @Operation(summary = "List custom color label tags of a mailbox")
    public ResponseEntity<List<LabelDto>> getLabelsInMailbox(@PathVariable Long mailboxId) {
        return ResponseEntity.ok(emailPlatformService.getLabelsByMailboxId(mailboxId));
    }

    // =========================================================================
    // EMAIL FLOW & DISPATCH STORAGE CONTROLLERS
    // =========================================================================

    @PostMapping("/emails")
    @Operation(summary = "Index and store an incoming/outgoing email transaction", description = "Applies size counts and links folders/labels")
    public ResponseEntity<EmailDto> storeAndTrackEmail(@Valid @RequestBody EmailSendRequest request) {
        return new ResponseEntity<>(emailPlatformService.sendAndStoreEmail(request), HttpStatus.CREATED);
    }

    @GetMapping("/emails/{id}")
    @Operation(summary = "Read detailed email payload", description = "Fetches body lines, marking read status to true in relational tables")
    public ResponseEntity<EmailDto> readEmailBody(@PathVariable Long id) {
        return ResponseEntity.ok(emailPlatformService.readEmail(id));
    }

    @DeleteMapping("/emails/{id}")
    @Operation(summary = "Delete or archive email into Trash", description = "Moves standard emails to system trash, purges permanently if selected in Trash")
    public ResponseEntity<Void> deleteEmailFromPlatform(@PathVariable Long id) {
        emailPlatformService.deleteEmail(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/emails/folder/{folderId}")
    @Operation(summary = "List paginated emails within specific folder map", description = "Applies strict sorting and pagination indices")
    public ResponseEntity<Page<EmailDto>> listEmailsInFolder(
            @PathVariable Long folderId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "receivedAt") String sortField,
            @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        return ResponseEntity.ok(emailPlatformService.getEmailsByFolder(folderId, page, size, sortField, sortDir));
    }

    @GetMapping("/emails/label/{labelId}")
    @Operation(summary = "List paginated emails matching custom label tag filter")
    public ResponseEntity<Page<EmailDto>> listEmailsByLabel(
            @PathVariable Long labelId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "receivedAt") String sortField,
            @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        return ResponseEntity.ok(emailPlatformService.getEmailsByLabel(labelId, page, size, sortField, sortDir));
    }

    // =========================================================================
    // DRAFT MANAGER CONTROLLERS
    // =========================================================================

    @PostMapping("/drafts")
    @Operation(summary = "Create a new saved draft box", description = "Creates a persistent workspace draft for editing")
    public ResponseEntity<DraftDto> saveDraftWorkspace(@Valid @RequestBody DraftRequest request) {
        return new ResponseEntity<>(emailPlatformService.createOrUpdateDraft(null, request), HttpStatus.CREATED);
    }

    @PutMapping("/drafts/{draftId}")
    @Operation(summary = "Update progress inside existing draft")
    public ResponseEntity<DraftDto> updateDraftWorkspace(@PathVariable Long draftId, @Valid @RequestBody DraftRequest request) {
        return ResponseEntity.ok(emailPlatformService.createOrUpdateDraft(draftId, request));
    }

    @GetMapping("/drafts/mailbox/{mailboxId}")
    @Operation(summary = "List persistent drafts in mailbox", description = "Fetches paginated workspace draft buffers")
    public ResponseEntity<Page<DraftDto>> listDrafts(
            @PathVariable Long mailboxId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "lastModified") String sortField,
            @RequestParam(defaultValue = "DESC") String sortDir
    ) {
        return ResponseEntity.ok(emailPlatformService.getDraftsByMailbox(mailboxId, page, size, sortField, sortDir));
    }

    @DeleteMapping("/drafts/{draftId}")
    @Operation(summary = "Purge draft file permanently")
    public ResponseEntity<Void> deleteDraft(@PathVariable Long draftId) {
        emailPlatformService.deleteDraft(draftId);
        return ResponseEntity.noContent().build();
    }
}
