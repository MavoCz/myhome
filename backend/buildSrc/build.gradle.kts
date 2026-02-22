plugins {
	`java-library`
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.jooq:jooq-meta:3.19.29")
	implementation("org.testcontainers:postgresql:1.21.4")
	implementation("org.flywaydb:flyway-core:11.3.4")
	implementation("org.flywaydb:flyway-database-postgresql:11.3.4")
	implementation("org.postgresql:postgresql:42.7.5")
}
