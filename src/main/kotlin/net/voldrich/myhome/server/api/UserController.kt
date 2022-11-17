package net.voldrich.myhome.server.api

import io.swagger.v3.oas.annotations.tags.Tag
import net.voldrich.myhome.server.repository.UserRepository
import org.springframework.web.bind.annotation.*

@Tag(name = "User")
@RestController
@RequestMapping("/api/user", produces = ["application/json"])
class UserController(val userRepository: UserRepository) {

    @GetMapping
    fun getUsers() = userRepository.getAll()
        .formatJSON(DB_RESULT_JSON_FORMAT)

    @PostMapping
    fun addUser(@RequestBody userDto: CreateUserDto) = userRepository.insert(userDto) {}
}

data class CreateUserDto(val email: String, val name: String)