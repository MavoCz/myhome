package net.voldrich.myhome.backend.auth.internal.security;

import net.voldrich.myhome.backend.auth.FamilyRole;
import net.voldrich.myhome.backend.auth.RequiresModuleAccess;
import net.voldrich.myhome.backend.auth.internal.service.ModuleAccessService;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
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

    @Around("@annotation(net.voldrich.myhome.backend.auth.RequiresModuleAccess) || @within(net.voldrich.myhome.backend.auth.RequiresModuleAccess)")
    public Object checkModuleAccess(ProceedingJoinPoint joinPoint) throws Throwable {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUserDetails user)) {
            throw new AccessDeniedException("Authentication required");
        }

        if (user.familyRole() == FamilyRole.ADMIN || user.familyRole() == FamilyRole.PARENT) {
            return joinPoint.proceed();
        }

        // Resolve the most specific (method-level) annotation, falling back to class-level.
        var method = ((MethodSignature) joinPoint.getSignature()).getMethod();
        var annotation = method.getAnnotation(RequiresModuleAccess.class);
        if (annotation == null) {
            annotation = joinPoint.getTarget().getClass().getAnnotation(RequiresModuleAccess.class);
        }
        if (annotation == null) {
            return joinPoint.proceed();
        }

        if (!moduleAccessService.hasAccess(user.userId(), user.familyId(),
                annotation.value(), annotation.permission())) {
            throw new AccessDeniedException("Module access denied: " + annotation.value());
        }

        return joinPoint.proceed();
    }
}
