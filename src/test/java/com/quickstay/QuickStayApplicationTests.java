package com.quickstay;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import com.quickstay.Testcontainers.PostgresTestBase;

@SpringBootTest
@ActiveProfiles("test")
class QuickStayApplicationTests extends PostgresTestBase {

	@Test
	void contextLoads() {
	}

}
