import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../hooks/useFavorites";

const RECENT_STORAGE_PREFIX = "recent_activities";
const REGIONS = [
  "\uacbd\uae30\ub3c4 \uc804\uccb4",
  "\uc218\uc6d0\uc2dc",
  "\uc131\ub0a8\uc2dc",
  "\uc758\uc815\ubd80\uc2dc",
  "\uc548\uc591\uc2dc",
  "\ubd80\ucc9c\uc2dc",
  "\uad11\uba85\uc2dc",
  "\ud3c9\ud0dd\uc2dc",
  "\ub3d9\ub450\ucc9c\uc2dc",
  "\uc548\uc0b0\uc2dc",
  "\uace0\uc591\uc2dc",
  "\uacfc\ucc9c\uc2dc",
  "\uad6c\ub9ac\uc2dc",
  "\ub0a8\uc591\uc8fc\uc2dc",
  "\uc624\uc0b0\uc2dc",
  "\uc2dc\ud765\uc2dc",
  "\uad70\ud3ec\uc2dc",
  "\uc758\uc655\uc2dc",
  "\ud558\ub0a8\uc2dc",
  "\uc6a9\uc778\uc2dc",
  "\ud30c\uc8fc\uc2dc",
  "\uc774\ucc9c\uc2dc",
  "\uc548\uc131\uc2dc",
  "\uae40\ud3ec\uc2dc",
  "\ud654\uc131\uc2dc",
  "\uad11\uc8fc\uc2dc",
  "\uc591\uc8fc\uc2dc",
  "\ud3ec\ucc9c\uc2dc",
  "\uc5ec\uc8fc\uc2dc",
  "\uc5f0\ucc9c\uad70",
  "\uac00\ud3c9\uad70",
  "\uc591\ud3c9\uad70",
];
const SEX_OPTIONS = [
  { value: "M", label: "남성" },
  { value: "F", label: "여성" },
];

export default function MyPage() {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { token, user, updateUserProfile } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const storageKey = useMemo(
    () => `${RECENT_STORAGE_PREFIX}:${user?.email || "guest"}`,
    [user?.email]
  );
  const { favorites, toggleFavorite } = useFavorites(user?.email);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    age: user?.age ?? "",
    location: user?.location ?? "",
    sex: user?.sex ?? "",
  });
  const [regionQuery, setRegionQuery] = useState("");
  const filteredRegions = useMemo(() => {
    const query = regionQuery.trim();
    if (!query) return REGIONS;
    return REGIONS.filter((region) => region.includes(query));
  }, [regionQuery]);

  useEffect(() => {
    setProfileForm({
      age: user?.age ?? "",
      location: user?.location ?? "",
      sex: user?.sex ?? "",
    });
  }, [user?.age, user?.location, user?.sex]);

  useEffect(() => {
    function loadApplications() {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          setApplications(Array.isArray(parsed) ? parsed : []);
        } else {
          setApplications([]);
        }
        setError("");
      } catch (err) {
        console.error(err);
        setError("신청 내역을 불러오지 못했습니다.");
        setApplications([]);
      } finally {
        setLoading(false);
      }
    }
    loadApplications();
  }, [storageKey]);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.email) return;
      try {
        const params = new URLSearchParams({ email: user.email });
        const res = await fetch(
          `${BASE_URL}/api/auth/profile?${params.toString()}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }
        );
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (data && typeof data === "object") {
          updateUserProfile({
            age: data.age,
            location: data.location,
            sex: data.sex,
          });
        }
      } catch (err) {
        console.error("Failed to load user profile", err);
      }
    }
    loadProfile();
  }, [BASE_URL, token, updateUserProfile, user?.email]);

  function cancelApplication(id) {
    setApplications((prev) => {
      const next = prev.filter((app) => app.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  function handleProfileChange(e) {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleProfileSubmit(e) {
    e.preventDefault();
    const cleaned = {
      age: Number(profileForm.age) || "",
      location: profileForm.location,
      sex: profileForm.sex,
    };
    updateUserProfile(cleaned);
    setIsEditingProfile(false);
  }

  function handleProfileCancel() {
    setProfileForm({
      age: user?.age ?? "",
      location: user?.location ?? "",
      sex: user?.sex ?? "",
    });
    setIsEditingProfile(false);
  }

  function handleFavoriteLink(item) {
    if (!item?.link) {
      alert("신청 링크가 제공되지 않았습니다.");
      return;
    }
    window.open(item.link, "_blank", "noopener,noreferrer");
  }

  function handleRegionSelect(region) {
    setProfileForm((prev) => ({ ...prev, location: region }));
  }

  function handleSexSelect(value) {
    setProfileForm((prev) => ({ ...prev, sex: value }));
  }

  const displayName = user?.name ? `${user.name} 님의` : "내";
  const sexLabel =
    user?.sex === "M" ? "남성" : user?.sex === "F" ? "여성" : "미등록";
  const infoItems = [
    { label: "거주 지역", value: user?.location || "미등록" },
    { label: "나이", value: user?.age ? `${user.age}세` : "미등록" },
    { label: "성별", value: sexLabel },
  ];

  return (
    <section className="space-y-6">
      <header className="rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          {displayName} 신청 내역
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          나의 기본 정보를 관리하고 관심/신청 목록을 모아볼 수 있습니다.
        </p>
      </header>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">내 정보</h2>
          <button
            onClick={() => {
              if (isEditingProfile) {
                handleProfileCancel();
              } else {
                setIsEditingProfile(true);
              }
            }}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-[#00a69c] hover:text-[#00a69c]"
          >
            {isEditingProfile ? "취소" : "프로필 수정"}
          </button>
        </div>
        {isEditingProfile ? (
          <form className="mt-4 space-y-4" onSubmit={handleProfileSubmit}>
            <div>
              <p className="text-sm font-semibold text-slate-700">거주 지역</p>
              <input
                value={regionQuery}
                onChange={(e) => setRegionQuery(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#00a69c]"
                placeholder="지역 검색 (예: 수원)"
              />
              <p className="mt-2 text-xs text-slate-500">
                선택됨: {profileForm.location || "미선택"}
              </p>
              <div className="mt-2 flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                {filteredRegions.map((region) => (
                  <button
                    type="button"
                    key={region}
                    onClick={() => handleRegionSelect(region)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      profileForm.location === region
                        ? "border-[#00a69c] bg-[#00a69c]/10 text-[#00a69c]"
                        : "border-slate-200 text-slate-600 hover:border-[#00a69c]/50 hover:text-[#00a69c]"
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              나이
              <input
                name="age"
                type="number"
                min={0}
                value={profileForm.age}
                onChange={handleProfileChange}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#00a69c]"
                placeholder="만 나이"
              />
            </label>
            <div className="text-sm font-semibold text-slate-700">
              성별
              <div className="mt-2 flex gap-3">
                {SEX_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => handleSexSelect(option.value)}
                    className={`rounded-2xl border px-4 py-2 text-sm transition ${
                      profileForm.sex === option.value
                        ? "border-[#00a69c] bg-[#00a69c]/10 text-[#00a69c]"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-[#00a69c] py-3 text-sm font-semibold text-white hover:bg-[#009085]"
              >
                저장
              </button>
              <button
                type="button"
                onClick={handleProfileCancel}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:border-[#00a69c] hover:text-[#00a69c]"
              >
                취소
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {infoItems.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-100 p-4 text-sm text-slate-600"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-[#00a69c]">
                  {item.label}
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">관심 목록</h2>
        {favorites.length ? (
          <ul className="mt-4 space-y-4">
            {favorites.map((fav) => (
              <li
                key={fav.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-4 text-sm"
              >
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {fav.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {fav.category} · {fav.region || "지역 미정"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFavoriteLink(fav)}
                    disabled={!fav.link}
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[#00a69c] hover:text-[#00a69c] disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    바로가기
                  </button>
                  <button
                    onClick={() => toggleFavorite(fav)}
                    className="rounded-full border border-red-100 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            하트를 눌러 관심 혜택을 추가하면 여기에서 확인할 수 있습니다.
          </p>
        )}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">최근 신청 내역</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">
            신청 내역을 불러오는 중입니다...
          </p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-500">{error}</p>
        ) : applications.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            아직 신청한 복지 혜택이 없습니다. 홈 화면에서 새로 신청해 보세요.
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {applications.map((app) => (
              <li
                key={app.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 text-sm"
              >
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {app.title || app.name || "복지 신청"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(app.region || "미정") +
                      " · " +
                      (app.status || "신청 이동") +
                      " · " +
                      (app.date ||
                        (app.applied_at
                          ? new Date(app.applied_at).toLocaleDateString()
                          : "방금 전"))}
                  </p>
                </div>
                <button
                  onClick={() => cancelApplication(app.id)}
                  className="flex items-center gap-2 rounded-full border border-red-100 px-4 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
