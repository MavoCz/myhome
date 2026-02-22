plugins {
	java
	id("org.springframework.boot") version "4.0.2"
	id("io.spring.dependency-management") version "1.1.7"
	id("org.jooq.jooq-codegen-gradle") version "3.19.29"
}

group = "net.voldrich.template"
version = "0.0.1-SNAPSHOT"
description = "Template for backend in Spring"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(25)
	}
}

repositories {
	mavenCentral()
}

extra["springModulithVersion"] = "2.0.2"

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.springframework.boot:spring-boot-starter-jdbc")
	implementation("org.springframework.boot:spring-boot-starter-jooq")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.springframework:spring-aspects")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("io.jsonwebtoken:jjwt-api:0.12.6")
	implementation("org.springframework.modulith:spring-modulith-starter-core")

	runtimeOnly("org.flywaydb:flyway-database-postgresql")
	runtimeOnly("org.postgresql:postgresql")
	runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
	runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
	runtimeOnly("org.springframework.modulith:spring-modulith-actuator")
	runtimeOnly("org.springframework.modulith:spring-modulith-observability")

	developmentOnly("org.springframework.boot:spring-boot-devtools")

	jooqCodegen(files("buildSrc/build/classes/java/main"))
	jooqCodegen("org.postgresql:postgresql")
	jooqCodegen("org.testcontainers:postgresql:1.21.4")
	jooqCodegen("org.flywaydb:flyway-core")
	jooqCodegen("org.flywaydb:flyway-database-postgresql")

	testImplementation("org.springframework.boot:spring-boot-starter-actuator-test")
	testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
	testImplementation("org.springframework.boot:spring-boot-starter-jdbc-test")
	testImplementation("org.springframework.boot:spring-boot-starter-jooq-test")
	testImplementation("org.springframework.boot:spring-boot-starter-security-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testImplementation("org.springframework.modulith:spring-modulith-starter-test")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

dependencyManagement {
	imports {
		mavenBom("org.springframework.modulith:spring-modulith-bom:${property("springModulithVersion")}")
	}
}

jooq {
	configuration {
		logging = org.jooq.meta.jaxb.Logging.WARN
		generator {
			database {
				name = "net.voldrich.template.jooq.FlywayTestcontainersDatabase"
				inputSchema = "public"
				excludes = "flyway_schema_history"
				properties = listOf(
					org.jooq.meta.jaxb.Property()
						.withKey("containerImage")
						.withValue("postgres:17"),
					org.jooq.meta.jaxb.Property()
						.withKey("flywayLocations")
						.withValue("filesystem:src/main/resources/db/migration")
				)
			}
			target {
				packageName = "net.voldrich.template.backend_spring.jooq"
				directory = "${project.layout.buildDirectory.get()}/generated-sources/jooq"
			}
		}
	}
}

tasks.named("jooqCodegen") {
	inputs.files(fileTree("src/main/resources/db/migration"))
		.withPropertyName("migrations")
		.withPathSensitivity(PathSensitivity.RELATIVE)
}

sourceSets {
	main {
		java {
			srcDir("${project.layout.buildDirectory.get()}/generated-sources/jooq")
		}
	}
}

tasks.withType<Test> {
	useJUnitPlatform()
}
