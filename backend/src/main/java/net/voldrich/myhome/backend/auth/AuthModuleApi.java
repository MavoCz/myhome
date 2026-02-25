package net.voldrich.myhome.backend.auth;

import java.util.List;
import java.util.Optional;

public interface AuthModuleApi {

    Optional<AuthUser> getCurrentUser();

    boolean hasModuleAccess(Long userId, Long familyId, String moduleName, ModulePermission permission);

    Optional<FamilyRole> getFamilyRole(Long userId, Long familyId);

    List<AuthUser> getFamilyMembers(Long familyId);
}
