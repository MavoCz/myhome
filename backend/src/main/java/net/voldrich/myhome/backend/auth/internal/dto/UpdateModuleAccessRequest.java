package net.voldrich.myhome.backend.auth.internal.dto;

import net.voldrich.myhome.backend.auth.ModulePermission;

import java.time.OffsetDateTime;
import java.util.List;

public record UpdateModuleAccessRequest(
        ModulePermission permission,
        OffsetDateTime validFrom,
        OffsetDateTime validUntil,
        List<ScheduleRequest> schedules
) {}
