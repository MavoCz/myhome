package net.voldrich.myhome.backend.auth.internal.service;

import net.voldrich.myhome.backend.auth.ModulePermission;
import net.voldrich.myhome.backend.auth.internal.dto.GrantModuleAccessRequest;
import net.voldrich.myhome.backend.auth.internal.dto.ModuleAccessResponse;
import net.voldrich.myhome.backend.auth.internal.dto.ScheduleRequest;
import net.voldrich.myhome.backend.auth.internal.dto.UpdateModuleAccessRequest;
import net.voldrich.myhome.backend.auth.internal.repository.FamilyMemberRepository;
import net.voldrich.myhome.backend.auth.internal.repository.ModuleAccessRepository;
import net.voldrich.myhome.backend.jooq.tables.records.ModuleAccessRecord;
import net.voldrich.myhome.backend.jooq.tables.records.ModuleAccessSchedulesRecord;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DateTimeException;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

@Service
public class ModuleAccessService {

    private final ModuleAccessRepository moduleAccessRepository;
    private final FamilyMemberRepository familyMemberRepository;

    public ModuleAccessService(ModuleAccessRepository moduleAccessRepository,
                               FamilyMemberRepository familyMemberRepository) {
        this.moduleAccessRepository = moduleAccessRepository;
        this.familyMemberRepository = familyMemberRepository;
    }

    @Transactional
    public ModuleAccessResponse grantAccess(Long familyId, Long grantedBy, GrantModuleAccessRequest request) {
        if (familyMemberRepository.findByFamilyAndUser(familyId, request.userId()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User is not a member of this family");
        }
        validateSchedules(request.schedules());
        var permission = request.permission().name();
        if (moduleAccessRepository.existsGrant(familyId, request.userId(), request.moduleName(), permission, null)) {
            throw duplicateGrant();
        }

        ModuleAccessRecord record;
        try {
            record = moduleAccessRepository.create(
                    familyId, request.userId(), request.moduleName(), permission,
                    request.validFrom(), request.validUntil(), grantedBy
            );
        } catch (DuplicateKeyException e) {
            // A concurrent request created the same grant between the check and the insert
            throw duplicateGrant();
        }

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
        var record = findGrant(id, familyId);
        validateSchedules(request.schedules());
        var permission = request.permission() != null ? request.permission().name() : record.getPermission();
        if (moduleAccessRepository.existsGrant(familyId, record.getUserId(), record.getModuleName(), permission, id)) {
            throw duplicateGrant();
        }

        try {
            moduleAccessRepository.update(id, permission, request.validFrom(), request.validUntil());
        } catch (DuplicateKeyException e) {
            throw duplicateGrant();
        }

        // Replace schedules
        if (request.schedules() != null) {
            moduleAccessRepository.deleteSchedulesByAccessId(id);
            for (var schedule : request.schedules()) {
                moduleAccessRepository.createSchedule(id, schedule.dayOfWeek(), schedule.startTime(), schedule.endTime(), schedule.timezone());
            }
        }

        return toResponse(findGrant(id, familyId));
    }

    @Transactional
    public void revokeAccess(Long id, Long familyId) {
        findGrant(id, familyId);
        moduleAccessRepository.deleteById(id);
    }

    /** Grants of other families are reported as missing, so their ids cannot be probed. */
    private ModuleAccessRecord findGrant(Long id, Long familyId) {
        return moduleAccessRepository.findByIdAndFamily(id, familyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Module access not found"));
    }

    /** The access check evaluates each window as start <= now < end within one day, in the schedule's zone. */
    private static void validateSchedules(List<ScheduleRequest> schedules) {
        if (schedules == null) {
            return;
        }
        for (var schedule : schedules) {
            try {
                ZoneId.of(schedule.timezone());
            } catch (DateTimeException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown timezone: " + schedule.timezone());
            }
            if (!schedule.startTime().isBefore(schedule.endTime())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Schedule must end after it starts (windows cannot cross midnight)");
            }
        }
    }

    private static ResponseStatusException duplicateGrant() {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "This member already has this permission for the module");
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
            ZoneId zone;
            try {
                zone = ZoneId.of(schedule.getTimezone());
            } catch (DateTimeException e) {
                continue; // rows saved before timezones were validated never match (fail closed)
            }
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
