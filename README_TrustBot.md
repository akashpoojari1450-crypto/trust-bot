# 🛡️ TrustBot — AI Fraud Rescue Companion

![TrustBot](https://img.shields.io/badge/AI%20Powered-Claude%20Sonnet-4fc3f7?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)
![License](https://img.shields.io/badge/License-MIT-00e676?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Live%20Demo-ff4081?style=for-the-badge)

> **"Every other app shows a report. TrustBot rescues you."**

---

## 🎯 Problem Statement

First-time digital users in India are vulnerable to:
- Phishing attacks & fake payment requests
- UPI fraud & OTP theft
- Social engineering via calls & WhatsApp
- Fake job offers, lottery scams & KYC fraud

They don't need a dashboard. They need a **friend who knows what to do**.

---

## 💡 Our Solution

**TrustBot** is a conversational AI fraud rescue companion. Instead of scanning and showing a cold report, TrustBot **talks to the user like a trusted friend** — understanding their situation, detecting danger in real-time, and guiding them to safety step by step.

### The Key Difference

| Traditional Fraud Apps | TrustBot |
|---|---|
| Paste link → Get report | Describe situation → Get rescued |
| Technical output | Plain English conversation |
| One-shot scan | Follow-up questions & guidance |
| User reads data | Bot walks user through safety |
| Static UI | Live, dynamic conversation |

---

## ✨ Features

- 🗣️ **Conversational AI Rescue** — Real-time chat that adapts to each user's situation
- 🚨 **Live Risk Detection** — SAFE / LOW / MEDIUM / HIGH / CRITICAL levels updated per message
- 💬 **Warm, Human Tone** — Talks like a trusted elder sibling, not a security tool
- ⚡ **Quick Start Scenarios** — 6 common scam situations to demo instantly
- 🔁 **Follow-up Intelligence** — AI asks clarifying questions to understand the full threat
- 📱 **Mobile-First Design** — Built for first-time smartphone users
- 🔒 **Privacy First** — Conversations stay local, nothing stored

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, CSS-in-JS |
| AI Engine | Anthropic Claude Sonnet API |
| Fonts | Nunito + DM Mono (Google Fonts) |
| State | React Hooks |
| Deployment | Vercel / Netlify |

---

## 🧠 AI Architecture

```
User describes situation (text)
        ↓
TrustBot System Prompt (Cybersecurity Expert + Warm Friend Persona)
        ↓
Claude Sonnet API — Full conversation history passed each turn
        ↓
Risk Level extracted from hidden <!--RISK:LEVEL--> tag in response
        ↓
Warm, plain-English response rendered as chat bubble
        ↓
Follow-up questions keep conversation going until user is SAFE ✅
```

**Prompt Engineering Strategy:**
- Persona-locked to warm, non-technical friend
- Forced risk classification on every response
- Scam trigger keyword awareness (OTP, KBC, RBI, UPI, blocked, urgent...)
- Response length capped at 2-4 sentences for readability
- Escalation protocol: detect → rescue → educate → empower

---

## 🚀 Setup & Installation

```bash
# Clone
git clone https://github.com/YOUR_TEAM/trustbot-ai
cd trustbot-ai

# Install
npm install

# Run
npm start
```

> The app uses the Anthropic API — works out of the box in Claude Artifacts or add your key via a proxy server.

---

## 📱 Demo Scenarios (Live)

| Tap This | What TrustBot Detects |
|---|---|
| "Someone called saying my bank account is blocked" | CRITICAL — Vishing attack |
| "I received a UPI request from unknown person" | HIGH — Payment fraud |
| "I got a link to claim a prize" | CRITICAL — Phishing |
| "Work from home job with advance fee" | HIGH — Job scam |
| "I won KBC lottery message" | CRITICAL — Lottery fraud |
| "RBI asked for my OTP" | CRITICAL — Impersonation + OTP theft |

---

## 👥 Team

| Name | Role |
|---|---|
| Member 1 | React UI & Chat Interface |
| Member 2 | Claude AI Integration & Prompt Engineering |
| Member 3 | UX Design & User Flow |
| Member 4 | Domain Research & Demo Scenarios |

---

## 📊 Evaluation Criteria Mapping

| Criteria | Marks | Our Approach |
|---|---|---|
| Innovation & Creativity | 20 | Conversational rescue — nobody else did this |
| AI Integration | 20 | Multi-turn Claude chat with live risk extraction |
| Problem Understanding | 15 | Covers all 6 major fraud types with empathy |
| Technical Implementation | 15 | Clean React, conversation history, real-time AI |
| User Experience | 10 | Mobile-first, zero jargon, warm tone |
| Real-Time Functionality | 10 | Live risk badge updates per message |
| Presentation & Demo | 5 | Every demo is live and unique |
| Social Impact | 5 | Designed for India's next billion users |

---

## 🔮 Roadmap

- [ ] Voice input (speak your situation)
- [ ] Hindi / regional language support
- [ ] WhatsApp bot integration
- [ ] Offline mode with on-device model
- [ ] Report to cybercrime portal (direct link)

---

*Built with ❤️ at Hackathon 2026*
*Protecting India's first-time digital users — one conversation at a time.*
