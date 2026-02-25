package net.voldrich.myhome.backend.auth.internal.service;

import net.voldrich.myhome.backend.auth.FamilyRole;
import net.voldrich.myhome.backend.auth.internal.repository.FamilyMemberRepository;
import net.voldrich.myhome.backend.auth.internal.repository.UserRepository;
import net.voldrich.myhome.backend.auth.internal.security.AuthUserDetails;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final FamilyMemberRepository familyMemberRepository;

    public CustomUserDetailsService(UserRepository userRepository, FamilyMemberRepository familyMemberRepository) {
        this.userRepository = userRepository;
        this.familyMemberRepository = familyMemberRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        Long userId = user.getId();
        Long familyId = null;
        FamilyRole familyRole = null;

        var familyMember = familyMemberRepository.findFirstByUserId(userId);
        if (familyMember.isPresent()) {
            familyId = familyMember.get().getFamilyId();
            familyRole = FamilyRole.valueOf(familyMember.get().getRole());
        }

        return new AuthUserDetails(
                userId,
                user.getEmail(),
                user.getPasswordHash(),
                user.getDisplayName(),
                familyId,
                familyRole,
                user.getEnabled()
        );
    }
}
