package net.voldrich.template.backend_spring.auth.internal.dto;

import jakarta.validation.constraints.NotNull;
import net.voldrich.template.backend_spring.auth.FamilyRole;

public record UpdateRoleRequest(
        @NotNull FamilyRole role
) {}
