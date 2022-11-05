package net.voldrich.myhome.server.api

import org.jooq.JSONFormat
import org.jooq.ResultQuery
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus
import kotlin.reflect.KClass

val DB_RESULT_JSON_FORMAT = JSONFormat()
    .header(false)
    .recordFormat(JSONFormat.RecordFormat.OBJECT)

@ResponseStatus(value = HttpStatus.NOT_FOUND)
class NotFoundException : RuntimeException {
    constructor(): super()
    constructor(message: String): super(message)
}

fun <T : Any> ResultQuery<*>.fetchList(type: KClass<T>): List<T> {
    return this.fetchInto(type.java)
}

fun ResultQuery<*>.fetchIdDto(): IdResponseDto {
    return this.fetchOneInto(IdResponseDto::class.java)
        ?: throw NotFoundException("ID not present")
}

fun <T : Any> ResultQuery<*>.fetchOneOrThrow(type: KClass<T>): T {
    return this.fetchOneInto(type.java)
        ?: throw NotFoundException("Inventory item not found")
}

data class IdResponseDto(val id: Long)