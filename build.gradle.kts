import org.jetbrains.kotlin.gradle.tasks.KotlinCompile
import nu.studer.gradle.jooq.JooqEdition
import org.jooq.meta.jaxb.Logging
import org.jooq.meta.jaxb.Property
import org.jooq.meta.jaxb.ForcedType

plugins {
	id("java")
	id("org.springframework.boot") version "2.7.4"
	id("io.spring.dependency-management") version "1.0.14.RELEASE"
	id("nu.studer.jooq") version "7.1.1"
	kotlin("jvm") version "1.7.20"
	kotlin("plugin.spring") version "1.7.20"
}

group = "net.voldrich.myhome"
version = "0.0.1-SNAPSHOT"
java.sourceCompatibility = JavaVersion.VERSION_17

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-graphql")
	implementation("org.springframework.boot:spring-boot-starter-jooq")
	implementation("org.springframework.boot:spring-boot-starter-web")
	implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
	implementation("org.jetbrains.kotlin:kotlin-reflect")
	implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
	implementation("org.springdoc:springdoc-openapi-webmvc-core:1.6.12")
	implementation("org.springdoc:springdoc-openapi-kotlin:1.6.12")
	implementation("org.jooq:jooq-kotlin:3.17.4")

	developmentOnly("org.springframework.boot:spring-boot-devtools")

	runtimeOnly("org.postgresql:postgresql")

	jooqGenerator("org.postgresql:postgresql:42.5.0")
	jooqGenerator("jakarta.xml.bind:jakarta.xml.bind-api:4.0.0")

	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testImplementation("org.springframework:spring-webflux")
	testImplementation("org.springframework.graphql:spring-graphql-test")
}

tasks.withType<KotlinCompile> {
	kotlinOptions {
		freeCompilerArgs = listOf("-Xjsr305=strict")
		jvmTarget = "17"
	}
}

tasks.withType<Test> {
	useJUnitPlatform()
}

//kotlin.sourceSets.create("src/generated/jooq")

jooq {
	version.set("3.16.7")
	edition.set(JooqEdition.OSS)

	configurations {
		create("main") {
			jooqConfiguration.apply {
				logging = Logging.WARN
				jdbc.apply {
					driver = "org.postgresql.Driver"
					url = "jdbc:postgresql://localhost:5432/postgres"
					user = "postgres"
					password = ""
					properties = listOf(
						Property().apply {
							key = "PAGE_SIZE"
							value = "2048"
						}
					)
				}
				generator.apply {
					name = "org.jooq.codegen.KotlinGenerator"
					database.apply {
						name = "org.jooq.meta.postgres.PostgresDatabase"
						inputSchema = "public"
						forcedTypes = listOf(
							ForcedType().apply {
								name = "varchar"
								includeExpression = ".*"
								includeTypes = "JSONB?"
							},
							ForcedType().apply {
								isEnumConverter = true
								userType = "net.voldrich.myhome.server.api.ItemState"
								includeExpression = ".*item.state"
								includeTypes = ".*"
							}
						)
					}
					generate.apply {
						isDeprecated = false
						isRecords = true
						isImmutablePojos = false
						isFluentSetters = true
						//withPojos(true)
						//withDaos(true)
						//withSerializablePojos(false)
						withSequences(true)
					}
					target.apply {
						packageName = "net.voldrich.myhome.jooq"
						directory = "src/generated/jooq"
					}
					strategy.name = "org.jooq.codegen.DefaultGeneratorStrategy"
				}
			}
		}
	}
}
