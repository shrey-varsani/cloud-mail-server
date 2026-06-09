package com.platform.email.service;

import com.platform.email.entity.*;
import com.platform.email.dto.*;
import com.platform.email.exception.ResourceNotFoundException;
import com.platform.email.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailPlatformService {

    private final MailboxRepository mailboxRepository;
    private final FolderRepository folderRepository;
    private final LabelRepository labelRepository;
    private final EmailRepository emailRepository;
    private final DraftRepository draftRepository;

    // =========================================================================
    // MAILBOX LOGIC
    // =========================================================================

    @Transactional
    public MailboxDto createMailbox(MailboxRequest request) {
        log.info("Creating a new mailbox for user {}: {}", request.getOwnerId(), request.getEmailAddress());
        
        if (mailboxRepository.findByEmailAddress(request.getEmailAddress()).isPresent()) {
            throw new IllegalArgumentException("Mailbox with email address already exists: " + request.getEmailAddress());
        }

        Mailbox mailbox = mailboxRepository.save(Mailbox.builder()
                .emailAddress(request.getEmailAddress())
                .ownerId(request.getOwnerId())
                .storageCapacityBytes(request.getStorageCapacityBytes())
                .storageUsedBytes(0L)
                .active(true)
                .build());

        // Auto-provision standard folders
        provisionDefaultFolder(mailbox, "Inbox");
        provisionDefaultFolder(mailbox, "Sent");
        provisionDefaultFolder(mailbox, "Trash");
        provisionDefaultFolder(mailbox, "Spam");
        provisionDefaultFolder(mailbox, "Archive");

        return mapToMailboxDto(mailbox);
    }

    private void provisionDefaultFolder(Mailbox mailbox, String folderName) {
        folderRepository.save(Folder.builder()
                .name(folderName)
                .type("SYSTEM")
                .mailbox(mailbox)
                .unreadCount(0)
                .totalCount(0)
                .build());
    }

    public MailboxDto getMailbox(Long id) {
        Mailbox mailbox = mailboxRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Mailbox not found with ID: " + id));
        return mapToMailboxDto(mailbox);
    }

    public List<MailboxDto> getMailboxesByOwner(String ownerId) {
        return mailboxRepository.findByOwnerId(ownerId).stream()
                .map(this::mapToMailboxDto)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // FOLDER LOGIC
    // =========================================================================

    @Transactional
    public FolderDto createFolder(FolderRequest request) {
        log.info("Creating folder '{}' for mailbox ID {}", request.getName(), request.getMailboxId());
        
        Mailbox mailbox = mailboxRepository.findById(request.getMailboxId())
                .orElseThrow(() -> new ResourceNotFoundException("Mailbox not found with ID: " + request.getMailboxId()));

        Optional<Folder> existingFolder = folderRepository.findByMailboxIdAndName(mailbox.getId(), request.getName());
        if (existingFolder.isPresent()) {
            throw new IllegalArgumentException("Folder already exists with name: " + request.getName());
        }

        Folder folder = folderRepository.save(Folder.builder()
                .name(request.getName())
                .type("USER_DEFINED")
                .mailbox(mailbox)
                .unreadCount(0)
                .totalCount(0)
                .build());

        return mapToFolderDto(folder);
    }

    public List<FolderDto> getFoldersByMailboxId(Long mailboxId) {
        return folderRepository.findByMailboxId(mailboxId).stream()
                .map(this::mapToFolderDto)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // LABEL LOGIC
    // =========================================================================

    @Transactional
    public LabelDto createLabel(LabelRequest request) {
        log.info("Creating custom tag/label '{}' for mailbox ID {}", request.getName(), request.getMailboxId());
        
        Mailbox mailbox = mailboxRepository.findById(request.getMailboxId())
                .orElseThrow(() -> new ResourceNotFoundException("Mailbox not found with ID: " + request.getMailboxId()));

        Label label = labelRepository.save(Label.builder()
                .name(request.getName())
                .colorHex(request.getColorHex())
                .mailbox(mailbox)
                .build());

        return mapToLabelDto(label);
    }

    public List<LabelDto> getLabelsByMailboxId(Long mailboxId) {
        return labelRepository.findByMailboxId(mailboxId).stream()
                .map(this::mapToLabelDto)
                .collect(Collectors.toList());
    }

    // =========================================================================
    // EMAIL STORAGE & FLOW LOGIC
    // =========================================================================

    @Transactional
    public EmailDto sendAndStoreEmail(EmailSendRequest request) {
        log.info("Storing email from {} to {} in mailbox ID {}", request.getSender(), request.getRecipientsTo(), request.getMailboxId());
        
        Mailbox mailbox = mailboxRepository.findById(request.getMailboxId())
                .orElseThrow(() -> new ResourceNotFoundException("Mailbox not found with ID: " + request.getMailboxId()));

        Folder targetFolder;
        if (request.getFolderId() != null) {
            targetFolder = folderRepository.findById(request.getFolderId())
                    .orElseThrow(() -> new ResourceNotFoundException("Folder not found with ID: " + request.getFolderId()));
        } else {
            // Default to Inbox
            targetFolder = folderRepository.findByMailboxIdAndName(mailbox.getId(), "Inbox")
                    .orElseThrow(() -> new ResourceNotFoundException("Inbox folder not provisioned for this mailbox"));
        }

        // Setup labels
        Set<Label> labelSet = new HashSet<>();
        if (request.getLabelIds() != null && !request.getLabelIds().isEmpty()) {
            for (Long labelId : request.getLabelIds()) {
                Label label = labelRepository.findById(labelId)
                        .orElseThrow(() -> new ResourceNotFoundException("Label not found with ID: " + labelId));
                labelSet.add(label);
            }
        }

        Email email = Email.builder()
                .mailbox(mailbox)
                .folder(targetFolder)
                .sender(request.getSender())
                .recipientsTo(request.getRecipientsTo())
                .recipientsCc(request.getRecipientsCc())
                .recipientsBcc(request.getRecipientsBcc())
                .subject(request.getSubject())
                .body(request.getBody())
                .isRead(false)
                .isStarred(false)
                .labels(labelSet)
                .build();

        email = emailRepository.save(email);

        // Update Folder counters and Mailbox disk storage bytes usage
        targetFolder.setTotalCount(targetFolder.getTotalCount() + 1);
        targetFolder.setUnreadCount(targetFolder.getUnreadCount() + 1);
        folderRepository.save(targetFolder);

        mailbox.setStorageUsedBytes(mailbox.getStorageUsedBytes() + email.getSizeInBytes());
        mailboxRepository.save(mailbox);

        return mapToEmailDto(email);
    }

    @Transactional(readOnly = true)
    public Page<EmailDto> getEmailsByFolder(Long folderId, int page, int size, String sortField, String sortDir) {
        log.info("Fetching paginated index for folder ID {} [page: {}, size: {}, sortField: {}, sortDir: {}]", folderId, page, size, sortField, sortDir);
        
        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortField);
        Pageable pageable = PageRequest.of(page, size, sort);

        return emailRepository.findByFolderId(folderId, pageable).map(this::mapToEmailDto);
    }

    @Transactional(readOnly = true)
    public Page<EmailDto> getEmailsByLabel(Long labelId, int page, int size, String sortField, String sortDir) {
        log.info("Fetching paginated emails for label ID {}", labelId);
        
        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortField);
        Pageable pageable = PageRequest.of(page, size, sort);

        return emailRepository.findByLabelId(labelId, pageable).map(this::mapToEmailDto);
    }

    @Transactional
    public EmailDto readEmail(Long id) {
        Email email = emailRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Email profile not found with ID: " + id));

        if (!email.getIsRead()) {
            email.setIsRead(true);
            emailRepository.save(email);

            Folder folder = email.getFolder();
            if (folder.getUnreadCount() > 0) {
                folder.setUnreadCount(folder.getUnreadCount() - 1);
                folderRepository.save(folder);
            }
        }

        return mapToEmailDto(email);
    }

    @Transactional
    public void deleteEmail(Long id) {
        log.info("Moving email ID {} to Trash or purging it permanently", id);
        Email email = emailRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Email not found with ID: " + id));

        Folder currentFolder = email.getFolder();
        Mailbox mailbox = email.getMailbox();

        if (currentFolder.getName().equalsIgnoreCase("Trash")) {
            // Delete Permanently
            emailRepository.delete(email);

            // Update folder count
            currentFolder.setTotalCount(Math.max(0, currentFolder.getTotalCount() - 1));
            if (!email.getIsRead()) {
                currentFolder.setUnreadCount(Math.max(0, currentFolder.getUnreadCount() - 1));
            }
            folderRepository.save(currentFolder);

            mailbox.setStorageUsedBytes(Math.max(0L, mailbox.getStorageUsedBytes() - email.getSizeInBytes()));
            mailboxRepository.save(mailbox);
        } else {
            // Retain inside database and transfer onto system Trash folder
            Folder trashFolder = folderRepository.findByMailboxIdAndName(mailbox.getId(), "Trash")
                    .orElseThrow(() -> new ResourceNotFoundException("System Trash folder not ready"));

            currentFolder.setTotalCount(Math.max(0, currentFolder.getTotalCount() - 1));
            if (!email.getIsRead()) {
                currentFolder.setUnreadCount(Math.max(0, currentFolder.getUnreadCount() - 1));
            }
            folderRepository.save(currentFolder);

            email.setFolder(trashFolder);
            emailRepository.save(email);

            trashFolder.setTotalCount(trashFolder.getTotalCount() + 1);
            if (!email.getIsRead()) {
                trashFolder.setUnreadCount(trashFolder.getUnreadCount() + 1);
            }
            folderRepository.save(trashFolder);
        }
    }

    // =========================================================================
    // DRAFTS MANAGEMENT LOGIC
    // =========================================================================

    @Transactional
    public DraftDto createOrUpdateDraft(Long draftId, DraftRequest request) {
        Mailbox mailbox = mailboxRepository.findById(request.getMailboxId())
                .orElseThrow(() -> new ResourceNotFoundException("Mailbox not found with ID: " + request.getMailboxId()));

        Draft draft;
        if (draftId != null) {
            log.info("Updating existing draft ID {}", draftId);
            draft = draftRepository.findById(draftId)
                    .orElseThrow(() -> new ResourceNotFoundException("Draft file not found with ID: " + draftId));
            
            draft.setRecipientsTo(request.getRecipientsTo());
            draft.setRecipientsCc(request.getRecipientsCc());
            draft.setRecipientsBcc(request.getRecipientsBcc());
            draft.setSubject(request.getSubject());
            draft.setBody(request.getBody());
        } else {
            log.info("Creating new workspace draft in mailbox {}", mailbox.getId());
            draft = Draft.builder()
                    .mailbox(mailbox)
                    .recipientsTo(request.getRecipientsTo())
                    .recipientsCc(request.getRecipientsCc())
                    .recipientsBcc(request.getRecipientsBcc())
                    .subject(request.getSubject())
                    .body(request.getBody())
                    .build();
        }

        draft = draftRepository.save(draft);
        return mapToDraftDto(draft);
    }

    @Transactional(readOnly = true)
    public Page<DraftDto> getDraftsByMailbox(Long mailboxId, int page, int size, String sortField, String sortDir) {
        log.info("Listing drafts for mailbox ID {}", mailboxId);
        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortField);
        Pageable pageable = PageRequest.of(page, size, sort);

        return draftRepository.findByMailboxId(mailboxId, pageable).map(this::mapToDraftDto);
    }

    @Transactional
    public void deleteDraft(Long draftId) {
        log.info("Purging draft container ID {}", draftId);
        Draft draft = draftRepository.findById(draftId)
                .orElseThrow(() -> new ResourceNotFoundException("Draft not found with ID: " + draftId));
        draftRepository.delete(draft);
    }

    // =========================================================================
    // MAPPER FUNCTIONS
    // =========================================================================

    private MailboxDto mapToMailboxDto(Mailbox mailbox) {
        return MailboxDto.builder()
                .id(mailbox.getId())
                .emailAddress(mailbox.getEmailAddress())
                .ownerId(mailbox.getOwnerId())
                .storageCapacityBytes(mailbox.getStorageCapacityBytes())
                .storageUsedBytes(mailbox.getStorageUsedBytes())
                .createdAt(mailbox.getCreatedAt())
                .active(mailbox.getActive())
                .build();
    }

    private FolderDto mapToFolderDto(Folder folder) {
        return FolderDto.builder()
                .id(folder.getId())
                .name(folder.getName())
                .type(folder.getType())
                .mailboxId(folder.getMailbox().getId())
                .unreadCount(folder.getUnreadCount())
                .totalCount(folder.getTotalCount())
                .build();
    }

    private LabelDto mapToLabelDto(Label label) {
        return LabelDto.builder()
                .id(label.getId())
                .name(label.getName())
                .colorHex(label.getColorHex())
                .mailboxId(label.getMailbox().getId())
                .build();
    }

    private EmailDto mapToEmailDto(Email email) {
        Set<LabelDto> labelDtos = email.getLabels().stream()
                .map(this::mapToLabelDto)
                .collect(Collectors.toSet());

        return EmailDto.builder()
                .id(email.getId())
                .mailboxId(email.getMailbox().getId())
                .folderId(email.getFolder().getId())
                .sender(email.getSender())
                .recipientsTo(email.getRecipientsTo())
                .recipientsCc(email.getRecipientsCc())
                .recipientsBcc(email.getRecipientsBcc())
                .subject(email.getSubject())
                .body(email.getBody())
                .sizeInBytes(email.getSizeInBytes())
                .isRead(email.getIsRead())
                .isStarred(email.getIsStarred())
                .receivedAt(email.getReceivedAt())
                .labels(labelDtos)
                .build();
    }

    private DraftDto mapToDraftDto(Draft draft) {
        return DraftDto.builder()
                .id(draft.getId())
                .mailboxId(draft.getMailbox().getId())
                .recipientsTo(draft.getRecipientsTo())
                .recipientsCc(draft.getRecipientsCc())
                .recipientsBcc(draft.getRecipientsBcc())
                .subject(draft.getSubject())
                .body(draft.getBody())
                .lastModified(draft.getLastModified())
                .build();
    }
}
