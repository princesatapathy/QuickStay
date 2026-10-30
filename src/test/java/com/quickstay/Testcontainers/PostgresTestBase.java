package com.quickstay.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Map;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base class for tests that need a real Postgres. Uses the database in TEST_DATABASE_URL when set
 * (its schema is wiped first), otherwise a Testcontainers container, and fails the run when
 * neither is available. It never skips silently.
 */
public abstract class PostgresTestBase {

    private record Target(String url, String username, String password) {
    }

    private static final Target TARGET = startTarget();

    private static Target startTarget() {
        Map<String, String> environment = System.getenv();
        boolean externalConfigured = !environment.getOrDefault("TEST_DATABASE_URL", "").isBlank();
        boolean dockerAvailable = externalConfigured || DockerClientFactory.instance().isDockerAvailable();

        if (TestDatabaseSelector.choose(environment, dockerAvailable) == TestDatabaseSelector.Source.EXTERNAL) {
            String url = environment.get("TEST_DATABASE_URL");
            String username = environment.getOrDefault("TEST_DATABASE_USER", "postgres");
            String password = environment.getOrDefault("TEST_DATABASE_PASSWORD", "");
            TestDatabaseSelector.requireDedicatedTestDatabase(url);
            wipeSchema(url, username, password);
            return new Target(url, username, password);
        }

        PostgreSQLContainer<?> container = new PostgreSQLContainer<>("postgres:16-alpine")
                .withDatabaseName("quickstay_test")
                .withUsername("test")
                .withPassword("test");
        container.start(); // stopped by Testcontainers' Ryuk when the JVM exits
        return new Target(container.getJdbcUrl(), container.getUsername(), container.getPassword());
    }

    private static void wipeSchema(String url, String username, String password) {
        try (Connection connection = DriverManager.getConnection(url, username, password);
             Statement statement = connection.createStatement()) {
            statement.execute("drop schema public cascade");
            statement.execute("create schema public");
        } catch (SQLException e) {
            throw new IllegalStateException("Could not reset the test database schema: " + e.getMessage(), e);
        }
    }

    @DynamicPropertySource
    static void registerProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", TARGET::url);
        registry.add("spring.datasource.username", TARGET::username);
        registry.add("spring.datasource.password", TARGET::password);
    }
}
