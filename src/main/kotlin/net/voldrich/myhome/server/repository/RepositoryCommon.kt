package net.voldrich.myhome.server.repository

import net.voldrich.myhome.server.api.NotFoundException
import org.jooq.Record
import org.jooq.ResultQuery
import kotlin.reflect.KClass


fun <T : Any> ResultQuery<*>.fetchList(type: KClass<T>): List<T> {
    return this.fetchInto(type.java)
}

fun ResultQuery<*>.fetchId(): RecordId {
    return this.fetchOneInto(RecordId::class.java)
        ?: throw NotFoundException("ID not present")
}

fun <T : Any> ResultQuery<*>.fetchOneOrThrow(type: KClass<T>): T {
    return this.fetchOneInto(type.java)
        ?: throw NotFoundException("Record not found")
}

fun ResultQuery<*>.fetchOneOrThrow(): Record {
    return this.fetchOne()
        ?: throw NotFoundException("Record not found")
}

data class RecordId(val id: Long)
