import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function MyPage() {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const { token, user, updateUserProfile } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadApplications() {
      try {
        const res = await fetch(`${BASE_URL}/api/applications`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error("failed");
        const payload = await res.json();
        const list = Array.isArray(payload?.data) ? payload.data : payload;
        setApplications(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error(err);
        setError("신청 내역을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }
    loadApplications();
  }, [BASE_URL, token]);

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

  async function cancelApplication(id) {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/applications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("failed");
      setApplications((prev) => prev.filter((app) => app.id !== id));
    } catch (err) {
      console.error(err);
      alert("신청 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
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
          진행 중인 복지 신청을 확인하고, 필요하면 취소할 수 있습니다.
        </p>
      </header>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">내 정보</h2>
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
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">신청 내역을 불러오는 중입니다...</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            아직 신청한 복지 혜택이 없습니다. 홈 화면에서 새로 신청해 보세요.
          </div>
        ) : (
          <ul className="space-y-4">
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
                      (app.status || "검토 중") +
                      " · " +
                      (app.applied_at
                        ? new Date(app.applied_at).toLocaleDateString()
                        : "방금 전")}
                  </p>
                </div>
                <button
                  onClick={() => cancelApplication(app.id)}
                  className="flex items-center gap-2 rounded-full border border-red-100 px-4 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  취소
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
