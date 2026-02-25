package net.voldrich.myhome.backend.auth.internal.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import net.voldrich.myhome.backend.auth.FamilyRole;
import net.voldrich.myhome.backend.auth.internal.security.AuthUserDetails;
import net.voldrich.myhome.backend.auth.internal.service.JwtTokenService;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenService jwtTokenService;

    public JwtAuthenticationFilter(JwtTokenService jwtTokenService) {
        this.jwtTokenService = jwtTokenService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7);
        var claims = jwtTokenService.validateAccessToken(token);
        if (claims == null) {
            filterChain.doFilter(request, response);
            return;
        }

        Long userId = claims.get("userId", Long.class);
        Long familyId = claims.get("familyId", Long.class);
        FamilyRole familyRole = FamilyRole.valueOf(claims.get("familyRole", String.class));
        String email = claims.getSubject();
        String displayName = claims.get("displayName", String.class);

        var userDetails = new AuthUserDetails(userId, email, "", displayName, familyId, familyRole, true);
        var authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }
}
