plugins {
	`java-library`
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.jooq:jooq-meta:3.20.11")
	implementation("org.testcontainers:postgresql:1.21.4")
	implementation("org.flywaydb:flyway-core:11.14.1")
	implementation("org.flywaydb:flyway-database-postgresql:11.14.1")
	implementation("org.postgresql:postgresql:42.7.10")

	// this version below is needed, otherwise bootJar failed in backend project
	implementation("org.apache.commons:commons-compress:1.27.1")
	// Force jackson-annotations 2.20 to match Jackson 3.0.x used by Spring Boot plugin
	implementation("com.fasterxml.jackson.core:jackson-annotations:2.20")
}
