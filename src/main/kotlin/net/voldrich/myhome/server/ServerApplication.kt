package net.voldrich.myhome.server

import org.jooq.DSLContext
import org.jooq.impl.DataSourceConnectionProvider
import org.jooq.impl.DefaultConfiguration
import org.jooq.impl.DefaultDSLContext
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.context.annotation.Bean
import org.springframework.jdbc.datasource.TransactionAwareDataSourceProxy
import org.springframework.transaction.annotation.EnableTransactionManagement
import javax.sql.DataSource


@SpringBootApplication
@EnableTransactionManagement
class ServerApplication {

	@Bean
	fun connectionProvider(dataSource: DataSource): DataSourceConnectionProvider {
		return DataSourceConnectionProvider(TransactionAwareDataSourceProxy(dataSource))
	}

	@Bean
	fun dsl(configuration: DefaultConfiguration): DSLContext {
		return DefaultDSLContext(configuration)
	}

	@Bean
	fun configuration(connectionProvider: DataSourceConnectionProvider): DefaultConfiguration {
		val jooqConfiguration = DefaultConfiguration()
		jooqConfiguration.set(connectionProvider)
		/*jooqConfiguration
			.set(DefaultExecuteListenerProvider(exceptionTransformer()))*/
		return jooqConfiguration
	}
}

fun main(args: Array<String>) {
	runApplication<ServerApplication>(*args)
}


