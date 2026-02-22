package net.voldrich.template.backend_spring.auth;

import java.util.Optional;

public interface AuthModuleApi {

    Optional<AuthUser> getCurrentUser();

    boolean hasModuleAccess(Long userId, Long familyId, String moduleName, ModulePermission permission);

    Optional<FamilyRole> getFamilyRole(Long userId, Long familyId);
}
