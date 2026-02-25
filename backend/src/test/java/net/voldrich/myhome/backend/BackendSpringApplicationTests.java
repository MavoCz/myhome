package net.voldrich.myhome.backend;

import com.tngtech.archunit.core.domain.JavaClass;
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;


class BackendSpringApplicationTests {

	@Test
	void verifyModules() {
		ApplicationModules.of(
				BackendSpringApplication.class,
				JavaClass.Predicates.resideInAPackage(
						"net.voldrich.myhome.backend.jooq..")
		).verify();
	}

}
