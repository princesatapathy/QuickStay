package com.quickstay.Testcontainers;

import java.net.URI;
import java.util.Map;

/**
 * Decides which Postgres the database tests use, without ever silently skipping them:
 * an explicitly configured test database wins, otherwise a Testcontainers container,
 * otherwise the run fails with instructions.
 */
public final class TestDatabaseSelector {

    public enum Source { EXTERNAL, CONTAINER }

    private TestDatabaseSelector() {
    }

    public static Source choose(Map<String, String> environment, boolean dockerAvailable) {
        String externalUrl = environment.get("TEST_DATABASE_URL");
        if (externalUrl != null && !externalUrl.isBlank()) {
            return Source.EXTERNAL;
        }
        if (dockerAvailable) {
            return Source.CONTAINER;
        }
        throw new IllegalStateException(
                "No test database available. Start Docker (Testcontainers), or set TEST_DATABASE_URL "
                        + "(plus TEST_DATABASE_USER and TEST_DATABASE_PASSWORD) to a dedicated database "
                        + "whose name contains 'test'.");
    }

    /** The external database's schema is wiped before each run, so it must be clearly a test database. */
    public static void requireDedicatedTestDatabase(String jdbcUrl) {
        String databaseName = databaseName(jdbcUrl);
        if (!databaseName.toLowerCase().contains("test")) {
            throw new IllegalArgumentException("Refusing to run tests against database '" + databaseName
                    + "': its name must contain 'test' because its schema is wiped before each run.");
        }
    }

    static String databaseName(String jdbcUrl) {
        String path = URI.create(jdbcUrl.replaceFirst("^jdbc:", "")).getPath();
        return path == null ? "" : path.replaceFirst("^/", "");
    }
}
