package com.quickstay.Service;

import com.quickstay.Dto.*;
import com.quickstay.Entities.HotelEntity;
import com.quickstay.Entities.InventoryEntity;
import com.quickstay.Entities.RoomEntity;
import com.quickstay.Entities.UserEntity;
import com.quickstay.Exceptions.ResourceNotFoundException;
import com.quickstay.Repositories.InventoryRepository;
import com.quickstay.Repositories.RoomRepository;
import com.quickstay.Service.Interfaces.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.quickstay.Utils.AppUtils.getCurrentUser;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;
    private final ModelMapper modelMapper;
    private final RoomRepository roomRepository;

    @Override
    public void initializeRoomForAYear(RoomEntity room) {
        LocalDate today = LocalDate.now();
        LocalDate endDate = today.plusYears(1);
        for (; !today.isAfter(endDate); today=today.plusDays(1)) {
            InventoryEntity inventory = InventoryEntity.builder()
                    .hotel(room.getHotel())
                    .room(room)
                    .bookCount(0)
                    .reservedCount(0)
                    .city(room.getHotel().getCity())
                    .date(today)
                    .price(room.getBasePrice())
                    .surgeFactor(BigDecimal.ONE)
                    .totalCount(room.getTotalCount())
                    .closed(false)
                    .build();
            inventoryRepository.save(inventory);
        }
    }

    @Override
    public void deleteAllInventories(RoomEntity room) {
        log.info("Deleting the inventories of room with id: {}", room.getId());
        inventoryRepository.deleteByRoom(room);
    }

    @Override
    public Page<HotelPriceDTO> searchHotels(HotelSearchRequest hotelSearchRequest) {
        log.info("Searching hotels for {} city, from {} to {}", hotelSearchRequest.getCity(), hotelSearchRequest.getStartDate(), hotelSearchRequest.getEndDate());
        Pageable pageable = PageRequest.of(hotelSearchRequest.getPage(), hotelSearchRequest.getSize());
        long dateCount =
                ChronoUnit.DAYS.between(hotelSearchRequest.getStartDate(), hotelSearchRequest.getEndDate()) + 1;

        List<InventoryEntity> availableInventory = inventoryRepository.findAvailableInventoryForSearch(
                hotelSearchRequest.getCity(), hotelSearchRequest.getStartDate(),
                hotelSearchRequest.getEndDate(), hotelSearchRequest.getRoomsCount());

        List<HotelPriceDTO> hotelPrices = availableInventory.stream()
                .collect(Collectors.groupingBy(inventory -> inventory.getRoom().getId()))
                .values()
                .stream()
                .filter(roomInventory -> roomInventory.size() == dateCount)
                .map(roomInventory -> {
                    HotelEntity hotel = roomInventory.get(0).getHotel();
                    double averagePrice = roomInventory.stream()
                            .map(InventoryEntity::getPrice)
                            .mapToDouble(BigDecimal::doubleValue)
                            .average()
                            .orElse(0);
                    return new HotelPriceDTO(hotel, averagePrice);
                })
                .collect(Collectors.toMap(
                        hotelPrice -> hotelPrice.getHotel().getId(),
                        Function.identity(),
                        (left, right) -> left.getPrice() <= right.getPrice() ? left : right,
                        LinkedHashMap::new))
                .values()
                .stream()
                .sorted(Comparator.comparingDouble(HotelPriceDTO::getPrice))
                .toList();

        int start = Math.toIntExact(pageable.getOffset());
        int end = Math.min(start + pageable.getPageSize(), hotelPrices.size());
        List<HotelPriceDTO> content = start >= hotelPrices.size() ? List.of() : hotelPrices.subList(start, end);
        return new PageImpl<>(content, pageable, hotelPrices.size());
    }

    @Override
    public List<InventoryDTO> getAllInventoryByRoom(Long roomId) {
        log.info("Getting All inventory by room for room with id: {}", roomId);
        RoomEntity room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: "+roomId));

        UserEntity user = getCurrentUser();
        if(!user.equals(room.getHotel().getOwner())) throw new AccessDeniedException("You are not the owner of room with id: "+roomId);

        return inventoryRepository.findByRoomOrderByDate(room).stream()
                .map((element) -> modelMapper.map(element,
                        InventoryDTO.class))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void updateInventory(Long roomId, UpdateInventoryRequestDTO updateInventoryRequestDto) {
        log.info("Updating All inventory by room for room with id: {} between date range: {} - {}", roomId,
                updateInventoryRequestDto.getStartDate(), updateInventoryRequestDto.getEndDate());

        RoomEntity room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with id: "+roomId));

        UserEntity user = getCurrentUser();
        if(!user.equals(room.getHotel().getOwner())) throw new AccessDeniedException("You are not the owner of room with id: "+roomId);

        inventoryRepository.getInventoryAndLockBeforeUpdate(roomId, updateInventoryRequestDto.getStartDate(),
                updateInventoryRequestDto.getEndDate());

        inventoryRepository.updateInventory(roomId, updateInventoryRequestDto.getStartDate(),
                updateInventoryRequestDto.getEndDate(), updateInventoryRequestDto.getClosed(),
                updateInventoryRequestDto.getSurgeFactor());
    }

}
