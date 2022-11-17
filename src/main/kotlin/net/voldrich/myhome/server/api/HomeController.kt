package net.voldrich.myhome.server.api

import io.swagger.v3.oas.annotations.tags.Tag
import net.voldrich.myhome.server.repository.HomeRepository
import org.springframework.web.bind.annotation.*

@Tag(name = "Home")
@RestController
@RequestMapping("/api/home", produces = ["application/json"])
class HomeController (val homeRepository: HomeRepository) {

    @GetMapping
    fun getHomes() = homeRepository.getAll().formatJSON(DB_RESULT_JSON_FORMAT)

    @PostMapping
    fun addHome(@RequestBody homeDto: CreateHomeDto) = homeRepository.insert(homeDto) { }
}

data class CreateHomeDto(val name: String)