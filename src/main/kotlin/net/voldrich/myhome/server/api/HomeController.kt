package net.voldrich.myhome.server.api

import io.swagger.v3.oas.annotations.tags.Tag
import net.voldrich.myhome.jooq.tables.references.HOME
import org.jooq.DSLContext
import org.springframework.web.bind.annotation.*

@Tag(name = "Home")
@RestController
@RequestMapping("/api/home", produces = ["application/json"])
class HomeController (val dsl: DSLContext) {

    @GetMapping
    fun getHomes() = dsl
        .selectFrom(HOME)
        .fetch()
        .formatJSON(DB_RESULT_JSON_FORMAT)

    @PostMapping
    fun addHome(@RequestBody homeDto: CreateHomeDto) = dsl
        .insertInto(HOME)
        .set(HOME.NAME, homeDto.name)
        .returningResult(HOME.ID)
        .fetchIdDto()
}

data class CreateHomeDto(val name: String)