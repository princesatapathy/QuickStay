package com.quickstay.Dto;

import com.quickstay.Enums.Gender;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ProfileUpdateRequestDTO {
    @Size(max = 100)
    private String name;

    @Past
    private LocalDate dateOfBirth;

    private Gender gender;
}
