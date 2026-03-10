package net.voldrich.myhome.backend.expenses.internal.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.voldrich.myhome.backend.auth.AuthModuleApi;
import net.voldrich.myhome.backend.auth.AuthUser;
import net.voldrich.myhome.backend.auth.FamilyRole;
import net.voldrich.myhome.backend.auth.ModulePermission;
import net.voldrich.myhome.backend.expenses.ExpenseAddedEvent;
import net.voldrich.myhome.backend.expenses.ExpenseCurrency;
import net.voldrich.myhome.backend.expenses.ExpenseDeletedEvent;
import net.voldrich.myhome.backend.expenses.ExpenseEditedEvent;
import net.voldrich.myhome.backend.expenses.internal.dto.*;
import net.voldrich.myhome.backend.expenses.internal.repository.*;
import net.voldrich.myhome.backend.jooq.tables.records.ExpensesRecord;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ExpenseService {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository splitRepository;
    private final ExpenseGroupRepository groupRepository;
    private final ExpenseGroupSplitRepository groupSplitRepository;
    private final ExpenseEditHistoryRepository historyRepository;
    private final ExchangeRateService exchangeRateService;
    private final AuthModuleApi authModuleApi;
    private final ApplicationEventPublisher eventPublisher;

    public ExpenseService(ExpenseRepository expenseRepository,
                          ExpenseSplitRepository splitRepository,
                          ExpenseGroupRepository groupRepository,
                          ExpenseGroupSplitRepository groupSplitRepository,
                          ExpenseEditHistoryRepository historyRepository,
                          ExchangeRateService exchangeRateService,
                          AuthModuleApi authModuleApi,
                          ApplicationEventPublisher eventPublisher) {
        this.expenseRepository = expenseRepository;
        this.splitRepository = splitRepository;
        this.groupRepository = groupRepository;
        this.groupSplitRepository = groupSplitRepository;
        this.historyRepository = historyRepository;
        this.exchangeRateService = exchangeRateService;
        this.authModuleApi = authModuleApi;
        this.eventPublisher = eventPublisher;
    }

    public record PageResult<T>(List<T> content, int totalElements, int page, int size) {}

    public PageResult<ExpenseResponse> listExpenses(AuthUser user, Long groupId, boolean unassigned, Integer year, Integer month, int page, int size) {
        int offset = page * size;
        boolean hasManage = user.familyRole() == FamilyRole.ADMIN ||
                authModuleApi.hasModuleAccess(user.id(), user.familyId(), "expenses", ModulePermission.MANAGE);
        List<Long> allowedGroupIds = null;
        if (user.familyRole() == FamilyRole.CHILD) {
            allowedGroupIds = groupRepository.findAllowedGroupIds(user.familyId());
        }
        var records = expenseRepository.findByFamily(user.familyId(), user.id(), groupId, allowedGroupIds, unassigned, year, month, offset, size);
        int total = expenseRepository.countByFamily(user.familyId(), user.id(), groupId, allowedGroupIds, unassigned, year, month);
        var members = getMemberMap(user.familyId());
        var content = records.stream().map(e -> toResponse(e, members, hasManage, user.id())).toList();
        return new PageResult<>(content, total, page, size);
    }

    @Transactional
    public ExpenseResponse createExpense(AuthUser user, ExpenseRequest request) {
        if (request.groupId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Group is required when creating an expense manually");
        }
        var group = groupRepository.findById(request.groupId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense group not found"));
        if (!group.getFamilyId().equals(user.familyId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense group not found");
        }
        if (group.getArchived()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot add expense to an archived group");
        }
        if (user.familyRole() == FamilyRole.CHILD && !group.getAllowChildren()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Children cannot add expenses to this group");
        }

        var members = getMemberMap(user.familyId());
        if (!members.containsKey(request.paidByUserId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paid-by user is not a member of this family");
        }

        BigDecimal czkAmount = exchangeRateService.convertToCzk(request.amount(), request.currency());
        BigDecimal exchangeRate = request.currency() == ExpenseCurrency.CZK ? null : exchangeRateService.getRate(request.currency());
        OffsetDateTime rateFetchedAt = request.currency() == ExpenseCurrency.CZK ? null : exchangeRateService.getRateFetchedAt(request.currency());

        var expense = expenseRepository.create(
                user.familyId(), request.groupId(), request.description(),
                request.amount(), request.currency().name(),
                czkAmount, exchangeRate, rateFetchedAt, request.date(),
                request.paidByUserId(), user.id(), null, null
        );

        saveSplits(expense.getId(), expense.getCzkAmount(), request.splits(), request.groupId(), members);

        String paidByName = members.getOrDefault(request.paidByUserId(), "Unknown");
        String createdByName = members.getOrDefault(user.id(), "Unknown");
        eventPublisher.publishEvent(new ExpenseAddedEvent(
                user.familyId(), expense.getId(), expense.getDescription(),
                expense.getOriginalAmount(), expense.getOriginalCurrency(),
                expense.getCzkAmount(), expense.getPaidByUserId(), paidByName,
                user.id(), createdByName
        ));

        boolean hasManage = user.familyRole() == FamilyRole.ADMIN ||
                authModuleApi.hasModuleAccess(user.id(), user.familyId(), "expenses", ModulePermission.MANAGE);
        return toResponse(expense, members, hasManage, user.id());
    }

    @Transactional
    public ExpenseResponse updateExpense(AuthUser user, Long expenseId, ExpenseRequest request) {
        var expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
        if (!expense.getFamilyId().equals(user.familyId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found");
        }
        if (expense.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.GONE, "Expense has been deleted");
        }

        boolean isCreator = expense.getCreatedByUserId().equals(user.id());
        boolean hasManage = user.familyRole() == FamilyRole.ADMIN ||
                authModuleApi.hasModuleAccess(user.id(), user.familyId(), "expenses", ModulePermission.MANAGE);
        if (!isCreator && !hasManage) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only edit your own expenses");
        }

        // Resolve target group: use request groupId if provided, otherwise keep existing
        Long targetGroupId = request.groupId() != null ? request.groupId() : expense.getGroupId();
        if (request.groupId() != null) {
            var group = groupRepository.findById(request.groupId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense group not found"));
            if (!group.getFamilyId().equals(user.familyId())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense group not found");
            }
        }

        var members = getMemberMap(user.familyId());
        BigDecimal czkAmount = exchangeRateService.convertToCzk(request.amount(), request.currency());
        BigDecimal exchangeRate = request.currency() == ExpenseCurrency.CZK ? null : exchangeRateService.getRate(request.currency());
        OffsetDateTime rateFetchedAt = request.currency() == ExpenseCurrency.CZK ? null : exchangeRateService.getRateFetchedAt(request.currency());

        Map<String, List<String>> changedFields = buildChangedFields(expense, request, targetGroupId, czkAmount);
        if (!changedFields.isEmpty()) {
            historyRepository.create(expenseId, user.id(), toJson(changedFields));
        }

        var updated = expenseRepository.update(
                expenseId, user.familyId(), targetGroupId, request.description(),
                request.amount(), request.currency().name(),
                czkAmount, exchangeRate, rateFetchedAt, request.date()
        ).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));

        splitRepository.deleteByExpenseId(expenseId);
        saveSplits(expenseId, updated.getCzkAmount(), request.splits(), targetGroupId, members);

        String editedByName = members.getOrDefault(user.id(), "Unknown");
        eventPublisher.publishEvent(new ExpenseEditedEvent(
                user.familyId(), expenseId, updated.getDescription(), user.id(), editedByName
        ));

        return toResponse(updated, members, hasManage, user.id());
    }

    @Transactional
    public void deleteExpense(AuthUser user, Long expenseId) {
        var expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
        if (!expense.getFamilyId().equals(user.familyId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found");
        }
        if (expense.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.GONE, "Expense already deleted");
        }

        boolean isCreator = expense.getCreatedByUserId().equals(user.id());
        boolean hasManage = user.familyRole() == FamilyRole.ADMIN ||
                authModuleApi.hasModuleAccess(user.id(), user.familyId(), "expenses", ModulePermission.MANAGE);
        if (!isCreator && !hasManage) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only delete your own expenses");
        }

        expenseRepository.softDelete(expenseId, user.familyId(), OffsetDateTime.now());

        var members = getMemberMap(user.familyId());
        String deletedByName = members.getOrDefault(user.id(), "Unknown");
        eventPublisher.publishEvent(new ExpenseDeletedEvent(
                user.familyId(), expenseId, expense.getDescription(),
                expense.getCzkAmount(), user.id(), deletedByName
        ));
    }

    @Transactional
    public ExpenseResponse restoreExpense(AuthUser user, Long expenseId) {
        var expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
        if (!expense.getFamilyId().equals(user.familyId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found");
        }
        if (expense.getDeletedAt() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expense is not deleted");
        }
        if (expense.getDeletedAt().isBefore(OffsetDateTime.now().minusDays(90))) {
            throw new ResponseStatusException(HttpStatus.GONE, "Expense can only be restored within 90 days of deletion");
        }

        expenseRepository.restore(expenseId, user.familyId());
        var restored = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
        boolean hasManage = user.familyRole() == FamilyRole.ADMIN ||
                authModuleApi.hasModuleAccess(user.id(), user.familyId(), "expenses", ModulePermission.MANAGE);
        return toResponse(restored, getMemberMap(user.familyId()), hasManage, user.id());
    }

    public List<EditHistoryResponse> getHistory(Long familyId, Long expenseId) {
        var expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found"));
        if (!expense.getFamilyId().equals(familyId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found");
        }
        return historyRepository.findByExpenseIdWithNames(expenseId).stream()
                .map(r -> new EditHistoryResponse(
                        r.value1(),
                        r.value2(),
                        r.value3(),
                        parseChangedFields(r.value4().data()),
                        r.value5()
                ))
                .toList();
    }

    private void saveSplits(Long expenseId, BigDecimal czkAmount, List<SplitEntry> requestSplits,
                            Long groupId, Map<Long, String> members) {
        if (groupId == null) {
            return; // Private (unassigned) expenses have no splits
        }
        List<SplitEntry> splits;
        if (requestSplits != null && !requestSplits.isEmpty()) {
            BigDecimal total = requestSplits.stream().map(SplitEntry::sharePct).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (total.compareTo(new BigDecimal("100.00")) != 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Split percentages must sum to 100%, got: " + total);
            }
            splits = requestSplits;
        } else {
            var groupSplits = groupSplitRepository.findByGroupId(groupId);
            splits = groupSplits.stream()
                    .map(gs -> new SplitEntry(gs.getUserId(), gs.getSharePct()))
                    .toList();
        }

        for (var split : splits) {
            BigDecimal splitCzk = czkAmount.multiply(split.sharePct())
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            splitRepository.create(expenseId, split.userId(), split.sharePct(), splitCzk);
        }
    }

    private ExpenseResponse toResponse(ExpensesRecord e, Map<Long, String> members, boolean hasManage, Long requestingUserId) {
        var splits = splitRepository.findByExpenseId(e.getId()).stream()
                .map(s -> new ExpenseSplitResponse(
                        s.getUserId(),
                        members.getOrDefault(s.getUserId(), "Unknown"),
                        s.getSharePct(),
                        s.getCzkAmount()
                ))
                .toList();

        var group = e.getGroupId() != null ? groupRepository.findById(e.getGroupId()).orElse(null) : null;
        boolean canEdit = e.getCreatedByUserId().equals(requestingUserId) || hasManage;

        return new ExpenseResponse(
                e.getId(),
                e.getDescription(),
                e.getOriginalAmount(),
                e.getOriginalCurrency(),
                e.getCzkAmount(),
                e.getExchangeRate(),
                e.getRateFetchedAt(),
                e.getExpenseDate(),
                new ExpenseResponse.UserRef(e.getPaidByUserId(), members.getOrDefault(e.getPaidByUserId(), "Unknown")),
                group != null ? new ExpenseResponse.GroupRef(group.getId(), group.getName()) : null,
                splits,
                e.getCreatedByUserId(),
                e.getCreatedAt(),
                e.getDeletedAt(),
                canEdit,
                e.getImportSource()
        );
    }

    private Map<Long, String> getMemberMap(Long familyId) {
        return authModuleApi.getFamilyMembers(familyId).stream()
                .collect(Collectors.toMap(AuthUser::id, AuthUser::displayName));
    }

    private Map<String, List<String>> buildChangedFields(ExpensesRecord existing, ExpenseRequest request,
                                                         Long targetGroupId, BigDecimal newCzkAmount) {
        Map<String, List<String>> changes = new LinkedHashMap<>();
        if (!existing.getDescription().equals(request.description())) {
            changes.put("description", List.of(existing.getDescription(), request.description()));
        }
        if (existing.getOriginalAmount().compareTo(request.amount()) != 0) {
            changes.put("amount", List.of(existing.getOriginalAmount().toString(), request.amount().toString()));
        }
        if (!existing.getOriginalCurrency().equals(request.currency().name())) {
            changes.put("currency", List.of(existing.getOriginalCurrency(), request.currency().name()));
        }
        if (!existing.getExpenseDate().equals(request.date())) {
            changes.put("date", List.of(existing.getExpenseDate().toString(), request.date().toString()));
        }
        if (!Objects.equals(existing.getGroupId(), targetGroupId)) {
            String oldGroup = existing.getGroupId() != null ? existing.getGroupId().toString() : "none";
            String newGroup = targetGroupId != null ? targetGroupId.toString() : "none";
            changes.put("groupId", List.of(oldGroup, newGroup));
        }
        return changes;
    }

    private String toJson(Map<String, List<String>> changes) {
        try {
            return JSON.writeValueAsString(changes);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    private Map<String, List<String>> parseChangedFields(String json) {
        try {
            return JSON.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }
}
