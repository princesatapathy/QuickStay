package com.quickstay.Dto;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class RoomDTO {
    private Long id;

    @NotBlank
    private String type;

    @NotNull
    @DecimalMin("0.01")
    private BigDecimal basePrice;

    private String[] photos;
    private String[] amenities;

    @NotNull
    @Min(1)
    private Integer totalCount;

    @NotNull
    @Min(1)
    private Integer capacity;
}
