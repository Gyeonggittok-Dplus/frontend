import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  CalendarDays,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const FALLBACK_RECOMMENDATIONS = [
  {
    id: 1,
    title: "청년 주거비 지원",
    desc: "19~34세 무주택 청년에게 보증금과 월세를 지원합니다.",
    region: "수원시",
    category: "주거",
  },
  {
    id: 2,
    title: "경기 긴급복지",
    desc: "갑작스러운 위기 상황 가구에 생계·의료비를 신속하게 지원합니다.",
    region: "경기도",
    category: "긴급",
  },
  {
    id: 3,
    title: "돌봄 공백 SOS",
    desc: "돌봄 공백이 있는 가정에 돌봄 인력과 비용을 지원합니다.",
    region: "고양시",
    category: "돌봄",
  },
  {
    id: 4,
    title: "문화누리 카드",
    desc: "문화 생활을 지원하기 위해 연간 바우처를 제공합니다.",
    region: "경기도",
    category: "문화",
  },
  {
    id: 5,
    title: "아이돌봄 바우처",
    desc: "아이돌봄 시간이 필요한 가정에 시간당 지원을 제공합니다.",
    region: "성남시",
    category: "돌봄",
  },
  {
    id: 6,
    title: "에너지 바우처",
    desc: "저소득층 겨울철 난방비 및 여름철 냉방비를 지원합니다.",
    region: "경기도",
    category: "생활",
  },
];

const QUICK_ACTIONS = [
  {
    id: "finder",
    label: "맞춤 복지 찾기",
    desc: "조건 설정 후 추천 받기",
    icon: Search,
    path: "/search",
  },
  {
    id: "map",
    label: "복지 지도",
    desc: "가까운 센터 확인",
    icon: MapPin,
    path: "/map",
  },
  {
    id: "chat",
    label: "챗봇 상담",
    desc: "실시간 질문 응답",
    icon: MessageCircle,
    path: "/chat",
  },
];

const RECENT_ACTIVITIES = [
  {
    id: "1",
    title: "청년 주거비 지원 신청",
    status: "검토 중",
    date: "2025.02.03",
  },
  {
    id: "2",
    title: "복지 플래너 상담 예약",
    status: "완료",
    date: "2025.01.23",
  },
  {
    id: "3",
    title: "경기 긴급복지 문의",
    status: "답변 완료",
    date: "2025.01.18",
  },
];

function normalizeApplicationId(value) {
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }
  return null;
}

export default function Home() {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [healthStatus, setHealthStatus] = useState("정상");
  const [recommendations, setRecommendations] = useState(
    FALLBACK_RECOMMENDATIONS
  );
  const [loadingBenefit, setLoadingBenefit] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [appliedIds, setAppliedIds] = useState([]);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [recentApplications, setRecentApplications] = useState([]);
  const [heroReady, setHeroReady] = useState(false);

  const fetchApplications = useCallback(async () => {
    if (!token) {
      setAppliedIds([]);
      setRecentApplications([]);
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/api/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const payload = await res.json();
      const list = Array.isArray(payload?.data) ? payload.data : payload;
      if (Array.isArray(list)) {
        const ids = list
          .map((item) =>
            normalizeApplicationId(item.benefit_id ?? item.benefitId ?? item.id)
          )
          .filter((id) => id !== null);
        setAppliedIds(ids);
        setRecentApplications(list.slice(0, 3));
      } else {
        setAppliedIds([]);
        setRecentApplications([]);
      }
    } catch (err) {
      console.warn("Failed to load applications", err);
      setRecentApplications([]);
    }
  }, [BASE_URL, token]);

  useEffect(() => {
    setHeroReady(true);
  }, []);

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
      try {
        const params = new URLSearchParams();
        if (user?.location) {
          params.set("sigun_name", user.location);
        }
        params.set("limit", "6");
        const query = params.toString();
        const res = await fetch(
          `${BASE_URL}/api/welfare/list${query ? `?${query}` : ""}`
        );
        if (!res.ok) throw new Error("failed to load benefits");
        const data = await res.json();
        const welfareList = Array.isArray(data)
          ? data
          : Array.isArray(data?.welfare)
          ? data.welfare
          : [];

        if (!cancelled && welfareList.length) {
          const normalized = welfareList.slice(0, 6).map((item, index) => {
            const descriptionCandidates = [
              item.desc,
              item.description,
              item.target,
              item.support_cycle,
              item.apply_method,
            ].filter(Boolean);

            return {
              id:
                item.id ??
                item.service_id ??
                item.service_name ??
                item.service_url ??
                index,
              title: item.title ?? item.service_name ?? "복지 서비스",
              desc:
                descriptionCandidates.join(" · ") ||
                "자세한 내용은 상세 페이지에서 확인해 주세요.",
              region: item.region ?? item.sigun_name ?? "경기도",
              category: item.category ?? item.department ?? "복지",
            };
          });
          setRecommendations(normalized);
        }
      } catch (error) {
        console.warn("failed to load benefits", error);
      } finally {
        if (!cancelled) setLoadingBenefit(false);
      }
    }

    loadStatus();
    loadBenefits();

    fetchApplications();

    return () => {
      cancelled = true;
    };
  }, [BASE_URL, fetchApplications, user?.location]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "좋은 아침입니다";
    if (hour < 18) return "반갑습니다";
    return "편안한 저녁 보내세요";
  }, []);

  async function handleApply(benefit) {
    if (!token) return;
    const normalizedId = benefit.id ?? benefit.benefit_id;
    if (appliedIds.includes(normalizedId)) return;
    setSubmittingId(normalizedId);
    setApplicationMessage("");
    try {
      const res = await fetch(`${BASE_URL}/api/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          benefit_id: normalizedId,
          title: benefit.title,
          email: user?.email ?? "",
        }),
      });
      if (!res.ok) throw new Error("failed");
      setAppliedIds((prev) =>
        Array.from(new Set([...prev, normalizedId]))
      );
      setApplicationMessage(
        `'${benefit.title}' 신청이 완료되었습니다. 마이페이지에서 신청 내역을 확인할 수 있습니다.`
      );
      fetchApplications();
    } catch (err) {
      console.error(err);
      setApplicationMessage("신청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <section className="space-y-8">
      <div className="grid gap-6 rounded-3xl bg-gradient-to-r from-[#004c72] to-[#009fc2] p-8 text-white shadow-lg lg:grid-cols-[2fr,1fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.5em] text-white/70">오늘의 복지 브리핑</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight">
            {greeting}, {user?.name || "경기복지인"}님
          </h1>
          <p className="mt-3 text-base text-white/80">
            한눈에 보는 맞춤 복지 혜택과 진행 현황을 확인해 주세요.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-white">
              <Sparkles className="h-4 w-4 text-white" />
              추천 혜택 {recommendations.length}개
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-white">
              <BadgeCheck className="h-4 w-4 text-white" />
              건강 상태 {healthStatus}
            </span>
          </div>
        </div>
        <div className="rounded-2xl bg-white/10 p-4 text-sm text-white backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">진행 중인 신청</h2>
              <p className="mt-1 text-white/80">최근 최대 3건까지 확인됩니다.</p>
            </div>
            <button
              className="rounded-full border border-white/40 px-3 py-1 text-xs font-semibold text-white hover:bg-white/15"
              onClick={() => navigate("/mypage")}
            >
              마이페이지
            </button>
          </div>
          {recentApplications.length ? (
            <ul className="mt-4 space-y-3">
              {recentApplications.map((app) => (
                <li
                  key={app.id ?? app.benefit_id}
                  className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-white">
                    {app.title || app.name || "복지 신청"}
                  </p>
                  <p className="text-xs text-white/70">
                    {(app.status || "검토 중") +
                      " · " +
                      (app.applied_at
                        ? new Date(app.applied_at).toLocaleDateString()
                        : "방금")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-white/30 px-4 py-3 text-sm text-white/80">
              진행 중인 신청 내역이 없습니다. 원하는 혜택을 신청해 보세요.
            </p>
          )}
        </div>
      </div>
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            추천 복지 혜택
          </h2>
          <button
            className="text-sm font-semibold text-[#00a69c]"
            onClick={() => navigate("/search")}
          >
            전체 보기
          </button>
        </div>
        {applicationMessage && (
          <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-600">
            {applicationMessage}
          </p>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recommendations.map((benefit) => (
            <article
              key={benefit.id}
              className="rounded-2xl border border-slate-100 p-5 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="text-xs font-semibold text-slate-400">
                {benefit.category} · {benefit.region}
              </div>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">
                {benefit.title}
              </h3>
              <p className="mt-1 text-sm text-slate-600">{benefit.desc}</p>
              <button
                onClick={() => handleApply(benefit)}
                disabled={
                  appliedIds.includes(benefit.id ?? benefit.benefit_id) ||
                  submittingId === (benefit.id ?? benefit.benefit_id)
                }
                className={`mt-4 rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                  appliedIds.includes(benefit.id ?? benefit.benefit_id)
                    ? "border-slate-200 text-slate-400"
                    : "border-[#00a69c] text-[#00a69c] hover:bg-[#00a69c]/5"
                }`}
              >
                {appliedIds.includes(benefit.id ?? benefit.benefit_id)
                  ? "신청 완료"
                  : submittingId === (benefit.id ?? benefit.benefit_id)
                  ? "신청 중..."
                  : "신청하기"}
              </button>
            </article>
          ))}
          {!recommendations.length && !loadingBenefit && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
              추천 데이터를 불러오지 못했습니다.
            </div>
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
          <ul className="mt-4 space-y-4 text-sm">
            {RECENT_ACTIVITIES.map((activity) => (
              <li
                key={activity.id}
                className="rounded-2xl border border-slate-100 p-4 transition hover:-translate-y-1 hover:shadow-sm"
              >
                <p className="font-semibold text-slate-900">{activity.title}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{activity.status}</span>
                  <span>{activity.date}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </section>
  );
}
