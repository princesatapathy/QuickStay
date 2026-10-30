package com.quickstay.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.Test;

class TestDatabaseSelectorTest {

    private static final Map<String, String> NO_ENV = Map.of();
    private static final Map<String, String> EXTERNAL_ENV =
            Map.of("TEST_DATABASE_URL", "jdbc:postgresql://localhost:5432/quickstay_test");

    @Test
    void usesTheExternalTestDatabaseWhenConfigured() {
        assertThat(TestDatabaseSelector.choose(EXTERNAL_ENV, true))
                .isEqualTo(TestDatabaseSelector.Source.EXTERNAL);
    }

    @Test
    void usesAContainerWhenNothingIsConfiguredAndDockerIsAvailable() {
        assertThat(TestDatabaseSelector.choose(NO_ENV, true))
                .isEqualTo(TestDatabaseSelector.Source.CONTAINER);
    }

    @Test
    void failsLoudlyInsteadOfSkippingWhenNoDatabaseIsAvailable() {
        assertThatThrownBy(() -> TestDatabaseSelector.choose(NO_ENV, false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("TEST_DATABASE_URL")
                .hasMessageContaining("Docker");
    }

    @Test
    void treatsABlankUrlAsNotConfigured() {
        assertThatThrownBy(() -> TestDatabaseSelector.choose(Map.of("TEST_DATABASE_URL", "  "), false))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void refusesADatabaseThatDoesNotLookLikeATestDatabase() {
        assertThatThrownBy(() ->
                TestDatabaseSelector.requireDedicatedTestDatabase("jdbc:postgresql://localhost:5432/airbnb"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("airbnb");
    }

    @Test
    void acceptsADedicatedTestDatabaseWithOrWithoutQueryParameters() {
        assertThatCode(() -> {
            TestDatabaseSelector.requireDedicatedTestDatabase("jdbc:postgresql://localhost:5432/quickstay_test");
            TestDatabaseSelector.requireDedicatedTestDatabase("jdbc:postgresql://db:5432/ci_test?sslmode=disable");
        }).doesNotThrowAnyException();
    }
}
