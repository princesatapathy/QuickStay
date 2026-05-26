package com.quickstay.Repositories;

import com.quickstay.Entities.HotelEntity;
import com.quickstay.Entities.HotelMinPriceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface HotelMinPriceRepository  extends JpaRepository<HotelMinPriceEntity, Long> {

    Optional<HotelMinPriceEntity> findByHotelAndDate(HotelEntity hotel, LocalDate date);
}
