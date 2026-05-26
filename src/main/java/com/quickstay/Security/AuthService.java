package com.quickstay.Security;

import com.quickstay.Dto.LoginDTO;
import com.quickstay.Dto.ManagerSignUpRequestDTO;
import com.quickstay.Dto.SignUpRequestDTO;
import com.quickstay.Dto.UserDTO;
import com.quickstay.Entities.UserEntity;
import com.quickstay.Enums.Role;
import com.quickstay.Exceptions.ResourceNotFoundException;
import com.quickstay.Repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final ModelMapper modelMapper;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JWTService jwtService;

    @Value("${app.manager.signup.code:}")
    private String managerSignupCode;

    public UserDTO signUp(SignUpRequestDTO signUpRequestDto) {
        return createUser(signUpRequestDto, Role.GUEST);
    }

    public UserDTO signUpManager(ManagerSignUpRequestDTO signUpRequestDto) {
        if (managerSignupCode == null || managerSignupCode.isBlank()) {
            throw new AuthenticationServiceException("Manager signup is disabled");
        }
        if (!managerSignupCode.equals(signUpRequestDto.getManagerCode())) {
            throw new AuthenticationServiceException("Invalid manager signup code");
        }
        return createUser(signUpRequestDto, Role.HOTEL_MANAGER);
    }

    private UserDTO createUser(SignUpRequestDTO signUpRequestDto, Role role) {
        UserEntity user = userRepository.findByEmail(signUpRequestDto.getEmail()).orElse(null);
        if (user != null) {
            throw new IllegalStateException("User is already present with same email id");
        }

        UserEntity newUser = modelMapper.map(signUpRequestDto, UserEntity.class);
        newUser.setRoles(Set.of(role));
        newUser.setPassword(passwordEncoder.encode(signUpRequestDto.getPassword()));
        newUser = userRepository.save(newUser);

        return modelMapper.map(newUser, UserDTO.class);
    }

    public String[] login(LoginDTO loginDto) {
        Authentication authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
                loginDto.getEmail(), loginDto.getPassword()
        ));

        UserEntity user = (UserEntity) authentication.getPrincipal();

        String[] arr = new String[2];
        arr[0] = jwtService.generateAccessToken(user);
        arr[1] = jwtService.generateRefreshToken(user);

        return arr;
    }

    public String refreshToken(String refreshToken) {
        Long id = jwtService.getUserIdFromToken(refreshToken);

        UserEntity user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found with id: "+id));
        return jwtService.generateAccessToken(user);
    }

}
