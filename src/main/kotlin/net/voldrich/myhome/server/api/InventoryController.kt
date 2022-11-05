package net.voldrich.myhome.server.api

import io.swagger.v3.oas.annotations.tags.Tag
import net.voldrich.myhome.jooq.tables.references.INVENTORY_ITEM
import org.jooq.DSLContext
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.time.LocalDate

@Tag(name = "Inventory")
@RestController
@RequestMapping("/api/inventory", produces = ["application/json"])
class InventoryController(val dsl: DSLContext) {

    @GetMapping("{id}")
    fun getItemsById(@PathVariable("id") id: Long) = dsl
        .selectFrom(INVENTORY_ITEM)
        .where(INVENTORY_ITEM.ID.eq(id))
        .fetchOneOrThrow(InventoryItemDto::class)

    @GetMapping
    fun getInventoryItems() = dsl
        .selectFrom(INVENTORY_ITEM)
            .fetchList(InventoryItemDto::class)

    @PostMapping
    fun addInventoryItem(@RequestBody inventoryItemDto: CreateInventoryItemDto) : IdResponseDto {
        val newRecord = dsl.newRecord(INVENTORY_ITEM, inventoryItemDto)
        newRecord.set(INVENTORY_ITEM.CREATED_BY_USER_ID, 1)
        return dsl.insertInto(INVENTORY_ITEM)
            .set(newRecord)
            .returningResult(INVENTORY_ITEM.ID)
            .fetchIdDto()
    }

    @PutMapping("{id}")
    fun updateItem(@PathVariable("id") id: Long,
                   @RequestBody inventoryItemDto: CreateInventoryItemDto) {
        val updatedRecord = dsl.newRecord(INVENTORY_ITEM, inventoryItemDto)
        dsl.update(INVENTORY_ITEM)
            .set(updatedRecord)
            .where(INVENTORY_ITEM.ID.eq(id))
    }

    /*inline fun <reified T : Any> ResultQuery<*>.fetchOneOrThrowIn(): T {
        return this.fetchOneInto(T::class.java)
            ?: throw NotFoundException()
    }*/
}

enum class ItemState {
    WISHLIST,
    STORED,
    IN_USE,
    IN_REPAIR,
    SOLD,
    BORROWED
}

enum class ItemCondition {
    NEW,
    LIKE_NEW,
    USED,
    REFURBISHED,
    BROKEN,
    DESTROYED
}

data class InventoryItemDto(
    val id: Long,
    val homeId: Long,
    val name: String,
    val description: String?,
    val purchasedDate: LocalDate?,
    val warrantyDuration: String?,
    val createdOn: Instant,
    val updatedOn: Instant,
    val createdByUserId: Long,
    val state: ItemState = ItemState.IN_USE,
    val condition: ItemCondition = ItemCondition.NEW
)

data class InventoryItemEventDto(
    val id: Long,
    val itemId: Long,
    val homeId: Long,
    val userId: Long,
    val eventName: String,
    val occurredOn: Instant,
    val state: ItemState,
    val condition: ItemCondition
)

data class CreateInventoryItemDto(
    val homeId: Long,
    val name: String,
    val description: String?,
    val purchasedDate: LocalDate?,
    val warrantyDuration: String?,
    val state: ItemState,
    val condition: ItemCondition
)