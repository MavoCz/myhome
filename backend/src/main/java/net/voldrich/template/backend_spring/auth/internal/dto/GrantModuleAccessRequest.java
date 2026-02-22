package net.voldrich.template.backend_spring.auth.internal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import net.voldrich.template.backend_spring.auth.ModulePermission;

import java.time.OffsetDateTime;
import java.util.List;

public record GrantModuleAccessRequest(
        @NotNull Long userId,
        @NotBlank String moduleName,
        @NotNull ModulePermission permission,
        OffsetDateTime validFrom,
        OffsetDateTime validUntil,
        List<ScheduleRequest> schedules
) {}
