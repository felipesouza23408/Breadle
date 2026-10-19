package com.breadle.backend.group;

import com.breadle.backend.entity.Usuario;
import com.breadle.backend.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/groups")
public class ReadingGroupController {

    private final ReadingGroupService readingGroupService;
    private final UsuarioRepository usuarioRepository;

    public ReadingGroupController(ReadingGroupService readingGroupService,
                                 UsuarioRepository usuarioRepository) {
        this.readingGroupService = readingGroupService;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping
    public ResponseEntity<List<ReadingGroupDto>> listGroups() {
        Long userId = currentUserId();
        return ResponseEntity.ok(readingGroupService.listGroups(userId));
    }

    @GetMapping("/me")
    public ResponseEntity<List<ReadingGroupDto>> myGroups() {
        Long userId = currentUserId();
        return ResponseEntity.ok(readingGroupService.listMyGroups(userId));
    }

    @GetMapping("/{groupId}/leaderboard")
    public ResponseEntity<List<GroupLeaderboardEntryDto>> leaderboard(@PathVariable Long groupId) {
        Long userId = currentUserId();
        return ResponseEntity.ok(readingGroupService.getLeaderboard(groupId, userId));
    }

    @GetMapping("/{groupId}/challenges")
    public ResponseEntity<List<GroupChallengeDto>> challenges(@PathVariable Long groupId) {
        return ResponseEntity.ok(readingGroupService.getChallenges(groupId));
    }

    @PostMapping("/{groupId}/challenges")
    public ResponseEntity<GroupChallengeDto> createChallenge(@PathVariable Long groupId,
                                                          @RequestBody GroupChallengeRequest request) {
        return ResponseEntity.ok(readingGroupService.createChallenge(groupId, request));
    }

    @GetMapping("/{groupId}/activity")
    public ResponseEntity<List<GroupActivityDto>> activity(@PathVariable Long groupId) {
        return ResponseEntity.ok(readingGroupService.getActivities(groupId));
    }

    @GetMapping("/{groupId}/chat")
    public ResponseEntity<List<GroupChatMessageDto>> messages(@PathVariable Long groupId) {
        return ResponseEntity.ok(readingGroupService.getMessages(groupId));
    }

    @PostMapping("/{groupId}/chat")
    public ResponseEntity<GroupChatMessageDto> sendMessage(@PathVariable Long groupId,
                                                          @RequestBody GroupChatMessageDto request) {
        Long userId = currentUserId();
        return ResponseEntity.ok(readingGroupService.sendMessage(groupId, userId, request.getContent()));
    }

    @PostMapping
    public ResponseEntity<ReadingGroupDto> createGroup(@RequestBody CreateGroupRequest request) {
        Long userId = currentUserId();
        return ResponseEntity.ok(readingGroupService.createGroup(userId, request));
    }

    @PostMapping("/{groupId}/join")
    public ResponseEntity<ReadingGroupDto> joinGroup(@PathVariable Long groupId) {
        Long userId = currentUserId();
        return ResponseEntity.ok(readingGroupService.joinGroup(userId, groupId));
    }

    private Long currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalArgumentException("Usuário não autenticado.");
        }

        String email = authentication.getName();
        Usuario usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
        return usuario.getId();
    }
}
