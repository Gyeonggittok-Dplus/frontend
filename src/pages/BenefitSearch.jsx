import { useEffect, useMemo, useState } from "react";
import { Filter, Heart, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useFavorites } from "../hooks/useFavorites";
import { filterBenefitsByRegion, normalizeBenefitItem } from "../utils/benefits";

const provinceRegex = /(도|특별시|광역시)$/;
const formatRegionLabel = (region = "") => {
  if (!region) return "지역 정보 없음";
  const parts = region.split(/\s+/).filter(Boolean);
  if (!parts.length) return region;
  const [first, second] = parts;
  if (provinceRegex.test(first)) {
    return second || first;
  }
  return first;
};

export default function BenefitSearch() {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { user } = useAuth();
  const { toggleFavorite, isFavorite } = useFavorites(user?.email);

  const [benefits, setBenefits] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadBenefits() {
      if (!user?.email) {
        setBenefits([]);
        setError("로그인 정보를 확인할 수 없습니다.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ email: user.email });
        const res = await fetch(
          `${BASE_URL}/api/welfare/list?${params.toString()}`
        );
        if (!res.ok) throw new Error("failed to load benefits");
        const data = await res.json();
        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.welfare)
          ? data.welfare
          : [];
        const normalized = rows.map((item, index) =>
          normalizeBenefitItem(item, index)
        );
        if (!cancelled) {
          setBenefits(filterBenefitsByRegion(normalized, user?.location));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("복지 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
          setBenefits([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBenefits();
    return () => {
      cancelled = true;
    };
  }, [BASE_URL, user?.email, user?.location]);

  const categories = useMemo(() => {
    const collection = new Set(["전체"]);
    benefits.forEach((item) => {
      if (item.category) collection.add(item.category);
    });
    return Array.from(collection);
  }, [benefits]);

  const filtered = useMemo(() => {
    let dataset = benefits;
    if (selectedCategory !== "전체") {
      dataset = dataset.filter((item) => item.category === selectedCategory);
    }
    if (keyword.trim()) {
      const target = keyword.trim();
      dataset = dataset.filter(
        (item) =>
          item.title.includes(target) ||
          item.desc.includes(target) ||
          item.region.includes(target)
      );
    }
    return dataset;
  }, [benefits, keyword, selectedCategory]);

  const currentRegionLabel = useMemo(
    () => formatRegionLabel(user?.location || ""),
    [user?.location]
  );

  const handleOpenLink = (benefit) => {
    if (!benefit?.link) {
      alert("신청 링크가 제공되지 않았습니다.");
      return;
    }
    window.open(benefit.link, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="rounded-3xl bg-white p-8 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00a69c]">
            지역 맞춤
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            지역 맞춤 복지 찾기
          </h1>
          <p className="text-sm text-slate-500">
            거주 지역에 맞는 모든 복지 목록을 스크롤로 살펴보고, 관심 혜택을
            저장해 보세요.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            현재 지역 기준: {currentRegionLabel || "미선택"}
          </p>
        </div>
      </header>

      <div className="mt-6 rounded-2xl border border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            className="flex-1 border-none text-sm outline-none placeholder:text-slate-400"
            placeholder="예: 청년, 주거, 돌봄, 경기 등"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button
            onClick={() => setShowFilter((prev) => !prev)}
            className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-[#00a69c] hover:text-[#00a69c]"
          >
            <Filter className="h-4 w-4" />
            {showFilter ? "필터 닫기" : "필터"}
          </button>
        </div>
        {showFilter && (
          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span>카테고리</span>
              <button
                onClick={() => setSelectedCategory("전체")}
                className="text-[#00a69c]"
              >
                초기화
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    selectedCategory === category
                      ? "bg-[#00a69c] text-white"
                      : "border border-slate-200 text-slate-600 hover:border-[#00a69c]/50 hover:text-[#00a69c]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-sm text-slate-500">
            복지 정보를 불러오는 중입니다...
          </p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : filtered.length ? (
          filtered.map((benefit) => (
            <article
              key={benefit.id}
              className="rounded-2xl border border-slate-100 p-5 shadow-sm"
            >
              <div className="flex items-start justify-between text-xs text-slate-400">
                <span>
                  {benefit.category} · {formatRegionLabel(benefit.region)}
                </span>
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
              <h2 className="mt-2 text-lg font-semibold text-slate-900">
                {benefit.title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{benefit.desc}</p>
              <div className="mt-4 flex gap-3 text-sm font-semibold">
                <button
                  onClick={() => toggleFavorite(benefit)}
                  className={`flex-1 rounded-2xl border py-2 ${
                    isFavorite(benefit)
                      ? "border-[#f43f5e] text-[#f43f5e]"
                      : "border-slate-200 text-slate-600 hover:border-[#00a69c]/50 hover:text-[#00a69c]"
                  }`}
                >
                  {isFavorite(benefit) ? "관심 해제" : "관심 등록"}
                </button>
                <button
                  onClick={() => handleOpenLink(benefit)}
                  disabled={!benefit.link}
                  className="flex-1 rounded-2xl bg-[#00a69c] py-2 text-white transition hover:bg-[#009085] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {benefit.link ? "신청하러 가기" : "신청 정보 없음"}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            검색 조건에 맞는 복지 혜택이 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}
