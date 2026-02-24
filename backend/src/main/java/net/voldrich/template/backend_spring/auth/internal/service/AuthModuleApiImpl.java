package net.voldrich.template.backend_spring.auth.internal.service;

import net.voldrich.template.backend_spring.auth.AuthModuleApi;
import net.voldrich.template.backend_spring.auth.AuthUser;
import net.voldrich.template.backend_spring.auth.FamilyRole;
import net.voldrich.template.backend_spring.auth.ModulePermission;
import net.voldrich.template.backend_spring.auth.internal.repository.FamilyMemberRepository;
import net.voldrich.template.backend_spring.auth.internal.security.AuthUserDetails;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AuthModuleApiImpl implements AuthModuleApi {

    private final ModuleAccessService moduleAccessService;
    private final FamilyMemberRepository familyMemberRepository;

    public AuthModuleApiImpl(ModuleAccessService moduleAccessService, FamilyMemberRepository familyMemberRepository) {
        this.moduleAccessService = moduleAccessService;
        this.familyMemberRepository = familyMemberRepository;
    }

    @Override
    public Optional<AuthUser> getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUserDetails user)) {
            return Optional.empty();
        }
        return Optional.of(new AuthUser(user.userId(), user.email(), user.displayName(), user.familyId(), user.familyRole()));
    }

    @Override
    public boolean hasModuleAccess(Long userId, Long familyId, String moduleName, ModulePermission permission) {
        // Parents always have access
        var member = familyMemberRepository.findByFamilyAndUser(familyId, userId);
        if (member.isPresent() && FamilyRole.PARENT.name().equals(member.get().getRole())) {
            return true;
        }
        return moduleAccessService.hasAccess(userId, familyId, moduleName, permission);
    }

    @Override
    public Optional<FamilyRole> getFamilyRole(Long userId, Long familyId) {
        return familyMemberRepository.findByFamilyAndUser(familyId, userId)
                .map(m -> FamilyRole.valueOf(m.getRole()));
    }

    @Override
    public List<AuthUser> getFamilyMembers(Long familyId) {
        return familyMemberRepository.findMembersWithUserInfo(familyId)
                .map(r -> new AuthUser(r.value1(), r.value2(), r.value3(), familyId, FamilyRole.valueOf(r.value4())));
    }
}
