package com.quickstay.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

/**
 * Guards the test infrastructure itself: database tests must really run against a dedicated
 * test database (never a developer's real data), and must fail loudly, not skip, when no
 * database is available.
 */
@SpringBootTest
@ActiveProfiles("test")
class PostgresTestBaseTest extends PostgresTestBase {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void connectsToADedicatedTestDatabase() {
        String databaseName = jdbcTemplate.queryForObject("select current_database()", String.class);

        assertThat(databaseName).containsIgnoringCase("test");
    }

    @Test
    void flywayHasMigratedTheSchema() {
        Integer appliedMigrations = jdbcTemplate.queryForObject(
                "select count(*) from flyway_schema_history where success", Integer.class);

        assertThat(appliedMigrations).isGreaterThanOrEqualTo(1);
    }
}
