package com.breadle.backend.notification;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final UserNotificationRepository userNotificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(UserNotificationRepository userNotificationRepository,
                              SimpMessagingTemplate messagingTemplate) {
        this.userNotificationRepository = userNotificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public List<NotificationDto> listForUser(Long userId) {
        return userNotificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
            .map(this::toDto)
            .toList();
    }

    @Transactional
    public UserNotification createForUser(Long userId, String title, String message, String type) {
        if (userId == null) {
            throw new IllegalArgumentException("Usuário obrigatório para a notificação.");
        }
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Título da notificação é obrigatório.");
        }

        UserNotification notification = new UserNotification();
        notification.setUserId(userId);
        notification.setTitle(title.trim());
        notification.setMessage(message == null ? "" : message.trim());
        notification.setType(type == null || type.isBlank() ? "INFO" : type.trim().toUpperCase());
        notification.setSeen(false);

        UserNotification saved = userNotificationRepository.save(notification);
        messagingTemplate.convertAndSend("/topic/notifications/" + userId, toDto(saved));
        return saved;
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        userNotificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
            .forEach(notification -> {
                notification.setSeen(true);
                userNotificationRepository.save(notification);
            });
    }

    private NotificationDto toDto(UserNotification notification) {
        return new NotificationDto(
            notification.getId(),
            notification.getTitle(),
            notification.getMessage(),
            notification.getType(),
            notification.getSeen(),
            notification.getCreatedAt()
        );
    }
}
