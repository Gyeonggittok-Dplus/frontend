import { createContext, useCallback, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // ─────────────────────────────────
  // 1) 초기값을 localStorage에서 바로 읽기 (새로고침해도 유지)
  // ─────────────────────────────────
  const [token, setToken] = useState(() => {
    return localStorage.getItem("access_token");
  });

  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser);
    } catch (e) {
      console.warn("Failed to parse stored user:", e);
      return null;
    }
  });

  const [needsSurvey, setNeedsSurvey] = useState(() => {
    const storedSurvey = localStorage.getItem("needs_survey");
    return storedSurvey === "true";
  });

  // ─────────────────────────────────
  // 2) 로그인: 토큰/유저/설문여부 저장 + localStorage 동기화
  // ─────────────────────────────────
  const login = useCallback((newToken, userInfo, requiresSurvey = false) => {
    setToken(newToken);
    setUser(userInfo);
    setNeedsSurvey(requiresSurvey);

    localStorage.setItem("access_token", newToken);
    localStorage.setItem("user", JSON.stringify(userInfo));
    localStorage.setItem("needs_survey", String(requiresSurvey));
  }, []);

  // ─────────────────────────────────
  // 3) 로그아웃: 상태/스토리지 모두 초기화
  // ─────────────────────────────────
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setNeedsSurvey(false);

    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("needs_survey");
  }, []);

  // ─────────────────────────────────
  // 4) 설문 완료 처리
  // ─────────────────────────────────
  const completeSurvey = useCallback(() => {
    setNeedsSurvey(false);
    localStorage.setItem("needs_survey", "false");
  }, []);

  // ─────────────────────────────────
  // 5) 프로필 일부 수정 (마이페이지에서 사용)
  // ─────────────────────────────────
  const updateUserProfile = useCallback((partialProfile) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partialProfile };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  }, []);

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    needsSurvey,
    login,
    logout,
    completeSurvey,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
