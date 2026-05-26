package com.quickstay.Controller;

import com.quickstay.Dto.HotelDTO;
import com.quickstay.Dto.HotelInfoDto;
import com.quickstay.Dto.HotelPriceDTO;
import com.quickstay.Dto.HotelSearchRequest;
import com.quickstay.Service.Interfaces.HotelService;
import com.quickstay.Service.Interfaces.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/hotels")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Hotel Browse", description = "Browse and search for hotels")
@Validated
public class HotelBrowseController {

    private final InventoryService inventoryService;
    private final HotelService hotelService;

    @GetMapping("/search")
    @Operation(summary = "Search for hotels", description = "Filter hotels based on location, price, availability, etc.")
    public ResponseEntity<Page<HotelPriceDTO>> searchHotels(
            @NotBlank @RequestParam String city,
            @RequestParam(defaultValue = "") String checkIn,
            @RequestParam(defaultValue = "") String checkOut,
            @Min(1) @RequestParam(defaultValue = "1") Integer roomsCount,
            @Min(0) @RequestParam(defaultValue = "0") Integer page,
            @Min(1) @Max(100) @RequestParam(defaultValue = "10") Integer size) {

        HotelSearchRequest hotelSearchRequest = new HotelSearchRequest();
        hotelSearchRequest.setCity(city);
        hotelSearchRequest.setStartDate(checkIn.isBlank() ? LocalDate.now().plusDays(1)
                : LocalDate.parse(checkIn));
        hotelSearchRequest.setEndDate(checkOut.isBlank() ? LocalDate.now().plusDays(3)
                : LocalDate.parse(checkOut));
        hotelSearchRequest.setRoomsCount(roomsCount);
        hotelSearchRequest.setPage(page);
        hotelSearchRequest.setSize(size);

        if (hotelSearchRequest.getEndDate().isBefore(hotelSearchRequest.getStartDate())) {
            throw new IllegalArgumentException("checkOut must be on or after checkIn");
        }

        Page<HotelPriceDTO> result = inventoryService.searchHotels(hotelSearchRequest);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{hotelId}/info")
    @Operation(summary = "Get detailed hotel information", description = "Retrieve information about a specific hotel")
    public ResponseEntity<HotelInfoDto> getHotelInfo(@PathVariable Long hotelId) {
        return ResponseEntity.ok(hotelService.getHotelInfoById(hotelId));
    }
}
