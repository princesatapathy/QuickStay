package com.quickstay.Dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordDTO {
    @Email
    @NotBlank
    private String email;

    @Pattern(regexp = "[0-9]{6}", message = "must be the 6-digit code from the email")
    private String otp;

    @NotBlank
    @Size(min = 8, max = 100)
    private String newPassword;
}
