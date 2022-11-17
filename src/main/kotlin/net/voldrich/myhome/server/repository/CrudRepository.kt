package net.voldrich.myhome.server.repository

import net.voldrich.myhome.server.api.NotFoundException
import org.jooq.DSLContext
import org.jooq.Record
import org.jooq.Table
import org.jooq.TableField
import java.util.function.Consumer

abstract class CrudRepository<R : Record>(open val dsl: DSLContext,
                              open val table: Table<R>,
                              open val idField: TableField<R, Long?>) {

    fun getAll() = dsl
        .selectFrom(table)
        .fetch()

    fun getById(id: Long) = dsl
        .selectFrom(table)
        .where(idField.eq(id))
        .fetchOneOrThrow()

    fun insert(dto: Any, change: Consumer<R>): RecordId {
        val newRecord : R = dsl.newRecord(table, dto)
        change.accept(newRecord)
        return insert(newRecord)
    }

    fun insert(newRecord: Record): RecordId = dsl.insertInto(table)
        .set(newRecord)
        .returningResult(idField)
        .fetchId()

    fun update(id: Long, dto: Any, change: Consumer<R>) {
        val record : R = dsl.newRecord(table, dto)
        change.accept (record)
        update(id, record)
    }

    fun update(id: Long, updatedRecord: R) {
        val count = dsl.update(table)
            .set(updatedRecord)
            .where(idField.eq(id))
            .execute()
        if (count != 1) throw NotFoundException("No record was updated")
    }

    fun delete(id: Long) {
        dsl.delete(table)
            .where(idField.eq(id))
            .execute()
    }
}