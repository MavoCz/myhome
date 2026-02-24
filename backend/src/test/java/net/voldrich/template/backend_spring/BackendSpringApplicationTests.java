package net.voldrich.template.backend_spring;

import com.tngtech.archunit.core.domain.JavaClass;
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;


class BackendSpringApplicationTests {

	@Test
	void verifyModules() {
		ApplicationModules.of(
				BackendSpringApplication.class,
				JavaClass.Predicates.resideInAPackage(
						"net.voldrich.template.backend_spring.jooq..")
		).verify();
	}

}
