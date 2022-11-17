package net.voldrich.myhome.server.api

import io.swagger.v3.oas.annotations.tags.Tag
import net.voldrich.myhome.server.repository.ItemRepository
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime

@Tag(name = "Item")
@RestController
@RequestMapping("/api/item", produces = ["application/json"])
class ItemController(val itemRepository: ItemRepository) {

    @GetMapping("{id}")
    fun getById(@PathVariable("id") id: Long) = itemRepository
        .getById(id)
        .into(ItemDto::class.java)

    @GetMapping
    fun getAll(): List<ItemDto> = itemRepository
        .getAll()
        .into(ItemDto::class.java)

    @PostMapping
    fun add(@RequestBody itemDto: CreateItemDto) = itemRepository
        .insert(itemDto) { it.createdByUserId = 1 }

    @PutMapping("/{id}")
    fun update(@PathVariable("id") id: Long, @RequestBody itemDto: CreateItemDto) {
        itemRepository.update(id, itemDto) {
            it.updatedOn = LocalDateTime.now()
        }
    }

    @DeleteMapping("/{id}")
    fun delete(@PathVariable("id") id: Long) {
        itemRepository.delete(id)
    }
}

enum class ItemState {
    STORED,
    IN_USE,
    IN_REPAIR,
    SOLD,
    BORROWED
}

data class ItemDto(
    val id: Long,
    val homeId: Long,
    val categoryId: Long,
    val name: String,
    val description: String?,
    val purchasedDate: LocalDate?,
    val warrantyDuration: String?,
    val createdOn: Instant,
    val updatedOn: Instant,
    val createdByUserId: Long,
    val state: ItemState = ItemState.IN_USE,
)

data class CreateItemDto(
    val homeId: Long,
    val categoryId: Long,
    val name: String,
    val description: String?,
    val purchasedDate: LocalDate?,
    val warrantyDuration: String?,
    val state: ItemState
)