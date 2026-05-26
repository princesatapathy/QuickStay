package com.quickstay.Dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class BookingRequest {
    @NotNull
    private Long hotelId;

    @NotNull
    private Long roomId;

    @NotNull
    @FutureOrPresent
    private LocalDate checkInDate;

    @NotNull
    @FutureOrPresent
    private LocalDate checkOutDate;

    @NotNull
    @Min(1)
    private Integer roomsCount;

    @AssertTrue(message = "checkOutDate must be on or after checkInDate")
    public boolean isValidDateRange() {
        return checkInDate == null || checkOutDate == null || !checkOutDate.isBefore(checkInDate);
    }
}
