package net.voldrich.myhome.server

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.transaction.annotation.EnableTransactionManagement


@SpringBootApplication
@EnableTransactionManagement
class ServerApplication {

}

fun main(args: Array<String>) {
	runApplication<ServerApplication>(*args)
}


