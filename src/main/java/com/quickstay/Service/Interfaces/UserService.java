package com.quickstay.Service.Interfaces;

import com.quickstay.Dto.ProfileUpdateRequestDTO;
import com.quickstay.Dto.UserDTO;
import com.quickstay.Entities.UserEntity;

public interface UserService {
    UserEntity getUserById(Long id);

    void updateProfile(ProfileUpdateRequestDTO profileUpdateRequestDto);

    UserDTO getMyProfile();
}
