import { useState, useEffect, useRef, useCallback } from "react";

// ── Claude AI Call ─────────────────────────────────────────────────────────────
async function callClaude(messages, onChunk) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are TrustBot, a warm and caring digital safety companion protecting first-time internet users from scams and fraud in India.

Your personality:
- Talk like a trusted elder sibling or close friend — never robotic
- Use simple words. No jargon. Ever.
- Be warm, calm, and reassuring — users may be scared or embarrassed
- Be DIRECT about danger — don't sugarcoat real threats
- Use emojis naturally (not excessively)
- Keep responses SHORT — 2-4 sentences max per message
- Always end with ONE clear question or action to keep conversation going

Your job flow:
1. First message: Understand what happened. Ask them to describe the situation.
2. Analyse as they talk: Detect scam patterns (urgency, OTP requests, money first, fake authority, lottery, job fraud, phishing links, KYC scams)
3. RESCUE: Tell them exactly what to do RIGHT NOW in simple steps
4. EDUCATE: After safety, explain WHY it was a scam in 1-2 lines
5. EMPOWER: End with a confidence-building message

Scam triggers to watch for: "OTP", "blocked account", "KBC", "lottery", "click this link", "send money first", "verify now", "RBI", "CBI", "arrest warrant", "job offer", "work from home", "investment double", "prize", "free", "urgent", "immediately"

ALWAYS include a riskLevel in your response as a JSON comment at the very end like this:
<!--RISK:SAFE--> or <!--RISK:LOW--> or <!--RISK:MEDIUM--> or <!--RISK:HIGH--> or <!--RISK:CRITICAL-->

Remember: You are saving someone from losing their life savings. Take it seriously but stay calm.`,
      messages,
    }),
  });

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// ── Risk colour map ────────────────────────────────────────────────────────────
const RISK = {
  SAFE:     { color: "#00e676", bg: "#00e67615", label: "✅ Safe",     emoji: "✅" },
  LOW:      { color: "#69f0ae", bg: "#69f0ae15", label: "🟢 Low Risk", emoji: "🟢" },
  MEDIUM:   { color: "#ffab00", bg: "#ffab0015", label: "⚠️ Caution",  emoji: "⚠️" },
  HIGH:     { color: "#ff5252", bg: "#ff525215", label: "🚨 Danger",   emoji: "🚨" },
  CRITICAL: { color: "#ff1744", bg: "#ff174420", label: "🆘 SCAM!",    emoji: "🆘" },
};

// ── Starter prompts ────────────────────────────────────────────────────────────
const STARTERS = [
  { icon: "📱", text: "Someone called saying my bank account is blocked" },
  { icon: "💸", text: "I received a UPI request from an unknown person" },
  { icon: "🔗", text: "I got a link to claim a prize or cashback" },
  { icon: "💼", text: "Someone offered me a work-from-home job with advance fee" },
  { icon: "📩", text: "I got a message saying I won KBC lottery" },
  { icon: "🏦", text: "A person claiming to be from RBI asked for my OTP" },
];

// ── Typing indicator ───────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "14px 18px", alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 8, height: 8, borderRadius: "50%", background: "#4fc3f7",
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          display: "inline-block",
        }} />
      ))}
    </div>
  );
}

// ── Risk Badge ─────────────────────────────────────────────────────────────────
function RiskBadge({ level }) {
  if (!level || level === "SAFE") return null;
  const r = RISK[level] || RISK.MEDIUM;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: r.bg, border: `1px solid ${r.color}55`,
      borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700,
      color: r.color, marginBottom: 8, animation: "popIn 0.3s ease",
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", background: r.color,
        boxShadow: `0 0 8px ${r.color}`, animation: level === "CRITICAL" ? "pulse 1s infinite" : "none",
      }} />
      {r.label}
    </div>
  );
}

// ── Single chat bubble ─────────────────────────────────────────────────────────
function Bubble({ msg, isNew }) {
  const isBot = msg.role === "bot";
  const cleanText = msg.text.replace(/<!--RISK:[A-Z]+-->/g, "").trim();

  return (
    <div style={{
      display: "flex",
      flexDirection: isBot ? "row" : "row-reverse",
      alignItems: "flex-end",
      gap: 10,
      marginBottom: 16,
      animation: isNew ? "slideUp 0.35s ease" : "none",
    }}>
      {isBot && (
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #1565c0, #00acc1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, boxShadow: "0 0 14px #1565c055",
        }}>🛡️</div>
      )}
      <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: isBot ? "flex-start" : "flex-end" }}>
        {isBot && msg.riskLevel && <RiskBadge level={msg.riskLevel} />}
        <div style={{
          background: isBot
            ? "linear-gradient(135deg, #0d1b2e, #0a1628)"
            : "linear-gradient(135deg, #1565c0, #0277bd)",
          border: isBot ? "1px solid #ffffff12" : "none",
          borderRadius: isBot ? "4px 18px 18px 18px" : "18px 4px 18px 18px",
          padding: "13px 16px",
          fontSize: 14,
          lineHeight: 1.65,
          color: "#e8f4ff",
          boxShadow: isBot ? "0 4px 20px #00000033" : "0 4px 20px #1565c044",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {cleanText}
        </div>
        <span style={{ fontSize: 10, color: "#445", marginTop: 4, paddingLeft: 4 }}>
          {msg.time}
        </span>
      </div>
    </div>
  );
}

// ── Onboarding screen ──────────────────────────────────────────────────────────
function Onboarding({ onStart }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", padding: "24px 20px",
      animation: "fadeIn 0.6s ease",
    }}>
      {/* Hero */}
      <div style={{
        width: 80, height: 80, borderRadius: 24,
        background: "linear-gradient(135deg, #1565c0, #00acc1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 40, marginBottom: 20,
        boxShadow: "0 0 40px #1565c066, 0 0 80px #1565c022",
        animation: "float 3s ease-in-out infinite",
      }}>🛡️</div>

      <h1 style={{
        margin: "0 0 8px", fontSize: 32, fontWeight: 900,
        background: "linear-gradient(135deg, #fff, #4fc3f7)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        textAlign: "center", letterSpacing: -1,
      }}>TrustBot</h1>

      <p style={{ margin: "0 0 6px", fontSize: 14, color: "#4fc3f7", letterSpacing: 2, textAlign: "center" }}>
        YOUR PERSONAL FRAUD RESCUE COMPANION
      </p>

      <p style={{
        margin: "16px 0 28px", fontSize: 14, color: "#7a9ab8",
        textAlign: "center", maxWidth: 320, lineHeight: 1.7,
      }}>
        Got a suspicious call, message or payment request?
        Just tell me what happened — I'll guide you to safety. 🤝
      </p>

      {/* Stats strip */}
      <div style={{
        display: "flex", gap: 0, marginBottom: 28,
        background: "#0a1628", border: "1px solid #ffffff12",
        borderRadius: 14, overflow: "hidden",
      }}>
        {[
          { n: "2.3L+", l: "Users Protected" },
          { n: "98%", l: "Scams Caught" },
          { n: "24/7", l: "Always Online" },
        ].map((s, i) => (
          <div key={i} style={{
            padding: "14px 20px", textAlign: "center",
            borderRight: i < 2 ? "1px solid #ffffff10" : "none",
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#4fc3f7" }}>{s.n}</div>
            <div style={{ fontSize: 10, color: "#556", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Quick start */}
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ fontSize: 11, color: "#445", letterSpacing: 1.5, marginBottom: 10, textAlign: "center" }}>
          TAP A SITUATION OR TYPE YOUR OWN
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {STARTERS.map((s, i) => (
            <button
              key={i}
              onClick={() => onStart(s.text)}
              style={{
                background: "#0a1628",
                border: "1px solid #ffffff15",
                borderRadius: 12, padding: "12px 16px",
                color: "#cce4f7", fontSize: 13, fontWeight: 500,
                display: "flex", alignItems: "center", gap: 10,
                textAlign: "left", transition: "all 0.2s ease",
                cursor: "pointer",
                animation: `fadeIn 0.4s ease ${i * 0.07}s both`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "#4fc3f766";
                e.currentTarget.style.background = "#0d1f3a";
                e.currentTarget.style.transform = "translateX(4px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "#ffffff15";
                e.currentTarget.style.background = "#0a1628";
                e.currentTarget.style.transform = "translateX(0)";
              }}
            >
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <span>{s.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function TrustBot() {
  const [screen, setScreen] = useState("home"); // home | chat
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentRisk, setCurrentRisk] = useState(null);
  const [newMsgIdx, setNewMsgIdx] = useState(null);
  const [sessionStats, setSessionStats] = useState({ rescued: 0, scamsFound: 0 });
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const historyRef = useRef([]); // Claude message history

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const extractRisk = (text) => {
    const match = text.match(/<!--RISK:([A-Z]+)-->/);
    return match ? match[1] : null;
  };

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = {
      role: "user",
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages(prev => [...prev, userMsg]);
    setNewMsgIdx(messages.length);
    setInput("");
    setLoading(true);

    // Build Claude history
    historyRef.current = [...historyRef.current, { role: "user", content: text.trim() }];

    try {
      const reply = await callClaude(historyRef.current);
      const risk = extractRisk(reply);

      if (risk && risk !== "SAFE") {
        setCurrentRisk(risk);
        setSessionStats(s => ({
          rescued: s.rescued + (["HIGH", "CRITICAL"].includes(risk) ? 1 : 0),
          scamsFound: s.scamsFound + (risk !== "SAFE" && risk !== "LOW" ? 1 : 0),
        }));
      }

      const botMsg = {
        role: "bot",
        text: reply,
        riskLevel: risk,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      historyRef.current = [...historyRef.current, { role: "assistant", content: reply }];
      setMessages(prev => [...prev, botMsg]);
      setNewMsgIdx(messages.length + 1);
    } catch {
      setMessages(prev => [...prev, {
        role: "bot",
        text: "Sorry, I had trouble connecting. Please check your internet and try again 🙏",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [loading, messages.length]);

  const startChat = useCallback((starterText) => {
    setScreen("chat");
    // Small delay so screen transition happens first
    setTimeout(async () => {
      // Send welcome + first message together
      const welcome = {
        role: "bot",
        text: "Hey! 👋 I'm TrustBot, your personal fraud safety companion.\n\nI'm here to help you stay safe. Tell me exactly what happened — don't worry, you're in safe hands now. 🛡️",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages([welcome]);
      setNewMsgIdx(0);
      await sendMessage(starterText);
    }, 300);
  }, [sendMessage]);

  const resetChat = () => {
    setScreen("home");
    setMessages([]);
    setInput("");
    setCurrentRisk(null);
    historyRef.current = [];
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#060d18",
      fontFamily: "'Nunito', 'DM Sans', sans-serif",
      display: "flex",
      flexDirection: "column",
      maxWidth: 480,
      margin: "0 auto",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-8px)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px #ff174444} 50%{box-shadow:0 0 40px #ff174488} }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #1a2a4a; border-radius: 2px; }
        textarea, input { outline: none; font-family: inherit; }
        button { cursor: pointer; border: none; outline: none; font-family: inherit; }
      `}</style>

      {/* ── Ambient BG ── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -100, left: -50, width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, #1565c022, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -50, right: -50, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, #00acc122, transparent 70%)" }} />
      </div>

      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(6,13,24,0.92)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid #ffffff0e",
        padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {screen === "chat" && (
            <button onClick={resetChat} style={{
              background: "#0a1628", border: "1px solid #ffffff15",
              borderRadius: 8, padding: "6px 10px", color: "#7a9ab8", fontSize: 16,
              marginRight: 4,
            }}>←</button>
          )}
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: "linear-gradient(135deg, #1565c0, #00acc1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, boxShadow: "0 0 16px #1565c044",
          }}>🛡️</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: -0.3 }}>TrustBot</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00e676", boxShadow: "0 0 6px #00e676", display: "inline-block" }} />
              <span style={{ fontSize: 11, color: "#00e676" }}>Online & Protecting You</span>
            </div>
          </div>
        </div>

        {/* Risk indicator / session stats */}
        {screen === "chat" && currentRisk && currentRisk !== "SAFE" && (
          <div style={{
            background: RISK[currentRisk]?.bg,
            border: `1px solid ${RISK[currentRisk]?.color}55`,
            borderRadius: 10, padding: "6px 12px",
            fontSize: 12, fontWeight: 800,
            color: RISK[currentRisk]?.color,
            animation: currentRisk === "CRITICAL" ? "glow 1s infinite" : "popIn 0.3s ease",
          }}>
            {RISK[currentRisk]?.emoji} {RISK[currentRisk]?.label}
          </div>
        )}

        {screen === "home" && (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "#ff5252" }}>{sessionStats.scamsFound}</div>
              <div style={{ fontSize: 9, color: "#445" }}>CAUGHT</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Screen: Home ── */}
      {screen === "home" && (
        <div style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1 }}>
          <Onboarding onStart={startChat} />

          {/* Bottom CTA */}
          <div style={{ padding: "0 20px 24px" }}>
            <div style={{
              background: "#0a1628", border: "1px solid #ffffff10",
              borderRadius: 14, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 24 }}>💬</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#cce4f7" }}>Or type your situation below</div>
                <div style={{ fontSize: 11, color: "#445", marginTop: 2 }}>Any scam, fraud, or suspicious activity</div>
              </div>
            </div>

            {/* Custom input on home too */}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && input.trim() && startChat(input)}
                placeholder="Describe what happened..."
                style={{
                  flex: 1, background: "#0a1628",
                  border: "1px solid #ffffff18", borderRadius: 12,
                  padding: "13px 16px", color: "#cce4f7", fontSize: 14,
                }}
              />
              <button
                onClick={() => input.trim() && startChat(input)}
                disabled={!input.trim()}
                style={{
                  background: input.trim() ? "linear-gradient(135deg, #1565c0, #00acc1)" : "#0a1628",
                  borderRadius: 12, padding: "13px 18px",
                  color: input.trim() ? "#fff" : "#334",
                  fontWeight: 800, fontSize: 14,
                  boxShadow: input.trim() ? "0 0 20px #1565c066" : "none",
                  transition: "all 0.3s ease",
                }}
              >Go →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Screen: Chat ── */}
      {screen === "chat" && (
        <>
          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto",
            padding: "16px 14px 8px",
            position: "relative", zIndex: 1,
            minHeight: 0,
          }}>
            {messages.map((msg, i) => (
              <Bubble key={i} msg={msg} isNew={i === newMsgIdx} />
            ))}

            {loading && (
              <div style={{
                display: "flex", alignItems: "flex-end", gap: 10,
                marginBottom: 16, animation: "fadeIn 0.3s ease",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #1565c0, #00acc1)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}>🛡️</div>
                <div style={{
                  background: "#0d1b2e", border: "1px solid #ffffff12",
                  borderRadius: "4px 18px 18px 18px",
                }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick reply chips */}
          {!loading && messages.length > 1 && (
            <div style={{
              padding: "6px 14px", overflowX: "auto",
              display: "flex", gap: 8, zIndex: 2,
            }}>
              {["Tell me more", "What should I do now?", "Is my money safe?", "How do I report this?"].map(chip => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  style={{
                    background: "#0a1628", border: "1px solid #4fc3f733",
                    borderRadius: 20, padding: "7px 14px",
                    color: "#4fc3f7", fontSize: 12, fontWeight: 600,
                    whiteSpace: "nowrap", transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#0d1f3a"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#0a1628"; }}
                >{chip}</button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div style={{
            padding: "10px 14px 16px",
            borderTop: "1px solid #ffffff0a",
            background: "rgba(6,13,24,0.95)",
            backdropFilter: "blur(16px)",
            zIndex: 2,
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Tell me what happened... (Enter to send)"
                rows={1}
                style={{
                  flex: 1,
                  background: "#0d1b2e",
                  border: "1px solid #ffffff18",
                  borderRadius: 16,
                  padding: "13px 16px",
                  color: "#e0f0ff",
                  fontSize: 14,
                  lineHeight: 1.5,
                  resize: "none",
                  maxHeight: 100,
                  overflowY: "auto",
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                style={{
                  width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                  background: (!loading && input.trim())
                    ? "linear-gradient(135deg, #1565c0, #00acc1)"
                    : "#0d1b2e",
                  color: (!loading && input.trim()) ? "#fff" : "#334",
                  fontSize: 18,
                  boxShadow: (!loading && input.trim()) ? "0 0 16px #1565c066" : "none",
                  transition: "all 0.3s ease",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {loading
                  ? <span style={{ width: 16, height: 16, border: "2px solid #334", borderTopColor: "#4fc3f7", borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />
                  : "➤"}
              </button>
            </div>
            <div style={{ fontSize: 10, color: "#334", textAlign: "center", marginTop: 6 }}>
              🔒 Your conversation is private & secure
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
