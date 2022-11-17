package net.voldrich.myhome.server.repository

import net.voldrich.myhome.jooq.tables.records.HomeUserRecord
import net.voldrich.myhome.jooq.tables.references.HOME_USER
import org.jooq.DSLContext
import org.springframework.stereotype.Repository

@Repository
class UserRepository(dsl: DSLContext) : CrudRepository<HomeUserRecord>(dsl, HOME_USER, HOME_USER.ID)