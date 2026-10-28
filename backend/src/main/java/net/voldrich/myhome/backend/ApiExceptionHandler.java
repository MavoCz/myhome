package net.voldrich.myhome.backend;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Puts the reason of deliberately thrown exceptions into the response body as {@code message}, which is
 * where the frontend client reads it from. Spring's default error body omits it, so the UI could only show
 * a generic fallback.
 */
@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return body(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        var status = HttpStatus.resolve(ex.getStatusCode().value());
        String message = ex.getReason() != null ? ex.getReason() : status != null ? status.getReasonPhrase() : "Request failed";
        return ResponseEntity.status(ex.getStatusCode())
                .headers(ex.getHeaders())
                .body(Map.of("status", ex.getStatusCode().value(), "message", message));
    }

    private static ResponseEntity<Map<String, Object>> body(HttpStatus status, String message) {
        return ResponseEntity.status(status)
                .body(Map.of("status", status.value(), "message", message != null ? message : status.getReasonPhrase()));
    }
}
