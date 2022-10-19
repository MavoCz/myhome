package net.voldrich.myhome.server

import net.voldrich.myhome.jooq.tables.pojos.Account
import net.voldrich.myhome.jooq.tables.Account.Companion.ACCOUNT
import net.voldrich.myhome.jooq.tables.records.AccountRecord
import org.jooq.DSLContext
import org.jooq.JSONFormat
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("account")
class AccountController (val dsl: DSLContext) {

    val jsonFormat = JSONFormat().header(false).recordFormat(JSONFormat.RecordFormat.OBJECT);

    @GetMapping()
    fun getAccounts() = dsl.selectFrom(ACCOUNT)
        .fetch()
        .formatJSON(jsonFormat)

    @PostMapping()
    fun getAccounts(@RequestBody account: Account) = dsl.insertInto(ACCOUNT)
        .set(AccountRecord(account))
        .execute()
}