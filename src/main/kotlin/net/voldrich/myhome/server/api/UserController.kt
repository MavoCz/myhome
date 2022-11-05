package net.voldrich.myhome.server.api

import io.swagger.v3.oas.annotations.tags.Tag
import net.voldrich.myhome.jooq.tables.references.HOME_USER
import org.jooq.DSLContext
import org.springframework.web.bind.annotation.*

@Tag(name = "User")
@RestController
@RequestMapping("/api/user", produces = ["application/json"])
class UserController(val dsl: DSLContext) {

    @GetMapping
    fun getUsers() = dsl
        .selectFrom(HOME_USER)
        .fetch()
        .formatJSON(DB_RESULT_JSON_FORMAT)

    @PostMapping
    fun addUser(@RequestBody userDto: CreateUserDto) = dsl
        .insertInto(HOME_USER)
        .set(dsl.newRecord(HOME_USER, userDto))
        .returningResult(HOME_USER.ID)
        .fetchIdDto()
}

data class CreateUserDto(val email: String)