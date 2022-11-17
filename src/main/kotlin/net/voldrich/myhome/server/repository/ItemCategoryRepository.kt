package net.voldrich.myhome.server.repository

import net.voldrich.myhome.jooq.tables.records.ItemCategoryRecord
import net.voldrich.myhome.jooq.tables.references.ITEM_CATEGORY
import org.jooq.DSLContext
import org.springframework.stereotype.Repository

@Repository
class ItemCategoryRepository(dsl: DSLContext) : CrudRepository<ItemCategoryRecord>(dsl, ITEM_CATEGORY, ITEM_CATEGORY.ID)