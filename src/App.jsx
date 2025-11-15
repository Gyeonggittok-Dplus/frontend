import {
  HashRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Home as HomeIcon, Map, MessageCircle, Search, UserRound } from "lucide-react";
import Home from "./pages/Home";
import BenefitSearch from "./pages/BenefitSearch";
import MapView from "./pages/MapView";
import Chatbot from "./pages/Chatbot";
import MyPage from "./pages/MyPage";
import Survey from "./pages/Survey";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import brandMark from "./assets/gyeonggi-logo-main.png";

const NAV_LINKS = [
  { path: "/", label: "홈", protected: true, icon: HomeIcon },
  { path: "/search", label: "복지 찾기", protected: true, icon: Search },
  { path: "/map", label: "복지 지도", protected: true, icon: Map },
  { path: "/chat", label: "챗봇", protected: true, icon: MessageCircle },
  { path: "/mypage", label: "마이페이지", protected: true, icon: UserRound },
];

function AppLayout() {
  const location = useLocation();
  const { isAuthenticated, logout, user, needsSurvey } = useAuth();
  const isLoginPage = location.pathname === "/login";
  const isChatPage = location.pathname === "/chat";

  const filteredNav = NAV_LINKS.filter((link) => {
    if (link.protected && !isAuthenticated) return false;
    return true;
  });

  return (
    <div className={isLoginPage ? "min-h-screen" : "min-h-screen bg-slate-50 text-slate-900"}>
      {!isLoginPage && (
        <header className="bg-gradient-to-r from-[#004c72] to-[#009fc2] text-white shadow-sm">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-wrap items-center gap-4 text-center sm:text-left">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 p-2 shadow-inner">
                <img
                  src={brandMark}
                  alt="경기똑D+ 로고"
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-white/70 sm:text-xs">
                  도민의 복지 비서
                </p>
                <p className="text-2xl font-semibold text-white">경기똑D+</p>
              </div>
            </div>

            {!needsSurvey && (
              <nav className="hidden flex-wrap items-center justify-center gap-2 text-xs font-semibold sm:flex sm:justify-start sm:text-sm">
                {filteredNav.map(({ path, label }) => (
                  <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) =>
                      `rounded-full px-3 py-2 transition ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "text-white/70 hover:text-white"
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-white/80 sm:gap-4 sm:text-sm">
              <span className="font-medium">
                {isAuthenticated
                  ? needsSurvey
                    ? "설문을 먼저 완료해주세요."
                    : `안녕하세요 ${user?.name || "경기복지인"} 님`
                  : ""}
              </span>
              {isAuthenticated ? (
                <button
                  onClick={logout}
                  className="rounded-full border border-white/40 px-4 py-2 text-white transition hover:bg-white/15"
                >
                  로그아웃
                </button>
              ) : (
                <NavLink
                  to="/login"
                  className="rounded-full border border-white/40 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
                >
                  로그인
                </NavLink>
              )}
            </div>
          </div>
        </header>
      )}

      <main
        className={
          isLoginPage
            ? "min-h-screen"
            : `mx-auto w-full max-w-7xl px-6 ${
                isChatPage ? "pb-20" : "pb-16"
              } pt-8 sm:min-h-[calc(100vh-80px)] sm:px-8 sm:py-10`
        }
      >
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <BenefitSearch />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <MapView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chatbot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mypage"
            element={
              <ProtectedRoute>
                <MyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/survey"
            element={
              <ProtectedRoute allowSurvey>
                <Survey />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
          />
        </Routes>
      </main>

      {isAuthenticated && !isLoginPage && !needsSurvey && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 py-3 sm:hidden">
          <div className="mx-auto flex max-w-md items-center text-xs font-semibold">
            {filteredNav.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center gap-1 rounded-full px-3 py-1 text-center ${
                    isActive ? "text-[#00a69c]" : "text-slate-500"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}
