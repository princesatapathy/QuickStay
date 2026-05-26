package com.quickstay.Dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ManagerSignUpRequestDTO extends SignUpRequestDTO {
    @NotBlank
    private String managerCode;
}
