package net.voldrich.template.jooq;

import org.flywaydb.core.Flyway;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.jooq.meta.postgres.PostgresDatabase;
import org.testcontainers.containers.PostgreSQLContainer;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * jOOQ Database implementation that starts a PostgreSQL Testcontainer,
 * runs Flyway migrations, and generates code from the resulting schema.
 * <p>
 * Configured via jOOQ database properties:
 * <ul>
 *     <li>{@code containerImage} - PostgreSQL Docker image (default: {@code postgres:17})</li>
 *     <li>{@code flywayLocations} - Flyway migration locations (default: {@code filesystem:src/main/resources/db/migration})</li>
 * </ul>
 */
public class FlywayTestcontainersDatabase extends PostgresDatabase {

    private PostgreSQLContainer<?> container;
    private Connection connection;

    @Override
    protected DSLContext create0() {
        if (connection != null) {
            return DSL.using(connection);
        }

        String containerImage = getProperties().getProperty("containerImage", "postgres:18");
        String flywayLocations = getProperties().getProperty("flywayLocations",
                "filesystem:src/main/resources/db/migration");

        container = new PostgreSQLContainer<>(containerImage);
        container.start();

        Flyway.configure()
                .dataSource(container.getJdbcUrl(), container.getUsername(), container.getPassword())
                .locations(flywayLocations)
                .load()
                .migrate();

        try {
            connection = DriverManager.getConnection(
                    container.getJdbcUrl(), container.getUsername(), container.getPassword());
        } catch (SQLException e) {
            container.stop();
            throw new RuntimeException("Failed to connect to Testcontainer PostgreSQL", e);
        }

        // setConnection triggers create() -> create0(), but the guard clause
        // at the top prevents recursion since connection is already set
        setConnection(connection);

        return DSL.using(connection);
    }

    @Override
    public void close() {
        super.close();

        if (connection != null) {
            try {
                connection.close();
            } catch (SQLException ignore) {
            }
        }

        if (container != null) {
            container.stop();
        }
    }
}
