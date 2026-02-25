package net.voldrich.myhome.backend.auth.internal.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import net.voldrich.myhome.backend.auth.FamilyRole;

public record AddFamilyMemberRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8) String password,
        @NotBlank String displayName,
        @NotNull FamilyRole role
) {}
