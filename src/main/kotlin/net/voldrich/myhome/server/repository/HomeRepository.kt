package net.voldrich.myhome.server.repository

import net.voldrich.myhome.jooq.tables.records.HomeRecord
import net.voldrich.myhome.jooq.tables.references.HOME
import org.jooq.DSLContext
import org.springframework.stereotype.Repository

@Repository
class HomeRepository(dsl: DSLContext) : CrudRepository<HomeRecord>(dsl, HOME, HOME.ID)