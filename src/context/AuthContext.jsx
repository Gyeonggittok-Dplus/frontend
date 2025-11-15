import { createContext, useCallback, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [needsSurvey, setNeedsSurvey] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");
    const storedUser = localStorage.getItem("user");
    const storedSurvey = localStorage.getItem("needs_survey");
    if (storedToken) {
      setToken(storedToken);
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.warn("Failed to parse stored user", e);
      }
    }
    if (storedSurvey) {
      setNeedsSurvey(storedSurvey === "true");
    }
  }, []);

  const login = useCallback((newToken, userInfo, requiresSurvey = false) => {
    setToken(newToken);
    setUser(userInfo);
    setNeedsSurvey(requiresSurvey);
    localStorage.setItem("access_token", newToken);
    localStorage.setItem("user", JSON.stringify(userInfo));
    localStorage.setItem("needs_survey", String(requiresSurvey));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setNeedsSurvey(false);
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("needs_survey");
  }, []);

  const completeSurvey = useCallback((profile = {}) => {
    setNeedsSurvey(false);
    setUser((prev) => {
      const nextUser = prev ? { ...prev, ...profile } : { ...profile };
      localStorage.setItem("user", JSON.stringify(nextUser));
      return nextUser;
    });
    localStorage.setItem("needs_survey", "false");
  }, []);

  const updateUserProfile = useCallback((profile = {}) => {
    setUser((prev) => {
      const nextUser = prev ? { ...prev, ...profile } : { ...profile };
      localStorage.setItem("user", JSON.stringify(nextUser));
      return nextUser;
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
