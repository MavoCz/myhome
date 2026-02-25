plugins {
	`java-library`
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.jooq:jooq-meta:3.19.30")
	implementation("org.testcontainers:postgresql:1.21.4")
	implementation("org.flywaydb:flyway-core:11.14.1")
	// this version below is needed, otherwise bootJar failed in backend project
	implementation("org.apache.commons:commons-compress:1.27.1")
	implementation("org.flywaydb:flyway-database-postgresql:11.14.1")
	implementation("org.postgresql:postgresql:42.7.10")
}
