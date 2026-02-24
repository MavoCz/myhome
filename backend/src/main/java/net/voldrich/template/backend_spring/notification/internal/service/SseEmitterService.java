package net.voldrich.template.backend_spring.notification.internal.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class SseEmitterService {

    private static final Logger log = LoggerFactory.getLogger(SseEmitterService.class);
    private static final long EMITTER_TIMEOUT = 5 * 60 * 1000L; // 5 minutes

    private final ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SseEmitter createEmitter(Long userId) {
        var emitter = new SseEmitter(EMITTER_TIMEOUT);
        emitters.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        Runnable cleanup = () -> {
            var userEmitters = emitters.get(userId);
            if (userEmitters != null) {
                userEmitters.remove(emitter);
                if (userEmitters.isEmpty()) {
                    emitters.remove(userId);
                }
            }
        };

        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());

        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            log.warn("Failed to send connected event to user {}", userId, e);
            emitter.complete();
        }

        return emitter;
    }

    public void sendToUser(Long userId, Object payload) {
        var userEmitters = emitters.get(userId);
        if (userEmitters == null) {
            return;
        }

        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (IOException e) {
            log.error("Failed to serialize SSE payload", e);
            return;
        }

        for (var emitter : userEmitters) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(json));
            } catch (IOException e) {
                log.debug("Failed to send SSE event to user {}, removing emitter", userId);
                emitter.complete();
            }
        }
    }

    public void sendHeartbeat() {
        emitters.forEach((userId, userEmitters) -> {
            for (var emitter : userEmitters) {
                try {
                    emitter.send(SseEmitter.event().name("heartbeat").data(""));
                } catch (IOException e) {
                    log.debug("Heartbeat failed for user {}, removing emitter", userId);
                    emitter.complete();
                }
            }
        });
    }
}
