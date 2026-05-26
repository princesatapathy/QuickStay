package com.quickstay.Repositories;

import com.quickstay.Dto.GuestDTO;
import com.quickstay.Entities.GuestEntity;
import com.quickstay.Entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GuestRepository extends JpaRepository<GuestEntity, Long> {
    List<GuestDTO> findByUser(UserEntity user);
}