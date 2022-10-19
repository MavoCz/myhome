package net.voldrich.myhome.server

import net.voldrich.myhome.jooq.tables.references.HOME
import net.voldrich.myhome.jooq.tables.references.HOME_USER
import net.voldrich.myhome.jooq.tables.references.INVENTORY_ITEM
import org.jooq.DSLContext
import org.jooq.JSONFormat
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api")
class HomeController (val dsl: DSLContext) {

    val jsonFormat = JSONFormat().header(false).recordFormat(JSONFormat.RecordFormat.OBJECT)

    @GetMapping("/home", produces = ["application/json"])
    fun getHomes() = dsl.selectFrom(HOME)
        .fetch()
        .formatJSON(jsonFormat)

    @GetMapping("/user", produces = ["application/json"])
    fun getUser() = dsl.selectFrom(HOME_USER)
        .fetch()
        .formatJSON(jsonFormat)

    @PostMapping("/home", produces = ["application/json"])
    fun addHome(@RequestBody homeDto: CreateHomeDto): String {
        return dsl.insertInto(HOME)
            .set(HOME.NAME, homeDto.name)
            .returningResult(HOME.ID)
            .fetchOne()!!
            .formatJSON(jsonFormat)
    }

    @PostMapping("/user", produces = ["application/json"])
    fun addUser(@RequestBody userDto: CreateUserDto): String {
        return dsl.insertInto(HOME_USER)
            .set(dsl.newRecord(HOME_USER, userDto))
            .returningResult(HOME_USER.ID)
            .fetchOne()!!
            .formatJSON(jsonFormat)
    }

    @PostMapping("/inventory", produces = ["application/json"])
    fun addInventoryItem(@RequestBody inventoryItemDto: CreateInventoryItemDto): String {
        return dsl.insertInto(INVENTORY_ITEM)
            .set(dsl.newRecord(INVENTORY_ITEM, inventoryItemDto))
            .returningResult(INVENTORY_ITEM.ID)
            .fetchOne()!!
            .formatJSON(jsonFormat)
    }

    data class CreateHomeDto(val name: String)
    data class CreateUserDto(val email: String)
    data class CreateInventoryItemDto(val homeId: Int, val createdByUserId: Int, val name: String, val description: String)
}