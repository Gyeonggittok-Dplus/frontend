import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_PREFIX = "recent_activities";

const sanitizeApplication = (payload, fallbackId) => {
  if (!payload) return null;
  const id =
    payload.id ??
    payload.application_id ??
    payload.benefit_id ??
    payload.benefit?.id ??
    fallbackId;
  if (!id) return null;
  return {
    id,
    serverId: payload.serverId ?? payload.server_id ?? payload.id ?? null,
    title: payload.title ?? payload.name ?? "복지 신청",
    region: payload.region ?? payload.location ?? "미정",
    status: payload.status ?? "신청 이동",
    date:
      payload.date ??
      payload.applied_at ??
      payload.created_at ??
      new Date().toISOString(),
  };
};

export function useRecentApplications(email, token) {
  const storageKey = useMemo(
    () => `${STORAGE_PREFIX}:${email || "guest"}`,
    [email]
  );
  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  const endpoint = API_BASE ? `${API_BASE}/api/applications` : null;

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadApplications() {
      if (!email) {
        if (!cancelled) {
          setApplications([]);
          setLoading(false);
          setError("");
        }
        return;
      }

      if (endpoint) {
        try {
          const res = await fetch(
            `${endpoint}?email=${encodeURIComponent(email)}`,
            { headers: authHeaders }
          );
          if (!res.ok) throw new Error("server");
          const data = await res.json();
          const rawList = Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data)
            ? data
            : [];
          const normalized = rawList
            .map((item, index) => sanitizeApplication(item, index))
            .filter(Boolean);
          if (!cancelled) {
            setApplications(normalized);
            setError("");
            setLoading(false);
          }
          try {
            localStorage.setItem(storageKey, JSON.stringify(normalized));
          } catch {
            // ignore storage errors
          }
          return;
        } catch (err) {
          console.warn("Failed to load applications from server", err);
          if (!cancelled) {
            setError("서버와 동기화할 수 없습니다. 저장된 데이터만 표시합니다.");
          }
        }
      }

      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!cancelled) setApplications(Array.isArray(parsed) ? parsed : []);
        } else if (!cancelled) {
          setApplications([]);
        }
      } catch {
        if (!cancelled) setApplications([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadApplications();
    return () => {
      cancelled = true;
    };
  }, [email, endpoint, storageKey, authHeaders]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(applications));
    } catch {
      // ignore
    }
  }, [applications, storageKey]);

  const addApplication = useCallback(
    (entry) => {
      const sanitized = sanitizeApplication(entry, Date.now());
      if (!sanitized) return;
      setApplications((prev) => {
        const next = [sanitized, ...prev].slice(0, 5);
        return next;
      });

      if (!endpoint || !email) return;
      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          email,
          benefit_id: sanitized.id,
          title: sanitized.title,
          region: sanitized.region,
          status: sanitized.status,
        }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error("server");
          const data = await res.json();
          if (data?.id) {
            setApplications((prev) =>
              prev.map((item) =>
                item.id === sanitized.id ? { ...item, serverId: data.id } : item
              )
            );
          }
        })
        .catch((err) =>
          console.warn("Failed to sync application addition", err)
        );
    },
    [authHeaders, email, endpoint]
  );

  const removeApplication = useCallback(
    (id) => {
      setApplications((prev) => prev.filter((item) => item.id !== id));
      if (!endpoint || !email) return;
      const target = applications.find((item) => item.id === id);
      const deleteUrl = target?.serverId
        ? `${endpoint}/${encodeURIComponent(target.serverId)}`
        : `${endpoint}?email=${encodeURIComponent(
            email
          )}&benefit_id=${encodeURIComponent(id)}`;
      fetch(deleteUrl, {
        method: "DELETE",
        headers: authHeaders,
      }).catch((err) =>
        console.warn("Failed to sync application removal", err)
      );
    },
    [applications, authHeaders, email, endpoint]
  );

  return {
    applications,
    loading,
    error,
    addApplication,
    removeApplication,
  };
}
