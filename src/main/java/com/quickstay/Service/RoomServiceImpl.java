package com.quickstay.Service;

import com.quickstay.Dto.RoomDTO;
import com.quickstay.Entities.HotelEntity;
import com.quickstay.Entities.RoomEntity;
import com.quickstay.Entities.UserEntity;
import com.quickstay.Exceptions.ResourceNotFoundException;
import com.quickstay.Exceptions.UnAuthorisedException;
import com.quickstay.Repositories.HotelRepository;
import com.quickstay.Repositories.RoomRepository;
import com.quickstay.Service.Interfaces.InventoryService;
import com.quickstay.Service.Interfaces.RoomService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

import static com.quickstay.Utils.AppUtils.getCurrentUser;

@Service
@RequiredArgsConstructor
@Slf4j
public class RoomServiceImpl implements RoomService {
    private final RoomRepository roomRepository;
    private final HotelRepository hotelRepository;
    private final InventoryService inventoryService;
    private final ModelMapper modelMapper;

    @Override
    public RoomDTO createNewRoom(Long hotelId, RoomDTO roomDto) {
        log.info("Creating a new room in hotel with ID: {}", hotelId);
        HotelEntity hotel = hotelRepository
                .findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found with ID: "+hotelId));

        UserEntity user = (UserEntity) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if(!user.equals(hotel.getOwner())) {
            throw new UnAuthorisedException("This user does not own this hotel with id: "+hotelId);
        }
        RoomEntity room = modelMapper.map(roomDto, RoomEntity.class);
        room.setHotel(hotel);
        if (room.getCapacity() == null) room.setCapacity(2); // default 2 guests per room
        room = roomRepository.save(room);

        if (hotel.getActive()) {
            inventoryService.initializeRoomForAYear(room);
        }

        return modelMapper.map(room, RoomDTO.class);
    }

    @Override
    public List<RoomDTO> getAllRoomsInHotel(Long hotelId) {
        log.info("Getting all rooms in hotel with ID: {}", hotelId);
        HotelEntity hotel = hotelRepository
                .findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found with ID: "+hotelId));

        UserEntity user = (UserEntity) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if(!user.equals(hotel.getOwner())) {
            throw new UnAuthorisedException("This user does not own this hotel with id: "+hotelId);
        }

        return hotel.getRooms()
                .stream()
                .map((element) -> modelMapper.map(element, RoomDTO.class))
                .collect(Collectors.toList());
    }

    @Override
    public RoomDTO getRoomById(Long roomId) {
        log.info("Getting the room with ID: {}", roomId);
        RoomEntity room = roomRepository
                .findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: "+roomId));
        return modelMapper.map(room, RoomDTO.class);
    }

    @Override
    @Transactional
    public void deleteRoomById(Long roomId) {
        log.info("Deleting the room with ID: {}", roomId);
        RoomEntity room = roomRepository
                .findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: "+roomId));

        UserEntity user = (UserEntity) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if(!user.equals(room.getHotel().getOwner())) {
            throw new UnAuthorisedException("This user does not own this room with id: "+roomId);
        }
        inventoryService.deleteAllInventories(room);
        roomRepository.deleteById(roomId);
    }

    @Override
    @Transactional
    public RoomDTO updateRoomById(Long hotelId, Long roomId, RoomDTO roomDto) {
        log.info("Updating the room with ID: {}", roomId);
        HotelEntity hotel = hotelRepository
                .findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found with ID: "+hotelId));

        UserEntity user = getCurrentUser();
        if(!user.equals(hotel.getOwner())) {
            throw new UnAuthorisedException("This user does not own this hotel with id: "+hotelId);
        }

        RoomEntity room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: "+roomId));

        // Preserve non-DTO fields before mapping overwrites them
        Integer existingCapacity = room.getCapacity();
        String[] existingPhotos  = room.getPhotos();

        modelMapper.map(roomDto, room);
        room.setId(roomId);

        // Restore fields not editable via this endpoint
        if (room.getCapacity() == null) room.setCapacity(existingCapacity);
        if (room.getPhotos()   == null) room.setPhotos(existingPhotos);

//        TODO: if price or inventory is updated, then update the inventory for this room
        room = roomRepository.save(room);

        return modelMapper.map(room, RoomDTO.class);
    }
}
