package net.voldrich.myhome.backend.auth.internal.service;

import net.voldrich.myhome.backend.auth.ModulePermission;
import net.voldrich.myhome.backend.auth.internal.dto.GrantModuleAccessRequest;
import net.voldrich.myhome.backend.auth.internal.dto.ModuleAccessResponse;
import net.voldrich.myhome.backend.auth.internal.dto.UpdateModuleAccessRequest;
import net.voldrich.myhome.backend.auth.internal.repository.ModuleAccessRepository;
import net.voldrich.myhome.backend.jooq.tables.records.ModuleAccessRecord;
import net.voldrich.myhome.backend.jooq.tables.records.ModuleAccessSchedulesRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

@Service
public class ModuleAccessService {

    private final ModuleAccessRepository moduleAccessRepository;

    public ModuleAccessService(ModuleAccessRepository moduleAccessRepository) {
        this.moduleAccessRepository = moduleAccessRepository;
    }

    @Transactional
    public ModuleAccessResponse grantAccess(Long familyId, Long grantedBy, GrantModuleAccessRequest request) {
        var record = moduleAccessRepository.create(
                familyId, request.userId(), request.moduleName(), request.permission().name(),
                request.validFrom(), request.validUntil(), grantedBy
        );

        if (request.schedules() != null) {
            for (var schedule : request.schedules()) {
                moduleAccessRepository.createSchedule(
                        record.getId(), schedule.dayOfWeek(), schedule.startTime(), schedule.endTime(), schedule.timezone()
                );
            }
        }

        return toResponse(record);
    }

    public List<ModuleAccessResponse> listAccess(Long familyId, Long userId) {
        var records = moduleAccessRepository.findByFamilyAndUser(familyId, userId);
        return records.stream().map(this::toResponse).toList();
    }

    @Transactional
    public ModuleAccessResponse updateAccess(Long id, Long familyId, UpdateModuleAccessRequest request) {
        var record = moduleAccessRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Module access not found"));
        if (!record.getFamilyId().equals(familyId)) {
            throw new IllegalArgumentException("Module access does not belong to this family");
        }

        moduleAccessRepository.update(id,
                request.permission() != null ? request.permission().name() : record.getPermission(),
                request.validFrom(), request.validUntil());

        // Replace schedules
        if (request.schedules() != null) {
            moduleAccessRepository.deleteSchedulesByAccessId(id);
            for (var schedule : request.schedules()) {
                moduleAccessRepository.createSchedule(id, schedule.dayOfWeek(), schedule.startTime(), schedule.endTime(), schedule.timezone());
            }
        }

        return toResponse(moduleAccessRepository.findById(id).orElseThrow());
    }

    @Transactional
    public void revokeAccess(Long id, Long familyId) {
        var record = moduleAccessRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Module access not found"));
        if (!record.getFamilyId().equals(familyId)) {
            throw new IllegalArgumentException("Module access does not belong to this family");
        }
        moduleAccessRepository.deleteById(id);
    }

    public boolean hasAccess(Long userId, Long familyId, String moduleName, ModulePermission permission) {
        var records = moduleAccessRepository.findByUserAndModule(userId, familyId, moduleName);

        OffsetDateTime now = OffsetDateTime.now();
        for (var record : records) {
            // Check permission level: MANAGE implies ACCESS
            ModulePermission grantedPerm = ModulePermission.valueOf(record.getPermission());
            if (permission == ModulePermission.MANAGE && grantedPerm != ModulePermission.MANAGE) {
                continue;
            }

            // Check time validity
            if (record.getValidFrom() != null && now.isBefore(record.getValidFrom())) {
                continue;
            }
            if (record.getValidUntil() != null && now.isAfter(record.getValidUntil())) {
                continue;
            }

            // Check schedule windows
            var schedules = moduleAccessRepository.findSchedulesByAccessId(record.getId());
            if (schedules.isEmpty()) {
                return true; // No schedule restrictions
            }

            if (isWithinSchedule(schedules, now)) {
                return true;
            }
        }
        return false;
    }

    private boolean isWithinSchedule(List<ModuleAccessSchedulesRecord> schedules, OffsetDateTime now) {
        for (var schedule : schedules) {
            ZoneId zone = ZoneId.of(schedule.getTimezone());
            ZonedDateTime zonedNow = now.atZoneSameInstant(zone);
            int currentDay = zonedNow.getDayOfWeek().getValue(); // 1=Monday, 7=Sunday

            if (currentDay == schedule.getDayOfWeek()) {
                LocalTime currentTime = zonedNow.toLocalTime();
                if (!currentTime.isBefore(schedule.getStartTime()) && currentTime.isBefore(schedule.getEndTime())) {
                    return true;
                }
            }
        }
        return false;
    }

    private ModuleAccessResponse toResponse(ModuleAccessRecord record) {
        var schedules = moduleAccessRepository.findSchedulesByAccessId(record.getId());
        return new ModuleAccessResponse(
                record.getId(),
                record.getUserId(),
                record.getModuleName(),
                ModulePermission.valueOf(record.getPermission()),
                record.getValidFrom(),
                record.getValidUntil(),
                record.getGrantedBy(),
                schedules.stream().map(s -> new ModuleAccessResponse.ScheduleResponse(
                        s.getId(), s.getDayOfWeek(), s.getStartTime().toString(), s.getEndTime().toString(), s.getTimezone()
                )).toList()
        );
    }
}
