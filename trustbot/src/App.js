import { useState, useRef, useEffect, useCallback } from "react";

const SYSTEM_PROMPT = `You are TrustBot — a friendly AI assistant and fraud detection expert for Indian users.

You have TWO modes:

1. CASUAL CHAT MODE — For greetings and small talk (hi, hello, how are you, what's your name, etc.), respond naturally and warmly like a friendly chatbot. Keep it short and conversational.

2. SCAM DETECTION MODE — When someone describes or shows a suspicious call, message, payment request, OTP request, lottery win, KYC pending, job offer, screenshot, etc., IMMEDIATELY:
   - Give a verdict: 🔴 SCAM / 🟡 SUSPICIOUS / 🟢 SAFE
   - Explain in 2-3 simple sentences what the scammer is doing
   - Give 3 numbered action steps
   - Use simple English mixed with Hindi words naturally (like "yaar", "bhai", "bilkul")

If the user uploads an image/screenshot, analyze it carefully for scam indicators like fake logos, suspicious links, urgent language, requests for OTP/money/personal info.

Always be warm, helpful, and easy to understand for Indian users.`;

const QUICK_SCENARIOS = [
  { icon: "📞", label: "Bank OTP call", text: "Someone called saying they're from SBI and my account will be blocked. They're asking for my OTP to verify." },
  { icon: "💸", label: "KYC scam", text: "Got a WhatsApp message saying my Paytm KYC is pending and my wallet will be blocked. They sent a link." },
  { icon: "🎁", label: "Prize winner", text: "Received SMS saying I won ₹25,000 in a lucky draw. They want ₹500 processing fee first." },
  { icon: "👨‍💼", label: "Job offer scam", text: "Got a call offering work from home job, paying ₹50,000/month. They asked me to pay ₹2,000 for registration." },
  { icon: "📱", label: "Fake app", text: "Someone sent me a link to download an app to get cashback on my electricity bill." },
  { icon: "💳", label: "UPI request", text: "A stranger sent me a UPI collect request for ₹1 saying it's for verification of my account." },
];

const API_KEY = process.env.REACT_APP_GROQ_KEY || "";

export default function TrustBot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [riskLevel, setRiskLevel] = useState(null);
  const [showIntro, setShowIntro] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const speakText = useCallback((text) => {
    if (!voiceEnabled) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const cleanText = text.replace(/[\u{1F600}-\u{1F9FF}]/gu, "").replace(/🔴|🟡|🟢/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.includes("en-IN")) ||
                        voices.find(v => v.lang.includes("en-GB")) ||
                        voices.find(v => v.lang.includes("en"));
      if (preferred) utterance.voice = preferred;
      synth.speak(utterance);
    };
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = trySpeak;
    } else {
      trySpeak();
    }
  }, [voiceEnabled]);

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const toggleVoice = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = "en-IN";
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.onresult = (e) => {
          setInput(e.results[0][0].transcript);
          setListening(false);
        };
        recognitionRef.current.onerror = () => setListening(false);
        recognitionRef.current.onend = () => setListening(false);
        recognitionRef.current.start();
        setListening(true);
      } catch(e) {
        setListening(false);
      }
    }
  }, [listening]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1];
      setImageBase64(base64);
      setImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const detectRisk = (text) => {
    if (text.includes("🔴")) return "danger";
    if (text.includes("🟡")) return "suspicious";
    if (text.includes("🟢")) return "safe";
    return null;
  };

  const sendMessage = async (overrideText) => {
    const userText = (overrideText || input).trim();
    if (!userText && !imageBase64) return;
    if (loading) return;

    const displayText = userText || "📸 Analyze this screenshot for scams";
    setInput("");
    setShowIntro(false);
    setLoading(true);
    setRiskLevel(null);
    stopSpeaking();

    const capturedImage = imageBase64;
    const capturedPreview = imagePreview;
    clearImage();

    const newMessages = [...messages, {
      role: "user",
      content: displayText,
      imagePreview: capturedPreview,
    }];
    setMessages(newMessages);

    try {
      // Build Groq message content
      let userContent;
      if (capturedImage) {
        // Groq vision model supports images
        userContent = [
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${capturedImage}`,
            },
          },
          {
            type: "text",
            text: userText || "Please analyze this screenshot. Is this a scam or fraud? Check for suspicious links, fake logos, urgent language, requests for OTP or money.",
          },
        ];
      } else {
        userContent = userText;
      }

      // Build messages array for API (without imagePreview field)
      const apiMessages = newMessages.map(m => ({
        role: m.role,
        content: m.role === "user" && m === newMessages[newMessages.length - 1]
          ? userContent
          : (typeof m.content === "string" ? m.content : "User sent an image for analysis"),
      }));

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: capturedImage ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile",
          max_tokens: 1000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...apiMessages,
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || "API error");
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that. Try again.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
      setRiskLevel(detectRisk(reply));
      speakText(reply);
    } catch (e) {
      setMessages([...newMessages, { role: "assistant", content: "🔴 Connection error: " + e.message }]);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const getBgGlow = () => {
    if (riskLevel === "danger") return "rgba(239,68,68,0.15)";
    if (riskLevel === "suspicious") return "rgba(245,158,11,0.12)";
    if (riskLevel === "safe") return "rgba(34,197,94,0.12)";
    return "transparent";
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(ellipse at top, ${getBgGlow()} 0%, transparent 60%), 
                   linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #0a0a0f 100%)`,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: "flex", flexDirection: "column",
      transition: "background 0.8s ease",
    }}>
      {/* Header */}
      <header style={{
        padding: "16px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.02)",
        backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", gap: "12px",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{
          width: 40, height: 40,
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, boxShadow: "0 0 20px rgba(59,130,246,0.4)",
        }}>🛡️</div>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px" }}>TrustBot</div>
          <div style={{ color: "#4ade80", fontSize: 11, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block", animation: "pulse 2s infinite" }} />
            Fraud Rescue AI • Available 24/7
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => { setVoiceEnabled(v => !v); stopSpeaking(); }} title={voiceEnabled ? "Mute voice" : "Enable voice"} style={{
            width: 34, height: 34, borderRadius: 8,
            background: voiceEnabled ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
            border: voiceEnabled ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>
            {voiceEnabled ? "🔊" : "🔇"}
          </button>
          {speaking && (
            <button onClick={stopSpeaking} style={{
              width: 34, height: 34, borderRadius: 8,
              background: "rgba(245,158,11,0.15)",
              border: "1px solid rgba(245,158,11,0.4)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "#fbbf24", fontWeight: 600,
            }}>⏸</button>
          )}
          {riskLevel && (
            <div style={{
              padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: riskLevel === "danger" ? "rgba(239,68,68,0.2)" : riskLevel === "suspicious" ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)",
              color: riskLevel === "danger" ? "#f87171" : riskLevel === "suspicious" ? "#fbbf24" : "#4ade80",
              border: `1px solid ${riskLevel === "danger" ? "rgba(239,68,68,0.4)" : riskLevel === "suspicious" ? "rgba(245,158,11,0.4)" : "rgba(34,197,94,0.4)"}`,
            }}>
              {riskLevel === "danger" ? "🔴 DANGER" : riskLevel === "suspicious" ? "🟡 SUSPICIOUS" : "🟢 SAFE"}
            </div>
          )}
        </div>
      </header>

      {speaking && (
        <div style={{
          background: "rgba(59,130,246,0.1)", borderBottom: "1px solid rgba(59,130,246,0.2)",
          padding: "8px 20px", display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{ display: "flex", gap: 3 }}>
            {[0,0.1,0.2,0.3,0.4].map((d,i) => (
              <span key={i} style={{
                width: 3, height: 14, borderRadius: 2, background: "#3b82f6",
                animation: `soundWave 0.8s ${d}s infinite`, display: "inline-block",
              }} />
            ))}
          </div>
          <span style={{ color: "#93c5fd", fontSize: 12 }}>TrustBot is speaking...</span>
          <button onClick={stopSpeaking} style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "#64748b", cursor: "pointer", fontSize: 12,
          }}>Stop</button>
        </div>
      )}

      {!API_KEY && (
        <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", margin: "12px 16px", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>
          ⚠️ No API key. Add <code>REACT_APP_GROQ_KEY=your_key</code> to <code>.env</code> and restart.
        </div>
      )}

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", maxWidth: 680, width: "100%", margin: "0 auto" }}>
        {showIntro && (
          <div style={{ animation: "fadeIn 0.6s ease" }}>
            <div style={{ textAlign: "center", padding: "32px 16px 24px" }}>
              <div style={{
                width: 72, height: 72,
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 36, margin: "0 auto 16px", boxShadow: "0 0 40px rgba(139,92,246,0.4)",
              }}>🛡️</div>
              <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.5px" }}>
                Tell me what happened
              </h1>
              <p style={{ color: "#94a3b8", fontSize: 15, margin: 0, lineHeight: 1.6 }}>
                Speak, type, or upload a screenshot of any suspicious message.<br />
                I'll warn you instantly — with voice! 🔊
              </p>
            </div>
            <div style={{ marginBottom: 24 }}>
              <p style={{ color: "#64748b", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12, paddingLeft: 4 }}>
                Common situations
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {QUICK_SCENARIOS.map((s) => (
                  <button key={s.label} onClick={() => sendMessage(s.text)} style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12, padding: "12px 14px", cursor: "pointer", textAlign: "left",
                    transition: "all 0.2s ease", display: "flex", alignItems: "center", gap: 10,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  >
                    <span style={{ fontSize: 20 }}>{s.icon}</span>
                    <span style={{ color: "#cbd5e1", fontSize: 13, fontWeight: 500 }}>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            marginBottom: 16, display: "flex",
            flexDirection: msg.role === "user" ? "row-reverse" : "row",
            alignItems: "flex-end", gap: 10, animation: "slideUp 0.3s ease",
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, flexShrink: 0,
              }}>🛡️</div>
            )}
            <div style={{ maxWidth: "80%" }}>
              {msg.imagePreview && (
                <div style={{ marginBottom: 6, textAlign: "right" }}>
                  <img src={msg.imagePreview} alt="uploaded" style={{
                    maxWidth: 200, maxHeight: 150, borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)", objectFit: "cover",
                  }} />
                </div>
              )}
              <div style={{
                padding: "12px 16px",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: msg.role === "user" ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "rgba(255,255,255,0.06)",
                border: msg.role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : "none",
                color: "#e2e8f0", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap",
              }}>
                {msg.content}
              </div>
              {msg.role === "assistant" && (
                <button onClick={() => speakText(msg.content)} style={{
                  marginTop: 4, background: "none", border: "none",
                  color: "#475569", fontSize: 11, cursor: "pointer", padding: "2px 4px",
                  display: "flex", alignItems: "center", gap: 4,
                }}>🔊 Replay</button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}>🛡️</div>
            <div style={{
              padding: "14px 18px", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px 18px 18px 4px",
              display: "flex", gap: 6, alignItems: "center",
            }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <span key={i} style={{
                  width: 8, height: 8, borderRadius: "50%", background: "#3b82f6",
                  animation: `bounce 1s ${d}s infinite`, display: "inline-block",
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: "12px 16px 20px",
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          {!showIntro && messages.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
              {["What should I do?", "Is this safe to click?", "How do I report this?"].map(q => (
                <button key={q} onClick={() => sendMessage(q)} style={{
                  background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)",
                  borderRadius: 20, padding: "5px 12px", color: "#93c5fd", fontSize: 12,
                  cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                }}>{q}</button>
              ))}
            </div>
          )}

          {/* Image preview before sending */}
          {imagePreview && (
            <div style={{
              marginBottom: 8, padding: "8px 12px",
              background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: 12, display: "flex", alignItems: "center", gap: 10,
            }}>
              <img src={imagePreview} alt="preview" style={{
                width: 48, height: 48, borderRadius: 8, objectFit: "cover",
                border: "1px solid rgba(255,255,255,0.1)",
              }} />
              <div style={{ flex: 1 }}>
                <p style={{ color: "#93c5fd", fontSize: 12, margin: 0, fontWeight: 500 }}>📸 Screenshot ready to analyze</p>
                <p style={{ color: "#475569", fontSize: 11, margin: 0 }}>Add a message or send as-is</p>
              </div>
              <button onClick={clearImage} style={{
                background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 6, padding: "4px 8px", color: "#f87171", fontSize: 12, cursor: "pointer",
              }}>✕ Remove</button>
            </div>
          )}

          <div style={{
            display: "flex", gap: 10,
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${listening ? "rgba(239,68,68,0.5)" : imagePreview ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 16, padding: "8px 8px 8px 16px", alignItems: "flex-end",
            transition: "border-color 0.3s",
          }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={listening ? "🎤 Listening... speak now" : "Speak 🎙️, type, or upload screenshot 📸..."}
              rows={1}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#e2e8f0", fontSize: 15, resize: "none", lineHeight: 1.6,
                maxHeight: 120, overflowY: "auto", fontFamily: "inherit",
              }}
              onInput={e => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
            />

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />

            {/* Upload button */}
            <button onClick={() => fileInputRef.current?.click()} title="Upload screenshot" style={{
              width: 38, height: 38, borderRadius: 10,
              background: imagePreview ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.06)",
              border: imagePreview ? "1px solid rgba(59,130,246,0.6)" : "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, transition: "all 0.2s", flexShrink: 0,
            }}>📸</button>

            {/* Mic button */}
            <button onClick={toggleVoice} title={listening ? "Stop" : "Speak"} style={{
              width: 38, height: 38, borderRadius: 10,
              background: listening ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.06)",
              border: listening ? "1px solid rgba(239,68,68,0.6)" : "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, transition: "all 0.2s",
              boxShadow: listening ? "0 0 12px rgba(239,68,68,0.5)" : "none",
              animation: listening ? "pulseRed 1.5s infinite" : "none",
              flexShrink: 0,
            }}>
              {listening ? "⏹️" : "🎙️"}
            </button>

            {/* Send button */}
            <button onClick={() => sendMessage()} disabled={(!input.trim() && !imageBase64) || loading} style={{
              width: 38, height: 38, borderRadius: 10,
              background: (input.trim() || imageBase64) && !loading ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "rgba(255,255,255,0.04)",
              border: "none", cursor: (input.trim() || imageBase64) && !loading ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, transition: "all 0.2s",
              boxShadow: (input.trim() || imageBase64) && !loading ? "0 0 16px rgba(59,130,246,0.4)" : "none",
              flexShrink: 0,
            }}>
              {loading ? "⏳" : "➤"}
            </button>
          </div>
          <p style={{ color: "#334155", fontSize: 11, textAlign: "center", marginTop: 8, marginBottom: 0 }}>
            TrustBot • Never share OTPs, passwords, or banking details with anyone
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseRed { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)} 50%{box-shadow:0 0 0 8px rgba(239,68,68,0)} }
        @keyframes soundWave { 0%,100%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        textarea::placeholder { color: #475569; }
      `}</style>
    </div>
  );
}