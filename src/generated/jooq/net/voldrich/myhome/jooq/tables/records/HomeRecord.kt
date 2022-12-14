/*
 * This file is generated by jOOQ.
 */
package net.voldrich.myhome.jooq.tables.records


import java.time.LocalDateTime

import net.voldrich.myhome.jooq.tables.Home

import org.jooq.Field
import org.jooq.Record1
import org.jooq.Record3
import org.jooq.Row3
import org.jooq.impl.UpdatableRecordImpl


/**
 * This class is generated by jOOQ.
 */
@Suppress("UNCHECKED_CAST")
open class HomeRecord() : UpdatableRecordImpl<HomeRecord>(Home.HOME), Record3<Long?, String?, LocalDateTime?> {

    var id: Long?
        set(value): Unit = set(0, value)
        get(): Long? = get(0) as Long?

    var name: String?
        set(value): Unit = set(1, value)
        get(): String? = get(1) as String?

    var createdOn: LocalDateTime?
        set(value): Unit = set(2, value)
        get(): LocalDateTime? = get(2) as LocalDateTime?

    // -------------------------------------------------------------------------
    // Primary key information
    // -------------------------------------------------------------------------

    override fun key(): Record1<Long?> = super.key() as Record1<Long?>

    // -------------------------------------------------------------------------
    // Record3 type implementation
    // -------------------------------------------------------------------------

    override fun fieldsRow(): Row3<Long?, String?, LocalDateTime?> = super.fieldsRow() as Row3<Long?, String?, LocalDateTime?>
    override fun valuesRow(): Row3<Long?, String?, LocalDateTime?> = super.valuesRow() as Row3<Long?, String?, LocalDateTime?>
    override fun field1(): Field<Long?> = Home.HOME.ID
    override fun field2(): Field<String?> = Home.HOME.NAME
    override fun field3(): Field<LocalDateTime?> = Home.HOME.CREATED_ON
    override fun component1(): Long? = id
    override fun component2(): String? = name
    override fun component3(): LocalDateTime? = createdOn
    override fun value1(): Long? = id
    override fun value2(): String? = name
    override fun value3(): LocalDateTime? = createdOn

    override fun value1(value: Long?): HomeRecord {
        this.id = value
        return this
    }

    override fun value2(value: String?): HomeRecord {
        this.name = value
        return this
    }

    override fun value3(value: LocalDateTime?): HomeRecord {
        this.createdOn = value
        return this
    }

    override fun values(value1: Long?, value2: String?, value3: LocalDateTime?): HomeRecord {
        this.value1(value1)
        this.value2(value2)
        this.value3(value3)
        return this
    }

    /**
     * Create a detached, initialised HomeRecord
     */
    constructor(id: Long? = null, name: String? = null, createdOn: LocalDateTime? = null): this() {
        this.id = id
        this.name = name
        this.createdOn = createdOn
    }
}
