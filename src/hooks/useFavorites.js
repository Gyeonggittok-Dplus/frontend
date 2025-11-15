import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_PREFIX = "favorite_benefits";
const sanitizeBenefit = (benefit, fallbackId) => {
  if (!benefit) return null;
  const id =
    benefit.id ??
    benefit.benefit_id ??
    benefit.service_id ??
    benefit.service_name ??
    fallbackId;
  if (!id) return null;
  return {
    id,
    title: benefit.title ?? benefit.service_name ?? "복지 서비스",
    desc: benefit.desc ?? benefit.description ?? "",
    region: benefit.region ?? benefit.location ?? "",
    category: benefit.category ?? benefit.department ?? "",
    link: benefit.link ?? "",
  };
};

const encodeCombined = (item) => {
  const welfare = item.title ?? "복지 서비스";
  const url = item.link ?? "";
  return { welfare, url };
};

export function useFavorites(email) {
  const storageKey = useMemo(
    () => `${STORAGE_PREFIX}:${email || "guest"}`,
    [email]
  );
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const endpoint = API_BASE ? `${API_BASE}/api/user_inform` : null;
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      if (!email) {
        if (!cancelled) {
          setFavorites([]);
          setLoading(false);
        }
        return;
      }

      if (endpoint) {
        try {
          const res = await fetch(
            `${endpoint}/get_fav_welfare?email=${encodeURIComponent(email)}`
          );
          if (!res.ok) throw new Error("server");
          const data = await res.json();
          const rawList = Array.isArray(data?.welfare)
            ? data.welfare
            : Array.isArray(data)
            ? data
            : [];
          const normalized = rawList
            .map((entry, index) => {
              const [title, url = ""] = String(entry).split(",", 2);
              return sanitizeBenefit(
                {
                  id: `${title}-${url}`,
                  title,
                  link: url,
                  region: data?.region || "",
                  category: data?.category || "",
                },
                index
              );
            })
            .filter(Boolean);
          if (!cancelled) {
            setFavorites(normalized);
            setLoading(false);
          }
          try {
            localStorage.setItem(storageKey, JSON.stringify(normalized));
          } catch {
            // ignore storage errors
          }
          return;
        } catch (err) {
          console.warn("Failed to load favorites from server", err);
        }
      }

      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!cancelled) setFavorites(Array.isArray(parsed) ? parsed : []);
        } else if (!cancelled) {
          setFavorites([]);
        }
      } catch {
        if (!cancelled) setFavorites([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFavorites();
    return () => {
      cancelled = true;
    };
  }, [email, endpoint, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(favorites));
    } catch {
      // ignore storage errors
    }
  }, [favorites, storageKey]);

  const syncFavorite = useCallback(
    (item, action) => {
      if (!endpoint || !email || !item) return;
      const { welfare, url } = encodeCombined(item);
      const urlBase = `${endpoint}/${action}_fav_welfare?email=${encodeURIComponent(
        email
      )}&welfare=${encodeURIComponent(welfare)}&url=${encodeURIComponent(url)}`;
      fetch(urlBase, { method: "POST" }).catch((err) =>
        console.warn(`Failed to ${action} favorite`, err)
      );
    },
    [endpoint, email]
  );

  const toggleFavorite = useCallback(
    (benefit) => {
      const sanitized = sanitizeBenefit(benefit, Date.now());
      if (!sanitized) return;

      setFavorites((prev) => {
        const exists = prev.some((item) => item.id === sanitized.id);
        if (exists) {
          syncFavorite(sanitized, "rm");
          return prev.filter((item) => item.id !== sanitized.id);
        }
        syncFavorite(sanitized, "post");
        return [...prev, sanitized];
      });
    },
    [syncFavorite]
  );

  const isFavorite = useCallback(
    (benefit) => {
      const id = typeof benefit === "object" ? benefit?.id : benefit;
      if (!id) return false;
      return favorites.some((item) => item.id === id);
    },
    [favorites]
  );

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    loading,
  };
}
