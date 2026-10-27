package net.voldrich.myhome.backend.learning.internal.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.voldrich.myhome.backend.auth.AuthModuleApi;
import net.voldrich.myhome.backend.auth.AuthUser;
import net.voldrich.myhome.backend.auth.FamilyRole;
import net.voldrich.myhome.backend.jooq.tables.records.LearningCoinGrantsRecord;
import net.voldrich.myhome.backend.jooq.tables.records.LearningZoosRecord;
import net.voldrich.myhome.backend.learning.internal.dto.*;
import net.voldrich.myhome.backend.learning.internal.repository.CoinGrantRepository;
import net.voldrich.myhome.backend.learning.internal.repository.ExerciseResultRepository;
import net.voldrich.myhome.backend.learning.internal.repository.LearningZooRepository;
import org.jooq.JSONB;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DateTimeException;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class LearningService {

    private static final ObjectMapper JSON = new ObjectMapper();
    /** A zoo with hundreds of objects is a few tens of kB; anything far bigger is a broken client. */
    static final int MAX_STATE_BYTES = 256 * 1024;
    private static final int RECENT_GRANTS_LIMIT = 50;

    private final LearningZooRepository zooRepository;
    private final ExerciseResultRepository resultRepository;
    private final CoinGrantRepository grantRepository;
    private final AuthModuleApi authModuleApi;

    public LearningService(LearningZooRepository zooRepository,
                           ExerciseResultRepository resultRepository,
                           CoinGrantRepository grantRepository,
                           AuthModuleApi authModuleApi) {
        this.zooRepository = zooRepository;
        this.resultRepository = resultRepository;
        this.grantRepository = grantRepository;
        this.authModuleApi = authModuleApi;
    }

    @Transactional(readOnly = true)
    public MyZooResponse getMyZoo(AuthUser user) {
        requireChild(user);
        var pending = grantRepository.findPending(user.familyId(), user.id()).stream()
                .map(this::toGrantResponse)
                .toList();
        var zoo = zooRepository.find(user.familyId(), user.id());
        if (zoo.isEmpty()) {
            return new MyZooResponse(user.id(), user.displayName(), null, 0, pending);
        }
        return new MyZooResponse(user.id(), user.displayName(), readState(zoo.get().getState()), zoo.get().getVersion(), pending);
    }

    /**
     * Saves the child's zoo if nobody saved a newer version in between (409 otherwise, and the app rebases).
     * Claiming bonus grants happens in the same transaction, so their coins land exactly once.
     */
    @Transactional
    public SaveZooResponse saveMyZoo(AuthUser user, SaveZooRequest request) {
        requireChild(user);
        var stateJson = writeJson(request.state());
        if (stateJson.length() > MAX_STATE_BYTES) {
            throw new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE, "Zoo state is too large");
        }

        var saved = request.version() == 0
                ? zooRepository.insert(user.familyId(), user.id(), stateJson)
                : zooRepository.updateIfVersion(user.familyId(), user.id(), stateJson, request.version());
        if (!saved) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Zoo was changed elsewhere");
        }

        var grantIds = request.claimedGrantIds() == null ? List.<Long>of() : request.claimedGrantIds();
        var distinctIds = new HashSet<>(grantIds);
        if (!distinctIds.isEmpty() && grantRepository.claim(user.familyId(), user.id(), distinctIds) != distinctIds.size()) {
            // Already claimed from another device (or not this child's): roll the save back so the app rebases
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bonus coins were already claimed");
        }
        return new SaveZooResponse(request.version() + 1);
    }

    /** All zoos in the family: children visit each other's, parents look at them. */
    @Transactional(readOnly = true)
    public List<ZooResponse> listFamilyZoos(AuthUser user) {
        var names = memberNames(user.familyId());
        return zooRepository.findByFamilyId(user.familyId()).stream()
                .filter(zoo -> names.containsKey(zoo.getUserId()))
                .map(zoo -> toZooResponse(zoo, names.get(zoo.getUserId())))
                .toList();
    }

    @Transactional
    public void recordResults(AuthUser user, ExerciseResultsRequest request) {
        requireChild(user);
        for (var result : request.results()) {
            resultRepository.insertIgnoringDuplicates(
                    user.familyId(),
                    user.id(),
                    result.clientId(),
                    result.exercise(),
                    writeJson(result.event()),
                    result.coins(),
                    result.solvedAt());
        }
    }

    @Transactional(readOnly = true)
    public List<ChildProgressResponse> progress(AuthUser user, int days, String timezone) {
        var zone = parseZone(timezone);
        var from = OffsetDateTime.now(zone).toLocalDate().minusDays(days - 1L).atStartOfDay(zone).toOffsetDateTime();
        var totals = resultRepository.dailyTotals(user.familyId(), from, zone.getId()).stream()
                .collect(Collectors.groupingBy(
                        r -> r.value1(),
                        Collectors.mapping(r -> new DailyProgressResponse(r.value2(), r.value3(), r.value4(), r.value5()),
                                Collectors.toList())));
        var zoos = zooRepository.findByFamilyId(user.familyId()).stream()
                .collect(Collectors.toMap(LearningZoosRecord::getUserId, zoo -> readState(zoo.getState())));

        return children(user.familyId()).stream()
                .map(child -> {
                    var state = zoos.get(child.id());
                    return new ChildProgressResponse(
                            child.id(),
                            child.displayName(),
                            state == null ? null : intField(state, "coins"),
                            state == null ? null : intField(state, "earned"),
                            totals.getOrDefault(child.id(), List.of()));
                })
                .toList();
    }

    @Transactional
    public CoinGrantResponse grantCoins(AuthUser user, CoinGrantRequest request) {
        var isChild = children(user.familyId()).stream().anyMatch(c -> c.id().equals(request.userId()));
        if (!isChild) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bonus coins can only go to a child in this family");
        }
        var note = request.note() == null || request.note().isBlank() ? null : request.note().trim();
        return toGrantResponse(grantRepository.create(user.familyId(), request.userId(), request.amount(), note, user.id()));
    }

    @Transactional(readOnly = true)
    public List<CoinGrantResponse> recentGrants(AuthUser user) {
        return grantRepository.findRecent(user.familyId(), RECENT_GRANTS_LIMIT).stream()
                .map(this::toGrantResponse)
                .toList();
    }

    /** Learning data belongs to the family membership; leaving the family removes it. */
    @Transactional
    public void deleteMemberData(Long familyId, Long userId) {
        zooRepository.delete(familyId, userId);
        resultRepository.deleteForUser(familyId, userId);
        grantRepository.deleteForUser(familyId, userId);
    }

    private void requireChild(AuthUser user) {
        if (user.familyRole() != FamilyRole.CHILD) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only children have a zoo");
        }
    }

    private List<AuthUser> children(Long familyId) {
        return authModuleApi.getFamilyMembers(familyId).stream()
                .filter(m -> m.familyRole() == FamilyRole.CHILD)
                .toList();
    }

    private Map<Long, String> memberNames(Long familyId) {
        return authModuleApi.getFamilyMembers(familyId).stream()
                .collect(Collectors.toMap(AuthUser::id, AuthUser::displayName));
    }

    private ZooResponse toZooResponse(LearningZoosRecord zoo, String displayName) {
        return new ZooResponse(zoo.getUserId(), displayName, readState(zoo.getState()), zoo.getVersion());
    }

    private CoinGrantResponse toGrantResponse(LearningCoinGrantsRecord grant) {
        return new CoinGrantResponse(
                grant.getId(),
                grant.getUserId(),
                grant.getAmount(),
                grant.getNote(),
                grant.getCreatedAt(),
                grant.getClaimedAt());
    }

    private static ZoneId parseZone(String timezone) {
        try {
            return ZoneId.of(timezone);
        } catch (DateTimeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown timezone: " + timezone);
        }
    }

    private static Integer intField(Map<String, Object> state, String name) {
        return state.get(name) instanceof Number n ? n.intValue() : null;
    }

    private static String writeJson(Object value) {
        try {
            return JSON.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize learning state", e);
        }
    }

    private static Map<String, Object> readState(JSONB json) {
        try {
            return JSON.readValue(json.data(), new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to read learning state", e);
        }
    }
}
