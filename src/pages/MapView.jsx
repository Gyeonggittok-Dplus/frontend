import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Navigation, PhoneCall } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const FILTERS = ["내 지역"];
const DEFAULT_CENTER = { lat: 37.3854, lng: 127.1155 };
const KAKAO_SCRIPT_ID = "kakao-map-sdk";

const normalizeUrl = (url = "") => {
  if (!url) return "";
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
};

const hasValidUrl = (url) => typeof url === "string" && url.trim().length >= 4;

export default function MapView() {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { token, user } = useAuth();
  const [spots, setSpots] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [userRegion, setUserRegion] = useState("");
  const [error, setError] = useState("");
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const [heroReady, setHeroReady] = useState(false);

  const derivedRegion = (userRegion || user?.location || "").trim();

  const filteredSpots = useMemo(() => {
    let dataset = spots.slice();
    if (activeFilter === "내 지역" && derivedRegion) {
      dataset = dataset.filter(
        (spot) =>
          spot.sigun === derivedRegion ||
          spot.sigun?.startsWith(derivedRegion) ||
          spot.address?.includes(derivedRegion)
      );
    }
    return dataset.slice(0, 20);
  }, [activeFilter, derivedRegion, spots]);

  useEffect(() => {
    setHeroReady(true);
    async function loadSpots() {
      const email = user?.email;
      if (!email) {
        setError("사용자 이메일을 확인할 수 없어 데이터를 불러올 수 없습니다.");
        setSpots([]);
        setSelected(null);
        setUserRegion("");
        return;
      }

      try {
        const params = new URLSearchParams({ email });
        const headers = new Headers();
        if (token) headers.append("Authorization", `Bearer ${token}`);

        const res = await fetch(
          `${BASE_URL}/api/map/facilities?${params.toString()}`,
          { headers }
        );
        if (!res.ok) throw new Error("failed");

        const payload = await res.json();
        const remoteData = Array.isArray(payload?.data)
          ? payload.data
          : payload;

        console.log("Facilities payload:", payload);
        if (Array.isArray(remoteData) && remoteData.length) {
          const normalized = remoteData.map((item, index) => {
            const latCandidate =
              item.lat ??
              item.latitude ??
              item.REFINE_WGS84_LAT ??
              item.y ??
              DEFAULT_CENTER.lat;
            const lngCandidate =
              item.lng ??
              item.longitude ??
              item.REFINE_WGS84_LOGT ??
              item.x ??
              DEFAULT_CENTER.lng;

            return {
              id: item.id ?? index,
              name:
                item.name ??
                item.INST_NM ??
                item.title ??
                item.service_name ??
                "복지 센터",
              address:
                item.address ??
                item.road_addr ??
                item.REFINE_ROADNM_ADDR ??
                item.lot_addr ??
                item.REFINE_LOTNO_ADDR ??
                item.location ??
                [item.sigun_name, item.address_detail]
                  .filter(Boolean)
                  .join(" "),
              sigun:
                item.sigun_name ??
                item.SIGUN_NM ??
                item.location?.split(" ")?.[0] ??
                "",
              phone: item.phone ?? item.TELNO ?? item.contact ?? "",
              lat: Number.isFinite(Number(latCandidate))
                ? Number(latCandidate)
                : DEFAULT_CENTER.lat,
              lng: Number.isFinite(Number(lngCandidate))
                ? Number(lngCandidate)
                : DEFAULT_CENTER.lng,
              url:
                item.url ??
                item.lo_addr ??
                item.HMPG_URL ??
                item.service_url ??
                item.apply_method ??
                item.link ??
                "",
            };
          });
          const seen = new Set();
          const deduped = normalized.filter((spot) => {
            const key = `${spot.name}|${spot.address}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          const sorted = deduped.sort((a, b) =>
              a.name.localeCompare(b.name, "ko")
            );
            setSpots(sorted);
          setSelected(sorted[0] ?? null);
          setUserRegion(payload?.user_location || user?.location || "");
          setError("");
        } else {
          setSpots([]);
          setSelected(null);
          setUserRegion("");
        }
      } catch (err) {
        console.warn("Failed to load centers", err);
        setError("복지센터 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setSpots([]);
        setSelected(null);
        setUserRegion("");
      }
    }

    loadSpots();
  }, [BASE_URL, token, user]);

  useEffect(() => {
    const loadMap = () => {
      if (!window.kakao?.maps || !mapContainerRef.current) return;
      window.kakao.maps.load(() => {
        mapRef.current = new window.kakao.maps.Map(mapContainerRef.current, {
          center: new window.kakao.maps.LatLng(
            DEFAULT_CENTER.lat,
            DEFAULT_CENTER.lng
          ),
          level: 7,
        });
        setMapReady(true);
      });
    };

    if (window.kakao && window.kakao.maps) {
      loadMap();
      return;
    }

    const existingScript = document.getElementById(KAKAO_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", loadMap);
      return () => existingScript.removeEventListener("load", loadMap);
    }

    const script = document.createElement("script");
    script.id = KAKAO_SCRIPT_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${
      import.meta.env.VITE_KAKAO_MAP_KEY
    }&autoload=false`;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", loadMap);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", loadMap);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.kakao) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    filteredSpots.forEach((spot) => {
      const marker = new window.kakao.maps.Marker({
        map: mapRef.current,
        position: new window.kakao.maps.LatLng(spot.lat, spot.lng),
      });
      window.kakao.maps.event.addListener(marker, "click", () => {
        setSelected(spot);
        mapRef.current.panTo(new window.kakao.maps.LatLng(spot.lat, spot.lng));
      });
      markersRef.current.push(marker);
    });
  }, [filteredSpots, mapReady]);

  useEffect(() => {
    if (!selected || !mapReady || !mapRef.current || !window.kakao) return;
    mapRef.current.panTo(
      new window.kakao.maps.LatLng(selected.lat, selected.lng)
    );
  }, [selected, mapReady]);

  const filterDescription =
    activeFilter === "내 지역" && derivedRegion
      ? `${derivedRegion} 기준 추천 센터`
      : "경기도 전체 센터 현황";

  return (
    <section className="space-y-6">
      <div
        className={`rounded-3xl bg-gradient-to-r from-[#004c72] to-[#007ba4] p-6 text-white shadow-sm transition-all duration-700 ${
          heroReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              복지 지도
            </p>
            <h1 className="mt-2 text-3xl font-semibold">가까운 복지센터 찾기</h1>
            <p className="mt-2 text-sm text-white/80">
              {filterDescription} · 총 {spots.length}개 센터
            </p>
          </div>
          <div className="inline-flex flex-wrap gap-2 rounded-2xl bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em]">
            <span>{derivedRegion || "지역 미설정"}</span>
            
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                activeFilter === filter
                  ? "bg-white text-[#004c72]"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="relative h-[420px] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm sm:h-[520px] lg:h-[560px]">
          <div ref={mapContainerRef} className="absolute inset-0" />
          <div className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow">
            내 위치 기준
          </div>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-500">
          {error && (
            <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-xs text-red-500 text-center">
              {error}
            </p>
          )}
          {selected ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00a69c]">
                선택한 센터
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {selected.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{selected.address}</p>
              <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
                {selected.phone && (
                  <span className="inline-flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-[#00a69c]" />
                    {selected.phone}
                  </span>
                )}
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-left text-sm font-semibold text-[#00a69c]"
                  onClick={() =>
                    window.open(
                      `https://map.kakao.com/link/to/${encodeURIComponent(
                        selected.name
                      )},${selected.lat},${selected.lng}`,
                      "_blank"
                    )
                  }
                >
                  <Navigation className="h-4 w-4" />
                  길찾기 열기
                </button>
                
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              좌측 지도에서 센터를 선택하면 정보가 표시됩니다.
            </p>
          )}

          <div className="mt-8 max-h-[360px] space-y-3 overflow-y-auto pr-2">
            {filteredSpots.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                복지센터를 불러오는 중 입니다.
              </p>
            ) : (
              filteredSpots.map((spot) => (
                <button
                  key={spot.id}
                  onClick={() => setSelected(spot)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition transform ${
                    selected?.id === spot.id
                      ? "border-[#00a69c] bg-[#00a69c]/5 text-[#00a69c]"
                      : "border-slate-100 text-slate-700 hover:-translate-y-1 hover:border-[#00a69c]/40 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full p-1.5 ${
                        selected?.id === spot.id
                          ? "bg-[#00a69c]/80 text-white"
                          : "bg-slate-100 text-[#00a69c]"
                      }`}
                    >
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-semibold">
                        {spot.sigun ? `[${spot.sigun}] ` : ""}
                        {spot.name}
                      </p>
                      <p className="text-xs text-slate-500">{spot.address}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
