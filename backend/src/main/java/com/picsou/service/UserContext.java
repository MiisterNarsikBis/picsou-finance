package com.picsou.service;

import com.picsou.model.AppUser;
import com.picsou.model.FamilyMember;
import com.picsou.model.UserRole;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Request-scoped helper to access the current authenticated user and their family member.
 * Admins can override the memberId via query param to act on behalf of a managed profile.
 */
@Component
public class UserContext {

    public AppUser currentUser() {
        return (AppUser) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    public FamilyMember currentMember() {
        return currentUser().getMember();
    }

    public Long currentMemberId() {
        Long override = getMemberIdOverride();
        return override != null ? override : currentMember().getId();
    }

    public boolean isAdmin() {
        return currentUser().getRole() == UserRole.ADMIN;
    }

    /**
     * If the current user is an admin and a memberId query param is present, return it.
     * Otherwise return null (use own member).
     */
    private Long getMemberIdOverride() {
        if (!isAdmin()) return null;
        ServletRequestAttributes attrs =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) return null;
        HttpServletRequest request = attrs.getRequest();
        String param = request.getParameter("memberId");
        if (param == null || param.isBlank()) return null;
        try {
            return Long.parseLong(param);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
