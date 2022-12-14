/*
 * This file is generated by jOOQ.
 */
package net.voldrich.myhome.jooq.tables


import kotlin.collections.List

import net.voldrich.myhome.jooq.Public
import net.voldrich.myhome.jooq.keys.ITEM_CATEGORY_PK
import net.voldrich.myhome.jooq.keys.ITEM_CATEGORY__ITEM_CATEGORY_HOME_FK
import net.voldrich.myhome.jooq.tables.records.ItemCategoryRecord

import org.jooq.Field
import org.jooq.ForeignKey
import org.jooq.Identity
import org.jooq.Name
import org.jooq.Record
import org.jooq.Row3
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
open class ItemCategory(
    alias: Name,
    child: Table<out Record>?,
    path: ForeignKey<out Record, ItemCategoryRecord>?,
    aliased: Table<ItemCategoryRecord>?,
    parameters: Array<Field<*>?>?
): TableImpl<ItemCategoryRecord>(
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
         * The reference instance of <code>public.item_category</code>
         */
        val ITEM_CATEGORY: ItemCategory = ItemCategory()
    }

    /**
     * The class holding records for this type
     */
    override fun getRecordType(): Class<ItemCategoryRecord> = ItemCategoryRecord::class.java

    /**
     * The column <code>public.item_category.id</code>.
     */
    val ID: TableField<ItemCategoryRecord, Long?> = createField(DSL.name("id"), SQLDataType.BIGINT.nullable(false).identity(true), this, "")

    /**
     * The column <code>public.item_category.home_id</code>.
     */
    val HOME_ID: TableField<ItemCategoryRecord, Long?> = createField(DSL.name("home_id"), SQLDataType.BIGINT.nullable(false), this, "")

    /**
     * The column <code>public.item_category.name</code>.
     */
    val NAME: TableField<ItemCategoryRecord, String?> = createField(DSL.name("name"), SQLDataType.VARCHAR(255), this, "")

    private constructor(alias: Name, aliased: Table<ItemCategoryRecord>?): this(alias, null, null, aliased, null)
    private constructor(alias: Name, aliased: Table<ItemCategoryRecord>?, parameters: Array<Field<*>?>?): this(alias, null, null, aliased, parameters)

    /**
     * Create an aliased <code>public.item_category</code> table reference
     */
    constructor(alias: String): this(DSL.name(alias))

    /**
     * Create an aliased <code>public.item_category</code> table reference
     */
    constructor(alias: Name): this(alias, null)

    /**
     * Create a <code>public.item_category</code> table reference
     */
    constructor(): this(DSL.name("item_category"), null)

    constructor(child: Table<out Record>, key: ForeignKey<out Record, ItemCategoryRecord>): this(Internal.createPathAlias(child, key), child, key, ITEM_CATEGORY, null)
    override fun getSchema(): Schema? = if (aliased()) null else Public.PUBLIC
    override fun getIdentity(): Identity<ItemCategoryRecord, Long?> = super.getIdentity() as Identity<ItemCategoryRecord, Long?>
    override fun getPrimaryKey(): UniqueKey<ItemCategoryRecord> = ITEM_CATEGORY_PK
    override fun getReferences(): List<ForeignKey<ItemCategoryRecord, *>> = listOf(ITEM_CATEGORY__ITEM_CATEGORY_HOME_FK)

    private lateinit var _home: Home

    /**
     * Get the implicit join path to the <code>public.home</code> table.
     */
    fun home(): Home {
        if (!this::_home.isInitialized)
            _home = Home(this, ITEM_CATEGORY__ITEM_CATEGORY_HOME_FK)

        return _home;
    }
    override fun `as`(alias: String): ItemCategory = ItemCategory(DSL.name(alias), this)
    override fun `as`(alias: Name): ItemCategory = ItemCategory(alias, this)

    /**
     * Rename this table
     */
    override fun rename(name: String): ItemCategory = ItemCategory(DSL.name(name), null)

    /**
     * Rename this table
     */
    override fun rename(name: Name): ItemCategory = ItemCategory(name, null)

    // -------------------------------------------------------------------------
    // Row3 type methods
    // -------------------------------------------------------------------------
    override fun fieldsRow(): Row3<Long?, Long?, String?> = super.fieldsRow() as Row3<Long?, Long?, String?>
}
