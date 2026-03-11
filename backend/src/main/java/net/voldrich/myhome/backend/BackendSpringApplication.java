package net.voldrich.myhome.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendSpringApplication {

	static void main(String[] args) {
		System.setProperty("org.jooq.no-logo", "true");
		System.setProperty("org.jooq.no-tips", "true");
		SpringApplication.run(BackendSpringApplication.class, args);
	}

}
