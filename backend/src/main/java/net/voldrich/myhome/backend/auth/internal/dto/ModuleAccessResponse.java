package net.voldrich.myhome.backend.auth.internal.dto;

import net.voldrich.myhome.backend.auth.ModulePermission;

import java.time.OffsetDateTime;
import java.util.List;

public record ModuleAccessResponse(
        Long id,
        Long userId,
        String moduleName,
        ModulePermission permission,
        OffsetDateTime validFrom,
        OffsetDateTime validUntil,
        Long grantedBy,
        List<ScheduleResponse> schedules
) {
    public record ScheduleResponse(
            Long id,
            int dayOfWeek,
            String startTime,
            String endTime,
            String timezone
    ) {}
}
