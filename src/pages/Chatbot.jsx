import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const SUGGESTIONS = [
  "청년 맞춤 복지가 궁금해요",
  "노인 맞춤 복지가 궁금해요",
  "가까운 복지센터는 어디 있나요?",
];

export default function Chatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem("chat_history");
    if (saved) return JSON.parse(saved);
    return [
      { sender: "bot", text: "안녕하세요, 경기D+ 챗봇입니다. 어떤 복지 혜택이 궁금하신가요?" }
    ];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const messageContainerRef = useRef(null);

  const sendMessage = async (preset) => {
    const content = preset ?? input.trim();
    if (!content || loading) return;

    if (!user?.email) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "로그인 정보를 확인할 수 없습니다. 다시 로그인 후 이용해 주세요.",
        },
      ]);
      return;
    }

    setMessages((prev) => [...prev, { sender: "user", text: content }]);
    if (!preset) setInput("");
    setLoading(true);

    try {
      const payload = {
        message: content,
        email: user.email,
      };
      if (sessionId) {
        payload.session_id = sessionId;
      }

      const res = await fetch(`${BASE_URL}/api/chatbot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.session_id) {
        setSessionId(data.session_id);
      }
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.reply || "답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        },
      ]);
    } catch (err) {
      console.error("Failed to send chatbot message", err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "서버와 연결되지 않았습니다. 네트워크를 확인한 후 다시 시도해 주세요." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    sessionStorage.setItem("chat_history", JSON.stringify(messages));
  }, [messages]);

  return (
    <section className="mx-auto flex h-[calc(100vh-260px)] max-w-3xl flex-col rounded-3xl bg-white shadow-sm sm:h-[calc(100vh-220px)] lg:h-[calc(100vh-180px)]">
      <header className="border-b border-slate-100 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00a69c]">경기 D+ 챗봇</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">질문을 입력해 보세요</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => sendMessage(suggestion)}
                className="rounded-full border border-slate-200 px-3 py-1 text-[11px] leading-tight text-slate-600 hover:border-[#00a69c] hover:text-[#00a69c]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6" ref={messageContainerRef}>
        {messages.map((message, index) => (
          <div
            key={`${message.text}-${index}`}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                message.sender === "user"
                  ? "bg-[#00a69c] text-white"
                  : "bg-slate-100 text-slate-900"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-500">답변을 준비하고 있어요...</div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <input
            className="flex-1 border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
            placeholder="메시지를 입력하세요."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading}
            className="rounded-2xl bg-[#00a69c] p-3 text-white transition hover:bg-[#009085] disabled:opacity-40"
            aria-label="메시지 보내기"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
