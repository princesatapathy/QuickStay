package com.quickstay.Integration;

import com.quickstay.Entities.UserEntity;
import com.quickstay.Enums.Role;
import com.quickstay.Repositories.UserRepository;
import com.quickstay.Testcontainers.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class UserRepositoryIT extends PostgresTestBase {

    @Autowired private UserRepository userRepository;

    @Test
    void can_persist_user_with_roles_and_query_by_email() {
        UserEntity user = new UserEntity();
        user.setEmail("user@example.com");
        user.setPassword("hashed");
        user.setRoles(Set.of(Role.GUEST));

        userRepository.saveAndFlush(user);

        assertThat(userRepository.findByEmail("user@example.com"))
                .isPresent()
                .get()
                .extracting(UserEntity::getEmail)
                .isEqualTo("user@example.com");
    }
}

