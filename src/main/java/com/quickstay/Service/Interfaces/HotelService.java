package com.quickstay.Service.Interfaces;

import com.quickstay.Dto.HotelDTO;
import com.quickstay.Dto.HotelInfoDto;

import java.util.List;

public interface HotelService {
    HotelDTO createNewHotel(HotelDTO hotelDto);
    HotelDTO getHotelById(Long id);
    HotelDTO updateHotelById(Long id, HotelDTO hotelDto);
    void deleteHotelById(Long id);
    void activateHotel(Long hotelId);
    HotelInfoDto getHotelInfoById(Long hotelId);
    List<HotelDTO> getAllHotels();
}
