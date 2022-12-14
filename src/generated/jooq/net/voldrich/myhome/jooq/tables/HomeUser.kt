/*
 * This file is generated by jOOQ.
 */
package net.voldrich.myhome.jooq.tables


import java.time.LocalDateTime

import kotlin.collections.List

import net.voldrich.myhome.jooq.Public
import net.voldrich.myhome.jooq.keys.HOME_USER__HOME_USER_HOME_FK
import net.voldrich.myhome.jooq.keys.USER_EMAIL_UNIQUE
import net.voldrich.myhome.jooq.keys.USER_PK
import net.voldrich.myhome.jooq.tables.records.HomeUserRecord

import org.jooq.Field
import org.jooq.ForeignKey
import org.jooq.Identity
import org.jooq.Name
import org.jooq.Record
import org.jooq.Row5
import org.jooq.Schema
import org.jooq.Table
import org.jooq.TableField
import org.jooq.TableOptions
import org.jooq.UniqueKey
import org.jooq.impl.DSL
import org.jooq.impl.Internal
import org.jooq.impl.SQLDataType
import org.jooq.impl.TableImpl


/**
 * This class is generated by jOOQ.
 */
@Suppress("UNCHECKED_CAST")
open class HomeUser(
    alias: Name,
    child: Table<out Record>?,
    path: ForeignKey<out Record, HomeUserRecord>?,
    aliased: Table<HomeUserRecord>?,
    parameters: Array<Field<*>?>?
): TableImpl<HomeUserRecord>(
    alias,
    Public.PUBLIC,
    child,
    path,
    aliased,
    parameters,
    DSL.comment(""),
    TableOptions.table()
) {
    companion object {

        /**
         * The reference instance of <code>public.home_user</code>
         */
        val HOME_USER: HomeUser = HomeUser()
    }

    /**
     * The class holding records for this type
     */
    override fun getRecordType(): Class<HomeUserRecord> = HomeUserRecord::class.java

    /**
     * The column <code>public.home_user.id</code>.
     */
    val ID: TableField<HomeUserRecord, Long?> = createField(DSL.name("id"), SQLDataType.BIGINT.nullable(false).identity(true), this, "")

    /**
     * The column <code>public.home_user.home_id</code>.
     */
    val HOME_ID: TableField<HomeUserRecord, Long?> = createField(DSL.name("home_id"), SQLDataType.BIGINT.nullable(false), this, "")

    /**
     * The column <code>public.home_user.name</code>.
     */
    val NAME: TableField<HomeUserRecord, String?> = createField(DSL.name("name"), SQLDataType.VARCHAR(255).nullable(false), this, "")

    /**
     * The column <code>public.home_user.email</code>.
     */
    val EMAIL: TableField<HomeUserRecord, String?> = createField(DSL.name("email"), SQLDataType.VARCHAR(255).nullable(false), this, "")

    /**
     * The column <code>public.home_user.created_on</code>.
     */
    val CREATED_ON: TableField<HomeUserRecord, LocalDateTime?> = createField(DSL.name("created_on"), SQLDataType.LOCALDATETIME(6).nullable(false).defaultValue(DSL.field("now()", SQLDataType.LOCALDATETIME)), this, "")

    private constructor(alias: Name, aliased: Table<HomeUserRecord>?): this(alias, null, null, aliased, null)
    private constructor(alias: Name, aliased: Table<HomeUserRecord>?, parameters: Array<Field<*>?>?): this(alias, null, null, aliased, parameters)

    /**
     * Create an aliased <code>public.home_user</code> table reference
     */
    constructor(alias: String): this(DSL.name(alias))

    /**
     * Create an aliased <code>public.home_user</code> table reference
     */
    constructor(alias: Name): this(alias, null)

    /**
     * Create a <code>public.home_user</code> table reference
     */
    constructor(): this(DSL.name("home_user"), null)

    constructor(child: Table<out Record>, key: ForeignKey<out Record, HomeUserRecord>): this(Internal.createPathAlias(child, key), child, key, HOME_USER, null)
    override fun getSchema(): Schema? = if (aliased()) null else Public.PUBLIC
    override fun getIdentity(): Identity<HomeUserRecord, Long?> = super.getIdentity() as Identity<HomeUserRecord, Long?>
    override fun getPrimaryKey(): UniqueKey<HomeUserRecord> = USER_PK
    override fun getUniqueKeys(): List<UniqueKey<HomeUserRecord>> = listOf(USER_EMAIL_UNIQUE)
    override fun getReferences(): List<ForeignKey<HomeUserRecord, *>> = listOf(HOME_USER__HOME_USER_HOME_FK)

    private lateinit var _home: Home

    /**
     * Get the implicit join path to the <code>public.home</code> table.
     */
    fun home(): Home {
        if (!this::_home.isInitialized)
            _home = Home(this, HOME_USER__HOME_USER_HOME_FK)

        return _home;
    }
    override fun `as`(alias: String): HomeUser = HomeUser(DSL.name(alias), this)
    override fun `as`(alias: Name): HomeUser = HomeUser(alias, this)

    /**
     * Rename this table
     */
    override fun rename(name: String): HomeUser = HomeUser(DSL.name(name), null)

    /**
     * Rename this table
     */
    override fun rename(name: Name): HomeUser = HomeUser(name, null)

    // -------------------------------------------------------------------------
    // Row5 type methods
    // -------------------------------------------------------------------------
    override fun fieldsRow(): Row5<Long?, Long?, String?, String?, LocalDateTime?> = super.fieldsRow() as Row5<Long?, Long?, String?, String?, LocalDateTime?>
}
