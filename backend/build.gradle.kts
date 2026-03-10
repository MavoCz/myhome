plugins {
	java
	id("org.springframework.boot") version "4.0.3"
	id("io.spring.dependency-management") version "1.1.7"
	id("org.jooq.jooq-codegen-gradle") version "3.19.30"
	id("org.springdoc.openapi-gradle-plugin") version "1.9.0"
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

extra["springModulithVersion"] = "2.0.3"

val jwtVersion = "0.12.6"
dependencies {
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.apache.commons:commons-csv:1.13.0")
	implementation("org.springframework.boot:spring-boot-starter-jdbc")
	implementation("org.springframework.boot:spring-boot-starter-jooq")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.springframework:spring-aspects")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.0.1")
	implementation("io.jsonwebtoken:jjwt-api:$jwtVersion")
	implementation("org.springframework.modulith:spring-modulith-starter-core")
	implementation("org.springframework.modulith:spring-modulith-starter-jdbc")

	runtimeOnly("org.flywaydb:flyway-database-postgresql")
	runtimeOnly("org.postgresql:postgresql")
	runtimeOnly("io.jsonwebtoken:jjwt-impl:$jwtVersion")
	runtimeOnly("io.jsonwebtoken:jjwt-jackson:$jwtVersion")
	runtimeOnly("org.springframework.modulith:spring-modulith-actuator")
	runtimeOnly("org.springframework.modulith:spring-modulith-observability")

	developmentOnly("org.springframework.boot:spring-boot-devtools")
	developmentOnly("org.springframework.boot:spring-boot-docker-compose")
	developmentOnly("org.apache.commons:commons-compress:1.27.1")

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
						.withValue("postgres:18"),
					org.jooq.meta.jaxb.Property()
						.withKey("flywayLocations")
						.withValue("filesystem:src/main/resources/db/migration")
				)
			}
			target {
				packageName = "net.voldrich.myhome.backend.jooq"
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

openApi {
	apiDocsUrl.set("http://localhost:8080/api-docs")
	outputDir.set(layout.buildDirectory.dir("docs"))
	outputFileName.set("openapi.json")
	customBootRun {
		args.set(listOf("--spring.docker.compose.file=${projectDir}/compose.yml"))
	}
}

