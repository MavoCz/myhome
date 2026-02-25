package net.voldrich.myhome.backend.auth.internal.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import net.voldrich.myhome.backend.auth.FamilyRole;

public record InviteFamilyMemberRequest(
        @NotBlank @Email String email,
        @NotNull FamilyRole role
) {}
