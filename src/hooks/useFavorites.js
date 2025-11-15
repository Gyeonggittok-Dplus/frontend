import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_PREFIX = "favorite_benefits";

const sanitizeBenefit = (benefit) => {
  if (!benefit || !benefit.id) {
    return null;
  }
  return {
    id: benefit.id,
    title: benefit.title ?? "복지 서비스",
    desc: benefit.desc ?? "",
    region: benefit.region ?? "",
    category: benefit.category ?? "",
    link: benefit.link ?? "",
  };
};

export function useFavorites(email) {
  const storageKey = useMemo(
    () => `${STORAGE_PREFIX}:${email || "guest"}`,
    [email]
  );
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavorites(Array.isArray(parsed) ? parsed : []);
      } else {
        setFavorites([]);
      }
    } catch {
      setFavorites([]);
    }
  }, [storageKey]);

  const toggleFavorite = useCallback(
    (benefit) => {
      const sanitized = sanitizeBenefit(benefit);
      if (!sanitized) return;
      setFavorites((prev) => {
        const exists = prev.some((item) => item.id === sanitized.id);
        const next = exists
          ? prev.filter((item) => item.id !== sanitized.id)
          : [...prev, sanitized];
        localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey]
  );

  const isFavorite = useCallback(
    (benefit) => {
      const id =
        typeof benefit === "object" ? benefit?.id : benefit;
      if (!id) return false;
      return favorites.some((item) => item.id === id);
    },
    [favorites]
  );

  return {
    favorites,
    toggleFavorite,
    isFavorite,
  };
}
