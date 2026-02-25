package net.voldrich.myhome.backend.auth.internal.security;

import net.voldrich.myhome.backend.auth.FamilyRole;
import net.voldrich.myhome.backend.auth.ModulePermission;
import net.voldrich.myhome.backend.auth.internal.service.ModuleAccessService;
import org.springframework.security.access.PermissionEvaluator;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.io.Serializable;

@Component
public class ModuleAccessPermissionEvaluator implements PermissionEvaluator {

    private final ModuleAccessService moduleAccessService;

    public ModuleAccessPermissionEvaluator(ModuleAccessService moduleAccessService) {
        this.moduleAccessService = moduleAccessService;
    }

    @Override
    public boolean hasPermission(Authentication authentication, Object targetDomainObject, Object permission) {
        if (!(authentication.getPrincipal() instanceof AuthUserDetails user)) {
            return false;
        }
        String moduleName = (String) targetDomainObject;
        ModulePermission perm = ModulePermission.valueOf(((String) permission).toUpperCase());

        if (user.familyRole() == FamilyRole.PARENT) {
            return true;
        }

        return moduleAccessService.hasAccess(user.userId(), user.familyId(), moduleName, perm);
    }

    @Override
    public boolean hasPermission(Authentication authentication, Serializable targetId, String targetType, Object permission) {
        return false;
    }
}
