package net.voldrich.myhome.server.repository

import net.voldrich.myhome.jooq.tables.records.ItemRecord
import net.voldrich.myhome.jooq.tables.references.ITEM
import org.jooq.DSLContext
import org.springframework.stereotype.Repository

@Repository
class ItemRepository(dsl: DSLContext) : CrudRepository<ItemRecord>(dsl, ITEM, ITEM.ID) {

}