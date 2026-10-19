package com.breadle.backend.group;

import com.breadle.backend.entity.Usuario;
import com.breadle.backend.notification.NotificationService;
import com.breadle.backend.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ReadingGroupService {

    private final ReadingGroupRepository readingGroupRepository;
    private final ReadingGroupMemberRepository readingGroupMemberRepository;
    private final UsuarioRepository usuarioRepository;
    private final GroupChallengeRepository groupChallengeRepository;
    private final GroupActivityRepository groupActivityRepository;
    private final GroupChatMessageRepository groupChatMessageRepository;
    private final NotificationService notificationService;

    public ReadingGroupService(ReadingGroupRepository readingGroupRepository,
                              ReadingGroupMemberRepository readingGroupMemberRepository,
                              UsuarioRepository usuarioRepository,
                              GroupChallengeRepository groupChallengeRepository,
                              GroupActivityRepository groupActivityRepository,
                              GroupChatMessageRepository groupChatMessageRepository,
                              NotificationService notificationService) {
        this.readingGroupRepository = readingGroupRepository;
        this.readingGroupMemberRepository = readingGroupMemberRepository;
        this.usuarioRepository = usuarioRepository;
        this.groupChallengeRepository = groupChallengeRepository;
        this.groupActivityRepository = groupActivityRepository;
        this.groupChatMessageRepository = groupChatMessageRepository;
        this.notificationService = notificationService;
    }

    public List<ReadingGroupDto> listGroups(Long userId) {
        return readingGroupRepository.findByActiveTrueOrderByCreatedAtDesc().stream()
            .map(group -> toDto(group, userId))
            .sorted(Comparator.comparing(ReadingGroupDto::getMemberCount).reversed())
            .toList();
    }

    public List<ReadingGroupDto> listMyGroups(Long userId) {
        Set<Long> groupIds = readingGroupMemberRepository.findByUserId(userId).stream()
            .map(ReadingGroupMember::getGroupId)
            .collect(Collectors.toSet());

        return readingGroupRepository.findByActiveTrueOrderByCreatedAtDesc().stream()
            .filter(group -> groupIds.contains(group.getId()))
            .map(group -> toDto(group, userId))
            .toList();
    }

    public List<GroupLeaderboardEntryDto> getLeaderboard(Long groupId, Long currentUserId) {
        ReadingGroup group = readingGroupRepository.findById(groupId)
            .orElseThrow(() -> new IllegalArgumentException("Grupo não encontrado."));

        List<ReadingGroupMember> members = readingGroupMemberRepository.findByGroupIdOrderByPagesReadDesc(group.getId());
        List<GroupLeaderboardEntryDto> leaderboard = new java.util.ArrayList<>();

        for (int i = 0; i < members.size(); i++) {
            ReadingGroupMember member = members.get(i);
            Usuario user = usuarioRepository.findById(member.getUserId())
                .orElse(null);

            if (user == null) {
                continue;
            }

            leaderboard.add(new GroupLeaderboardEntryDto(
                user.getId(),
                user.getNome(),
                user.getTipo() == null ? "LEITOR" : user.getTipo().name(),
                member.getPagesRead() == null ? 0 : member.getPagesRead(),
                i + 1
            ));
        }

        return leaderboard;
    }

    public List<GroupChallengeDto> getChallenges(Long groupId) {
        ensureGroupExists(groupId);
        List<GroupChallenge> challenges = groupChallengeRepository.findByGroupIdOrderByCreatedAtDesc(groupId);
        challenges.forEach(challenge -> refreshChallengeStatus(groupId, challenge));
        return challenges.stream()
            .map(this::toChallengeDto)
            .toList();
    }

    @Transactional
    public GroupChallengeDto createChallenge(Long groupId, GroupChallengeRequest request) {
        ReadingGroup group = ensureGroupExists(groupId);
        if (request == null || request.getTitle() == null || request.getTitle().isBlank()) {
            throw new IllegalArgumentException("O título do desafio é obrigatório.");
        }

        GroupChallenge challenge = new GroupChallenge();
        challenge.setGroupId(group.getId());
        challenge.setTitle(request.getTitle().trim());
        challenge.setDescription(request.getDescription() == null ? "Desafio semanal do grupo." : request.getDescription().trim());
        challenge.setTargetPages(request.getTargetPages() == null || request.getTargetPages() <= 0 ? 180 : request.getTargetPages());
        challenge.setStartsAt(Instant.now());
        challenge.setEndsAt(Instant.now().plusSeconds(7L * 24 * 60 * 60));
        challenge.setStatus("ACTIVE");
        GroupChallenge saved = groupChallengeRepository.save(challenge);
        refreshChallengeStatus(group.getId(), saved);

        GroupActivity activity = new GroupActivity();
        activity.setGroupId(group.getId());
        activity.setUserId(group.getOwnerId());
        activity.setMessage("Você criou o desafio '" + saved.getTitle() + "' com meta de " + saved.getTargetPages() + " páginas.");
        activity.setType("CHALLENGE");
        groupActivityRepository.save(activity);

        notificationService.createForUser(
            group.getOwnerId(),
            "Novo desafio do grupo",
            "Você criou o desafio '" + saved.getTitle() + "' para o grupo.",
            "INFO"
        );

        return toChallengeDto(saved);
    }

    public List<GroupActivityDto> getActivities(Long groupId) {
        ensureGroupExists(groupId);
        return groupActivityRepository.findByGroupIdOrderByCreatedAtDesc(groupId).stream()
            .map(this::toActivityDto)
            .toList();
    }

    @Transactional
    public GroupChatMessageDto sendMessage(Long groupId, Long userId, String content) {
        ensureGroupExists(groupId);
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("A mensagem não pode estar vazia.");
        }

        Usuario user = usuarioRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        GroupChatMessage message = new GroupChatMessage();
        message.setGroupId(groupId);
        message.setUserId(user.getId());
        message.setContent(content.trim());
        GroupChatMessage saved = groupChatMessageRepository.save(message);

        GroupActivity activity = new GroupActivity();
        activity.setGroupId(groupId);
        activity.setUserId(user.getId());
        activity.setMessage(user.getNome() + " enviou uma nova mensagem de incentivo ao grupo.");
        activity.setType("MESSAGE");
        groupActivityRepository.save(activity);

        return toChatDto(saved, user);
    }

    public List<GroupChatMessageDto> getMessages(Long groupId) {
        ensureGroupExists(groupId);
        return groupChatMessageRepository.findByGroupIdOrderByCreatedAtAsc(groupId).stream()
            .map(message -> toChatDto(message, usuarioRepository.findById(message.getUserId()).orElse(null)))
            .toList();
    }

    @Transactional
    public ReadingGroupDto createGroup(Long userId, CreateGroupRequest request) {
        Usuario owner = usuarioRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        String name = request.getName() == null ? "" : request.getName().trim();
        if (name.isBlank()) {
            throw new IllegalArgumentException("O nome do grupo é obrigatório.");
        }

        ReadingGroup group = new ReadingGroup();
        group.setName(name);
        group.setDescription(request.getDescription() == null ? "Grupo de leitura colaborativo para acompanhar a rotina de leitura." : request.getDescription().trim());
        group.setOwnerId(owner.getId());
        group.setChallengeName(request.getChallengeName() == null || request.getChallengeName().isBlank()
            ? "Leitura coletiva" : request.getChallengeName().trim());
        group.setChallengeTargetPages(request.getChallengeTargetPages() == null || request.getChallengeTargetPages() <= 0
            ? 180 : request.getChallengeTargetPages());
        group.setActive(true);
        ReadingGroup savedGroup = readingGroupRepository.save(group);

        ReadingGroupMember ownerMember = new ReadingGroupMember();
        ownerMember.setGroupId(savedGroup.getId());
        ownerMember.setUserId(owner.getId());
        ownerMember.setRole("OWNER");
        readingGroupMemberRepository.save(ownerMember);

        GroupActivity welcome = new GroupActivity();
        welcome.setGroupId(savedGroup.getId());
        welcome.setUserId(owner.getId());
        welcome.setMessage("O grupo foi criado e a rotina de leitura começou com o primeiro desafio.");
        welcome.setType("WELCOME");
        groupActivityRepository.save(welcome);

        notificationService.createForUser(
            owner.getId(),
            "Grupo criado",
            "Seu grupo '" + savedGroup.getName() + "' está ativo e pronto para receber novos leitores.",
            "SUCCESS"
        );

        return toDto(savedGroup, owner.getId());
    }

    @Transactional
    public ReadingGroupDto joinGroup(Long userId, Long groupId) {
        Usuario user = usuarioRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));

        ReadingGroup group = readingGroupRepository.findById(groupId)
            .orElseThrow(() -> new IllegalArgumentException("Grupo não encontrado."));

        if (!Boolean.TRUE.equals(group.getActive())) {
            throw new IllegalArgumentException("Este grupo está inativo.");
        }

        boolean alreadyJoined = readingGroupMemberRepository.existsByGroupIdAndUserId(groupId, user.getId());
        if (alreadyJoined) {
            return toDto(group, user.getId());
        }

        ReadingGroupMember member = new ReadingGroupMember();
        member.setGroupId(group.getId());
        member.setUserId(user.getId());
        member.setRole("MEMBER");
        readingGroupMemberRepository.save(member);

        GroupActivity joinActivity = new GroupActivity();
        joinActivity.setGroupId(group.getId());
        joinActivity.setUserId(user.getId());
        joinActivity.setMessage(user.getNome() + " entrou no grupo e está pronto para o próximo desafio.");
        joinActivity.setType("JOIN");
        groupActivityRepository.save(joinActivity);

        notificationService.createForUser(
            user.getId(),
            "Você entrou no grupo",
            "Agora você faz parte de '" + group.getName() + "' e pode acompanhar o ranking e os desafios.",
            "INFO"
        );

        return toDto(group, user.getId());
    }

    private ReadingGroupDto toDto(ReadingGroup group, Long currentUserId) {
        long memberCount = readingGroupMemberRepository.countByGroupId(group.getId());
        boolean joined = currentUserId != null && readingGroupMemberRepository.existsByGroupIdAndUserId(group.getId(), currentUserId);
        return new ReadingGroupDto(
            group.getId(),
            group.getName(),
            group.getDescription(),
            group.getOwnerId(),
            group.getChallengeName(),
            group.getChallengeTargetPages(),
            (int) memberCount,
            joined,
            group.getCreatedAt()
        );
    }

    private GroupChallengeDto toChallengeDto(GroupChallenge challenge) {
        int progress = calculateChallengeProgress(challenge, challenge.getGroupId());
        return new GroupChallengeDto(
            challenge.getId(),
            challenge.getTitle(),
            challenge.getDescription(),
            challenge.getTargetPages(),
            progress,
            challenge.getStartsAt(),
            challenge.getEndsAt(),
            challenge.getStatus()
        );
    }

    private void refreshChallengeStatus(Long groupId, GroupChallenge challenge) {
        Instant now = Instant.now();
        int bestMemberProgress = readingGroupMemberRepository.findByGroupId(groupId).stream()
            .map(ReadingGroupMember::getPagesRead)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0);

        if (challenge.getEndsAt() != null && now.isAfter(challenge.getEndsAt())) {
            challenge.setStatus("EXPIRED");
        } else if (challenge.getTargetPages() != null && bestMemberProgress >= challenge.getTargetPages()) {
            challenge.setStatus("COMPLETED");
        } else {
            challenge.setStatus("ACTIVE");
        }

        groupChallengeRepository.save(challenge);
    }

    private int calculateChallengeProgress(GroupChallenge challenge, Long groupId) {
        int bestMemberProgress = readingGroupMemberRepository.findByGroupId(groupId).stream()
            .map(ReadingGroupMember::getPagesRead)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            .orElse(0);

        int targetPages = challenge.getTargetPages() == null || challenge.getTargetPages() <= 0 ? 1 : challenge.getTargetPages();
        return Math.min(100, Math.round((bestMemberProgress * 100f) / targetPages));
    }

    private GroupActivityDto toActivityDto(GroupActivity activity) {
        Usuario user = usuarioRepository.findById(activity.getUserId()).orElse(null);
        return new GroupActivityDto(
            activity.getId(),
            activity.getUserId(),
            user == null ? "Membro" : user.getNome(),
            activity.getMessage(),
            activity.getType(),
            activity.getCreatedAt()
        );
    }

    private GroupChatMessageDto toChatDto(GroupChatMessage message, Usuario user) {
        return new GroupChatMessageDto(
            message.getId(),
            message.getUserId(),
            user == null ? "Membro" : user.getNome(),
            message.getContent(),
            message.getCreatedAt()
        );
    }

    private ReadingGroup ensureGroupExists(Long groupId) {
        return readingGroupRepository.findById(groupId)
            .orElseThrow(() -> new IllegalArgumentException("Grupo não encontrado."));
    }
}
