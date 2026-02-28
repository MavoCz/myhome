package net.voldrich.myhome.backend.expenses.internal.service;

import net.voldrich.myhome.backend.auth.AuthModuleApi;
import net.voldrich.myhome.backend.expenses.internal.dto.*;
import net.voldrich.myhome.backend.expenses.internal.repository.ExpenseGroupRepository;
import net.voldrich.myhome.backend.expenses.internal.repository.ExpenseGroupSplitRepository;
import net.voldrich.myhome.backend.jooq.tables.records.ExpenseGroupsRecord;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ExpenseGroupService {

    private final ExpenseGroupRepository groupRepository;
    private final ExpenseGroupSplitRepository splitRepository;
    private final AuthModuleApi authModuleApi;

    public ExpenseGroupService(ExpenseGroupRepository groupRepository,
                               ExpenseGroupSplitRepository splitRepository,
                               AuthModuleApi authModuleApi) {
        this.groupRepository = groupRepository;
        this.splitRepository = splitRepository;
        this.authModuleApi = authModuleApi;
    }

    @Transactional
    public List<ExpenseGroupResponse> listGroups(Long familyId) {
        var groups = groupRepository.findByFamilyId(familyId);
        if (groups.isEmpty()) {
            // Auto-create default "General" group on first access
            groupRepository.create(familyId, "General", "Default expense group", null, null, true);
            groups = groupRepository.findByFamilyId(familyId);
        }
        return groups.stream().map(this::toResponse).toList();
    }

    @Transactional
    public ExpenseGroupResponse createGroup(Long familyId, ExpenseGroupRequest request) {
        if (groupRepository.existsByFamilyIdAndName(familyId, request.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Group name already exists in this family");
        }
        var record = groupRepository.create(familyId, request.name(), request.description(),
                request.startDate(), request.endDate(), false);
        return toResponse(record);
    }

    @Transactional
    public ExpenseGroupResponse updateGroup(Long familyId, Long groupId, ExpenseGroupRequest request) {
        var existing = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
        if (!existing.getFamilyId().equals(familyId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }
        if (!existing.getName().equalsIgnoreCase(request.name()) &&
                groupRepository.existsByFamilyIdAndNameExcluding(familyId, request.name(), groupId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Group name already exists in this family");
        }
        return groupRepository.update(groupId, familyId, request.name(), request.description(),
                        request.startDate(), request.endDate())
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
    }

    @Transactional
    public void archiveGroup(Long familyId, Long groupId) {
        var group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
        if (!group.getFamilyId().equals(familyId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }
        if (group.getIsDefault()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot archive the default group");
        }
        groupRepository.archive(groupId, familyId);
    }

    @Transactional
    public void deleteGroup(Long familyId, Long groupId) {
        var group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
        if (!group.getFamilyId().equals(familyId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }
        if (group.getIsDefault()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete the default group");
        }
        if (groupRepository.hasExpenses(groupId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete a group that has expenses");
        }
        groupRepository.delete(groupId, familyId);
    }

    @Transactional
    public SplitConfigResponse setSplits(Long familyId, Long groupId, SplitConfigRequest request) {
        var group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found"));
        if (!group.getFamilyId().equals(familyId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Group not found");
        }

        BigDecimal total = request.splits().stream()
                .map(SplitEntry::sharePct)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(new BigDecimal("100.00")) != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Split percentages must sum to 100%, got: " + total);
        }

        splitRepository.deleteByGroupId(groupId);
        for (var entry : request.splits()) {
            splitRepository.create(groupId, entry.userId(), entry.sharePct());
        }

        var splits = splitRepository.findByGroupIdWithNames(groupId).stream()
                .map(r -> new GroupSplitResponse(r.value1(), r.value2(), r.value3()))
                .toList();
        return new SplitConfigResponse(groupId, splits);
    }

    private ExpenseGroupResponse toResponse(ExpenseGroupsRecord g) {
        var splits = splitRepository.findByGroupIdWithNames(g.getId()).stream()
                .map(r -> new GroupSplitResponse(r.value1(), r.value2(), r.value3()))
                .toList();
        return new ExpenseGroupResponse(
                g.getId(), g.getName(), g.getDescription(),
                g.getStartDate(), g.getEndDate(), g.getArchived(), g.getIsDefault(), splits
        );
    }

    @Transactional
    public void createDefaultGroupForFamily(Long familyId) {
        if (!groupRepository.existsByFamilyIdAndName(familyId, "General")) {
            groupRepository.create(familyId, "General", "Default expense group",
                    null, null, true);
        }
    }
}
