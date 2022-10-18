package net.voldrich.myhome.server

import net.voldrich.myhome.jooq.tables.Account
import org.jooq.DSLContext
import org.jooq.JSONFormat
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("account")
class AccountController (val dsl: DSLContext) {

    @GetMapping()
    fun getAccounts() = dsl.selectFrom(Account.ACCOUNT)
        .fetch()
        .formatJSON(JSONFormat().header(false).recordFormat(JSONFormat.RecordFormat.OBJECT))
}