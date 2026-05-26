package com.quickstay.Dto;

import com.quickstay.Enums.Gender;
import com.quickstay.Enums.Role;
import lombok.Data;

import java.time.LocalDate;
import java.util.Set;

@Data
public class UserDTO {
    private Long id;
    private String email;
    private String name;
    private Gender gender;
    private LocalDate dateOfBirth;
    private Set<Role> roles;
}
