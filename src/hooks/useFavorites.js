import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

/**
 * 관심목록에서 사용할 혜택 타입 (프론트에서 쓰는 공통 구조)
 * - id: 고유 식별자
 * - title: 복지/혜택 이름 (백엔드의 welfare)
 * - link: 신청/상세 URL (백엔드의 url)
 * - region, category 등은 없을 수도 있어서 선택적으로 사용
 */
export function useFavorites(initialEmail) {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { user, token } = useAuth();

  // 훅 인자로 이메일 넘기면 그거 우선, 아니면 현재 로그인 유저 이메일
  const email = initialEmail ?? user?.email ?? "";

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ===========================
  // 1) 서버에서 관심목록 불러오기
  // ===========================
  useEffect(() => {
    if (!email) {
      setFavorites([]);
      return;
    }

    let cancelled = false;

    async function loadFavorites() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ email });
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // GET /get_fav_welfare?email=...
        
        const res = await fetch(
          `${BASE_URL}/api/inform/get_fav_welfare?${params.toString()}`,
          { headers }
        );

        if (!res.ok) {
          throw new Error("failed to load favorites");
        }

        const payload = await res.json();
        // 기대 형태: { success: True, email: "...", welfare: welfare_list }
        // welfare_list 는 [{ welfare: str, url: str }, ...] 라고 가정
        const list = Array.isArray(payload?.welfare) ? payload.welfare : [];

        const normalized = list.map((item, index) => {
          // ① 문자열 형태: "이름,https://url..."
          if (typeof item === "string") {
            const [rawName, rawUrl] = item.split(",", 2); // 콤마 기준으로 앞: 이름, 뒤: url
            const welfareName = (rawName || "").trim();
            const url = (rawUrl || "").trim();
        
            return {
              id: `${welfareName}-${url || index}`,
              title: welfareName || "관심 혜택",
              link: url,
              region: "",
              category: "",
              raw: item, // 원본 보존하고 싶으면
            };
          }
        
          // ② 객체 형태: { welfare: "...", url: "..." } 같은 경우
          const welfareName =
            item.welfare ?? item.title ?? item.name ?? "관심 혜택";
          const url = item.url ?? item.link ?? "";
        
          return {
            id: item.id ?? `${welfareName}-${url || index}`,
            title: welfareName,
            link: url,
            region: item.region ?? "",
            category: item.category ?? "",
            ...item,
          };
        });

        if (!cancelled) {
          setFavorites(normalized);
        }
      } catch (err) {
        console.error("Failed to load favorites", err);
        if (!cancelled) {
          setError("관심 목록을 불러오지 못했습니다.");
          setFavorites([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [BASE_URL, email, token]);

  // ===========================
  // 2) 이 혜택이 관심목록에 있는지 여부
  // ===========================
  const isSameBenefit = (a, b) => {
    if (!a || !b) return false;
  
    // url 기준이 가장 확실
    if (a.link && b.link && a.link === b.link) return true;
  
    // url이 없으면 이름으로라도 비교
    return a.title === b.title;
  };
  
  const isFavorite = useCallback(
    (benefit) => {
      if (!benefit) return false;
      return favorites.some((f) => isSameBenefit(f, benefit));
    },
    [favorites]
  );

  // ===========================
  // 3) 관심 토글 (추가 / 삭제 + 서버 동기화)
  // ===========================
  const toggleFavorite = useCallback(
    async (benefit) => {
      if (!email || !benefit) return;

      // 프론트 기준으로 이미 관심인지 확인
      const already = favorites.some((f) => isSameBenefit(f, benefit));

      setFavorites((prev) =>
        already
          ? prev.filter((f) => !isSameBenefit(f, benefit))
          : [...prev, benefit]
        );

      try {
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const params = new URLSearchParams({
          email,
          welfare: benefit.title ?? "",
          url: benefit.link ?? "",
        });

        if (already) {
          // 📌 삭제: POST /rm_fav_welfare?email=...&welfare=...&url=...
          await fetch(
            `${BASE_URL}/api/inform/rm_fav_welfare?${params.toString()}`,
            {
              method: "POST",
              headers,
            }
          );
          // 응답: {
          //   success: True,
          //   message: "Favorite welfare removed",
          //   removed: combined_value,
          //   row_deleted: False,
          //   current_welfare: updated_welfare
          // }
          // 필요하면 여기서 current_welfare로 favorites를 다시 세팅해도 됨
        } else {
          // 📌 추가: POST /post_fav_welfare?email=...&welfare=...&url=...
          await fetch(
            `${BASE_URL}/api/inform/post_fav_welfare?${params.toString()}`,
            {
              method: "POST",
              headers,
            }
          );
          // 응답: { "success": True, "message": "Favorites updated successfully" }
        }
      } catch (err) {
        console.error("Failed to sync favorite to server", err);

        // ❗실패 시 UI 롤백해주고 싶다면 이 부분 활성화
        // setFavorites((prev) =>
        //   already ? [...prev, benefit] : prev.filter((f) => f.id !== benefit.id)
        // );
      }
    },
    [BASE_URL, email, favorites, token]
  );

  return { favorites, loading, error, isFavorite, toggleFavorite };
}

export default useFavorites;
