package net.voldrich.template.backend_spring.auth.internal.security;

import net.voldrich.template.backend_spring.auth.FamilyRole;
import net.voldrich.template.backend_spring.auth.RequiresModuleAccess;
import net.voldrich.template.backend_spring.auth.internal.service.ModuleAccessService;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class RequiresModuleAccessAspect {

    private final ModuleAccessService moduleAccessService;

    public RequiresModuleAccessAspect(ModuleAccessService moduleAccessService) {
        this.moduleAccessService = moduleAccessService;
    }

    @Around("@annotation(requiresModuleAccess) || @within(requiresModuleAccess)")
    public Object checkModuleAccess(ProceedingJoinPoint joinPoint, RequiresModuleAccess requiresModuleAccess) throws Throwable {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUserDetails user)) {
            throw new AccessDeniedException("Authentication required");
        }

        if (user.familyRole() == FamilyRole.PARENT) {
            return joinPoint.proceed();
        }

        if (!moduleAccessService.hasAccess(user.userId(), user.familyId(),
                requiresModuleAccess.value(), requiresModuleAccess.permission())) {
            throw new AccessDeniedException("Module access denied: " + requiresModuleAccess.value());
        }

        return joinPoint.proceed();
    }
}
