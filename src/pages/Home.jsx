import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  MapPin,
  MessageCircle,
  Heart,
  Search,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../hooks/useFavorites";
import { useRecentApplications } from "../hooks/useRecentApplications";
import {
  filterBenefitsByRegion,
  normalizeBenefitItem,
} from "../utils/benefits";


const FALLBACK_RECOMMENDATIONS = [
  {
    id: 1,
    title: "청년 주거비 지원",
    desc: "19~34세 도민에게 전월세 보증금을 지원합니다.",
    region: "수원시",
    category: "주거",
  },
  {
    id: 2,
    title: "아이 돌봄바우처",
    desc: "맞벌이 가정을 위한 돌봄/교육 바우처입니다.",
    region: "경기도",
    category: "가족",
  },
  {
    id: 3,
    title: "문화생활 SOS",
    desc: "문화 생활비를 지원하는 복지 프로그램입니다.",
    region: "성남시",
    category: "문화",
  },
  {
    id: 4,
    title: "청년 문화카드",
    desc: "청년 문화활동 지원을 위한 카드형 바우처입니다.",
    region: "경기도",
    category: "문화",
  },
  {
    id: 5,
    title: "아이돌봄 SOS",
    desc: "돌봄 공백이 있는 가정을 위한 긴급 돌봄 지원입니다.",
    region: "용인시",
    category: "돌봄",
  },
  {
    id: 6,
    title: "노후 주거 개선",
    desc: "어르신을 위한 주거환경 개선 지원입니다.",
    region: "경기도",
    category: "주거",
  },
];

const QUICK_ACTIONS = [
  {
    id: "finder",
    label: "복지 혜택 찾기",
    desc: "나에게 맞는 추천 받기",
    icon: Search,
    path: "/search",
  },
  {
    id: "map",
    label: "복지 지도",
    desc: "주변 복지 시설 확인",
    icon: MapPin,
    path: "/map",
  },
  {
    id: "chat",
    label: "챗봇 상담",
    desc: "실시간 복지 상담",
    icon: MessageCircle,
    path: "/chat",
  },
];

export default function Home() {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { favorites, toggleFavorite, isFavorite } = useFavorites(user?.email);
  const {
    applications: recentActivities,
    addApplication,
    loading: recentActivitiesLoading,
  } = useRecentApplications(user?.email, token);

  const fallbackByRegion = useMemo(() => {
    return filterBenefitsByRegion(FALLBACK_RECOMMENDATIONS, user?.location).slice(
      0,
      6
    );
  }, [user?.location]);

  const [healthStatus, setHealthStatus] = useState("정상");
  const [recommendations, setRecommendations] = useState([]);
  const [loadingBenefit, setLoadingBenefit] = useState(true);
  const favoriteHighlights = useMemo(
    () => favorites.slice(0, 3),
    [favorites]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const res = await fetch(`${BASE_URL}/api/health`);
        const data = await res.json();
        if (!cancelled) setHealthStatus(data.status || "정상");
      } catch {
        if (!cancelled) setHealthStatus("연결 오류");
      }
    }

    async function loadBenefits() {
      if (!user?.email) {
        if (!cancelled) {
          setRecommendations(fallbackByRegion);
          setLoadingBenefit(false);
        }
        return;
      }

      try {
        const params = new URLSearchParams({ email: user.email });
        const res = await fetch(
          `${BASE_URL}/api/welfare/list?${params.toString()}`
        );
        if (!res.ok) throw new Error("failed to load benefits");
        const data = await res.json();
        const welfareList = Array.isArray(data)
          ? data
          : Array.isArray(data?.welfare)
          ? data.welfare
          : [];

        if (!cancelled && welfareList.length) {
          const normalized = welfareList.map((item, index) =>
            normalizeBenefitItem(item, index)
          );
          const limited = filterBenefitsByRegion(
            normalized,
            user?.location
          ).slice(0, 6);
          setRecommendations(limited.length ? limited : fallbackByRegion);
        }
      } catch (error) {
          console.warn("failed to load benefits", error);
          if (!cancelled) {
            setRecommendations(fallbackByRegion);
          }
      } finally {
        if (!cancelled) setLoadingBenefit(false);
      }
    }

    loadStatus();
    loadBenefits();

    return () => {
      cancelled = true;
    };
  }, [BASE_URL, fallbackByRegion, user?.email, user?.location]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "좋은 아침입니다";
    if (hour < 18) return "반갑습니다";
    return "편안한 저녁 보내세요";
  }, []);

  const handleOpenLink = useCallback(
    (benefit) => {
      if (!benefit?.link) {
        alert("신청 링크가 제공되지 않았습니다.");
        return;
      }
      addApplication({
        id: benefit.id,
        title: benefit.title,
        region: benefit.region,
        status: "신청 이동",
        date: new Date().toISOString(),
      });
      window.open(benefit.link, "_blank", "noopener,noreferrer");
    },
    [addApplication]
  );

  return (
    <section className="space-y-8">
      <div className="grid gap-6 rounded-3xl bg-gradient-to-r from-[#004c72] to-[#009fc2] p-8 text-white shadow-lg lg:grid-cols-[2fr,1fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.5em] text-white/70">오늘의 복지 브리핑</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight">
            {greeting}, {user?.name || "경기복지인"}님
          </h1>
          <p className="mt-3 text-base text-white/80">
            하루를 든든하게 만들어 줄 맞춤 혜택과 건강 정보를 만나보세요.
          </p>
          
        </div>
        <div className="rounded-2xl bg-white/10 p-4 text-sm text-white backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">관심 있는 신청 미리보기</h2>
              <p className="mt-1 text-white/80">
                하트를 눌러 최대 3개까지 미리보기
              </p>
            </div>
            <button
              className="rounded-full border border-white/40 px-3 py-1 text-xs font-semibold text-white hover:bg-white/15"
              onClick={() => navigate("/mypage")}
            >
              마이페이지
            </button>
          </div>
          {favoriteHighlights.length ? (
            <ul className="mt-4 space-y-3">
              {favoriteHighlights.map((fav) => (
                <li
                  key={fav.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {fav.title}
                    </p>
                    
                  </div>
                  <button
                    onClick={() => handleOpenLink(fav)}
                    disabled={!fav.link}
                    className="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/50"
                  >
                    바로가기
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-white/30 px-4 py-3 text-sm text-white/80">
              관심 목록이 비어 있습니다. 추천 카드의 하트를 눌러 관심 혜택을 추가해 보세요.
            </p>
          )}
        </div>
      </div>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            복지 혜택
          </h2>
          <button
            className="text-sm font-semibold text-[#00a69c]"
            onClick={() => navigate("/search")}
          >
            전체 보기
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loadingBenefit ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              추천 데이터를 불러오는 중입니다...
            </div>
          ) : (
            <>
              {recommendations.map((benefit) => (
                <article
                  key={benefit.id}
                  className="rounded-2xl border border-slate-100 p-5 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-semibold text-slate-400">
                      {benefit.category} · {benefit.region}
                    </div>
                    <button
                      onClick={() => toggleFavorite(benefit)}
                      aria-pressed={isFavorite(benefit)}
                      className="rounded-full border border-slate-100 p-2 text-[#f43f5e] transition hover:bg-[#f43f5e]/10"
                    >
                      <Heart
                        className="h-4 w-4"
                        fill={isFavorite(benefit) ? "#f43f5e" : "none"}
                      />
                    </button>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">
                    {benefit.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{benefit.desc}</p>
                  <button
                    onClick={() => handleOpenLink(benefit)}
                    disabled={!benefit.link}
                    className="mt-4 w-full rounded-2xl border border-[#00a69c] px-4 py-2 text-sm font-semibold text-[#00a69c] transition hover:bg-[#00a69c]/5 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  >
                    {benefit.link ? "신청하러 가기" : "신청 정보 없음"}
                  </button>
                </article>
              ))}
              {!recommendations.length && (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
                  추천 데이터를 불러오지 못했습니다.
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-xl font-semibold text-slate-900">빠른 메뉴</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {QUICK_ACTIONS.map(({ id, label, desc, icon: Icon, path }) => (
              <button
                key={id}
                onClick={() => navigate(path)}
                className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3 text-left transition hover:-translate-y-1 hover:border-[#00a69c]/40 hover:bg-[#00a69c]/5"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-[#00a69c]/10 p-3 text-[#00a69c]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {label}
                    </p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </div>
                <span className="text-sm text-[#00a69c]">바로가기</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">최근 활동</h2>
          {recentActivitiesLoading ? (
            <p className="mt-4 text-sm text-slate-500">
              최근 활동을 불러오는 중입니다...
            </p>
          ) : recentActivities.length ? (
            <ul className="mt-4 space-y-4 text-sm">
              {recentActivities.slice(0, 2).map((activity) => (
                <li
                  key={activity.id}
                  className="rounded-2xl border border-slate-100 p-4 transition hover:-translate-y-1 hover:shadow-sm"
                >
                  <p className="font-semibold text-slate-900">{activity.title}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    
                    <span>
                      {activity.date
                        ? new Date(activity.date).toLocaleDateString()
                        : "방금 전"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              아직 최근 활동이 없습니다. 신청하기 버튼을 눌러 활동을 추가해 보세요.
            </p>
          )}
        </div>
      </section>
    </section>
  );
}
