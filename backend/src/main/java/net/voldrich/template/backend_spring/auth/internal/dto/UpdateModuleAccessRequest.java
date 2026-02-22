package net.voldrich.template.backend_spring.auth.internal.dto;

import net.voldrich.template.backend_spring.auth.ModulePermission;

import java.time.OffsetDateTime;
import java.util.List;

public record UpdateModuleAccessRequest(
        ModulePermission permission,
        OffsetDateTime validFrom,
        OffsetDateTime validUntil,
        List<ScheduleRequest> schedules
) {}
