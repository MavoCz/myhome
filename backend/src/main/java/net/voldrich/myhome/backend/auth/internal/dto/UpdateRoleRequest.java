package net.voldrich.myhome.backend.auth.internal.dto;

import jakarta.validation.constraints.NotNull;
import net.voldrich.myhome.backend.auth.FamilyRole;

public record UpdateRoleRequest(
        @NotNull FamilyRole role
) {}
