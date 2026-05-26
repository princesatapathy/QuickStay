package com.quickstay.Dto;

import com.quickstay.Entities.HotelContactInfo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class HotelDTO {
    private Long id;

    @NotBlank
    @Size(max = 150)
    private String name;

    @NotBlank
    @Size(max = 100)
    private String city;

    private String[] photos;
    private String[] amenities;
    private HotelContactInfo contactInfo;
    private Boolean active;
}
