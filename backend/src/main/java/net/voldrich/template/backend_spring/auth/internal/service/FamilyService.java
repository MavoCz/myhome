package net.voldrich.template.backend_spring.auth.internal.service;

import net.voldrich.template.backend_spring.auth.FamilyRole;
import net.voldrich.template.backend_spring.auth.internal.dto.AddFamilyMemberRequest;
import net.voldrich.template.backend_spring.auth.internal.dto.FamilyMemberResponse;
import net.voldrich.template.backend_spring.auth.internal.repository.FamilyMemberRepository;
import net.voldrich.template.backend_spring.auth.internal.repository.UserRepository;
import net.voldrich.template.backend_spring.auth.internal.security.AuthUserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FamilyService {

    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final PasswordEncoder passwordEncoder;

    public FamilyService(UserRepository userRepository, FamilyMemberRepository familyMemberRepository,
                         PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public FamilyMemberResponse addMember(AuthUserDetails currentUser, AddFamilyMemberRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already registered");
        }

        var user = userRepository.create(request.email(), passwordEncoder.encode(request.password()), request.displayName());
        familyMemberRepository.create(currentUser.familyId(), user.getId(), request.role());

        return new FamilyMemberResponse(user.getId(), user.getEmail(), user.getDisplayName(), request.role());
    }

    public List<FamilyMemberResponse> listMembers(Long familyId) {
        var results = familyMemberRepository.findMembersWithUserInfo(familyId);
        return results.map(r -> new FamilyMemberResponse(
                r.value1(),
                r.value2(),
                r.value3(),
                FamilyRole.valueOf(r.value4())
        ));
    }

    @Transactional
    public void removeMember(Long familyId, Long userId, Long currentUserId) {
        if (userId.equals(currentUserId)) {
            throw new IllegalArgumentException("Cannot remove yourself from the family");
        }
        familyMemberRepository.deleteByFamilyAndUser(familyId, userId);
    }

    @Transactional
    public void updateRole(Long familyId, Long userId, FamilyRole role, Long currentUserId) {
        if (userId.equals(currentUserId)) {
            throw new IllegalArgumentException("Cannot change your own role");
        }
        familyMemberRepository.findByFamilyAndUser(familyId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Family member not found"));
        familyMemberRepository.updateRole(familyId, userId, role);
    }
}
