import React, { useState, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/* ============================================================
   RANDOM ACTS OF KINDNESS — v1.4 "Feed, Nav & Kindness+"
   New in v1.4:
   • Feed moved to its own page behind a Kindness+ demo paywall
   • App-style bottom navigation (Home · Feed · Map · Profile)
   • Location fix: clear GPS error messages + type-a-place fallback
   From v1.3:
   • Kindness Map — interactive world map of geo-tagged acts (Leaflet + OSM)
   • Social feed — hearts, comments, native share on every act
   • Community challenges — join goals with live progress bars
   From v1.2:
   • Attach photo proof to any act — resized on-device, quota-aware
   • Optional geo-tag per act, reverse-geocoded to a place name
   • Feed shows photos + locations
   From v1.1:
   • Onboarding / user registration (name, age, location, email, bio)
   • Avatar: emoji + color, or upload a real photo (resized on-device)
   • Kindness preferences that personalize the category order
   • Profile dashboard: stats, badges, kindness-by-category breakdown
   Everything stays on-device (localStorage) — no server needed yet.
   ============================================================ */

const CATEGORIES = [
  { id: "helping", label: "Helping Hand", emoji: "🤝", points: 10, color: "#ffb26b" },
  { id: "donation", label: "Donation", emoji: "🎁", points: 15, color: "#ff5d73" },
  { id: "emotional", label: "Emotional Support", emoji: "💬", points: 12, color: "#c58bff" },
  { id: "environment", label: "Environment", emoji: "🌱", points: 12, color: "#7be3b1" },
  { id: "community", label: "Community", emoji: "🏘️", points: 20, color: "#7cc4ff" },
];

const FEELINGS = [
  { label: "Grateful", emoji: "🙏" },
  { label: "Joyful", emoji: "😊" },
  { label: "Empowered", emoji: "💪" },
  { label: "Connected", emoji: "🫶" },
  { label: "Peaceful", emoji: "🕊️" },
];

const LEVELS = [
  { min: 0, name: "Kind Spark" },
  { min: 50, name: "Good Neighbor" },
  { min: 150, name: "Heart of Gold" },
  { min: 300, name: "Community Hero" },
  { min: 600, name: "Kindness Legend" },
];

const BADGES = [
  // ── COMMON ──────────────────────────────────────────────
  { id:"first",    name:"First Spark",       desc:"Log your first act",        emoji:"✨", color:"#ffd166", shape:"star",  tier:"common",   test:s=>s.total>=1 },
  { id:"five",     name:"Ripple Maker",       desc:"5 acts logged",             emoji:"🌊", color:"#7cc4ff", shape:"medal", tier:"common",   test:s=>s.total>=5 },
  { id:"streak3",  name:"On a Roll",          desc:"3-day streak",              emoji:"🔥", color:"#ffb26b", shape:"heart", tier:"common",   test:s=>s.streak>=3 },
  { id:"giver",    name:"Generous Heart",     desc:"3 donations",               emoji:"💝", color:"#ff5d73", shape:"heart", tier:"common",   test:s=>s.byCat.donation>=3 },
  { id:"peace",    name:"Peacekeeper",        desc:"5 emotional support acts",  emoji:"☮️", color:"#7be3b1", shape:"star",  tier:"common",   test:s=>(s.byCat.emotional||0)>=5 },
  { id:"nfriend",  name:"Nature Friend",      desc:"5 environment acts",        emoji:"🌿", color:"#7be3b1", shape:"medal", tier:"common",   test:s=>(s.byCat.environment||0)>=5 },
  // ── UNCOMMON ────────────────────────────────────────────
  { id:"ten",      name:"Wave of Good",       desc:"10 acts logged",            emoji:"🌟", color:"#ffd166", shape:"star",  tier:"uncommon", test:s=>s.total>=10 },
  { id:"streak7",  name:"Week of Warmth",     desc:"7-day streak",              emoji:"🏆", color:"#ffd166", shape:"medal", tier:"uncommon", test:s=>s.streak>=7 },
  { id:"points100",name:"Century of Care",    desc:"100 points",                emoji:"💯", color:"#ffb26b", shape:"medal", tier:"uncommon", test:s=>s.points>=100 },
  { id:"photog",   name:"Proof Positive",     desc:"5 acts with photos",        emoji:"📸", color:"#7cc4ff", shape:"star",  tier:"uncommon", test:s=>(s.withPhotos||0)>=5 },
  { id:"storytel", name:"Storyteller",        desc:"5 comments written",        emoji:"💬", color:"#c58bff", shape:"heart", tier:"uncommon", test:s=>(s.commentCount||0)>=5 },
  { id:"helper",   name:"Helping Force",      desc:"10 helping acts",           emoji:"🤝", color:"#ffd166", shape:"star",  tier:"uncommon", test:s=>(s.byCat.helping||0)>=10 },
  // ── RARE ────────────────────────────────────────────────
  { id:"twentyfive",name:"Kindness Force",    desc:"25 acts logged",            emoji:"🚀", color:"#c58bff", shape:"medal", tier:"rare",     test:s=>s.total>=25 },
  { id:"donking",  name:"Donation King",      desc:"10 donations",              emoji:"🤴", color:"#ffd166", shape:"medal", tier:"rare",     test:s=>(s.byCat.donation||0)>=10 },
  { id:"volhero",  name:"Volunteer Hero",     desc:"10 community acts",         emoji:"🦺", color:"#7cc4ff", shape:"medal", tier:"rare",     test:s=>(s.byCat.community||0)>=10 },
  { id:"eartha",   name:"Earth Angel",        desc:"10 environment acts",       emoji:"🌍", color:"#7be3b1", shape:"star",  tier:"rare",     test:s=>(s.byCat.environment||0)>=10 },
  { id:"heartwarm",name:"Heartwarmer",        desc:"10 emotional supports",     emoji:"🤗", color:"#c58bff", shape:"heart", tier:"rare",     test:s=>(s.byCat.emotional||0)>=10 },
  { id:"explore",  name:"Kindness Explorer",  desc:"Acts in 3 places",          emoji:"🧭", color:"#7be3b1", shape:"medal", tier:"rare",     test:s=>(s.uniquePlaces||0)>=3 },
  { id:"streak14", name:"Fortnight of Good",  desc:"14-day streak",             emoji:"⚡", color:"#7cc4ff", shape:"star",  tier:"rare",     test:s=>s.streak>=14 },
  { id:"points500",name:"Point Titan",        desc:"500 points",                emoji:"🏅", color:"#ffd166", shape:"medal", tier:"rare",     test:s=>s.points>=500 },
  { id:"social50", name:"Social Butterfly",   desc:"50 hearts given",           emoji:"🦋", color:"#ff8fa3", shape:"heart", tier:"rare",     test:s=>(s.heartsGiven||0)>=50 },
  { id:"journalist",name:"Photo Journalist",  desc:"10 acts with photos",       emoji:"🎬", color:"#7cc4ff", shape:"medal", tier:"rare",     test:s=>(s.withPhotos||0)>=10 },
  // ── EPIC ────────────────────────────────────────────────
  { id:"fifty",    name:"Half-Century Hero",  desc:"50 acts logged",            emoji:"🦸", color:"#ff5d73", shape:"medal", tier:"epic",     test:s=>s.total>=50 },
  { id:"streak30", name:"30-Day Kindness",    desc:"30 days in a row!",         emoji:"🎖️", color:"#ff5d73", shape:"medal", tier:"epic",     test:s=>s.streak>=30 },
  { id:"cosmexp",  name:"Cosmic Explorer",    desc:"Acts in 7 places",          emoji:"🌐", color:"#c58bff", shape:"star",  tier:"epic",     test:s=>(s.uniquePlaces||0)>=7 },
  { id:"champgiv", name:"Champion Giver",     desc:"25 donations",              emoji:"🎗️", color:"#ff8fa3", shape:"medal", tier:"epic",     test:s=>(s.byCat.donation||0)>=25 },
  { id:"pts1000",  name:"Wealth of Kindness", desc:"1,000 points",              emoji:"💎", color:"#7cc4ff", shape:"star",  tier:"epic",     test:s=>s.points>=1000 },
  { id:"comchamp", name:"Community Champion", desc:"30 community acts",         emoji:"🏙️", color:"#ffd166", shape:"medal", tier:"epic",     test:s=>(s.byCat.community||0)>=30 },
  { id:"streak60", name:"Streak Legend",      desc:"60-day streak",             emoji:"🌈", color:"#c58bff", shape:"star",  tier:"epic",     test:s=>s.streak>=60 },
  // ── LEGENDARY ───────────────────────────────────────────
  { id:"hundred",  name:"Kindness Legend",    desc:"100 acts logged",           emoji:"👑", color:"#ffd166", shape:"star",  tier:"legendary",test:s=>s.total>=100 },
  { id:"pts5000",  name:"Cosmic Wealth",      desc:"5,000 points",              emoji:"⭐", color:"#ffd166", shape:"star",  tier:"legendary",test:s=>s.points>=5000 },
  { id:"cosmdono", name:"Cosmic Giver",        desc:"50 donations",              emoji:"🌌", color:"#c58bff", shape:"medal", tier:"legendary",test:s=>(s.byCat.donation||0)>=50 },
  // ── MYTHIC ──────────────────────────────────────────────
  { id:"year",     name:"Year of Kindness",   desc:"365 acts logged",           emoji:"🎇", color:"#ff8fa3", shape:"star",  tier:"mythic",   test:s=>s.total>=365 },
  { id:"dna",      name:"DNA Awakened",       desc:"Creature fully evolved",    emoji:"🐉", color:"#c58bff", shape:"medal", tier:"mythic",   test:s=>s.total>=100 },
  { id:"omni",     name:"Omnigiver",          desc:"20+ acts in every category",emoji:"🌠", color:"#ffd166", shape:"star",  tier:"mythic",   test:s=>Object.values(s.byCat||{}).filter(v=>v>=20).length>=5 },
];

const IDEAS = [
  "Text someone a genuine compliment",
  "Pick up litter on your street",
  "Let someone go ahead of you in line",
  "Leave a generous tip with a kind note",
  "Check in on a friend you haven't heard from",
  "Write a positive review for a small business",
  "Donate clothes you no longer wear",
  "Bring coffee to a coworker",
];

const AVATAR_EMOJIS = ["😊", "🌟", "💛", "🦋", "🌸", "🐝", "🌊", "🔥", "🕊️", "🍀", "🌻", "🐢"];
const AVATAR_COLORS = ["#ff8fa3", "#ffb26b", "#ffd166", "#c58bff", "#7be3b1", "#7cc4ff"];

const STORAGE_KEY = "rak-acts-v1";
const PROFILE_KEY = "rak-profile-v1";
const CHALLENGES_KEY = "rak-challenges-v1";
const CHAT_KEY = "rak-chat-v1";
const PENDING_KEY = "rak-pending-v1";
const ADMIN_EMAIL = "particleserv@gmail.com";
const CASHAPP_TAG = "$AlmightyAtum";
const PLANS = {
  monthly: { price: "$4.99", amount: "4.99", label: "Monthly" },
  yearly:  { price: "$39.99", amount: "39.99", label: "Yearly · save 33%" },
};
const ACCOUNTS_KEY = "rak-accounts-v1";
const SESSION_KEY  = "rak-session-v1";
const ADMIN_PASS   = "RAK@Admin2025"; // change after first login

/* Deterministic 8-char activation code from subscriber email.
   Works cross-device: admin generates on their phone, subscriber
   enters on their phone — no backend required. */
const generateActivationCode = (email) => {
  const raw = (email || "unknown").toLowerCase().trim() + ":RAK-KIND-2025";
  const b = btoa(unescape(encodeURIComponent(raw)));
  // Take chars from positions 2,5,8,11,14,17,20,23 for spread
  let code = "";
  for (let i = 0; i < 8; i++) code += b[(i * 3 + 2) % b.length];
  return code.toUpperCase().replace(/[+/=]/g, (c) => ({ "+": "K", "/": "N", "=": "D" }[c]));
};
const PREMIUM_KEY = "rak-premium-v1";

const CHALLENGE_TEMPLATES = [
  { id: "kind7", name: "Kind 7", desc: "7 acts in 7 days", emoji: "🎯", target: 7, days: 7 },
  { id: "century", name: "Century of Kindness", desc: "100 acts in 30 days", emoji: "💯", target: 100, days: 30 },
  { id: "generous10", name: "Generous 10", desc: "10 donations in 30 days", emoji: "🎁", target: 10, days: 30, cat: "donation" },
  { id: "green15", name: "Green Streak", desc: "15 environment acts in 30 days", emoji: "🌱", target: 15, days: 30, cat: "environment" },
];

/* ---------- storage adapter ----------
   Uses Claude artifact storage when available, falls back to
   localStorage (Termux / browser), then to in-memory. */
const memoryStore = {};
const hasWinStorage = () =>
  typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";

const store = {
  async get(key) {
    if (hasWinStorage()) {
      try {
        return await window.storage.get(key, false);
      } catch (e) {
        return null; // key doesn't exist yet
      }
    }
    try {
      const v = window.localStorage.getItem(key);
      return v == null ? null : { key, value: v };
    } catch (e) {
      return key in memoryStore ? { key, value: memoryStore[key] } : null;
    }
  },
  async set(key, value) {
    if (hasWinStorage()) {
      try {
        const r = await window.storage.set(key, value, false);
        return r ? { key, value, persisted: true } : { key, value, persisted: false };
      } catch (e) {
        console.error("save failed", e);
        return { key, value, persisted: false };
      }
    }
    try {
      window.localStorage.setItem(key, value);
      return { key, value, persisted: true };
    } catch (e) {
      // quota exceeded → keep in memory so the session still works
      memoryStore[key] = value;
      return { key, value, persisted: false };
    }
  },
  async remove(key) {
    if (hasWinStorage()) {
      try {
        return await window.storage.delete(key, false);
      } catch (e) {
        return null;
      }
    }
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      delete memoryStore[key];
    }
    return { key, deleted: true };
  },
};

/* ---------- helpers ---------- */

function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

function computeStreak(acts) {
  if (!acts.length) return 0;
  const days = new Set(acts.map((a) => new Date(a.ts).toDateString()));
  const cursor = new Date();
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function starShape(points = 5, outer = 1, inner = 0.45) {
  const s = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const ang = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

const BUDDY_REPLIES = [
  "Love that energy! 💛 What's one small kindness you could do in the next hour?",
  "You're building something beautiful. Try this: {IDEA}",
  "Kind people find kind people — keep logging and your ripple grows 🌊",
  "That made me smile! Here's an idea for tomorrow: {IDEA}",
  "Streaks are built one day at a time. You've got this 🔥",
  "Here's a thought: {IDEA} — want to make it today's act?",
  "Every act you log inspires the next one. Proud of you ✨",
];

/* Lazy-load Leaflet from CDN only when the map is opened — zero npm deps */
let leafletPromise = null;
function loadLeaflet() {
  if (typeof window !== "undefined" && window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    s.onload = () => resolve(window.L);
    s.onerror = () => {
      leafletPromise = null;
      reject(new Error("Leaflet failed to load"));
    };
    document.head.appendChild(s);
  });
  return leafletPromise;
}

/* ---------- shared styles & small blocks ---------- */

const glass = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.09)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
};

const fieldStyle = {
  background: "rgba(0,0,0,0.28)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fdf3ec",
  fontSize: 14,
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Outfit:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  input::placeholder, textarea::placeholder { color: rgba(253,243,236,0.35); }
  @keyframes rakToastIn {
    from { opacity: 0; transform: translate(-50%, 14px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
  @keyframes rakPulse {
    0%, 100% { transform: scale(1); opacity: .7; }
    50% { transform: scale(1.2); opacity: 1; }
  }
  @keyframes rakSpinY {
    0% { transform: rotateY(0deg); }
    100% { transform: rotateY(360deg); }
  }
  @keyframes rakBadgeFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  @keyframes rakMarkerPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 2px 8px rgba(0,0,0,.4); }
    50% { transform: scale(1.15); box-shadow: 0 4px 16px rgba(255,209,102,.5); }
  }
  @keyframes rak3dTilt {
    0%,100% { transform: perspective(500px) rotateX(0deg) rotateY(0deg) translateY(0); }
    25%    { transform: perspective(500px) rotateX(4deg) rotateY(-5deg) translateY(-2px); }
    75%    { transform: perspective(500px) rotateX(-4deg) rotateY(5deg) translateY(2px); }
  }
  @keyframes rakRingOrbit {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes rakGlowPulse {
    0%,100% { opacity: .35; filter: blur(6px); transform: scale(.96); }
    50%     { opacity: .7; filter: blur(10px); transform: scale(1.06); }
  }
  @keyframes rakShimmer {
    0%   { background-position: -300% center; }
    100% { background-position:  300% center; }
  }
  @keyframes rakFlame {
    0%,100% { transform: scaleX(1) scaleY(1) rotate(-1deg); }
    33%     { transform: scaleX(1.18) scaleY(.88) rotate(1deg); }
    66%     { transform: scaleX(.9) scaleY(1.1) rotate(-2deg); }
  }
  @keyframes rakHeartPop {
    0%   { transform: translate(-50%,-50%) scale(0) rotate(0deg); opacity:1; }
    60%  { transform: translate(-50%,-50%) scale(1.4) rotate(-20deg); opacity:1; }
    100% { transform: translate(-50%,-50%) scale(.8) rotate(-30deg) translateY(-60px); opacity:0; }
  }
  @keyframes rakHeartFloat {
    0%   { opacity:1; transform: translateY(0) scale(1) rotate(var(--r,0deg)); }
    100% { opacity:0; transform: translateY(-80px) scale(.5) rotate(var(--r2,40deg)); }
  }
  @keyframes rakConicSpin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes rakStatRing {
    0%,100% { transform: rotate(0deg) scale(1); opacity:.6; }
    50%     { transform: rotate(180deg) scale(1.08); opacity:1; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
`;

function Shell({ children }) {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "linear-gradient(180deg, #170812 0%, #2a1124 42%, #170812 100%)",
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}
    >
      <style>{GLOBAL_CSS}</style>
      {children}
    </div>
  );
}

function Card({ children, className = "", style = {} }) {
  return (
    <div className={`rounded-3xl p-5 ${className}`} style={{ ...glass, ...style }}>
      {children}
    </div>
  );
}

function StatCard({ value, label, accent, delay = "0s" }) {
  return (
    <div
      className="rounded-2xl px-2 py-4 text-center relative overflow-hidden"
      style={{
        ...glass,
        animation: `rak3dTilt ${4.8 + Math.random() * 1.2}s ease-in-out infinite`,
        animationDelay: delay,
        transformStyle: "preserve-3d",
      }}
    >
      {/* glowing ring behind value */}
      <div
        style={{
          position: "absolute",
          top: "50%", left: "50%",
          width: 54, height: 54,
          marginTop: -27, marginLeft: -27,
          borderRadius: "50%",
          border: `2px solid ${accent}`,
          animation: `rakStatRing ${3.5 + Math.random()}s ease-in-out infinite`,
          animationDelay: delay,
          opacity: 0.55,
          pointerEvents: "none",
        }}
      />
      {/* shimmer accent line */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent 0%, ${accent} 50%, transparent 100%)`,
        backgroundSize: "300% 100%",
        animation: "rakShimmer 2.8s linear infinite",
        animationDelay: delay,
      }} />
      <div className="font-bold relative z-10" style={{ fontFamily: "'Fraunces', serif", fontSize: 30, lineHeight: 1, color: accent }}>
        {value}
      </div>
      <div className="mt-2 uppercase relative z-10" style={{ fontSize: 10, letterSpacing: "0.18em", color: "rgba(253,243,236,0.55)" }}>
        {label}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div className="uppercase font-semibold mb-3 mt-8" style={{ fontSize: 11, letterSpacing: "0.3em", color: "rgba(255,209,102,0.85)" }}>
      {children}
    </div>
  );
}

/* ---- 3D arc-progress ring for the level card ---- */
function LevelRing3D({ progress, level, nextLevel, points }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 140, H = 140;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const cx = W / 2, cy = H / 2, R = 56, line = 9;
    const start = -Math.PI * 1.2, end = Math.PI * 0.2;
    const filled = start + (end - start) * Math.min(progress, 1);
    let animFrame;
    let current = start;
    const speed = (filled - start) / 38;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // glow shadow
      ctx.shadowColor = "#ff8fa3";
      ctx.shadowBlur = 14;
      // track
      ctx.beginPath();
      ctx.arc(cx, cy, R, start, end);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = line;
      ctx.lineCap = "round";
      ctx.shadowBlur = 0;
      ctx.stroke();
      // filled arc
      if (current > start) {
        ctx.shadowColor = "#ffd166";
        ctx.shadowBlur = 16;
        const grad = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
        grad.addColorStop(0, "#ff5d73");
        grad.addColorStop(1, "#ffd166");
        ctx.beginPath();
        ctx.arc(cx, cy, R, start, current);
        ctx.strokeStyle = grad;
        ctx.lineWidth = line;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.shadowBlur = 0;
        // leading dot glow
        const lx = cx + R * Math.cos(current);
        const ly = cy + R * Math.sin(current);
        ctx.beginPath();
        ctx.arc(lx, ly, line / 2 + 2, 0, Math.PI * 2);
        ctx.fillStyle = "#ffd166";
        ctx.shadowColor = "#ffd166";
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      // center text
      ctx.fillStyle = "#ffd166";
      ctx.font = `bold ${W > 120 ? 15 : 12}px 'Outfit', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(level.name, cx, cy - 8);
      ctx.fillStyle = "rgba(253,243,236,0.6)";
      ctx.font = `11px 'Outfit', sans-serif`;
      ctx.fillText(points + " pts", cx, cy + 10);
    };
    const animate = () => {
      if (current < filled) {
        current = Math.min(current + speed, filled);
        draw();
        animFrame = requestAnimationFrame(animate);
      } else {
        draw();
      }
    };
    animate();
    return () => cancelAnimationFrame(animFrame);
  }, [progress, level, points]);
  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} style={{ display: "block" }} />
      {nextLevel && (
        <div className="mt-1" style={{ fontSize: 10, color: "rgba(253,243,236,0.45)" }}>
          next: {nextLevel.name} · {nextLevel.min - points} pts to go
        </div>
      )}
    </div>
  );
}

/* ---- CSS conic-gradient challenge donut ---- */
function CircleProgress({ pct, done, size = 52 }) {
  const color = done ? "#7be3b1" : "#ff5d73";
  const bg = done ? "rgba(123,227,177,.14)" : "rgba(255,93,115,.1)";
  const deg = Math.round(Math.min(pct, 100) * 3.6);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `conic-gradient(${color} ${deg}deg, rgba(255,255,255,0.07) ${deg}deg)`,
        animation: done ? "rakGlowPulse 2.2s ease-in-out infinite" : "none",
      }} />
      <div style={{
        position: "absolute", inset: 5,
        borderRadius: "50%",
        background: "rgba(23,8,18,0.92)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700,
        color: done ? "#7be3b1" : "rgba(253,243,236,0.85)",
      }}>
        {done ? "✓" : `${Math.round(pct)}%`}
      </div>
    </div>
  );
}

function Avatar({ avatar, size = 56 }) {
  const base = {
    width: size,
    height: size,
    border: "2px solid rgba(255,209,102,0.55)",
    boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
  };
  if (avatar && avatar.photo) {
    return <img src={avatar.photo} alt="avatar" className="rounded-full object-cover" style={base} />;
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ ...base, background: (avatar && avatar.color) || "#ff8fa3", fontSize: size * 0.48 }}
    >
      {(avatar && avatar.emoji) || "😊"}
    </div>
  );
}

function LevelCard({ stats }) {
  return (
    <Card className="mt-3 flex flex-col items-center text-center" style={{ paddingTop: 16, paddingBottom: 16 }}>
      <LevelRing3D
        progress={stats.progress}
        level={stats.level}
        nextLevel={stats.nextLevel}
        points={stats.points}
      />
    </Card>
  );
}

function BadgeRow({ earned, onSelect }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" style={{ perspective: 700 }}>
      {BADGES.map((b, i) => {
        const got = earned.includes(b.id);
        const tier = TIER[b.tier] || TIER.common;
        const spinDur = b.tier === "mythic" ? 1.8 : b.tier === "legendary" ? 2.4 : b.tier === "epic" ? 3.0 : 3.8 + (i % 3);
        const floatDur = 2.2 + (i % 4) * 0.4;
        return (
          <button
            key={b.id}
            onClick={() => onSelect && onSelect(b)}
            className="rounded-2xl px-3 py-4 text-center flex-shrink-0"
            style={{
              width: 122,
              background: got
                ? `linear-gradient(160deg, ${hexToRgba(tier.color, 0.18)}, rgba(255,255,255,0.05))`
                : "rgba(255,255,255,0.04)",
              border: got ? `1px solid ${hexToRgba(tier.color, 0.6)}` : "1px solid rgba(255,255,255,0.08)",
              opacity: got ? 1 : 0.48,
              animation: got ? `rakBadgeFloat ${floatDur}s ease-in-out infinite` : "none",
              boxShadow: got ? `0 0 20px ${tier.glow}, 0 4px 16px rgba(0,0,0,0.4)` : "none",
              transformStyle: "preserve-3d",
            }}
          >
            <div style={{
              fontSize: 28, filter: got ? "none" : "grayscale(1)", display: "inline-block",
              animation: got ? `rakSpinY ${spinDur}s linear infinite` : "none",
              transformStyle: "preserve-3d",
              textShadow: got ? `0 0 16px ${tier.glow}` : "none",
            }}>
              {b.emoji}
            </div>
            {/* Tier label */}
            {got && (
              <div style={{ fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", color: tier.color, marginTop: 3, fontWeight: 600 }}>
                {tier.label}
              </div>
            )}
            <div className="mt-1 font-semibold" style={{ fontSize: 11, color: "#fdf3ec", lineHeight: 1.3 }}>{b.name}</div>
            <div style={{ fontSize: 9, color: "rgba(253,243,236,0.45)", lineHeight: 1.4, marginTop: 2 }}>{b.desc}</div>
            <div style={{ fontSize: 8, marginTop: 4, color: got ? tier.color : "rgba(253,243,236,0.3)" }}>
              {got ? "★ earned" : "🔒 locked"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function NavBar({ view, setView }) {
  const tabs = [
    { id: "home", label: "Home", emoji: "🏠" },
    { id: "feed", label: "Feed", emoji: "📰" },
    { id: "chat", label: "Chat", emoji: "💌" },
    { id: "map", label: "Map", emoji: "🗺️" },
    { id: "profile", label: "Profile", emoji: "👤" },
  ];
  return (
    <div className="fixed left-1/2 z-40" style={{ bottom: 12, transform: "translateX(-50%)", width: "calc(100% - 24px)", maxWidth: 420 }}>
      <div
        className="flex rounded-full p-1"
        style={{
          background: "rgba(23,8,18,0.88)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className="flex-1 rounded-full py-2 text-center"
            style={{ background: view === t.id ? "rgba(255,209,102,0.15)" : "transparent", transition: "background .2s" }}
          >
            <div style={{ fontSize: 16 }}>{t.emoji}</div>
            <div
              className="font-semibold uppercase"
              style={{ fontSize: 9, letterSpacing: "0.08em", color: view === t.id ? "#ffd166" : "rgba(253,243,236,0.55)" }}
            >
              {t.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <div className="font-semibold mb-1 mt-4" style={{ fontSize: 13, color: "#fdf3ec" }}>
      {children}
    </div>
  );
}

/* ---------- profile form (registration + edit) ---------- */

function ProfileForm({ initial, saveLabel, onSave, onCancel }) {
  const [name, setName] = useState((initial && initial.name) || "");
  const [age, setAge] = useState((initial && initial.age) || "");
  const [location, setLocation] = useState((initial && initial.location) || "");
  const [email, setEmail] = useState((initial && initial.email) || "");
  const [bio, setBio] = useState((initial && initial.bio) || "");
  const [emoji, setEmoji] = useState((initial && initial.avatar && initial.avatar.emoji) || "😊");
  const [color, setColor] = useState((initial && initial.avatar && initial.avatar.color) || "#ff8fa3");
  const [photo, setPhoto] = useState((initial && initial.avatar && initial.avatar.photo) || null);
  const [prefs, setPrefs] = useState((initial && initial.prefs) || []);
  const fileRef = useRef(null);

  const togglePref = (id) =>
    setPrefs((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const handlePhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          // resize + square-crop on device so storage stays tiny
          const size = 192;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          const min = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
          setPhoto(canvas.toDataURL("image/jpeg", 0.82));
        } catch (err) {
          console.error("Could not process photo:", err);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      age: String(age).trim(),
      location: location.trim(),
      email: email.trim(),
      bio: bio.trim(),
      avatar: { emoji, color, photo },
      prefs,
      joined: (initial && initial.joined) || Date.now(),
    });
  };

  return (
    <div>
      {/* avatar */}
      <div className="flex items-center gap-4">
        <Avatar avatar={{ emoji, color, photo }} size={64} />
        <div className="flex-1">
          <div className="font-semibold" style={{ fontSize: 13, color: "#fdf3ec" }}>Your avatar</div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => fileRef.current && fileRef.current.click()}
              className="rounded-full px-3 py-1 font-semibold"
              style={{ fontSize: 11, background: "rgba(255,209,102,0.12)", border: "1px solid rgba(255,209,102,0.35)", color: "#ffd166" }}
            >
              📷 Upload photo
            </button>
            {photo && (
              <button
                onClick={() => setPhoto(null)}
                className="rounded-full px-3 py-1"
                style={{ fontSize: 11, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(253,243,236,0.7)" }}
              >
                Remove
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
        </div>
      </div>

      {!photo && (
        <div>
          <div className="flex flex-wrap gap-2 mt-4">
            {AVATAR_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  fontSize: 20,
                  background: emoji === e ? "rgba(255,209,102,0.18)" : "rgba(255,255,255,0.05)",
                  border: emoji === e ? "2px solid rgba(255,209,102,0.7)" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-3">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="rounded-full"
                style={{
                  width: 28,
                  height: 28,
                  background: c,
                  border: color === c ? "3px solid #fdf3ec" : "2px solid rgba(255,255,255,0.2)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* details */}
      <FieldLabel>Name *</FieldLabel>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        placeholder="What should we call you?"
        className="w-full rounded-2xl px-4 py-3 outline-none"
        style={fieldStyle}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Age</FieldLabel>
          <input
            value={age}
            onChange={(e) => setAge(e.target.value)}
            type="number"
            inputMode="numeric"
            min="1"
            max="120"
            placeholder="—"
            className="w-full rounded-2xl px-4 py-3 outline-none"
            style={fieldStyle}
          />
        </div>
        <div>
          <FieldLabel>Location</FieldLabel>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={40}
            placeholder="City"
            className="w-full rounded-2xl px-4 py-3 outline-none"
            style={fieldStyle}
          />
        </div>
      </div>

      <FieldLabel>Email</FieldLabel>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        maxLength={80}
        placeholder="you@example.com (optional)"
        className="w-full rounded-2xl px-4 py-3 outline-none"
        style={fieldStyle}
      />

      <FieldLabel>Bio</FieldLabel>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        maxLength={160}
        rows={3}
        placeholder="A line about you and why kindness matters to you"
        className="w-full rounded-2xl px-4 py-3 outline-none"
        style={{ ...fieldStyle, resize: "none" }}
      />
      <div className="text-right" style={{ fontSize: 10, color: "rgba(253,243,236,0.4)" }}>
        {bio.length}/160
      </div>

      <FieldLabel>What kinds of kindness do you love?</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const on = prefs.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => togglePref(c.id)}
              className="rounded-full px-3 py-2 font-semibold"
              style={{
                fontSize: 12,
                background: on ? c.color : "rgba(255,255,255,0.06)",
                color: on ? "#1c0b16" : "rgba(253,243,236,0.85)",
                border: on ? "1px solid transparent" : "1px solid rgba(255,255,255,0.12)",
                transition: "all .2s",
              }}
            >
              {c.emoji} {c.label}
            </button>
          );
        })}
      </div>

      <button
        onClick={submit}
        disabled={!name.trim()}
        className="w-full rounded-2xl py-3 font-bold mt-6"
        style={{
          fontSize: 15,
          background: name.trim() ? "linear-gradient(135deg, #ff5d73, #ffb26b)" : "rgba(255,255,255,0.08)",
          color: name.trim() ? "#2a0d18" : "rgba(253,243,236,0.35)",
          boxShadow: name.trim() ? "0 10px 30px rgba(255,93,115,0.35)" : "none",
          transition: "all .25s",
        }}
      >
        {saveLabel}
      </button>

      {onCancel && (
        <button
          onClick={onCancel}
          className="w-full rounded-2xl py-3 font-semibold mt-3"
          style={{ fontSize: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(253,243,236,0.75)" }}
        >
          Cancel
        </button>
      )}
    </div>
  );
}

/* ============================================================ */


/* ============================================================
   AUTH SCREEN — login + register
   ============================================================ */
function AuthScreen({ onLogin, onRegister, authError, setAuthError }) {
  const [mode, setMode] = React.useState("choice");
  const [loginEmail, setLoginEmail] = React.useState("");
  const [loginPass,  setLoginPass]  = React.useState("");
  const [regName,    setRegName]    = React.useState("");
  const [regAge,     setRegAge]     = React.useState("");
  const [regLoc,     setRegLoc]     = React.useState("");
  const [regEmail,   setRegEmail]   = React.useState("");
  const [regBio,     setRegBio]     = React.useState("");
  const [regPass,    setRegPass]    = React.useState("");
  const [regConf,    setRegConf]    = React.useState("");
  const [regEmoji,   setRegEmoji]   = React.useState("😊");
  const [regColor,   setRegColor]   = React.useState("#ff8fa3");
  const [regPhoto,   setRegPhoto]   = React.useState(null);
  const [regPrefs,   setRegPrefs]   = React.useState([]);
  const regFileRef = React.useRef(null);

  const togglePref = (id) =>
    setRegPrefs((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const handleRegPhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 192;
          const ctx = canvas.getContext("2d");
          const min = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width-min)/2, (img.height-min)/2, min, min, 0, 0, 192, 192);
          setRegPhoto(canvas.toDataURL("image/jpeg", 0.82));
        } catch(err) {}
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const submitLogin = () => {
    setAuthError("");
    if (!loginEmail.trim() || !loginPass.trim()) { setAuthError("Enter your email and password."); return; }
    onLogin(loginEmail.trim().toLowerCase(), loginPass);
  };

  const submitRegister = () => {
    setAuthError("");
    if (!regName.trim()) { setAuthError("Please enter your name."); return; }
    if (!regEmail.trim()) { setAuthError("Please enter your email."); return; }
    if (regPass.length < 6) { setAuthError("Password must be at least 6 characters."); return; }
    if (regPass !== regConf) { setAuthError("Passwords don’t match."); return; }
    onRegister(
      { name:regName.trim(), age:regAge.trim(), location:regLoc.trim(), email:regEmail.trim().toLowerCase(),
        bio:regBio.trim(), avatar:{emoji:regEmoji,color:regColor,photo:regPhoto}, prefs:regPrefs, joined:Date.now() },
      regEmail.trim().toLowerCase(), regPass
    );
  };

  const IS = { background:"rgba(0,0,0,0.28)", border:"1px solid rgba(255,255,255,0.12)", color:"#fdf3ec", fontSize:14 };
  const back = () => { setAuthError(""); setMode("choice"); };

  return (
    <div className="min-h-screen w-full" style={{ background:"#030106", fontFamily:"'Outfit',system-ui,sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Outfit:wght@400;600;700&display=swap');*{box-sizing:border-box}input::placeholder,textarea::placeholder{color:rgba(253,243,236,.35)}`}</style>
      <CinematicBG />
      <div className="relative z-10 max-w-md mx-auto px-4 py-8 pb-16">
        <div className="text-center mb-8">
          <h1 style={{ fontFamily:"'Fraunces',serif",fontSize:36,color:"#fdf3ec",lineHeight:1.1 }}>
            Random Acts<br/>
            <span style={{ background:"linear-gradient(90deg,#ff8fa3,#ffd166)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>of Kindness</span>
          </h1>
          <p className="mt-2" style={{ fontSize:12,color:"rgba(253,243,236,0.55)" }}>Every little good thing counts 💛</p>
        </div>

        {mode === "choice" && (
          <div className="flex flex-col gap-4">
            <button onClick={() => { setAuthError(""); setMode("register"); }}
              className="w-full rounded-2xl py-4 font-bold"
              style={{ fontSize:17,background:"linear-gradient(135deg,#ff5d73,#ffb26b)",color:"#2a0d18",boxShadow:"0 12px 32px rgba(255,93,115,0.35)" }}>
              Create Account →
            </button>
            <button onClick={() => { setAuthError(""); setMode("login"); }}
              className="w-full rounded-2xl py-4 font-bold"
              style={{ fontSize:17,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.2)",color:"#fdf3ec" }}>
              Log In
            </button>
            <div className="text-center mt-1" style={{ fontSize:11,color:"rgba(253,243,236,0.35)" }}>Admin? Log In with your admin email.</div>
          </div>
        )}

        {mode === "login" && (
          <div className="rounded-3xl p-5" style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)" }}>
            <div className="font-bold mb-4" style={{ fontFamily:"'Fraunces',serif",fontSize:20,color:"#fdf3ec" }}>Welcome back 👋</div>
            <label style={{ fontSize:12,color:"rgba(253,243,236,0.7)" }}>Email</label>
            <input type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="you@example.com"
              className="w-full rounded-2xl px-4 py-3 outline-none mt-1 mb-3" style={IS} />
            <label style={{ fontSize:12,color:"rgba(253,243,236,0.7)" }}>Password</label>
            <input type="password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} placeholder="••••••••"
              onKeyDown={e=>{ if(e.key==="Enter") submitLogin(); }}
              className="w-full rounded-2xl px-4 py-3 outline-none mt-1 mb-4" style={IS} />
            {authError && <div className="rounded-xl px-3 py-2 mb-3" style={{ background:"rgba(255,93,115,0.14)",border:"1px solid rgba(255,93,115,0.4)",fontSize:12,color:"#ff8fa3" }}>{authError}</div>}
            <button onClick={submitLogin} className="w-full rounded-2xl py-3 font-bold"
              style={{ fontSize:15,background:"linear-gradient(135deg,#ff5d73,#ffb26b)",color:"#2a0d18",boxShadow:"0 10px 30px rgba(255,93,115,.3)" }}>
              Log In →
            </button>
            <button onClick={back} className="w-full text-center mt-4" style={{ fontSize:12,color:"rgba(253,243,236,0.45)" }}>← Back</button>
          </div>
        )}

        {mode === "register" && (
          <div className="rounded-3xl p-5" style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.09)",backdropFilter:"blur(14px)",WebkitBackdropFilter:"blur(14px)" }}>
            <div className="font-bold mb-1" style={{ fontFamily:"'Fraunces',serif",fontSize:20,color:"#fdf3ec" }}>Create your profile 💛</div>
            <div className="mb-4" style={{ fontSize:11,color:"rgba(253,243,236,0.5)" }}>Set up your kindness identity. Everything stays on your device.</div>

            <div className="flex items-center gap-4 mb-3">
              {regPhoto
                ? <img src={regPhoto} alt="avatar" className="rounded-full object-cover flex-shrink-0" style={{ width:60,height:60,border:"2px solid rgba(255,209,102,0.55)" }} />
                : <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width:60,height:60,background:regColor,border:"2px solid rgba(255,209,102,0.55)",fontSize:28 }}>{regEmoji}</div>
              }
              <div>
                <div style={{ fontSize:11,color:"rgba(253,243,236,0.6)",marginBottom:5 }}>Your avatar</div>
                <div className="flex gap-2">
                  <button onClick={() => regFileRef.current && regFileRef.current.click()}
                    className="rounded-full px-3 py-1 font-semibold"
                    style={{ fontSize:11,background:"rgba(255,209,102,0.12)",border:"1px solid rgba(255,209,102,0.35)",color:"#ffd166" }}>
                    📷 Upload photo
                  </button>
                  {regPhoto && <button onClick={() => setRegPhoto(null)} style={{ fontSize:11,color:"rgba(253,243,236,0.45)" }}>Remove</button>}
                </div>
              </div>
              <input ref={regFileRef} type="file" accept="image/*" onChange={handleRegPhoto} style={{ display:"none" }} />
            </div>

            {!regPhoto && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-2 mb-2">
                  {AVATAR_EMOJIS.map(e=>(<button key={e} onClick={()=>setRegEmoji(e)} className="rounded-full flex items-center justify-center"
                    style={{ width:36,height:36,fontSize:17,background:regEmoji===e?"rgba(255,209,102,0.18)":"rgba(255,255,255,0.05)",
                      border:regEmoji===e?"2px solid rgba(255,209,102,0.7)":"1px solid rgba(255,255,255,0.1)" }}>{e}</button>))}
                </div>
                <div className="flex gap-3">
                  {AVATAR_COLORS.map(c=>(<button key={c} onClick={()=>setRegColor(c)} className="rounded-full"
                    style={{ width:26,height:26,background:c,border:regColor===c?"3px solid #fdf3ec":"2px solid rgba(255,255,255,0.2)" }} />))}
                </div>
              </div>
            )}

            <label style={{ fontSize:12,color:"rgba(253,243,236,0.7)" }}>Name *</label>
            <input value={regName} onChange={e=>setRegName(e.target.value)} maxLength={40} placeholder="What should we call you?"
              className="w-full rounded-2xl px-4 py-3 outline-none mt-1 mb-3" style={IS} />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div><label style={{ fontSize:12,color:"rgba(253,243,236,0.7)" }}>Age</label>
                <input value={regAge} onChange={e=>setRegAge(e.target.value)} type="number" inputMode="numeric" placeholder="—"
                  className="w-full rounded-2xl px-4 py-3 outline-none mt-1" style={IS} /></div>
              <div><label style={{ fontSize:12,color:"rgba(253,243,236,0.7)" }}>Location</label>
                <input value={regLoc} onChange={e=>setRegLoc(e.target.value)} maxLength={40} placeholder="City"
                  className="w-full rounded-2xl px-4 py-3 outline-none mt-1" style={IS} /></div>
            </div>

            <label style={{ fontSize:12,color:"rgba(253,243,236,0.7)" }}>Email * <span style={{ color:"rgba(253,243,236,0.4)",fontWeight:400 }}>(used to log in)</span></label>
            <input type="email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} placeholder="you@example.com"
              className="w-full rounded-2xl px-4 py-3 outline-none mt-1 mb-3" style={IS} />

            <label style={{ fontSize:12,color:"rgba(253,243,236,0.7)" }}>Password *</label>
            <input type="password" value={regPass} onChange={e=>setRegPass(e.target.value)} placeholder="Minimum 6 characters"
              className="w-full rounded-2xl px-4 py-3 outline-none mt-1 mb-3" style={IS} />

            <label style={{ fontSize:12,color:"rgba(253,243,236,0.7)" }}>Confirm password *</label>
            <input type="password" value={regConf} onChange={e=>setRegConf(e.target.value)} placeholder="••••••••"
              onKeyDown={e=>{ if(e.key==="Enter") submitRegister(); }}
              className="w-full rounded-2xl px-4 py-3 outline-none mt-1 mb-3" style={IS} />

            <label style={{ fontSize:12,color:"rgba(253,243,236,0.7)" }}>Bio <span style={{ color:"rgba(253,243,236,0.4)",fontWeight:400 }}>(optional)</span></label>
            <textarea value={regBio} onChange={e=>setRegBio(e.target.value)} maxLength={160} rows={2}
              placeholder="A line about you and why kindness matters to you"
              className="w-full rounded-2xl px-4 py-3 outline-none mt-1" style={{ ...IS,resize:"none" }} />
            <div className="text-right mb-3" style={{ fontSize:10,color:"rgba(253,243,236,0.4)" }}>{regBio.length}/160</div>

            <label style={{ fontSize:12,color:"rgba(253,243,236,0.7)",display:"block",marginBottom:8 }}>What kinds of kindness do you love?</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map(c=>{ const on=regPrefs.includes(c.id); return (
                <button key={c.id} onClick={()=>togglePref(c.id)} className="rounded-full px-3 py-2 font-semibold"
                  style={{ fontSize:12,background:on?c.color:"rgba(255,255,255,0.06)",color:on?"#1c0b16":"rgba(253,243,236,0.85)",
                    border:on?"1px solid transparent":"1px solid rgba(255,255,255,0.12)",transition:"all .2s" }}>
                  {c.emoji} {c.label}
                </button>
              );})}
            </div>

            {authError && <div className="rounded-xl px-3 py-2 mb-3" style={{ background:"rgba(255,93,115,0.14)",border:"1px solid rgba(255,93,115,0.4)",fontSize:12,color:"#ff8fa3" }}>{authError}</div>}

            <button onClick={submitRegister} disabled={!regName.trim()||!regEmail.trim()||regPass.length<6}
              className="w-full rounded-2xl py-4 font-bold"
              style={{ fontSize:15,
                background:regName.trim()&&regEmail.trim()&&regPass.length>=6?"linear-gradient(135deg,#ff5d73,#ffb26b)":"rgba(255,255,255,0.08)",
                color:regName.trim()&&regEmail.trim()&&regPass.length>=6?"#2a0d18":"rgba(253,243,236,0.35)",
                boxShadow:regName.trim()&&regEmail.trim()&&regPass.length>=6?"0 10px 30px rgba(255,93,115,.35)":"none",transition:"all .25s" }}>
              Start spreading kindness 💛
            </button>
            <button onClick={back} className="w-full text-center mt-3" style={{ fontSize:12,color:"rgba(253,243,236,0.45)" }}>← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
/* ── Manual Code Generator (admin tool, works cross-device) ─ */
function ManualCodeGen({ showToast }) {
  const [email, setEmail] = React.useState("");
  const [code,  setCode]  = React.useState("");
  const [sent,  setSent]  = React.useState(false);
  const IS = { background:"rgba(0,0,0,0.32)", border:"1px solid rgba(255,255,255,0.12)", color:"#fdf3ec", fontSize:14 };

  const generate = () => {
    const e = email.trim().toLowerCase();
    if (!e) return;
    setCode(generateActivationCode(e));
    setSent(false);
  };

  const sendCode = async () => {
    if (!code || !email.trim()) return;
    setSent(false);
    try {
      const res = await fetch("https://formsubmit.co/ajax/" + email.trim().toLowerCase(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: "Your Kindness+ Activation Code",
          message: "Your Kindness+ payment has been verified.\n\nActivation code: " + code + "\n\nOpen the app, enter this code on your pending payment card, and tap Activate. Kindness+ activates instantly!\n\n- Random Acts of Kindness Team",
          _template: "box",
        }),
      });
      const data = await res.json();
      if (data.success === "true" || data.success === true) {
        setSent(true);
        showToast("Code sent to " + email.trim() + " ✅");
      } else {
        showToast("Email may not have sent — use Share");
      }
    } catch (e) {
      showToast("Network error — copy the code manually");
    }
  };

  const share = async () => {
    if (!code) return;
    const msg = "Your Kindness+ activation code is: " + code + " - Enter it in the app to activate instantly.";
    try {
      if (navigator.share) { await navigator.share({ text: msg }); }
      else if (navigator.clipboard) { await navigator.clipboard.writeText(code); showToast("Code copied ✅"); }
    } catch (e) { /* cancelled */ }
  };

  return (
    <div className="rounded-2xl p-4" style={{ background:"rgba(124,196,255,0.06)", border:"1px solid rgba(124,196,255,0.25)" }}>
      <div style={{ fontSize:11, color:"rgba(124,196,255,0.75)", marginBottom:8, lineHeight:1.5 }}>
        Enter the subscriber’s email to generate their unique code — works across any browser or device.
      </div>
      <div className="flex gap-2 mb-3">
        <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setCode("");setSent(false);}} placeholder="subscriber@email.com"
          onKeyDown={e=>{ if(e.key==="Enter") generate(); }}
          className="flex-1 rounded-2xl px-4 py-3 outline-none" style={IS} />
        <button onClick={generate} className="rounded-2xl px-4 py-3 font-bold flex-shrink-0"
          style={{ fontSize:13, background:"rgba(124,196,255,0.15)", border:"1px solid rgba(124,196,255,0.45)", color:"#7cc4ff" }}>
          Generate
        </button>
      </div>
      {code && (
        <div>
          <div className="font-bold rounded-xl px-4 py-4 text-center mb-3"
            style={{ fontSize:26, letterSpacing:"0.35em", background:"rgba(0,0,0,0.45)", border:"1px solid rgba(255,209,102,0.5)", color:"#ffd166",
              boxShadow:"0 0 20px rgba(255,209,102,0.15)" }}>
            {code}
          </div>
          <div className="flex gap-2">
            <button onClick={sendCode} className="flex-1 rounded-2xl py-3 font-bold"
              style={{ fontSize:13, background:sent?"rgba(123,227,177,0.2)":"linear-gradient(135deg,#ffd166,#ffb26b)", color:sent?"#7be3b1":"#1c0b16",
                border:sent?"1px solid rgba(123,227,177,0.5)":"none", boxShadow:sent?"none":"0 6px 20px rgba(255,209,102,0.3)" }}>
              {sent ? "✅ Sent!" : "📧 Send by Email"}
            </button>
            <button onClick={share} className="rounded-2xl px-4 py-3 font-bold flex-shrink-0"
              style={{ fontSize:13, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.2)", color:"rgba(253,243,236,0.8)" }}>
              📤 Share
            </button>
          </div>
          <div style={{ fontSize:10, color:"rgba(253,243,236,0.4)", marginTop:6 }}>
            Sending to: {email.trim()}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Account Credentials (change email / password) ───────── */
function AccountCredentials({ session, onChanged, showToast }) {
  const [newEmail, setNewEmail] = React.useState(session ? session.email : "");
  const [curPass,  setCurPass]  = React.useState("");
  const [newPass,  setNewPass]  = React.useState("");
  const [busy,     setBusy]     = React.useState(false);
  const [err,      setErr]      = React.useState("");
  const IS = { background:"rgba(0,0,0,0.28)", border:"1px solid rgba(255,255,255,0.12)", color:"#fdf3ec", fontSize:14 };

  const save = async () => {
    setErr("");
    if (!curPass.trim()) { setErr("Enter your current password to confirm."); return; }
    if (!newEmail.trim()) { setErr("Email cannot be empty."); return; }
    setBusy(true);
    try {
      const acc = await store.get(ACCOUNTS_KEY);
      const accounts = acc && acc.value ? JSON.parse(acc.value) : [];
      const idx = accounts.findIndex(a => a.email === (session && session.email));
      if (idx === -1) { setErr("Account not found — try logging out and back in."); setBusy(false); return; }
      const correct = btoa(accounts[idx].email + ":" + curPass);
      if (accounts[idx].passHash !== correct) { setErr("Current password is incorrect."); setBusy(false); return; }
      const emailTaken = accounts.find((a, i) => i !== idx && a.email === newEmail.trim().toLowerCase());
      if (emailTaken) { setErr("That email is already registered to another account."); setBusy(false); return; }
      // Update email and optionally password
      accounts[idx].email = newEmail.trim().toLowerCase();
      if (newPass.trim().length >= 6) {
        accounts[idx].passHash = btoa(newEmail.trim().toLowerCase() + ":" + newPass.trim());
      } else {
        // Re-hash the old password against the new email
        accounts[idx].passHash = btoa(newEmail.trim().toLowerCase() + ":" + curPass);
      }
      await store.set(ACCOUNTS_KEY, JSON.stringify(accounts));
      // Update session
      const newSess = { ...session, email: newEmail.trim().toLowerCase() };
      await store.set(SESSION_KEY, JSON.stringify(newSess));
      setCurPass(""); setNewPass("");
      onChanged(newEmail.trim().toLowerCase());
    } catch (e) { setErr("Error saving — please try again."); }
    setBusy(false);
  };

  return (
    <div className="rounded-3xl p-5 mt-4" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)" }}>
      <div className="font-bold mb-1" style={{ fontSize:16, color:"#fdf3ec" }}>Account credentials</div>
      <div className="mb-4" style={{ fontSize:11, color:"rgba(253,243,236,0.5)" }}>
        Change your login email or password. Current password required.
      </div>

      <label style={{ fontSize:12, color:"rgba(253,243,236,0.7)" }}>Login email</label>
      <input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} maxLength={80}
        className="w-full rounded-2xl px-4 py-3 outline-none mt-1 mb-3" style={IS} />

      <label style={{ fontSize:12, color:"rgba(253,243,236,0.7)" }}>Current password <span style={{ color:"rgba(253,243,236,0.4)" }}>*</span></label>
      <input type="password" value={curPass} onChange={e=>setCurPass(e.target.value)} placeholder="Required to save any change"
        className="w-full rounded-2xl px-4 py-3 outline-none mt-1 mb-3" style={IS} />

      <label style={{ fontSize:12, color:"rgba(253,243,236,0.7)" }}>New password <span style={{ color:"rgba(253,243,236,0.4)" }}>(leave blank to keep current)</span></label>
      <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Min 6 chars — or leave blank"
        className="w-full rounded-2xl px-4 py-3 outline-none mt-1 mb-3" style={IS} />

      {err && <div className="rounded-xl px-3 py-2 mb-3" style={{ background:"rgba(255,93,115,0.14)",border:"1px solid rgba(255,93,115,0.4)",fontSize:12,color:"#ff8fa3" }}>{err}</div>}

      <button onClick={save} disabled={busy || !curPass.trim()}
        className="w-full rounded-2xl py-3 font-bold"
        style={{ fontSize:14,
          background:!busy&&curPass.trim()?"linear-gradient(135deg,#7cc4ff,#c58bff)":"rgba(255,255,255,0.08)",
          color:!busy&&curPass.trim()?"#1c0b16":"rgba(253,243,236,0.35)",
          boxShadow:!busy&&curPass.trim()?"0 8px 24px rgba(124,196,255,0.3)":"none",
          transition:"all .25s" }}>
        {busy ? "Saving…" : "Update credentials"}
      </button>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════
   CinematicBG — ultra-hyperrealistic Three.js background
   Used in AuthScreen and throughout the app
   ═════════════════════════════════════════════════════════ */
function CinematicBG() {
  const cvRef  = React.useRef(null);
  const grRef  = React.useRef(null);

  React.useEffect(() => {
    const cv = cvRef.current;
    const gr = grRef.current;
    if (!cv) return;

    // ── Texture helpers ─────────────────────────────────
    function circleTex(r,g,b,res=128){
      const c=document.createElement('canvas');c.width=c.height=res;
      const ctx=c.getContext('2d'),h=res/2;
      const grd=ctx.createRadialGradient(h,h,0,h,h,h);
      grd.addColorStop(0,`rgba(${r},${g},${b},1)`);
      grd.addColorStop(.38,`rgba(${r},${g},${b},.82)`);
      grd.addColorStop(.72,`rgba(${r},${g},${b},.15)`);
      grd.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.fillStyle=grd;ctx.fillRect(0,0,res,res);
      return new THREE.CanvasTexture(c);
    }
    function glowSp(r,g,b,size,res=256){
      const c=document.createElement('canvas');c.width=c.height=res;
      const ctx=c.getContext('2d'),h=res/2;
      const grd=ctx.createRadialGradient(h,h,0,h,h,h);
      grd.addColorStop(0,`rgba(${r},${g},${b},.92)`);
      grd.addColorStop(.28,`rgba(${r},${g},${b},.55)`);
      grd.addColorStop(.62,`rgba(${r},${g},${b},.1)`);
      grd.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.fillStyle=grd;ctx.fillRect(0,0,res,res);
      const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));
      sp.scale.setScalar(size);return sp;
    }

    // ── Renderer / scene / camera ────────────────────────
    const renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2.2));
    renderer.setSize(cv.clientWidth,cv.clientHeight);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(58,cv.clientWidth/cv.clientHeight,.1,200);
    camera.position.z=15;

    // ── Lights ──────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xfff1e6,.5));
    const rL=new THREE.PointLight(0xff8fa3,2.8,50);rL.position.set(-10,-5,9);scene.add(rL);
    const gL=new THREE.PointLight(0xffd166,2.4,45);gL.position.set(11,8,6);scene.add(gL);
    const bL=new THREE.PointLight(0x4488ff,1.4,38);bL.position.set(-5,10,-5);scene.add(bL);
    const pL=new THREE.PointLight(0xcc44ff,1.0,30);pL.position.set(7,-8,-4);scene.add(pL);

    // ── GLSL shaders ────────────────────────────────────
    const causticMat=new THREE.ShaderMaterial({
      uniforms:{time:{value:0}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform float time;varying vec2 vUv;void main(){vec2 p=vUv*2.-1.;float c=(sin(p.x*14.+sin(p.y*11.+time*1.1)+time*.4)+sin(p.y*16.+sin(p.x*9.-time*.9)+time*.35)+sin((p.x+p.y)*10.+time*1.3));c=abs(c)/3.;float ca=pow(max(0.,1.-abs(c-.5)*2.2),4.5);vec3 col=mix(vec3(0.,.12,.5),vec3(.4,.85,1.),ca);col+=vec3(.3,.1,0.)*pow(ca,2.);gl_FragColor=vec4(col,ca*.42);}',
      transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide
    });
    const causticPlane=new THREE.Mesh(new THREE.PlaneGeometry(38,38),causticMat);
    causticPlane.position.z=-11;causticPlane.rotation.x=-.25;scene.add(causticPlane);

    // Gem shader (hearts)
    const gemVS='varying vec3 vN;varying vec3 vVP;void main(){vN=normalize(normalMatrix*normal);vVP=-vec3(modelViewMatrix*vec4(position,1.0));gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
    const gemFS='uniform float time;varying vec3 vN;varying vec3 vVP;void main(){vec3 n=normalize(vN);vec3 v=normalize(vVP);float fr=pow(1.-max(dot(n,v),0.),2.8);vec3 col=mix(vec3(1.,.38,.52),vec3(1.,.92,.6),fr);col+=vec3(.5+.5*sin(dot(n,vec3(1.,2.,3.))*9.+time*2.5))*.28;col+=vec3(.3,.15,0.)*fr*.65;gl_FragColor=vec4(col,.92);}';
    const gemU={time:{value:0}};

    // Rainbow DNA shader
    const dnaVS='varying vec3 vWP;void main(){vWP=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWP,1.0);}';
    const dnaFS='uniform float time;varying vec3 vWP;void main(){float t=fract((vWP.y+10.)/20.*2.-time*.1);vec3 c;c.r=.5+.5*cos(6.28318*t);c.g=.5+.5*cos(6.28318*(t+.333));c.b=.5+.5*cos(6.28318*(t+.667));float glow=.5+.5*sin(time*3.+vWP.y*.8);c+=vec3(glow*.12);gl_FragColor=vec4(c,.72);}';
    const dnaU={time:{value:0}};

    // ── Circular particle clouds (NO squares) ────────────
    function cloud(n,spread,r,g,b,sz,op){
      const geo=new THREE.BufferGeometry();const pos=new Float32Array(n*3);
      for(let i=0;i<n;i++){
        const R=spread*Math.pow(Math.random(),.44),th=Math.random()*Math.PI*2,ph=Math.random()*Math.PI;
        pos[i*3]=R*Math.sin(ph)*Math.cos(th);pos[i*3+1]=R*Math.sin(ph)*Math.sin(th);pos[i*3+2]=R*Math.cos(ph)-9;
      }
      geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
      const tex=circleTex(r,g,b);
      return new THREE.Points(geo,new THREE.PointsMaterial({map:tex,alphaMap:tex,alphaTest:.01,color:new THREE.Color(r/255,g/255,b/255),size:sz,transparent:true,opacity:op,sizeAttenuation:true,blending:THREE.AdditiveBlending,depthWrite:false}));
    }
    const stars =cloud(4200,28,255,240,222,.05,.7);
    const nebR  =cloud(2600,20,255,143,163,.115,.62);
    const nebG  =cloud(2000,24,255,209,102,.09,.54);
    const nebP  =cloud(1500,15,197,139,255,.085,.46);
    const nebT  =cloud(1100,12,124,196,255,.075,.38);
    [stars,nebR,nebG,nebP,nebT].forEach(n=>scene.add(n));

    // ── Heart geometry ───────────────────────────────────
    const hs=new THREE.Shape();
    hs.moveTo(.25,.25);hs.bezierCurveTo(.25,.25,.2,0,0,0);
    hs.bezierCurveTo(-.3,0,-.3,.35,-.3,.35);hs.bezierCurveTo(-.3,.55,-.1,.77,.25,.95);
    hs.bezierCurveTo(.6,.77,.8,.55,.8,.35);hs.bezierCurveTo(.8,.35,.8,0,.5,0);
    hs.bezierCurveTo(.35,0,.25,.25,.25,.25);
    const HG=new THREE.ExtrudeGeometry(hs,{depth:.3,bevelEnabled:true,bevelThickness:.07,bevelSize:.07,bevelSegments:6,curveSegments:24});
    HG.center();
    const ss=new THREE.Shape();
    for(let i=0;i<10;i++){const r=i%2===0?1:.40,a=(i/10)*Math.PI*2-Math.PI/2;i===0?ss.moveTo(Math.cos(a)*r,Math.sin(a)*r):ss.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
    ss.closePath();
    const SG=new THREE.ExtrudeGeometry(ss,{depth:.22,bevelEnabled:true,bevelThickness:.05,bevelSize:.05,bevelSegments:3});SG.center();

    // ── Floating gems + orbs ─────────────────────────────
    const PAL=[[255,93,115],[255,143,163],[255,209,102],[255,178,107],[197,139,255],[124,196,255],[123,227,177],[245,151,142]];
    const floaters=[];
    for(let i=0;i<28;i++){
      const [r,g,b]=PAL[i%PAL.length];
      const isHeart=Math.random()<.55;
      const mat=isHeart
        ?new THREE.ShaderMaterial({vertexShader:gemVS,fragmentShader:gemFS,uniforms:{time:{value:0}},transparent:true,side:THREE.DoubleSide})
        :new THREE.MeshPhongMaterial({color:new THREE.Color(r/255,g/255,b/255),emissive:new THREE.Color(r/510,g/510,b/510),emissiveIntensity:.4,shininess:200,transparent:true,opacity:.93,specular:new THREE.Color(.9,.9,.9)});
      const mesh=new THREE.Mesh(isHeart?HG:SG,mat);
      const sc=.22+Math.random()*.88;mesh.scale.setScalar(sc);
      const [px,py,pz]=[(Math.random()-.5)*28,(Math.random()-.5)*19,Math.random()*6-5];
      mesh.position.set(px,py,pz);
      const glow=glowSp(r,g,b,sc*5.2);glow.position.set(px,py,pz-.6);
      mesh.userData={sc,vy:.003+Math.random()*.006,vx:(Math.random()-.5)*.004,wobble:Math.random()*Math.PI*2,spin:(Math.random()-.5)*.032,glow,isHeart};
      scene.add(mesh);scene.add(glow);floaters.push(mesh);
    }
    const orbList=[];
    for(let i=0;i<10;i++){
      const [r,g,b]=PAL[i%PAL.length];const rad=.38+Math.random()*1.0;
      const orb=new THREE.Mesh(new THREE.SphereGeometry(rad,30,30),new THREE.MeshPhongMaterial({color:new THREE.Color(r/255*.5,g/255*.5,b/255*.5),emissive:new THREE.Color(r/255*.2,g/255*.2,b/255*.2),emissiveIntensity:.6,shininess:360,transparent:true,opacity:.58,specular:new THREE.Color(1,1,1)}));
      const atm=new THREE.Mesh(new THREE.SphereGeometry(rad*1.45,12,12),new THREE.MeshBasicMaterial({color:new THREE.Color(r/255,g/255,b/255),transparent:true,opacity:.065,side:THREE.BackSide}));
      const gs=glowSp(r,g,b,rad*7.5);
      const [ox,oy,oz]=[(Math.random()-.5)*24,(Math.random()-.5)*16,Math.random()*4-5];
      orb.position.set(ox,oy,oz);atm.position.set(ox,oy,oz);gs.position.set(ox,oy,oz-.8);
      orb.userData={vy:.002+Math.random()*.005,vx:(Math.random()-.5)*.003,wobble:Math.random()*Math.PI*2,glow:gs,atm};
      scene.add(orb);scene.add(atm);scene.add(gs);orbList.push(orb);
    }

    // ── Rainbow DNA helix (ambient background element) ───
    const helixGroup=new THREE.Group();
    for(let strand=0;strand<2;strand++){
      const pts=[];
      for(let j=0;j<=90;j++){const t=(j/90)*Math.PI*8,off=strand?Math.PI:0;pts.push(new THREE.Vector3(Math.cos(t+off)*2.5,t*.5-10,Math.sin(t+off)*1.0));}
      const tube=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),90,.06,10,false);
      helixGroup.add(new THREE.Mesh(tube,new THREE.ShaderMaterial({vertexShader:dnaVS,fragmentShader:dnaFS,uniforms:dnaU,transparent:true,depthWrite:false})));
    }
    for(let i=0;i<16;i++){
      const t=(i/16)*Math.PI*8;
      const p1=new THREE.Vector3(Math.cos(t)*2.5,t*.5-10,Math.sin(t)*1.0);
      const p2=new THREE.Vector3(Math.cos(t+Math.PI)*2.5,t*.5-10,Math.sin(t+Math.PI)*1.0);
      helixGroup.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p1,p2]),5,.04,6,false),
        new THREE.MeshPhongMaterial({color:0xffd166,emissive:0xffb26b,emissiveIntensity:.5,transparent:true,opacity:.65,shininess:160})));
    }
    helixGroup.add(glowSp(120,200,255,22));
    helixGroup.position.set(-5,-1,-5);helixGroup.scale.setScalar(.75);scene.add(helixGroup);

    // ── Film grain ──────────────────────────────────────
    let grainTick=0;
    function updateGrain(){
      if(!gr)return;
      gr.width=gr.clientWidth||innerWidth;gr.height=gr.clientHeight||innerHeight;
      const gCtx=gr.getContext('2d');
      const id=gCtx.createImageData(gr.width,gr.height);const d=id.data;
      for(let i=0;i<d.length;i+=4){const v=Math.random()*255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}
      gCtx.putImageData(id,0,0);
    }

    // ── Mouse parallax ──────────────────────────────────
    let mx=0,my=0;
    const onMouse=e=>{mx=(e.clientX/innerWidth-.5)*2;my=-(e.clientY/innerHeight-.5)*2;};
    window.addEventListener('mousemove',onMouse);

    // ── Resize ──────────────────────────────────────────
    const onResize=()=>{
      camera.aspect=cv.clientWidth/cv.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(cv.clientWidth,cv.clientHeight);
    };
    window.addEventListener('resize',onResize);

    // ── Animate ─────────────────────────────────────────
    const clock=new THREE.Clock();let raf;
    const animate=()=>{
      raf=requestAnimationFrame(animate);
      const t=clock.getElapsedTime();
      camera.position.x+=(mx*.65-camera.position.x)*.042;
      camera.position.y+=(my*.42-camera.position.y)*.042;
      camera.lookAt(0,0,0);

      causticMat.uniforms.time.value=t;dnaU.time.value=t;gemU.time.value=t;

      floaters.forEach(f=>{
        const u=f.userData;
        f.position.y+=u.vy;f.position.x+=u.vx+Math.sin(t*.85+u.wobble)*.005;
        f.rotation.z+=u.spin;f.rotation.y+=u.spin*.7;
        f.scale.setScalar(u.sc*(1+Math.sin(t*2.2+u.wobble)*.1));
        if(f.position.y>12)f.position.y=-12;
        u.glow.position.x=f.position.x;u.glow.position.y=f.position.y;
        if(f.isHeart&&f.material.uniforms)f.material.uniforms.time.value=t;
      });

      orbList.forEach(orb=>{
        const u=orb.userData;
        orb.position.y+=u.vy;orb.position.x+=Math.sin(t*.7+u.wobble)*.003;
        const pulse=1+Math.sin(t*1.8+u.wobble)*.07;orb.scale.setScalar(pulse);
        if(orb.position.y>12)orb.position.y=-12;
        if(u.glow){u.glow.position.x=orb.position.x;u.glow.position.y=orb.position.y;}
        if(u.atm){u.atm.position.x=orb.position.x;u.atm.position.y=orb.position.y;u.atm.scale.setScalar(pulse);}
      });

      nebR.rotation.y=t*.011;nebG.rotation.y=-t*.009;nebP.rotation.y=t*.01;nebT.rotation.z=t*.008;stars.rotation.y=t*.003;
      helixGroup.rotation.y=t*.22;helixGroup.rotation.x=Math.sin(t*.14)*.1;

      rL.intensity=2.8+Math.sin(t*1.3)*.9;gL.intensity=2.4+Math.sin(t*1.6+.8)*.85;
      gL.position.x=Math.sin(t*.4)*12;gL.position.y=Math.cos(t*.3)*9;
      bL.intensity=1.4+Math.sin(t*1.05+1.5)*.55;pL.intensity=1.0+Math.sin(t*.95+2.2)*.45;

      grainTick++;if(grainTick%3===0)updateGrain();
      renderer.render(scene,camera);
    };
    animate();

    return()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove',onMouse);
      window.removeEventListener('resize',onResize);
      try{HG.dispose();SG.dispose();renderer.dispose();}catch(e){}
    };
  },[]);

  return (
    <>
      <canvas ref={cvRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',zIndex:0,pointerEvents:'none',display:'block'}} />
      <canvas ref={grRef} style={{position:'fixed',inset:0,width:'100%',height:'100%',zIndex:1,pointerEvents:'none',opacity:.042,mixBlendMode:'overlay'}} />
      {/* Cinematic color grade overlay */}
      <div style={{position:'fixed',inset:0,zIndex:2,pointerEvents:'none',background:'linear-gradient(155deg,rgba(0,50,80,.1) 0%,transparent 45%,rgba(90,35,0,.07) 100%)',mixBlendMode:'color'}} />
      {/* Vignette */}
      <div style={{position:'fixed',inset:0,zIndex:2,pointerEvents:'none',background:'radial-gradient(ellipse 92% 92% at 50% 50%,transparent 52%,rgba(2,0,4,.78) 100%)'}} />
    </>
  );
}


/* ── TIER COLORS ─────────────────────────────────────────── */
const TIER = {
  common:    { label:"Common",    color:"#aabbcc", glow:"rgba(170,187,204,.5)" },
  uncommon:  { label:"Uncommon",  color:"#7be3b1", glow:"rgba(123,227,177,.6)" },
  rare:      { label:"Rare",      color:"#7cc4ff", glow:"rgba(124,196,255,.65)" },
  epic:      { label:"Epic",      color:"#c58bff", glow:"rgba(197,139,255,.7)" },
  legendary: { label:"Legendary", color:"#ffd166", glow:"rgba(255,209,102,.8)" },
  mythic:    { label:"Mythic",    color:"#ff8fa3", glow:"rgba(255,143,163,.85)" },
};

/* ── DNA CREATURE CANVAS ─────────────────────────────────── */
function DNACreatureCanvas({ total }) {
  const cvRef = React.useRef(null);
  const level = total >= 100 ? 5 : total >= 50 ? 4 : total >= 25 ? 3 : total >= 10 ? 2 : total >= 1 ? 1 : 0;
  const LABELS = [
    "Log kindness to awaken your DNA creature ✨",
    "Kindness Seed — DNA awakening 🌱",
    "Sprouting Being — arms of compassion 🌿",
    "Walking Light — taking form 🌟",
    "Winged Guardian — spreading kindness 🦋",
    "Cosmic Creature — fully evolved 🐉",
  ];

  React.useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(cv.clientWidth, cv.clientHeight);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, cv.clientWidth / cv.clientHeight, 0.1, 80);
    camera.position.set(0, 0, 11);

    scene.add(new THREE.AmbientLight(0xfff1e6, 0.55));
    const pL1 = new THREE.PointLight(0xff8fa3, 2.5, 30); pL1.position.set(-4, 4, 6); scene.add(pL1);
    const pL2 = new THREE.PointLight(0xffd166, 2.2, 25); pL2.position.set(4, -2, 5); scene.add(pL2);
    const pL3 = new THREE.PointLight(0xc58bff, 1.6, 20); pL3.position.set(0, 6, 3); scene.add(pL3);

    // Glow sprite helper
    function gsp(r, g, b, size) {
      const res = 128, c = document.createElement("canvas"); c.width = c.height = res;
      const ctx = c.getContext("2d"), h = res / 2;
      const grd = ctx.createRadialGradient(h, h, 0, h, h, h);
      grd.addColorStop(0, `rgba(${r},${g},${b},.92)`);
      grd.addColorStop(.45, `rgba(${r},${g},${b},.4)`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grd; ctx.fillRect(0, 0, res, res);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      sp.scale.setScalar(size); return sp;
    }

    // Rainbow DNA shader
    const dnaU = { time: { value: 0 } };
    const dnaVS = "varying vec3 vWP;void main(){vWP=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWP,1.0);}";
    const dnaFS = "uniform float time;varying vec3 vWP;void main(){float t=fract((vWP.y+5.)/10.-time*.12);vec3 c;c.r=.5+.5*cos(6.28318*t);c.g=.5+.5*cos(6.28318*(t+.333));c.b=.5+.5*cos(6.28318*(t+.667));float gl=.5+.5*sin(time*3.+vWP.y*.9);c+=vec3(gl*.15);gl_FragColor=vec4(c,.92);}";
    const dnaMat = new THREE.ShaderMaterial({ vertexShader: dnaVS, fragmentShader: dnaFS, uniforms: dnaU, transparent: true, depthWrite: false });

    function makeTube(pts, r, mat) {
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, r, 10, false);
      return new THREE.Mesh(g, mat);
    }

    // DNA spine (always shown)
    const SH = 7; const spA = [], spB = [];
    for (let i = 0; i <= 70; i++) {
      const t = (i / 70) * Math.PI * 8, y = (i / 70) * SH - SH / 2;
      spA.push(new THREE.Vector3(Math.cos(t) * 1.3, y, Math.sin(t) * 0.55));
      spB.push(new THREE.Vector3(Math.cos(t + Math.PI) * 1.3, y, Math.sin(t + Math.PI) * 0.55));
    }
    scene.add(makeTube(spA, 0.062, dnaMat));
    scene.add(makeTube(spB, 0.062, dnaMat.clone()));
    for (let i = 0; i < 14; i++) {
      const t = (i / 14) * Math.PI * 8, y = (i / 14) * SH - SH / 2;
      const p1 = new THREE.Vector3(Math.cos(t) * 1.3, y, Math.sin(t) * 0.55);
      const p2 = new THREE.Vector3(Math.cos(t + Math.PI) * 1.3, y, Math.sin(t + Math.PI) * 0.55);
      scene.add(makeTube([p1, p2], 0.036, new THREE.MeshPhongMaterial({ color: 0xffd166, emissive: 0xffb26b, emissiveIntensity: 0.55, transparent: true, opacity: 0.72 })));
    }
    // Bioluminescent nodes on DNA
    const nodeGeo = new THREE.SphereGeometry(0.1, 10, 10);
    const PAL2 = [[255,93,115],[255,209,102],[197,139,255],[124,196,255],[123,227,177]];
    for (let i = 0; i < 10; i++) {
      const t = (i / 10) * Math.PI * 8, y = (i / 10) * SH - SH / 2;
      const [r, g, b] = PAL2[i % PAL2.length];
      const nd = new THREE.Mesh(nodeGeo, new THREE.MeshPhongMaterial({ color: new THREE.Color(r/255,g/255,b/255), emissive: new THREE.Color(r/255,g/255,b/255), emissiveIntensity: 1.0 }));
      nd.position.set(Math.cos(t)*1.3, y, Math.sin(t)*0.55);
      const ng = gsp(r, g, b, 1.8); ng.position.copy(nd.position);
      scene.add(nd); scene.add(ng);
    }

    // Body material
    const bMat = new THREE.MeshPhongMaterial({ color: 0xffb3c6, emissive: 0xff4488, emissiveIntensity: 0.28, shininess: 180, transparent: true, opacity: 0.93, specular: new THREE.Color(1, 0.8, 0.85) });
    const allMeshes = [];

    if (level >= 1) {
      // Glowing orb / egg emerging from DNA center
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 16), new THREE.MeshPhongMaterial({ color: 0xffb3c6, emissive: 0xff6699, emissiveIntensity: 0.6, shininess: 200, transparent: true, opacity: 0.88 }));
      egg.position.set(0, 0.5, 0); scene.add(egg); allMeshes.push(egg);
      scene.add(gsp(255, 143, 163, 4));
    }

    if (level >= 2) {
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.58, 16, 16), bMat);
      head.position.set(0, 3.8, 0); scene.add(head); allMeshes.push(head);
      scene.add(gsp(255, 143, 163, 2.5)).position.set(0, 3.8, 0);
      // Eyes
      [-1, 1].forEach(s => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x88ddff, emissiveIntensity: 1.0 }));
        eye.position.set(s * 0.2, 3.9, 0.5); scene.add(eye); allMeshes.push(eye);
      });
      // Arms reaching outward
      [-1, 1].forEach(side => {
        const armPts = [new THREE.Vector3(side * 0.6, 1.8, 0), new THREE.Vector3(side * 1.8, 1.0, 0.2), new THREE.Vector3(side * 2.5, 0.2, 0.5)];
        const arm = makeTube(armPts, 0.13, bMat); scene.add(arm); allMeshes.push(arm);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), bMat);
        hand.position.set(side * 2.7, 0.1, 0.6); scene.add(hand); allMeshes.push(hand);
        scene.add(gsp(255, 178, 107, 1.8)).position.set(side * 2.7, 0.1, 0.6);
      });
    }

    if (level >= 3) {
      // Legs
      [-1, 1].forEach(side => {
        const legPts = [new THREE.Vector3(side * 0.35, -2.8, 0), new THREE.Vector3(side * 0.55, -3.8, 0.25), new THREE.Vector3(side * 0.45, -4.6, 0.6)];
        const leg = makeTube(legPts, 0.15, bMat); scene.add(leg); allMeshes.push(leg);
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 8), bMat);
        foot.position.set(side * 0.45, -4.8, 0.7); scene.add(foot); allMeshes.push(foot);
      });
    }

    if (level >= 4) {
      // Wings — fan of 6 tubes per side
      [-1, 1].forEach(side => {
        for (let f = 0; f < 6; f++) {
          const fr = f / 5;
          const wingPts = [new THREE.Vector3(0, 1.5 - fr * 2.5, 0), new THREE.Vector3(side * (1.5 + fr * 2.5), 1.8 - fr * 3, 0.5 + fr * 0.4), new THREE.Vector3(side * (3.5 + fr * 1.5), 0.5 - fr * 2.2, 1.0)];
          const wMat = new THREE.MeshPhongMaterial({ color: new THREE.Color().setHSL(fr * 0.78 + 0.85, 0.85, 0.72), transparent: true, opacity: 0.42, shininess: 90, side: THREE.DoubleSide });
          const wing = makeTube(wingPts, 0.055, wMat); scene.add(wing); allMeshes.push(wing);
        }
      });
      scene.add(gsp(197, 139, 255, 9));
    }

    if (level >= 5) {
      // Crown of light spikes
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const crown = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.55, 6), new THREE.MeshPhongMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 1.4 }));
        crown.position.set(Math.cos(a) * 0.58, 4.6, Math.sin(a) * 0.58);
        crown.rotation.x = -Math.PI / 3.5 * Math.cos(a); crown.rotation.z = -Math.PI / 3.5 * Math.sin(a);
        scene.add(crown); allMeshes.push(crown);
        const cg = gsp(255, 209, 102, 1.2); cg.position.copy(crown.position); scene.add(cg);
      }
      // Cosmic aura particle cloud
      const aPos = new Float32Array(280 * 3);
      for (let i = 0; i < 280; i++) {
        const r = 2.8 + Math.random() * 1.8, t = Math.random() * Math.PI * 2, pv = Math.random() * Math.PI;
        aPos[i*3] = r*Math.sin(pv)*Math.cos(t); aPos[i*3+1] = (Math.random()-0.25)*10; aPos[i*3+2] = r*Math.sin(pv)*Math.sin(t);
      }
      const aGeo = new THREE.BufferGeometry(); aGeo.setAttribute("position", new THREE.BufferAttribute(aPos, 3));
      const aMesh = new THREE.Points(aGeo, new THREE.PointsMaterial({ color: 0xffd166, size: 0.1, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
      scene.add(aMesh); allMeshes.push(aMesh);
      scene.add(gsp(255, 209, 102, 14));
    }

    // Always: aura glow behind creature
    const auraSize = [0, 3, 6, 8, 11, 15][level];
    const [ar, ag, ab] = [[0,0,0],[255,209,102],[255,143,163],[124,196,255],[197,139,255],[255,143,163]][level];
    if (auraSize) { const ag2 = gsp(ar, ag, ab, auraSize); ag2.position.set(0, 0.5, -0.5); scene.add(ag2); }

    const clock = new THREE.Clock(); let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      dnaU.time.value = t;
      pL1.intensity = 2.5 + Math.sin(t * 1.3) * 0.9;
      pL2.intensity = 2.2 + Math.sin(t * 1.6 + 0.8) * 0.8;
      pL3.position.x = Math.sin(t * 0.65) * 4;
      // Gentle creature sway
      scene.rotation.y = Math.sin(t * 0.38) * 0.22;
      scene.rotation.x = Math.sin(t * 0.25) * 0.06;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      try { renderer.dispose(); } catch (e) {}
    };
  }, [level]);

  return (
    <div style={{ position: "relative", width: "100%", height: 260, marginBottom: 4 }}>
      <canvas ref={cvRef} style={{ width: "100%", height: "100%", display: "block" }} />
      <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", fontSize: 11, color: "rgba(253,243,236,0.55)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
        {LABELS[level]}
      </div>
      {level > 0 && (
        <div style={{ position: "absolute", top: 8, right: 12, fontSize: 10, letterSpacing: "0.25em", color: "#ffd166", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", padding: "3px 10px", borderRadius: 99, border: "1px solid rgba(255,209,102,0.3)" }}>
          LVL {level} / 5
        </div>
      )}
    </div>
  );
}

export default function RandomActsOfKindness() {
  // AUTH — must be FIRST, before every other hook
  const [session, setSession] = useState(null);     // null = not authenticated
  const [authError, setAuthError] = useState("");
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState("home"); // home | profile | edit
  const [acts, setActs] = useState([]);
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState(CATEGORIES[0].id);
  const [feeling, setFeeling] = useState(FEELINGS[0].label);
  const [toast, setToast] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const mountRef = useRef(null);
  const burstRef = useRef(null);
  const toastTimer = useRef(null);
  const actFileRef = useRef(null);
  const bcRef = useRef(null); // BroadcastChannel for cross-tab real-time sync

  // v1.2 — attachments for the act currently being logged
  const [photoAtt, setPhotoAtt] = useState(null); // resized dataURL
  const [locAtt, setLocAtt] = useState(null); // { lat, lng, name }
  const [locBusy, setLocBusy] = useState(false);

  // v1.3 — community + map
  const [challenges, setChallenges] = useState([]);
  const [showChallengePicker, setShowChallengePicker] = useState(false);
  const [openComments, setOpenComments] = useState(null); // act id with comments open
  const [commentText, setCommentText] = useState("");
  const [mapStatus, setMapStatus] = useState("loading"); // loading | ready | error
  const mapDivRef = useRef(null);

  // v1.4 — premium + manual place entry
  const [premium, setPremium] = useState(false);
  const [showPlaceInput, setShowPlaceInput] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeBusy, setPlaceBusy] = useState(false);

  // v1.5 — trophies, chat, globe, checkout, photo comments
  const [trophyBadge, setTrophyBadge] = useState(null); // badge being viewed in 3D
  const trophyCanvasRef = useRef(null);
  const [heartBursts, setHeartBursts] = useState({});
  const [chatMsgs, setChatMsgs] = useState([]);

  const triggerHeartBurst = (id) => {
    const key = `${id}-${Date.now()}`;
    setHeartBursts((prev) => ({ ...prev, [key]: id }));
    setTimeout(() => setHeartBursts((prev) => { const n = { ...prev }; delete n[key]; return n; }), 1000);
  };

  const toggleHeartAnimated = (id) => {
    toggleHeart(id);
    triggerHeartBurst(id);
  };
  const [chatText, setChatText] = useState("");
  const chatEndRef = useRef(null);
  const [mapMode, setMapMode] = useState("flat"); // flat | globe
  const globeDivRef = useRef(null);
  const [premiumInfo, setPremiumInfo] = useState(null); // { plan, since, renews }
  const [checkout, setCheckout] = useState(null); // { plan }
  const [checkoutStep, setCheckoutStep] = useState("cashapp"); // cashapp | submitted | pending
  const [subPending, setSubPending] = useState(null); // { plan, amount, ts, name, email }
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [globePin, setGlobePin] = useState(null); // clicked act on 3D globe
  const [adminView, setAdminView] = useState(false);
  const [adminTaps, setAdminTaps] = useState(0);
  const [pendingList, setPendingList] = useState([]);
  const [msgSearch, setMsgSearch] = useState("");
  const [addHandle, setAddHandle] = useState("");
  const [commentPhoto, setCommentPhoto] = useState(null);
  const commentFileRef = useRef(null);

  /* ---------- load saved data ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const a = await store.get(STORAGE_KEY);
        if (alive && a && a.value) {
          const parsed = JSON.parse(a.value);
          if (Array.isArray(parsed)) setActs(parsed);
        }
      } catch (e) { /* first run */ }
      try {
        const p = await store.get(PROFILE_KEY);
        if (alive && p && p.value) {
          const parsed = JSON.parse(p.value);
          if (parsed && parsed.name) {
            setProfile(parsed);
            if (parsed.prefs && parsed.prefs.length) setCat(parsed.prefs[0]);
          }
        }
      } catch (e) { /* no profile yet */ }
      try {
        const c = await store.get(CHALLENGES_KEY);
        if (alive && c && c.value) {
          const parsed = JSON.parse(c.value);
          if (Array.isArray(parsed)) setChallenges(parsed);
        }
      } catch (e) { /* no challenges yet */ }
      try {
        const pm = await store.get(PREMIUM_KEY);
        if (alive && pm && pm.value) {
          if (pm.value === "1") {
            const since = Date.now();
            setPremiumInfo({ plan: "monthly", since, renews: since + 30 * 86400000 });
            setPremium(true);
          } else {
            const info = JSON.parse(pm.value);
            if (info && info.plan) { setPremiumInfo(info); setPremium(true); }
          }
        }
      } catch (e) { /* free plan */ }
      try {
        const ch = await store.get(CHAT_KEY);
        if (alive && ch && ch.value) {
          const parsed = JSON.parse(ch.value);
          if (Array.isArray(parsed)) setChatMsgs(parsed);
        }
      } catch (e) { /* no chats yet */ }
      try {
        const pend = await store.get(PENDING_KEY);
        if (alive && pend && pend.value) {
          const parsed = JSON.parse(pend.value);
          if (parsed && parsed.status) setSubPending(parsed);
          if (parsed && parsed.approved) { setPremium(true); setSubPending(null); }
        }
      } catch (e) { /* no pending */ }
      try {
        const sess = await store.get(SESSION_KEY);
        if (alive && sess && sess.value) {
          const parsed = JSON.parse(sess.value);
          if (parsed && parsed.email) {
            setSession(parsed);
            // If admin session, load admin profile from its own key
            if (parsed.isAdmin) {
              try {
                const ap = await store.get("rak-admin-profile-v1");
                if (ap && ap.value) {
                  const ap2 = JSON.parse(ap.value);
                  if (ap2 && ap2.name) setProfile(ap2);
                }
              } catch {}
            }
          }
        }
      } catch (e) { /* not logged in */ }
      if (alive) setReady(true);
    })();
    return () => { alive = false; };
  }, []);

  const persistActs = async (next) => {
    const res = await store.set(STORAGE_KEY, JSON.stringify(next));
    if (!res || res.persisted === false) {
      showToast("⚠️ Storage full — saved for this session only");
    }
  };
  const persistProfile = (p) => store.set(PROFILE_KEY, JSON.stringify(p));

  /* ---------- derived ---------- */
  const stats = useMemo(() => {
    const total = acts.length;
    const points = acts.reduce(
      (sum, a) => sum + ((CATEGORIES.find((c) => c.id === a.cat) || {}).points || 10) + (a.bonus || 0),
      0
    );
    const byCat = {};
    acts.forEach((a) => { byCat[a.cat] = (byCat[a.cat] || 0) + 1; });
    const streak = computeStreak(acts);
    const withPhotos = acts.filter((a) => a.photo).length;
    const uniquePlaces = new Set(acts.filter((a) => a.loc && a.loc.name).map((a) => a.loc.name)).size;
    const commentCount = acts.reduce((n, a) => n + ((a.comments || []).length), 0);
    let levelIdx = 0;
    LEVELS.forEach((l, i) => { if (points >= l.min) levelIdx = i; });
    const level = LEVELS[levelIdx];
    const nextLevel = LEVELS[levelIdx + 1] || null;
    const progress = nextLevel ? Math.min(1, (points - level.min) / (nextLevel.min - level.min)) : 1;
    const heartsGiven = acts.reduce((n, a) => n + (a.likedByMe ? 1 : 0), 0);
    return { total, points, byCat, streak, withPhotos, uniquePlaces, commentCount, heartsGiven, level, nextLevel, progress };
  }, [acts]);

  const earned = useMemo(() => BADGES.filter((b) => b.test(stats)).map((b) => b.id), [stats]);
  const selectedCat = CATEGORIES.find((c) => c.id === cat) || CATEGORIES[0];
  const firstName = profile ? profile.name.split(" ")[0] : "";

  // preferred categories float to the front of the picker
  const orderedCategories = useMemo(() => {
    const prefs = (profile && profile.prefs) || [];
    return [...CATEGORIES].sort(
      (a, b) => (prefs.includes(b.id) ? 1 : 0) - (prefs.includes(a.id) ? 1 : 0)
    );
  }, [profile]);

  // v1.3 — live challenge progress derived from acts
  const challengeInfo = useMemo(() => {
    const now = Date.now();
    return challenges
      .map((c) => {
        const tpl = CHALLENGE_TEMPLATES.find((t) => t.id === c.tplId);
        if (!tpl) return null;
        const end = c.startedTs + tpl.days * 86400000;
        const progress = acts.filter(
          (a) => a.ts >= c.startedTs && a.ts <= end && (!tpl.cat || a.cat === tpl.cat)
        ).length;
        const done = progress >= tpl.target;
        const expired = !done && now > end;
        const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
        return { id: c.id, tpl, progress, done, expired, daysLeft };
      })
      .filter(Boolean);
  }, [challenges, acts]);

  /* ---------- actions ---------- */
  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const addAct = () => {
    const text = desc.trim();
    if (!text) return;
    // streak milestone rewards: bonus points on the day you hit 3 / 7 / 14 / 30
    const MILESTONE_BONUS = { 3: 10, 7: 25, 14: 60, 30: 150 };
    const todayStr = new Date().toDateString();
    const firstToday = !acts.some((x) => new Date(x.ts).toDateString() === todayStr);
    let bonus = 0;
    let streakAfter = 0;
    if (firstToday) {
      streakAfter = computeStreak([{ ts: Date.now() }, ...acts]);
      if (MILESTONE_BONUS[streakAfter]) bonus = MILESTONE_BONUS[streakAfter];
    }
    const act = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      desc: text,
      cat,
      feeling,
      ts: Date.now(),
      photo: photoAtt || null,
      loc: locAtt || null,
      bonus,
    };
    const next = [act, ...acts];
    setActs(next);
    persistActs(next);
    if (burstRef.current) burstRef.current();
    showToast(
      bonus
        ? `🔥 ${streakAfter}-day streak! +${selectedCat.points + bonus} pts (incl. +${bonus} bonus)`
        : `+${selectedCat.points} kindness points ✨`
    );
    setDesc("");
    setPhotoAtt(null);
    setLocAtt(null);
  };

  const fillIdea = () => setDesc(IDEAS[Math.floor(Math.random() * IDEAS.length)]);

  // v1.2 — attach a photo as proof (resized on-device so storage stays small)
  const attachActPhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 720;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setPhotoAtt(canvas.toDataURL("image/jpeg", 0.75));
          showToast("Photo attached 📷");
        } catch (err) {
          console.error("Could not process photo:", err);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // v1.2 — geo-tag the act; reverse-geocoded to a friendly place name
  const attachLocation = () => {
    if (!("geolocation" in navigator)) {
      showToast("No GPS here — type a place instead 🏙️");
      setShowPlaceInput(true);
      return;
    }
    if (window.isSecureContext === false) {
      // browsers block geolocation on plain-http IP addresses (e.g. 192.168.x.x)
      showToast("⚠️ GPS is blocked on this address — open http://localhost:5173, or type a place 🏙️");
      setShowPlaceInput(true);
      return;
    }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const lat = Number(p.coords.latitude.toFixed(5));
        const lng = Number(p.coords.longitude.toFixed(5));
        let name = `${lat}, ${lng}`;
        try {
          // free reverse geocoding, no API key (OpenStreetMap Nominatim)
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=12`
          );
          const j = await r.json();
          const a = j.address || {};
          const place = a.city || a.town || a.village || a.municipality || a.county || a.state;
          if (place) name = a.country_code ? `${place}, ${a.country_code.toUpperCase()}` : place;
        } catch (err) {
          /* offline or blocked — raw coordinates still work */
        }
        setLocAtt({ lat, lng, name });
        setLocBusy(false);
        showToast("Location attached 📍");
      },
      (err) => {
        setLocBusy(false);
        const msg =
          err && err.code === 1
            ? "Location permission denied — allow it for this site, or type a place 🏙️"
            : err && err.code === 3
            ? "GPS timed out — try near a window, or type a place 🏙️"
            : "GPS unavailable — type a place instead 🏙️";
        showToast(msg);
        setShowPlaceInput(true);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 }
    );
  };

  const resetActs = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    setActs([]);
    setConfirmReset(false);
    await store.remove(STORAGE_KEY);
    showToast("Fresh start 🌱");
  };

  // v1.3 — social actions
  const toggleHeart = (id) => {
    const next = acts.map((a) =>
      a.id === id
        ? { ...a, likedByMe: !a.likedByMe, hearts: (a.hearts || 0) + (a.likedByMe ? -1 : 1) }
        : a
    );
    setActs(next);
    persistActs(next);
  };

  const addComment = (id) => {
    const text = commentText.trim();
    if (!text && !commentPhoto) return;
    const next = acts.map((a) =>
      a.id === id
        ? {
            ...a,
            comments: [
              ...(a.comments || []),
              { id: `${Date.now()}`, text: text || "📷", ts: Date.now(), by: profile ? profile.name : "You", photo: commentPhoto || null },
            ],
          }
        : a
    );
    setActs(next);
    persistActs(next);
    setCommentText("");
    setCommentPhoto(null);
  };

  // v1.5 — attach a small photo to a comment (resized hard so storage stays light)
  const attachCommentPhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 480;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
          setCommentPhoto(canvas.toDataURL("image/jpeg", 0.7));
        } catch (err) {
          console.error("Could not process comment photo:", err);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const shareAct = async (a) => {
    const c = CATEGORIES.find((x) => x.id === a.cat);
    const text = `Random act of kindness ${c ? c.emoji : "💛"}: ${a.desc} — spreading good, one act at a time. #RandomActsOfKindness`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast("Copied — paste it anywhere 📋");
      } else {
        showToast("Sharing isn't supported in this browser");
      }
    } catch (e) {
      /* user closed the share sheet — that's fine */
    }
  };

  const startChallenge = (tplId) => {
    const next = [...challenges, { id: `${Date.now()}`, tplId, startedTs: Date.now() }];
    setChallenges(next);
    store.set(CHALLENGES_KEY, JSON.stringify(next));
    setShowChallengePicker(false);
    showToast("Challenge started 🎯");
  };

  const abandonChallenge = (id) => {
    const next = challenges.filter((c) => c.id !== id);
    setChallenges(next);
    store.set(CHALLENGES_KEY, JSON.stringify(next));
  };

  // v1.4 — manual place entry: geocode a typed city/place (works even when GPS is blocked)
  const findPlace = async () => {
    const q = placeQuery.trim();
    if (!q) return;
    setPlaceBusy(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`
      );
      const j = await r.json();
      if (Array.isArray(j) && j[0]) {
        const name = String(j[0].display_name || q).split(",").slice(0, 2).join(",");
        setLocAtt({ lat: Number(j[0].lat), lng: Number(j[0].lon), name });
        setShowPlaceInput(false);
        setPlaceQuery("");
        showToast("Location attached 📍");
      } else {
        showToast("Place not found — try a city name");
      }
    } catch (e) {
      showToast("Couldn't search — check your internet");
    }
    setPlaceBusy(false);
  };

  // v1.4 — Kindness+ (DEMO subscription — wire Google Play Billing / Stripe here later)
  // v1.7 — Cash App checkout flow
  const subscribePremium = (plan) => {
    setCheckout({ plan });
    setCheckoutStep("cashapp");
  };

  const openCashApp = () => {
    const amount = PLANS[checkout.plan].amount;
    const url = `https://cash.app/${CASHAPP_TAG}/${amount}`;
    window.open(url, "_blank");
  };

  const sendEmails = async (pendingData) => {
    // Notify admin
    try {
      await fetch("https://formsubmit.co/ajax/" + ADMIN_EMAIL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: "🎉 New Kindness+ Subscriber Payment Received",
          name: pendingData.name,
          email: pendingData.email || "No email provided",
          plan: pendingData.plan,
          amount: `$${PLANS[pendingData.plan].amount}`,
          message: `New Kindness+ subscriber is waiting for approval!\n\nName: ${pendingData.name}\nEmail: ${pendingData.email || "N/A"}\nPlan: ${pendingData.plan} ($${PLANS[pendingData.plan].amount})\nSubmitted: ${new Date(pendingData.ts).toLocaleString()}\n\n✅ ACTIVATION CODE: ${generateActivationCode(pendingData.email || "")}\n\nSteps:\n1. Open Cash App (${CASHAPP_TAG}) and verify payment\n2. Once confirmed, share the Activation Code above with the subscriber\n3. They enter it in the app to activate instantly — OR open your Admin Dashboard and tap Approve.`,
          _template: "table",
        }),
      });
    } catch (e) { console.warn("Admin email failed:", e); }

    // Notify subscriber (if they have an email)
    if (pendingData.email) {
      try {
        await fetch("https://formsubmit.co/ajax/" + pendingData.email, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            _subject: "💛 Your Kindness+ Membership Request Has Been Received!",
            name: pendingData.name,
            message: `Hi ${pendingData.name}!\n\nThank you for subscribing to Kindness+! 💛\n\nYour ${pendingData.plan} plan payment of $${PLANS[pendingData.plan].amount} has been received and is being reviewed.\n\n✅ Your membership will be activated within 15 minutes to 8 hours.\n\nYou'll be able to use all Kindness+ features once your account is approved. Keep spreading kindness!\n\n— The Random Acts of Kindness Team`,
            _template: "box",
          }),
        });
      } catch (e) { console.warn("Subscriber email failed:", e); }
    }
  };

  const submitPaymentConfirmation = async () => {
    const pendingData = {
      name: profile ? profile.name : "Unknown",
      email: profile ? profile.email : "",
      plan: checkout.plan,
      amount: PLANS[checkout.plan].amount,
      ts: Date.now(),
      status: "pending",
      approved: false,
    };
    setCheckoutStep("submitted");
    setSubPending(pendingData);
    // Persist immediately so admin can find it on any fresh load
    await store.set(PENDING_KEY, JSON.stringify(pendingData));
    // Broadcast to other open tabs (admin dashboard) in real-time
    if (bcRef.current) bcRef.current.postMessage({ type: "new_pending", data: pendingData });
    // Send emails in background — don't block the UI
    sendEmails(pendingData).catch((e) => console.warn("Email error:", e));
    setTimeout(() => setCheckout(null), 2800);
  };

  // Admin: approve a subscription (marks pending as approved, activates premium)
  const adminApprove = () => {
    if (!subPending) return;
    const since = Date.now();
    const renews = since + (subPending.plan === "yearly" ? 365 : 30) * 86400000;
    const info = { plan: subPending.plan, since, renews };
    // Write premium to storage — subscriber's tab picks it up via storage event
    store.set(PREMIUM_KEY, JSON.stringify(info));
    store.remove(PENDING_KEY);
    // Broadcast to subscriber's tab instantly via BroadcastChannel
    if (bcRef.current) bcRef.current.postMessage({ type: "premium_activated", data: info });
    // Update admin's own state
    setPremiumInfo(info);
    setPremium(true);
    setSubPending(null);
    setAdminView(false);
    showToast("✅ Approved and broadcast to subscriber's tab!");
  };

  // Subscriber: self-activate with code emailed to them by admin
  const activateWithCode = () => {
    setCodeError("");
    if (!session || !session.email) { setCodeError("Not logged in."); return; }
    const expected = generateActivationCode(session.email);
    if (codeInput.trim().toUpperCase() !== expected) {
      setCodeError("Incorrect code. Please check the email from admin.");
      return;
    }
    // Code matches — activate
    const since = Date.now();
    const plan = subPending ? subPending.plan : "monthly";
    const renews = since + (plan === "yearly" ? 365 : 30) * 86400000;
    const info = { plan, since, renews };
    setPremiumInfo(info);
    setPremium(true);
    setSubPending(null);
    store.set(PREMIUM_KEY, JSON.stringify(info));
    store.remove(PENDING_KEY);
    setCodeInput("");
    showToast("🎉 Kindness+ is now active! Welcome.");
  };

  // Secret admin access: tap the logo/title 5 times rapidly
  const handleAdminTap = () => {
    const next = adminTaps + 1;
    setAdminTaps(next);
    if (next >= 5) {
      setAdminTaps(0);
      setAdminView(true);
    }
    setTimeout(() => setAdminTaps(0), 2000);
  };

  const cancelPremium = () => {
    setPremium(false);
    setPremiumInfo(null);
    store.remove(PREMIUM_KEY);
    showToast("Kindness+ cancelled (demo)");
  };

  // v1.5 — Kindness Buddy chat (demo bot; human DMs arrive with the backend)
  const sendChat = () => {
    const text = chatText.trim();
    if (!text) return;
    const mine = { id: `${Date.now()}m`, from: "me", text, ts: Date.now() };
    const next = [...chatMsgs, mine];
    setChatMsgs(next);
    store.set(CHAT_KEY, JSON.stringify(next));
    setChatText("");
    setTimeout(() => {
      const tpl = BUDDY_REPLIES[Math.floor(Math.random() * BUDDY_REPLIES.length)];
      const reply = tpl.replace("{IDEA}", IDEAS[Math.floor(Math.random() * IDEAS.length)].toLowerCase());
      setChatMsgs((cur) => {
        const n2 = [...cur, { id: `${Date.now()}b`, from: "buddy", text: reply, ts: Date.now() }];
        store.set(CHAT_KEY, JSON.stringify(n2));
        return n2;
      });
    }, 900);
  };

  const inviteFriend = async () => {
    const text = `Join me on Random Acts of Kindness 💛 — we log good deeds, build streaks, and grow a kinder world together. #RandomActsOfKindness`;
    try {
      if (navigator.share) await navigator.share({ text });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(text); showToast("Invite copied 📋"); }
    } catch (e) { /* cancelled */ }
  };

  /* ---------- auth functions ---------- */
  const handleLogin = async (email, pass) => {
    setAuthError("");
    // Check admin credentials first
    if (email === ADMIN_EMAIL.toLowerCase() && pass === ADMIN_PASS) {
      const sess = { email: ADMIN_EMAIL, isAdmin: true };
      setSession(sess);
      store.set(SESSION_KEY, JSON.stringify(sess));
      // Always set the admin profile with the correct email — overrides any subscriber profile
      const adminProfile = {
        name: "Atum",
        email: ADMIN_EMAIL,
        avatar: { emoji: "🔐", color: "#ffd166", photo: null },
        prefs: [],
        joined: Date.now(),
        bio: "Admin · Particle LC · " + ADMIN_EMAIL,
      };
      setProfile(adminProfile);
      store.set("rak-admin-profile-v1", JSON.stringify(adminProfile));
      return;
    }
    // Check registered accounts
    try {
      const acc = await store.get(ACCOUNTS_KEY);
      if (acc && acc.value) {
        const accounts = JSON.parse(acc.value);
        const found = accounts.find(a => a.email === email && a.passHash === btoa(email + ":" + pass));
        if (found) {
          const sess = { email: found.email, isAdmin: false };
          setSession(sess);
          store.set(SESSION_KEY, JSON.stringify(sess));
          return;
        }
      }
    } catch (e) { /* no accounts yet */ }
    setAuthError("Incorrect email or password. Please try again.");
  };

  const handleRegister = async (name, email, pass) => {
    setAuthError("");
    if (email === ADMIN_EMAIL.toLowerCase()) {
      setAuthError("This email is reserved. Please use a different email.");
      return;
    }
    try {
      const acc = await store.get(ACCOUNTS_KEY);
      const accounts = acc && acc.value ? JSON.parse(acc.value) : [];
      if (accounts.find(a => a.email === email)) {
        setAuthError("An account with this email already exists. Please log in.");
        return;
      }
      const newAcc = { email, passHash: btoa(email + ":" + pass), name, createdAt: Date.now() };
      accounts.push(newAcc);
      await store.set(ACCOUNTS_KEY, JSON.stringify(accounts));

      // Auto-create a profile so they go straight to home — no onboarding form needed
      const randomEmoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
      const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const autoProfile = {
        name: name.trim(),
        email: email.trim(),
        age: "",
        location: "",
        bio: "",
        avatar: { emoji: randomEmoji, color: randomColor, photo: null },
        prefs: [],
        joined: Date.now(),
      };
      setProfile(autoProfile);
      await store.set(PROFILE_KEY, JSON.stringify(autoProfile));

      const sess = { email, isAdmin: false };
      setSession(sess);
      store.set(SESSION_KEY, JSON.stringify(sess));
    } catch (e) {
      setAuthError("Could not create account. Please try again.");
    }
  };

  const handleLogout = () => {
    setSession(null);
    store.remove(SESSION_KEY);
    // Keep profile and acts — they reload from storage on next login
  };

  const isAdmin = session && session.isAdmin;

  const createProfile = (p) => {
    setProfile(p);
    persistProfile(p);
    if (p.prefs && p.prefs.length) setCat(p.prefs[0]);
    setView("home");
    showToast(`Welcome, ${p.name.split(" ")[0]}! 💛`);
  };

  const updateProfile = (p) => {
    setProfile(p);
    persistProfile(p);
    setView("profile");
    showToast("Profile saved 💛");
  };

  const deleteProfile = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setConfirmDelete(false);
    setProfile(null);
    setView("home");
    await store.remove(PROFILE_KEY);
  };

  /* ---------- 3D scene: floating hearts (home only) ---------- */
  const hasProfile = !!profile;
  useEffect(() => {
    if (!ready || !hasProfile || view !== "home") return;
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xfff1e6, 0.85));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(3, 5, 6);
    scene.add(key);
    const glow = new THREE.PointLight(0xff8fa3, 1.4, 30);
    glow.position.set(-4, -2, 4);
    scene.add(glow);
    const rim = new THREE.PointLight(0xffd166, 0.9, 25);
    rim.position.set(5, 3, -2);
    scene.add(rim);

    const hs = new THREE.Shape();
    hs.moveTo(0.25, 0.25);
    hs.bezierCurveTo(0.25, 0.25, 0.2, 0, 0, 0);
    hs.bezierCurveTo(-0.3, 0, -0.3, 0.35, -0.3, 0.35);
    hs.bezierCurveTo(-0.3, 0.55, -0.1, 0.77, 0.25, 0.95);
    hs.bezierCurveTo(0.6, 0.77, 0.8, 0.55, 0.8, 0.35);
    hs.bezierCurveTo(0.8, 0.35, 0.8, 0, 0.5, 0);
    hs.bezierCurveTo(0.35, 0, 0.25, 0.25, 0.25, 0.25);
    const geo = new THREE.ExtrudeGeometry(hs, {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3,
      curveSegments: 16,
    });
    geo.center();

    const palette = {
      heart: [0xff5d73, 0xff8fa3, 0xffb3c1, 0xf4978e],
      star: [0xffd166, 0xffe3a3, 0xffb26b],
      coin: [0xffd166, 0xf5c542],
      spark: [0xfdf3ec, 0xffe3b3, 0xc58bff],
    };
    const starGeo = new THREE.ExtrudeGeometry(starShape(5, 0.5, 0.22), {
      depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2,
    });
    starGeo.center();
    const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 24);
    const sparkOctGeo = new THREE.OctahedronGeometry(0.22, 0);
    const hearts = []; // mixed kindness floats: hearts, stars, coins, sparks

    function makeFloat(opts = {}) {
      if (hearts.length > 46) return;
      const kind = opts.kind || (Math.random() < 0.5 ? "heart" : Math.random() < 0.5 ? "star" : Math.random() < 0.5 ? "coin" : "spark");
      const colors = palette[kind];
      const mat = new THREE.MeshPhongMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        shininess: 100,
        transparent: true,
        opacity: 0.95,
      });
      const g = kind === "heart" ? geo : kind === "star" ? starGeo : kind === "coin" ? coinGeo : sparkOctGeo;
      const m = new THREE.Mesh(g, mat);
      const baseScale = opts.scale != null ? opts.scale : kind === "heart" ? 0.35 + Math.random() * 0.5 : 0.5 + Math.random() * 0.55;
      m.scale.setScalar(baseScale);
      m.position.set(
        opts.x != null ? opts.x : Math.random() * 10 - 5,
        opts.y != null ? opts.y : -4 + Math.random() * 9,
        Math.random() * 3 - 2
      );
      if (kind === "coin") m.rotation.x = Math.PI / 2;
      m.userData = {
        kind,
        baseScale,
        vy: opts.vy != null ? opts.vy : 0.004 + Math.random() * 0.006,
        vx: opts.vx != null ? opts.vx : (Math.random() - 0.5) * 0.004,
        wobble: Math.random() * Math.PI * 2,
        burst: !!opts.burst,
        life: 1,
      };
      scene.add(m);
      hearts.push(m);
    }

    for (let i = 0; i < 16; i++) makeFloat();

    /* --- large slowly-spinning 3D halo behind the title --- */
    const haloGeo = new THREE.TorusGeometry(3.4, 0.055, 12, 88);
    const haloMat = new THREE.MeshPhongMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.28, shininess: 80 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI * 0.26;
    scene.add(halo);

    /* --- second smaller orbit ring --- */
    const orbitGeo = new THREE.TorusGeometry(2.1, 0.032, 10, 64);
    const orbitMat = new THREE.MeshPhongMaterial({ color: 0xffd166, transparent: true, opacity: 0.22 });
    const orbitRing = new THREE.Mesh(orbitGeo, orbitMat);
    orbitRing.rotation.x = Math.PI * 0.5;
    orbitRing.rotation.z = Math.PI * 0.12;
    scene.add(orbitRing);

    /* --- flying doves: elongated OctahedronGeometry in ivory --- */
    const doveGeo = new THREE.OctahedronGeometry(0.18, 0);
    doveGeo.scale(1, 0.55, 2.0); // elongate into a bird silhouette
    const doves = [];
    for (let d = 0; d < 5; d++) {
      const m = new THREE.Mesh(
        doveGeo,
        new THREE.MeshPhongMaterial({ color: 0xfef0e6, shininess: 80, transparent: true, opacity: 0.88 })
      );
      m.position.set(-7 + d * 2.8, 1.5 + Math.sin(d * 1.8) * 1.2, Math.random() * 2 - 1);
      m.userData = { phase: d * 1.25, speed: 0.009 + d * 0.002 };
      scene.add(m);
      doves.push(m);
    }

    /* --- confetti ribbons: thin flat boxes spinning and rising --- */
    const ribbonColors = [0xff5d73, 0xffd166, 0x7cc4ff, 0xc58bff, 0x7be3b1, 0xffb26b];
    const ribbons = [];
    for (let r = 0; r < 18; r++) {
      const rg = new THREE.BoxGeometry(0.28 + Math.random() * 0.18, 0.07, 0.04);
      const rm = new THREE.Mesh(rg, new THREE.MeshPhongMaterial({
        color: ribbonColors[r % ribbonColors.length], transparent: true, opacity: 0.82, shininess: 60,
      }));
      rm.position.set(Math.random() * 12 - 6, -5 + Math.random() * 9, Math.random() * 3 - 1.5);
      rm.userData = {
        vy: 0.006 + Math.random() * 0.008,
        vx: (Math.random() - 0.5) * 0.005,
        wobble: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.08,
      };
      scene.add(rm);
      ribbons.push(rm);
    }

    /* --- dense warm sparkle particle cloud --- */
    const NP = 280;
    const pos = new Float32Array(NP * 3);
    for (let i = 0; i < NP; i++) {
      pos[i * 3] = Math.random() * 16 - 8;
      pos[i * 3 + 1] = Math.random() * 12 - 6;
      pos[i * 3 + 2] = Math.random() * 5 - 3;
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const sparkMat = new THREE.PointsMaterial({ color: 0xffe3b3, size: 0.055, transparent: true, opacity: 0.75 });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparks);

    /* pink accent cloud */
    const NP2 = 120;
    const pos2 = new Float32Array(NP2 * 3);
    for (let i = 0; i < NP2; i++) {
      pos2[i * 3] = Math.random() * 14 - 7;
      pos2[i * 3 + 1] = Math.random() * 10 - 5;
      pos2[i * 3 + 2] = Math.random() * 4 - 2;
    }
    const sparkGeo2 = new THREE.BufferGeometry();
    sparkGeo2.setAttribute("position", new THREE.BufferAttribute(pos2, 3));
    const sparkMat2 = new THREE.PointsMaterial({ color: 0xff8fa3, size: 0.04, transparent: true, opacity: 0.55 });
    const sparks2 = new THREE.Points(sparkGeo2, sparkMat2);
    scene.add(sparks2);

    burstRef.current = () => {
      for (let i = 0; i < 14; i++) {
        makeFloat({
          kind: Math.random() < 0.6 ? "heart" : Math.random() < 0.5 ? "star" : "spark",
          x: (Math.random() - 0.5) * 2.5,
          y: -4.8,
          vy: 0.025 + Math.random() * 0.035,
          vx: (Math.random() - 0.5) * 0.03,
          scale: 0.22 + Math.random() * 0.4,
          burst: true,
        });
      }
    };

    let raf;
    let clock, animate;
    try {
    clock = new THREE.Clock();
    animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      camera.position.x = Math.sin(t * 0.25) * 0.55;
      camera.position.y = Math.sin(t * 0.18) * 0.22;
      camera.lookAt(0, 0, 0);

      /* halo rings */
      halo.rotation.z += 0.003;
      haloMat.opacity = 0.18 + Math.sin(t * 0.7) * 0.1;
      orbitRing.rotation.y += 0.007;
      orbitMat.opacity = 0.12 + Math.sin(t * 1.1) * 0.08;

      /* doves */
      doves.forEach((d) => {
        const u = d.userData;
        d.position.x += u.speed;
        d.position.y = 1.5 + Math.sin(t * 1.8 + u.phase) * 0.55;
        d.rotation.y = Math.sin(t * 2.2 + u.phase) * 0.35;
        d.rotation.z = Math.sin(t * 2.6 + u.phase) * 0.2;
        if (d.position.x > 7.5) d.position.x = -7.5;
      });

      /* confetti ribbons */
      ribbons.forEach((r) => {
        const u = r.userData;
        r.position.y += u.vy;
        r.position.x += u.vx + Math.sin(t * 1.4 + u.wobble) * 0.003;
        r.rotation.z += u.spin;
        r.rotation.x += u.spin * 0.6;
        if (r.position.y > 5.8) r.position.y = -5;
      });

      for (let i = hearts.length - 1; i >= 0; i--) {
        const h = hearts[i];
        const u = h.userData;
        h.position.y += u.vy;
        h.position.x += u.vx + Math.sin(t * 1.2 + u.wobble) * 0.002;
        h.rotation.z = Math.PI + Math.sin(t * 0.9 + u.wobble) * 0.25;
        h.rotation.y = Math.sin(t * 0.7 + u.wobble * 1.3) * 0.55;
        const pulse = 1 + Math.sin(t * 2.4 + u.wobble) * 0.06;
        h.scale.setScalar(u.baseScale * pulse);
        if (u.burst) {
          u.life -= 0.006;
          h.material.opacity = Math.max(u.life, 0);
        }
        if (h.position.y > 5.6 || (u.burst && u.life <= 0)) {
          if (u.burst || hearts.length > 26) {
            scene.remove(h);
            h.material.dispose();
            hearts.splice(i, 1);
          } else {
            h.position.y = -5;
            h.position.x = Math.random() * 10 - 5;
          }
        }
      }

      sparks.rotation.y = Math.sin(t * 0.1) * 0.25;
      sparks.rotation.x = Math.sin(t * 0.07) * 0.1;
      sparkMat.opacity = 0.4 + Math.sin(t * 2) * 0.25;
      sparks2.rotation.y = -Math.sin(t * 0.13) * 0.2;
      sparkMat2.opacity = 0.3 + Math.sin(t * 2.4 + 1) * 0.2;
      renderer.render(scene, camera);
    };
    animate();
    } catch(e) {
      console.error("Hero 3D scene error:", e);
    }

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      burstRef.current = null;
      try {
        hearts.forEach((h) => { scene.remove(h); h.material.dispose(); });
        geo.dispose();
        starGeo.dispose();
        coinGeo.dispose();
        sparkOctGeo.dispose();
        haloGeo.dispose(); haloMat.dispose();
        orbitGeo.dispose(); orbitMat.dispose();
        doveGeo.dispose();
        doves.forEach((d) => d.material.dispose());
        ribbons.forEach((r) => { r.geometry.dispose(); r.material.dispose(); });
        sparkGeo.dispose(); sparkGeo2.dispose();
        sparkMat.dispose(); sparkMat2.dispose();
      } catch(e) { /* already disposed */ }
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [ready, hasProfile, view]);

  /* ---------- Kindness Map: Leaflet + OpenStreetMap ---------- */
  useEffect(() => {
    if (!ready || !hasProfile || view !== "map" || mapMode !== "flat") return;
    let map = null;
    let cancelled = false;
    setMapStatus("loading");
    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapDivRef.current) return;
        map = L.map(mapDivRef.current);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© OpenStreetMap contributors",
        }).addTo(map);

        const geoActs = acts.filter((a) => a.loc);
        const pts = [];
        geoActs.forEach((a) => {
          const c = CATEGORIES.find((x) => x.id === a.cat) || CATEGORIES[0];
          const icon = L.divIcon({
            className: "",
            html: `<div style="width:34px;height:34px;border-radius:50%;background:${c.color};display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);animation:rakMarkerPulse 2.4s ease-in-out infinite">${c.emoji}</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          });
          const photoHtml = a.photo
            ? `<img src="${a.photo}" style="width:100%;border-radius:8px;margin-top:6px"/>`
            : "";
          const popup = `<b>${escapeHtml(a.desc)}</b><br/>${c.emoji} ${c.label} · ${escapeHtml(
            (a.loc && a.loc.name) || ""
          )}<br/><small>${new Date(a.ts).toLocaleString()}</small>${photoHtml}`;
          L.marker([a.loc.lat, a.loc.lng], { icon }).addTo(map).bindPopup(popup);
          pts.push([a.loc.lat, a.loc.lng]);
        });

        if (pts.length > 0) map.fitBounds(pts, { padding: [40, 40], maxZoom: 13 });
        else map.setView([20, 0], 2);
        setMapStatus("ready");
        setTimeout(() => { if (map) map.invalidateSize(); }, 60);
      })
      .catch(() => {
        if (!cancelled) setMapStatus("error");
      });
    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [ready, hasProfile, view, mapMode, acts]);

  /* ---------- 3D Globe: rotating world with glowing kindness pins ---------- */
  const globePinCallbackRef = useRef(null);
  useEffect(() => { globePinCallbackRef.current = (act) => setGlobePin(act); }, []);
  useEffect(() => {
    if (!ready || !hasProfile || view !== "map" || mapMode !== "globe") return;
    const mount = globeDivRef.current;
    if (!mount) return;
    const globePinCallback = (act) => { if (globePinCallbackRef.current) globePinCallbackRef.current(act); };
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / 420, 0.1, 100);
    camera.position.set(0, 0, 6.2);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, 420);
    mount.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xfff1e6, 1.1);
    sun.position.set(4, 3, 5);
    scene.add(sun);

    const globe = new THREE.Group();
    const R = 2.1;
    const ocean = new THREE.Mesh(
      new THREE.SphereGeometry(R, 48, 48),
      new THREE.MeshPhongMaterial({ color: 0x11263f, shininess: 60, specular: 0x224466 })
    );
    globe.add(ocean);
    const grid = new THREE.Mesh(
      new THREE.SphereGeometry(R + 0.01, 28, 18),
      new THREE.MeshBasicMaterial({ color: 0x7cc4ff, wireframe: true, transparent: true, opacity: 0.16 })
    );
    globe.add(grid);
    const glowSphere = new THREE.Mesh(
      new THREE.SphereGeometry(R + 0.16, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.07, side: THREE.BackSide })
    );
    globe.add(glowSphere);

    const pinGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const pins = [];
    const pinActs = []; // parallel: pinActs[i] is the act for pins[i]
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    acts.filter((a) => a.loc).forEach((a) => {
      const c = CATEGORIES.find((x) => x.id === a.cat) || CATEGORIES[0];
      const col = parseInt(c.color.slice(1), 16);
      const m = new THREE.Mesh(pinGeo, new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.55 }));
      const phi = ((90 - a.loc.lat) * Math.PI) / 180;
      const theta = ((a.loc.lng + 180) * Math.PI) / 180;
      m.position.set(
        -(R + 0.04) * Math.sin(phi) * Math.cos(theta),
        (R + 0.04) * Math.cos(phi),
        (R + 0.04) * Math.sin(phi) * Math.sin(theta)
      );
      globe.add(m);
      pins.push(m);
      pinActs.push(a);
    });
    scene.add(globe);

    const SN = 220;
    const sp = new Float32Array(SN * 3);
    for (let i = 0; i < SN; i++) {
      sp[i * 3] = (Math.random() - 0.5) * 30;
      sp[i * 3 + 1] = (Math.random() - 0.5) * 20;
      sp[i * 3 + 2] = -6 - Math.random() * 10;
    }
    const sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    const smat = new THREE.PointsMaterial({ color: 0xfdf3ec, size: 0.05, transparent: true, opacity: 0.7 });
    const starfield = new THREE.Points(sgeo, smat);
    scene.add(starfield);

    // drag to spin
    let dragging = false, px = 0, py = 0, rx = 0.25;
    let downX = 0, downY = 0; // to distinguish tap vs drag
    const getPt = (e) => (e.touches ? e.touches[0] : e);
    const down = (e) => {
      dragging = true;
      const t0 = getPt(e);
      px = t0.clientX; py = t0.clientY;
      downX = t0.clientX; downY = t0.clientY;
    };
    const move = (e) => {
      if (!dragging) return;
      const t0 = getPt(e);
      globe.rotation.y += (t0.clientX - px) * 0.005;
      rx = Math.max(-1, Math.min(1, rx + (t0.clientY - py) * 0.003));
      px = t0.clientX; py = t0.clientY;
    };
    const up = (e) => {
      dragging = false;
      const t0 = getPt(e.changedTouches ? e : { clientX: px, clientY: py });
      const dx = (t0.clientX || px) - downX;
      const dy = (t0.clientY || py) - downY;
      // Only raycast on a tap (< 8px movement)
      if (Math.sqrt(dx * dx + dy * dy) < 8 && pins.length > 0) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((downX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((downY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(pins);
        if (hits.length > 0) {
          const idx = pins.indexOf(hits[0].object);
          if (idx >= 0) globePinCallback(pinActs[idx]);
        }
      }
    };
    const el = renderer.domElement;
    el.addEventListener("mousedown", down);
    el.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    el.addEventListener("touchstart", down, { passive: true });
    el.addEventListener("touchmove", move, { passive: true });
    el.addEventListener("touchend", up);

    const clock = new THREE.Clock();
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (!dragging) globe.rotation.y += 0.0045;
      globe.rotation.x += (rx - globe.rotation.x) * 0.08;
      const pulse = 1 + Math.sin(t * 3) * 0.28;
      pins.forEach((p) => p.scale.setScalar(pulse));
      starfield.rotation.z = t * 0.008;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("mousedown", down);
      el.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      el.removeEventListener("touchstart", down);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", up);
      pins.forEach((p) => p.material.dispose());
      pinGeo.dispose();
      ocean.geometry.dispose(); ocean.material.dispose();
      grid.geometry.dispose(); grid.material.dispose();
      glowSphere.geometry.dispose(); glowSphere.material.dispose();
      sgeo.dispose(); smat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [ready, hasProfile, view, mapMode, acts]);

  /* ---------- 3D trophy viewer: spinning medal/star/heart per badge ---------- */
  useEffect(() => {
    if (!trophyBadge) return;
    const mount = trophyCanvasRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.set(0, 0, 6);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const size = Math.min(mount.clientWidth || 280, 280);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    mount.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xfff1e6, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0xff8fa3, 1.2, 30);
    rim.position.set(-4, -2, 4);
    scene.add(rim);

    const earnedIt = earned.includes(trophyBadge.id);
    const colorHex = parseInt((trophyBadge.color || "#ffd166").slice(1), 16);
    const mat = new THREE.MeshPhongMaterial({ color: earnedIt ? colorHex : 0x666666, shininess: 110, specular: 0xffffff });
    const ringMat = new THREE.MeshPhongMaterial({ color: earnedIt ? 0xffd166 : 0x555555, shininess: 90 });

    const group = new THREE.Group();
    let centerGeo;
    if (trophyBadge.shape === "heart") {
      const hshape = new THREE.Shape();
      hshape.moveTo(0.25, 0.25);
      hshape.bezierCurveTo(0.25, 0.25, 0.2, 0, 0, 0);
      hshape.bezierCurveTo(-0.3, 0, -0.3, 0.35, -0.3, 0.35);
      hshape.bezierCurveTo(-0.3, 0.55, -0.1, 0.77, 0.25, 0.95);
      hshape.bezierCurveTo(0.6, 0.77, 0.8, 0.55, 0.8, 0.35);
      hshape.bezierCurveTo(0.8, 0.35, 0.8, 0, 0.5, 0);
      hshape.bezierCurveTo(0.35, 0, 0.25, 0.25, 0.25, 0.25);
      centerGeo = new THREE.ExtrudeGeometry(hshape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 16 });
      centerGeo.center();
    } else if (trophyBadge.shape === "star") {
      centerGeo = new THREE.ExtrudeGeometry(starShape(5, 1, 0.45), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 });
      centerGeo.center();
    } else {
      centerGeo = new THREE.CylinderGeometry(1, 1, 0.22, 40);
    }
    const center = new THREE.Mesh(centerGeo, mat);
    if (trophyBadge.shape === "medal") center.rotation.x = Math.PI / 2;
    if (trophyBadge.shape === "heart") { center.rotation.z = Math.PI; center.scale.setScalar(1.35); }
    group.add(center);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.1, 14, 56), ringMat);
    group.add(ring);
    scene.add(group);

    const N2 = 60;
    const p2 = new Float32Array(N2 * 3);
    for (let i = 0; i < N2; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 0.6;
      p2[i * 3] = Math.cos(a) * r;
      p2[i * 3 + 1] = (Math.random() - 0.5) * 2.4;
      p2[i * 3 + 2] = Math.sin(a) * r;
    }
    const sg2 = new THREE.BufferGeometry();
    sg2.setAttribute("position", new THREE.BufferAttribute(p2, 3));
    const sm2 = new THREE.PointsMaterial({ color: earnedIt ? 0xffe3b3 : 0x888888, size: 0.06, transparent: true, opacity: 0.9 });
    const orbit = new THREE.Points(sg2, sm2);
    scene.add(orbit);

    const clock = new THREE.Clock();
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      group.rotation.y += 0.022;
      group.position.y = Math.sin(t * 1.6) * 0.15;
      orbit.rotation.y -= 0.007;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      centerGeo.dispose();
      ring.geometry.dispose();
      mat.dispose(); ringMat.dispose();
      sg2.dispose(); sm2.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [trophyBadge, earned]);

  /* ---------- BroadcastChannel: real-time cross-tab sync ----------
     Same browser, different tabs → instant sync of pending subscriptions
     and premium activations without a backend.                        */
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const bc = new BroadcastChannel("rak-sync-v1");
    bcRef.current = bc;

    bc.onmessage = (e) => {
      const { type, data } = e.data || {};
      if (type === "new_pending" && data) {
        setSubPending(data);
        // If admin dashboard is open, update immediately
        setAdminView((was) => {
          if (was) showToast("🔔 New subscriber awaiting approval!");
          return was;
        });
      }
      if (type === "premium_activated" && data) {
        // The subscriber's tab receives this when admin approves
        setPremiumInfo(data);
        setPremium(true);
        setSubPending(null);
        store.remove(PENDING_KEY);
        showToast("🎉 Kindness+ is now active! Welcome.");
      }
      if (type === "code_sent") {
        showToast("✅ Activation code sent to your email.");
      }
    };

    return () => { bc.close(); bcRef.current = null; };
  }, []);

  /* ---------- storage event: cross-tab fallback ----------
     Fires when ANOTHER tab in the same browser writes to localStorage.
     Covers browsers that don't support BroadcastChannel.            */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === PENDING_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.status === "pending" && !parsed.approved) {
            setSubPending(parsed);
            setAdminView((was) => {
              if (was) showToast("🔔 New subscriber just submitted payment!");
              return was;
            });
          }
        } catch {}
      }
      if (e.key === PREMIUM_KEY && e.newValue) {
        try {
          const info = JSON.parse(e.newValue);
          if (info && info.plan) { setPremiumInfo(info); setPremium(true); }
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /* ---------- chat auto-scroll ---------- */
  useEffect(() => {
    if (view === "chat" && chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs, view]);

  /* ---------- admin dashboard: reload pending from storage on every open ---------- */
  useEffect(() => {
    if (!adminView) return;
    (async () => {
      try {
        const pend = await store.get(PENDING_KEY);
        if (pend && pend.value) {
          const parsed = JSON.parse(pend.value);
          if (parsed && parsed.status === "pending" && !parsed.approved) {
            setSubPending(parsed);
          } else if (parsed && parsed.approved) {
            setSubPending(null); // already approved
          }
        }
      } catch (e) { /* storage unavailable */ }
    })();
  }, [adminView]);

  // v1.4 — full social feed item (used on the Feed page)
  const renderFeedItem = (a) => {
    const c = CATEGORIES.find((x) => x.id === a.cat) || CATEGORIES[0];
    const f = FEELINGS.find((x) => x.label === a.feeling);
    return (
      <div key={a.id} className="flex items-start gap-3 rounded-2xl p-4" style={glass}>
        <div
          className="flex items-center justify-center rounded-full flex-shrink-0"
          style={{ width: 42, height: 42, background: hexToRgba(c.color, 0.18), border: `1px solid ${hexToRgba(c.color, 0.4)}`, fontSize: 18 }}
        >
          {c.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ color: "#fdf3ec", fontSize: 14, lineHeight: 1.45 }}>{a.desc}</div>
          <div className="mt-1" style={{ fontSize: 11, color: "rgba(253,243,236,0.5)" }}>
            {c.label} · {f ? `${f.emoji} ${f.label}` : a.feeling} · {timeAgo(a.ts)}
            {a.loc && <span> · 📍 {a.loc.name}</span>}
            {a.bonus ? <span style={{ color: "#ffb26b" }}> · 🔥 streak bonus</span> : null}
          </div>
          {a.photo && (
            <img
              src={a.photo}
              alt="kindness proof"
              className="rounded-xl mt-2 w-full object-cover"
              style={{ maxHeight: 200, border: "1px solid rgba(255,255,255,0.1)" }}
            />
          )}
          <div className="flex items-center gap-4 mt-2 relative">
            {/* floating heart burst particles — no CSS custom properties, works on all Android */}
            {Object.entries(heartBursts)
              .filter(([, actId]) => actId === a.id)
              .map(([key]) =>
                [
                  { h: "❤️", sz: 16, tx: 0,  ty: -65, rot: -25 },
                  { h: "💕", sz: 13, tx: 16, ty: -55, rot: 10  },
                  { h: "💖", sz: 18, tx: -12, ty: -70, rot: -10 },
                ].map((p, pi) => (
                  <span
                    key={`${key}-${pi}`}
                    style={{
                      position: "absolute",
                      left: 8 + pi * 10,
                      top: 0,
                      fontSize: p.sz,
                      pointerEvents: "none",
                      zIndex: 10,
                      animation: `none`,
                      transition: "transform 0.9s ease-out, opacity 0.9s ease-out",
                      transform: `translateY(${p.ty}px) translateX(${p.tx}px) rotate(${p.rot}deg) scale(0.4)`,
                      opacity: 0,
                      animationFillMode: "forwards",
                    }}
                    ref={(el) => {
                      if (el) {
                        requestAnimationFrame(() => {
                          el.style.transform = `translateY(${p.ty}px) translateX(${p.tx}px) rotate(${p.rot}deg) scale(0.4)`;
                          el.style.opacity = "0";
                          requestAnimationFrame(() => {
                            el.style.transition = "transform 0.85s cubic-bezier(0.2,0.8,0.4,1), opacity 0.85s ease-out";
                            el.style.transform = `translateY(${p.ty - 20}px) translateX(${p.tx}px) rotate(${p.rot}deg) scale(1.2)`;
                            el.style.opacity = "0";
                            setTimeout(() => { if (el) el.style.opacity = "1"; }, 10);
                            setTimeout(() => { if (el) el.style.opacity = "0"; }, 400);
                          });
                        });
                      }
                    }}
                  >
                    {p.h}
                  </span>
                ))
              )}
            <button
              onClick={() => toggleHeartAnimated(a.id)}
              className="font-semibold"
              style={{
                fontSize: 12,
                color: a.likedByMe ? "#ff5d73" : "rgba(253,243,236,0.6)",
                transition: "transform .15s, color .15s",
                transform: a.likedByMe ? "scale(1.25)" : "scale(1)",
              }}
            >
              {a.likedByMe ? "❤️" : "🤍"} {a.hearts || 0}
            </button>
            <button
              onClick={() => { setOpenComments(openComments === a.id ? null : a.id); setCommentText(""); setCommentPhoto(null); }}
              className="font-semibold"
              style={{ fontSize: 12, color: openComments === a.id ? "#ffd166" : "rgba(253,243,236,0.6)" }}
            >
              💬 {(a.comments || []).length}
            </button>
            <button
              onClick={() => shareAct(a)}
              className="font-semibold"
              style={{ fontSize: 12, color: "rgba(253,243,236,0.6)" }}
            >
              ↗ Share
            </button>
          </div>
          {openComments === a.id && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <input ref={commentFileRef} type="file" accept="image/*" onChange={attachCommentPhoto} style={{ display: "none" }} />
              {(a.comments || []).map((cm) => (
                <div key={cm.id} className="mb-2" style={{ lineHeight: 1.4 }}>
                  <span className="font-semibold" style={{ fontSize: 12, color: "#ffd166" }}>{cm.by}</span>
                  <span style={{ fontSize: 12, color: "rgba(253,243,236,0.8)" }}> {cm.text}</span>
                  <span style={{ fontSize: 10, color: "rgba(253,243,236,0.35)" }}> · {timeAgo(cm.ts)}</span>
                  {cm.photo && (
                    <img
                      src={cm.photo}
                      alt="comment attachment"
                      className="rounded-xl mt-1 w-full object-cover"
                      style={{ maxHeight: 140, border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  )}
                </div>
              ))}
              {commentPhoto && (
                <div className="flex items-center gap-2 mb-2">
                  <img src={commentPhoto} alt="attachment preview" className="rounded-lg object-cover" style={{ width: 44, height: 44, border: "1px solid rgba(255,209,102,0.5)" }} />
                  <button onClick={() => setCommentPhoto(null)} style={{ fontSize: 11, color: "rgba(253,243,236,0.6)" }}>✕ remove</button>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => commentFileRef.current && commentFileRef.current.click()}
                  className="rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ width: 36, height: 36, background: commentPhoto ? "rgba(255,209,102,0.16)" : "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 14 }}
                >
                  📷
                </button>
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addComment(a.id); }}
                  maxLength={140}
                  placeholder="Add a kind word…"
                  className="flex-1 rounded-full px-3 py-2 outline-none"
                  style={{ ...fieldStyle, fontSize: 12 }}
                />
                <button
                  onClick={() => addComment(a.id)}
                  className="rounded-full px-4 py-2 font-bold flex-shrink-0"
                  style={{ fontSize: 12, background: "linear-gradient(135deg, #ff5d73, #ffb26b)", color: "#2a0d18" }}
                >
                  ➤
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="font-bold flex-shrink-0" style={{ color: "#ffd166", fontSize: 13 }}>
          +{c.points + (a.bonus || 0)}
        </div>
      </div>
    );
  };

  /* ---------- toast (shared) ---------- */
  const toastEl = toast && (
    <div
      className="fixed left-1/2 z-50 rounded-full px-5 py-2 font-bold"
      style={{
        bottom: 28,
        transform: "translateX(-50%)",
        background: "linear-gradient(135deg, #ffd166, #ff8fa3)",
        color: "#2a0d18",
        fontSize: 14,
        boxShadow: "0 12px 40px rgba(255,141,163,0.45)",
        animation: "rakToastIn .3s ease",
      }}
    >
      {toast}
    </div>
  );

  /* ---------- 3D trophy modal (shared) ---------- */
  const trophyEl = trophyBadge && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: "rgba(10,3,8,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={() => setTrophyBadge(null)}
    >
      <div
        className="rounded-3xl p-5 text-center w-full"
        style={{ ...glass, maxWidth: 340, background: "rgba(30,12,26,0.96)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={trophyCanvasRef} className="flex items-center justify-center" style={{ height: 280 }} />
        <div className="font-bold" style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: trophyBadge.color || "#ffd166" }}>
          {trophyBadge.emoji} {trophyBadge.name}
        </div>
        <div className="mt-1" style={{ fontSize: 12, color: "rgba(253,243,236,0.65)" }}>{trophyBadge.desc}</div>
        <div className="mt-2 font-semibold" style={{ fontSize: 12, color: earned.includes(trophyBadge.id) ? "#7be3b1" : "rgba(253,243,236,0.45)" }}>
          {earned.includes(trophyBadge.id) ? "★ Earned — beautiful work" : "🔒 Locked — keep going"}
        </div>
        <button
          onClick={() => setTrophyBadge(null)}
          className="w-full rounded-2xl py-2 font-semibold mt-4"
          style={{ fontSize: 13, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fdf3ec" }}
        >
          Close
        </button>
      </div>
    </div>
  );

  /* ---------- Globe pin popup (shared) ---------- */
  const globePinEl = globePin && (() => {
    const c = CATEGORIES.find((x) => x.id === globePin.cat) || CATEGORIES[0];
    const f = FEELINGS.find((x) => x.label === globePin.feeling);
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ background: "rgba(10,3,8,0.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
        onClick={() => setGlobePin(null)}
      >
        <div
          className="w-full rounded-t-3xl p-5 pb-8"
          style={{ ...glass, maxWidth: 440, background: "rgba(28,10,22,0.97)", animation: "rakToastIn .3s ease" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="rounded-full flex items-center justify-center" style={{ width: 44, height: 44, background: hexToRgba(c.color, 0.18), border: `1px solid ${hexToRgba(c.color, 0.45)}`, fontSize: 20 }}>{c.emoji}</div>
            <div>
              <div className="font-semibold" style={{ fontSize: 14, color: "#fdf3ec" }}>{globePin.desc}</div>
              <div style={{ fontSize: 11, color: "rgba(253,243,236,0.55)" }}>
                {c.label} · {f ? `${f.emoji} ${f.label}` : globePin.feeling} · 📍 {globePin.loc.name}
              </div>
              <div style={{ fontSize: 10, color: "rgba(253,243,236,0.4)" }}>{new Date(globePin.ts).toLocaleDateString()}</div>
            </div>
          </div>
          {globePin.photo && <img src={globePin.photo} alt="proof" className="rounded-2xl w-full object-cover" style={{ maxHeight: 200, border: "1px solid rgba(255,255,255,0.1)" }} />}
          <button onClick={() => setGlobePin(null)} className="w-full rounded-2xl py-2 font-semibold mt-4" style={{ fontSize: 13, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", color: "rgba(253,243,236,0.7)" }}>Close</button>
        </div>
      </div>
    );
  })();

  /* ---------- Cash App 3D checkout modal (shared) ---------- */
  const checkoutEl = checkout && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(8,3,6,0.88)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
      onClick={() => { if (checkoutStep !== "submitted") setCheckout(null); }}
    >
      <div
        className="rounded-3xl p-6 w-full"
        style={{ ...glass, maxWidth: 360, background: "rgba(15,5,12,0.97)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {checkoutStep === "cashapp" && (
          <div>
            {/* 3D animated Cash App icon header */}
            <div className="flex justify-center mb-4">
              <div style={{ position: "relative", width: 80, height: 80 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 22,
                  background: "linear-gradient(145deg, #00D632, #00a825)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 42,
                  boxShadow: "0 8px 32px rgba(0,214,50,0.45), 0 2px 8px rgba(0,0,0,0.5)",
                  animation: "rakBadgeFloat 2.4s ease-in-out infinite",
                }}>💵</div>
                <div style={{
                  position: "absolute", inset: -6, borderRadius: 28,
                  border: "2px solid rgba(0,214,50,0.35)",
                  animation: "rakStatRing 2.8s ease-in-out infinite",
                }} />
              </div>
            </div>
            <div className="text-center mb-4">
              <div className="font-bold" style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: "#ffd166" }}>Kindness+ · {PLANS[checkout.plan].label}</div>
              <div className="font-bold mt-1" style={{ fontSize: 28, color: "#00D632", letterSpacing: "-0.5px" }}>{PLANS[checkout.plan].price}</div>
              <div style={{ fontSize: 11, color: "rgba(253,243,236,0.5)" }}>one-time · manually approved within 15 min – 8 hrs</div>
            </div>
            {/* Step-by-step instructions */}
            <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(0,214,50,0.07)", border: "1px solid rgba(0,214,50,0.25)" }}>
              <div className="font-semibold mb-2" style={{ fontSize: 12, color: "#00D632" }}>How to pay:</div>
              {[
                `Open Cash App on your phone`,
                `Send ${PLANS[checkout.plan].price} to ${CASHAPP_TAG}`,
                `Add note: "Kindness+ ${checkout.plan}"`,
                `Tap "I've Paid" below`,
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2 mb-1">
                  <span className="font-bold flex-shrink-0" style={{ fontSize: 11, color: "#00D632", minWidth: 16 }}>{i + 1}.</span>
                  <span style={{ fontSize: 12, color: "rgba(253,243,236,0.8)" }}>{step}</span>
                </div>
              ))}
            </div>
            <button
              onClick={openCashApp}
              className="w-full rounded-2xl py-3 font-bold mb-3"
              style={{ fontSize: 15, background: "linear-gradient(135deg, #00D632, #00a825)", color: "#fff", boxShadow: "0 8px 24px rgba(0,214,50,0.35)" }}
            >
              Open Cash App → {CASHAPP_TAG}
            </button>
            <button
              onClick={submitPaymentConfirmation}
              className="w-full rounded-2xl py-3 font-bold"
              style={{ fontSize: 14, background: "linear-gradient(135deg, #ffd166, #ff8fa3)", color: "#1c0b16", boxShadow: "0 8px 24px rgba(255,209,102,0.3)" }}
            >
              ✅ I've Paid — Submit for Approval
            </button>
            <button onClick={() => setCheckout(null)} className="w-full text-center mt-3" style={{ fontSize: 11, color: "rgba(253,243,236,0.4)" }}>
              Cancel
            </button>
          </div>
        )}
        {checkoutStep === "submitted" && (
          <div className="text-center py-4">
            <div style={{ fontSize: 48, animation: "rakBadgeFloat 1.8s ease-in-out infinite" }}>⏳</div>
            <div className="font-bold mt-3" style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: "#ffd166" }}>Submitted!</div>
            <div className="mt-2" style={{ fontSize: 13, color: "rgba(253,243,236,0.7)", lineHeight: 1.6 }}>
              Your request has been sent. You'll receive an email confirmation shortly. Activation takes <b>15 min – 8 hrs</b>.
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ---------- Pending subscription banner (home/feed) ---------- */
  const pendingBanner = subPending && !premium && (
    <div className="rounded-2xl overflow-hidden mb-4" style={{ border: "1px solid rgba(0,214,50,0.4)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4" style={{ background: "rgba(0,214,50,0.10)" }}>
        <div style={{ fontSize: 28, animation: "rakPulse 2s ease-in-out infinite", flexShrink: 0 }}>⏳</div>
        <div>
          <div className="font-bold" style={{ fontSize: 14, color: "#7be3b1" }}>Payment submitted — awaiting admin approval</div>
          <div style={{ fontSize: 11, color: "rgba(253,243,236,0.6)" }}>
            {subPending.plan === "yearly" ? "Yearly" : "Monthly"} plan · ${subPending.amount} · {new Date(subPending.ts).toLocaleDateString()}
          </div>
        </div>
      </div>
      {/* Code entry */}
      <div className="p-4" style={{ background: "rgba(0,0,0,0.3)" }}>
        <div className="font-semibold mb-1" style={{ fontSize: 12, color: "rgba(253,243,236,0.75)" }}>
          Received your activation code from admin?
        </div>
        <div style={{ fontSize: 11, color: "rgba(253,243,236,0.45)", marginBottom: 10 }}>
          After admin verifies your Cash App payment, they'll email you an 8-character code. Enter it below to activate instantly.
        </div>
        <div className="flex gap-2">
          <input
            value={codeInput}
            onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") activateWithCode(); }}
            maxLength={8}
            placeholder="Enter code (e.g. AB3KD7NX)"
            className="flex-1 rounded-2xl px-4 py-3 outline-none font-bold"
            style={{ background: "rgba(0,0,0,0.4)", border: codeError ? "1px solid rgba(255,93,115,0.7)" : "1px solid rgba(255,255,255,0.15)", color: "#fdf3ec", fontSize: 16, letterSpacing: "0.2em" }}
          />
          <button
            onClick={activateWithCode}
            className="rounded-2xl px-4 py-3 font-bold flex-shrink-0"
            style={{ fontSize: 13, background: "linear-gradient(135deg,#00D632,#00a825)", color: "#fff", boxShadow: "0 6px 20px rgba(0,214,50,0.35)" }}
          >
            ✅ Activate
          </button>
        </div>
        {codeError && (
          <div className="mt-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,93,115,0.12)", border: "1px solid rgba(255,93,115,0.35)", fontSize: 12, color: "#ff8fa3" }}>
            {codeError}
          </div>
        )}
        <div className="mt-3" style={{ fontSize: 10, color: "rgba(253,243,236,0.35)", lineHeight: 1.5 }}>
          No code yet? Admin verifies Cash App payment first — usually within 15 min – 8 hrs.
        </div>
      </div>
    </div>
  );

  /* ---------- Admin dashboard modal ---------- */
  const adminEl = adminView && (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
      <div className="min-h-screen flex flex-col px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="font-bold" style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: "#ffd166" }}>🔐 Admin Dashboard</div>
            <div style={{ fontSize: 11, color: "rgba(253,243,236,0.45)" }}>Random Acts of Kindness · {ADMIN_EMAIL}</div>
          </div>
          <button onClick={() => setAdminView(false)}
            className="rounded-full flex items-center justify-center"
            style={{ width: 38, height: 38, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fdf3ec", fontSize: 18 }}>
            ✕
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total Acts", value: acts.length, color: "#ff8fa3" },
            { label: "Kindness+", value: premium ? "Active" : subPending ? "Pending" : "Free", color: premium ? "#7be3b1" : subPending ? "#ffd166" : "rgba(253,243,236,0.5)" },
            { label: "Cash App", value: CASHAPP_TAG, color: "#00D632" },
          ].map((s2, i) => (
            <div key={i} className="rounded-2xl p-3 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
              <div className="font-bold" style={{ fontSize: 13, color: s2.color, lineHeight: 1.2 }}>{s2.value}</div>
              <div style={{ fontSize: 9, color: "rgba(253,243,236,0.45)", letterSpacing: "0.1em", marginTop: 3 }}>{s2.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* How to approve guide */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,209,102,0.07)", border: "1px solid rgba(255,209,102,0.25)" }}>
          <div className="font-semibold mb-2" style={{ fontSize: 11, color: "#ffd166", letterSpacing: "0.18em" }}>APPROVAL WORKFLOW</div>
          {[
            `Subscriber pays via Cash App to ${CASHAPP_TAG}`,
            "They tap ‘I’ve Paid’ → you receive email at " + ADMIN_EMAIL,
            "Open Cash App → verify the payment amount & note",
            "Come here → find their name below → tap Approve",
            "Their Kindness+ activates instantly on their device",
          ].map((step, i) => (
            <div key={i} className="flex gap-2 mb-1">
              <span className="font-bold flex-shrink-0" style={{ fontSize: 11, color: "#ffd166", minWidth: 16 }}>{i+1}.</span>
              <span style={{ fontSize: 11, color: "rgba(253,243,236,0.75)", lineHeight: 1.4 }}>{step}</span>
            </div>
          ))}
        </div>

        {/* Pending subscription card */}
        {/* ── Manual code generator (cross-device / cross-browser) ── */}
        <div className="font-semibold mb-2 mt-2" style={{ fontSize: 11, color: "rgba(124,196,255,0.85)", letterSpacing: "0.2em" }}>GENERATE CODE FOR ANY SUBSCRIBER</div>
        <ManualCodeGen showToast={showToast} />

        <div className="font-semibold mb-2 mt-6" style={{ fontSize: 11, color: "rgba(255,209,102,0.8)", letterSpacing: "0.2em" }}>PENDING SUBSCRIPTIONS</div>
        {!subPending ? (
          <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
            <div className="font-semibold" style={{ fontSize: 13, color: "rgba(253,243,236,0.7)" }}>No pending subscriptions</div>
            <div style={{ fontSize: 11, color: "rgba(253,243,236,0.4)", marginTop: 4 }}>
              When a subscriber taps "I've Paid", their request appears here.
            </div>
            <button
              onClick={async () => {
                try {
                  const pend = await store.get(PENDING_KEY);
                  if (pend && pend.value) {
                    const parsed = JSON.parse(pend.value);
                    if (parsed && parsed.status === "pending" && !parsed.approved) {
                      setSubPending(parsed);
                      showToast("✅ Pending request loaded!");
                    } else if (parsed && parsed.approved) {
                      showToast("ℹ️ Last request was already approved.");
                    } else {
                      showToast("No pending requests in storage.");
                    }
                  } else {
                    showToast("No pending requests yet.");
                  }
                } catch (e) { showToast("Error reading storage."); }
              }}
              className="rounded-full px-5 py-2 font-semibold mt-4"
              style={{ fontSize: 12, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(253,243,236,0.75)" }}
            >
              🔄 Refresh
            </button>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,214,50,0.4)" }}>
            {/* Subscriber info */}
            <div className="p-4" style={{ background: "rgba(0,214,50,0.07)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 44, height: 44, background: "rgba(0,214,50,0.15)", border: "1px solid rgba(0,214,50,0.45)", fontSize: 20 }}>👤</div>
                <div>
                  <div className="font-bold" style={{ fontSize: 15, color: "#fdf3ec" }}>{subPending.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(253,243,236,0.65)" }}>{subPending.email || "No email provided"}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "PLAN", value: subPending.plan === "yearly" ? "Yearly" : "Monthly" },
                  { label: "AMOUNT", value: `$${subPending.amount}` },
                  { label: "SUBMITTED", value: new Date(subPending.ts).toLocaleDateString() },
                  { label: "TIME", value: new Date(subPending.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
                ].map((item, i) => (
                  <div key={i} className="rounded-xl p-2" style={{ background: "rgba(0,0,0,0.25)" }}>
                    <div style={{ fontSize: 9, color: "rgba(253,243,236,0.4)", letterSpacing: "0.15em" }}>{item.label}</div>
                    <div className="font-semibold" style={{ fontSize: 13, color: "#fdf3ec" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Activation code for admin to share */}
            <div className="px-4 py-4" style={{ background: "rgba(255,209,102,0.06)", borderTop: "1px solid rgba(255,209,102,0.2)" }}>
              <div style={{ fontSize: 11, color: "rgba(255,209,102,0.8)", letterSpacing: "0.15em", marginBottom: 8 }}>SUBSCRIBER ACTIVATION CODE</div>
              {/* Large code display */}
              <div className="font-bold rounded-xl px-4 py-4 text-center mb-3"
                style={{ fontSize: 28, letterSpacing: "0.35em", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,209,102,0.5)", color: "#ffd166", boxShadow: "0 0 24px rgba(255,209,102,0.15)" }}>
                {generateActivationCode(subPending.email || "")}
              </div>
              {/* Send by email + native share */}
              <div className="flex gap-2 mb-2">
                <button
                  onClick={async () => {
                    const code = generateActivationCode(subPending.email || "");
                    if (!subPending.email) { showToast("No subscriber email on file"); return; }
                    showToast("Sending activation code... 📧");
                    try {
                      const res = await fetch("https://formsubmit.co/ajax/" + subPending.email, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Accept: "application/json" },
                        body: JSON.stringify({
                          _subject: "Your Kindness+ Activation Code",
                          name: subPending.name,
                          message: `Hi ${subPending.name}!\n\nYour Kindness+ payment has been verified.\n\nYour activation code is:\n\n   ${code}\n\nHow to activate:\n1. Open the Random Acts of Kindness app\n2. You will see your pending payment card on the home screen\n3. Enter the code above and tap Activate\n4. Kindness+ activates instantly!\n\nPlan: ${subPending.plan} - $${subPending.amount}\n\nThank you for subscribing!\n- Random Acts of Kindness Team`,
                          _template: "box",
                        }),
                      });
                      const data = await res.json();
                      if (data.success === "true" || data.success === true) {
                        showToast("Activation code sent to " + subPending.email + " ✅");
                      if (bcRef.current) bcRef.current.postMessage({ type: "code_sent" });
                      } else {
                        showToast("Email may not have sent - use Share button");
                      }
                    } catch (e) {
                      showToast("Network error - use Share button below");
                    }
                  }}
                  className="flex-1 rounded-2xl py-3 font-bold"
                  style={{ fontSize: 13, background: "linear-gradient(135deg,#ffd166,#ffb26b)", color: "#1c0b16", boxShadow: "0 6px 20px rgba(255,209,102,0.3)" }}
                >
                  Send Code by Email
                </button>
                <button
                  onClick={async () => {
                    const code = generateActivationCode(subPending.email || "");
                    const msg = `Hi ${subPending.name}! Your Kindness+ activation code is: ${code} - Enter it in the app on your pending payment card to activate instantly.`;
                    try {
                      if (navigator.share) { await navigator.share({ text: msg }); }
                      else if (navigator.clipboard) { await navigator.clipboard.writeText(code); showToast("Code copied to clipboard"); }
                    } catch (e) { /* cancelled */ }
                  }}
                  className="rounded-2xl px-4 py-3 font-bold flex-shrink-0"
                  style={{ fontSize: 13, background: "rgba(255,209,102,0.12)", border: "1px solid rgba(255,209,102,0.4)", color: "#ffd166" }}
                >
                  Share
                </button>
              </div>
              <div style={{ fontSize: 10, color: "rgba(253,243,236,0.4)", lineHeight: 1.5 }}>
                Sending to: <span style={{ color: "#ffd166" }}>{subPending.email || "no email on file"}</span>. Subscriber enters this code in the app to activate.
              </div>
            </div>
            {/* Checklist */}
            <div className="px-4 py-3" style={{ background: "rgba(0,0,0,0.3)" }}>
              <div style={{ fontSize: 11, color: "rgba(253,243,236,0.6)", marginBottom: 6 }}>Verify in Cash App before sharing code:</div>
              {[
                `Payment of $${subPending.amount} received from ${subPending.name}`,
                `Note contains "Kindness+ ${subPending.plan}"`,
                "Payment is not flagged or reversed",
              ].map((c, i) => (
                <div key={i} className="flex gap-2 mb-1">
                  <span style={{ color: "#00D632", fontSize: 12 }}>✓</span>
                  <span style={{ fontSize: 11, color: "rgba(253,243,236,0.65)" }}>{c}</span>
                </div>
              ))}
            </div>
            {/* Approve button */}
            <div className="p-4" style={{ background: "rgba(0,214,50,0.05)" }}>
              <button
                onClick={adminApprove}
                className="w-full rounded-2xl py-4 font-bold"
                style={{ fontSize: 16, background: "linear-gradient(135deg, #00D632, #00a825)", color: "#fff", boxShadow: "0 12px 32px rgba(0,214,50,0.4)", letterSpacing: "0.02em" }}
              >
                ✅ Approve & Activate Kindness+
              </button>
              <button
                onClick={async () => {
                  setSubPending(null);
                  await store.remove(PENDING_KEY);
                  showToast("Request rejected & removed.");
                }}
                className="w-full text-center mt-3"
                style={{ fontSize: 11, color: "rgba(255,93,115,0.6)" }}
              >
                ✕ Reject this request
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center" style={{ fontSize: 10, color: "rgba(253,243,236,0.25)", lineHeight: 1.6 }}>
          Admin account: {ADMIN_EMAIL}<br />
          Real-time cross-device approvals need Supabase (next phase).
        </div>
      </div>
    </div>
  );

  /* ---------- loading ---------- */
  if (!ready) {
    return (
      <Shell>
        <div className="min-h-screen flex items-center justify-center">
          <div style={{ fontSize: 44, animation: "rakPulse 1.1s ease-in-out infinite" }}>💛</div>
        </div>
      </Shell>
    );
  }

  /* ---------- auth gate ---------- */
  if (!session) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        onRegister={handleRegister}
        authError={authError}
        setAuthError={setAuthError}
      />
    );
  }

  /* ---------- onboarding / registration ---------- */
  if (!profile) {
    return (
      <Shell>
        <div className="max-w-md mx-auto px-4 py-10">
          <div className="text-center">
            <div className="uppercase font-semibold" style={{ letterSpacing: "0.35em", fontSize: 11, color: "rgba(255,209,102,0.9)" }}>
              welcome to
            </div>
            <h1 className="mt-3 font-bold" style={{ fontFamily: "'Fraunces', serif", fontSize: 36, lineHeight: 1.05, color: "#fdf3ec" }}>
              Random Acts
              <br />
              <span style={{ background: "linear-gradient(90deg, #ff8fa3, #ffd166)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                of Kindness
              </span>
            </h1>
            <p className="mt-3 mb-6" style={{ fontSize: 13, color: "rgba(253,243,236,0.6)", lineHeight: 1.5 }}>
              Set up your kindness profile. Everything stays on your device.
            </p>
          </div>
          <Card>
            <ProfileForm initial={null} saveLabel="Start spreading kindness 💛" onSave={createProfile} />
          </Card>
        </div>
        {toastEl}
      </Shell>
    );
  }

  /* ---------- edit profile ---------- */
  if (view === "edit") {
    return (
      <Shell>
        <div className="max-w-md mx-auto px-4 py-6 pb-32">
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => setView("profile")}
              className="rounded-full flex items-center justify-center"
              style={{ width: 38, height: 38, ...glass, color: "#fdf3ec", fontSize: 18 }}
            >
              ←
            </button>
            <div className="font-bold" style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: "#fdf3ec" }}>
              Edit profile
            </div>
          </div>
          <Card>
            <ProfileForm initial={profile} saveLabel="Save changes" onSave={updateProfile} onCancel={() => setView("profile")} />
          </Card>

          {/* ── Account credentials (email + password change) ── */}
          <AccountCredentials
            session={session}
            onChanged={(newEmail) => {
              // Update profile email in state + storage
              const updated = { ...profile, email: newEmail };
              setProfile(updated);
              store.set(PROFILE_KEY, JSON.stringify(updated));
              showToast("Account email updated ✅");
              setView("profile");
            }}
            showToast={showToast}
          />
        </div>
        {toastEl}
      </Shell>
    );
  }

  /* ---------- profile dashboard ---------- */
  if (view === "profile") {
    const maxCatCount = Math.max(1, ...CATEGORIES.map((c) => stats.byCat[c.id] || 0));
    const metaBits = [
      profile.location ? `📍 ${profile.location}` : null,
      profile.age ? `🎂 ${profile.age}` : null,
    ].filter(Boolean);

    return (
      <Shell>
        <div className="max-w-md mx-auto px-4 py-6 pb-32">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("home")}
                className="rounded-full flex items-center justify-center"
                style={{ width: 38, height: 38, ...glass, color: "#fdf3ec", fontSize: 18 }}
              >
                ←
              </button>
              <div className="font-bold" style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: "#fdf3ec" }}>
                Profile
              </div>
            </div>
            <button
              onClick={() => setView("edit")}
              className="rounded-full px-4 py-2 font-semibold"
              style={{ fontSize: 12, background: "rgba(255,209,102,0.12)", border: "1px solid rgba(255,209,102,0.35)", color: "#ffd166" }}
            >
              ✏️ Edit
            </button>
          </div>

          <CinematicBG />

          {/* DNA Creature Evolution */}
          <Card className="mb-4" style={{ padding: 0, overflow: "hidden", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(197,139,255,0.3)" }}>
            <DNACreatureCanvas total={stats.total} />
          </Card>

          {/* identity card */}
          <Card className="text-center">
            <div className="flex justify-center">
              <Avatar avatar={profile.avatar} size={88} />
            </div>
            <div className="mt-3 font-bold" style={{ fontFamily: "'Fraunces', serif", fontSize: 26, color: "#fdf3ec" }}>
              {profile.name}
            </div>
            {profile.bio && (
              <div className="mt-1" style={{ fontSize: 13, color: "rgba(253,243,236,0.7)", lineHeight: 1.5 }}>
                {profile.bio}
              </div>
            )}
            {metaBits.length > 0 && (
              <div className="mt-2" style={{ fontSize: 12, color: "rgba(253,243,236,0.55)" }}>
                {metaBits.join("  ·  ")}
              </div>
            )}
            {profile.email && (
              <div className="mt-1" style={{ fontSize: 11, color: "rgba(253,243,236,0.45)" }}>
                ✉️ {profile.email}
              </div>
            )}
            <div className="mt-2" style={{ fontSize: 10, color: "rgba(253,243,236,0.35)" }}>
              Spreading kindness since {new Date(profile.joined).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
            </div>
          </Card>

          {/* subscription */}
          <Card className="mt-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-bold" style={{ fontSize: 14, color: premium ? "#ffd166" : "#fdf3ec" }}>
                  {premium ? "✨ Kindness+ active" : "Free plan"}
                </div>
                <div style={{ fontSize: 11, color: "rgba(253,243,236,0.5)" }}>
                  {premium
                    ? premiumInfo
                      ? `${premiumInfo.plan === "yearly" ? "Yearly" : "Monthly"} · renews ${new Date(premiumInfo.renews).toLocaleDateString()}`
                      : "Full feed, hearts, comments & sharing unlocked"
                    : "Upgrade to unlock the full social feed"}
                </div>
              </div>
              {premium ? (
                <button onClick={cancelPremium} className="underline flex-shrink-0" style={{ fontSize: 11, color: "rgba(253,243,236,0.5)" }}>
                  Cancel (demo)
                </button>
              ) : (
                <button
                  onClick={() => setView("feed")}
                  className="rounded-full px-4 py-2 font-bold flex-shrink-0"
                  style={{ fontSize: 12, background: "linear-gradient(135deg, #ffd166, #ff8fa3)", color: "#2a0d18" }}
                >
                  Upgrade ✨
                </button>
              )}
            </div>
          </Card>

          {/* stats */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <StatCard value={stats.total} label="acts" accent="#ff8fa3" delay="0s" />
            <StatCard value={stats.streak > 0 ? `${stats.streak}🔥` : 0} label="day streak" accent="#ffd166" delay="0.6s" />
            <StatCard value={stats.points} label="points" accent="#ffb26b" delay="1.2s" />
          </div>
          <LevelCard stats={stats} />

          {/* Streak Freeze IAP */}
          {stats.streak > 0 && !premium && (
            <div className="rounded-2xl p-4 mb-4 flex items-center gap-4" style={{ background: "rgba(255,93,115,0.08)", border: "1px solid rgba(255,93,115,0.35)" }}>
              <div style={{ fontSize: 28, animation: "rakFlame 1.4s ease-in-out infinite", flexShrink: 0 }}>🔥</div>
              <div className="flex-1">
                <div className="font-bold" style={{ fontSize: 14, color: "#ff8fa3" }}>Protect your {stats.streak}-day streak!</div>
                <div style={{ fontSize: 11, color: "rgba(253,243,236,0.55)" }}>Streak Freeze saves a broken streak — Duolingo's #1 IAP</div>
              </div>
              <button
                onClick={() => { subscribePremium("monthly"); showToast("🔥 Streak Freeze included with Kindness+"); }}
                className="rounded-full px-4 py-2 font-bold flex-shrink-0"
                style={{ fontSize: 12, background: "linear-gradient(135deg,#ff5d73,#ffb26b)", color: "#2a0d18", boxShadow: "0 6px 20px rgba(255,93,115,0.35)" }}
              >
                Protect
              </button>
            </div>
          )}

          {/* badges */}
          <SectionTitle>Badges · {earned.length}/{BADGES.length}</SectionTitle>
          <BadgeRow earned={earned} onSelect={setTrophyBadge} />

          {/* category breakdown */}
          <SectionTitle>Kindness by category</SectionTitle>
          <Card>
            {stats.total === 0 ? (
              <div style={{ fontSize: 12, color: "rgba(253,243,236,0.55)" }}>
                Log your first act to see your kindness style take shape.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {CATEGORIES.map((c) => {
                  const n = stats.byCat[c.id] || 0;
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <div className="flex-shrink-0" style={{ width: 130, fontSize: 12, color: "#fdf3ec" }}>
                        {c.emoji} {c.label}
                      </div>
                      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: "rgba(255,255,255,0.08)" }}>
                        <div
                          className="rounded-full"
                          style={{ height: "100%", width: `${(n / maxCatCount) * 100}%`, background: c.color, transition: "width .5s ease" }}
                        />
                      </div>
                      <div className="flex-shrink-0 text-right font-semibold" style={{ width: 22, fontSize: 12, color: "rgba(253,243,236,0.7)" }}>
                        {n}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* preferences */}
          <SectionTitle>Favorite kinds of kindness</SectionTitle>
          <Card>
            {profile.prefs && profile.prefs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.prefs.map((id) => {
                  const c = CATEGORIES.find((x) => x.id === id);
                  if (!c) return null;
                  return (
                    <span
                      key={id}
                      className="rounded-full px-3 py-2 font-semibold"
                      style={{ fontSize: 12, background: hexToRgba(c.color, 0.16), border: `1px solid ${hexToRgba(c.color, 0.45)}`, color: "#fdf3ec" }}
                    >
                      {c.emoji} {c.label}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "rgba(253,243,236,0.55)" }}>
                None picked yet — tap ✏️ Edit to choose your favorites.
              </div>
            )}
          </Card>

          {/* Admin Dashboard button — only shown to admin account */}
          {isAdmin && (
            <button
              onClick={() => setAdminView(true)}
              className="w-full rounded-2xl py-3 font-bold mt-6"
              style={{ fontSize:14, background:"linear-gradient(135deg,#ffd166,#ffb26b)", color:"#1c0b16", boxShadow:"0 8px 24px rgba(255,209,102,0.3)" }}
            >
              🔐 Admin Dashboard
            </button>
          )}

          <div className="mt-8 text-center flex flex-col gap-3">
            <button
              onClick={handleLogout}
              className="rounded-full px-6 py-2 font-semibold mx-auto"
              style={{ fontSize:13, background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(253,243,236,0.8)" }}
            >
              Log Out
            </button>
            <button
              onClick={deleteProfile}
              className="underline mx-auto"
              style={{ color: confirmDelete ? "#ff8fa3" : "rgba(253,243,236,0.35)", fontSize: 11 }}
            >
              {confirmDelete ? "Tap again to delete all data" : "Delete all my data"}
            </button>
            <div style={{ fontSize: 10, color: "rgba(253,243,236,0.3)" }}>
              Log Out keeps your data. Delete removes everything.
            </div>
          </div>
        </div>
        <NavBar view={view} setView={setView} />
        {toastEl}
        {trophyEl}
        {adminEl}
      </Shell>
    );
  }

  /* ---------- messages ---------- */
  // Demo: some suggested kind people to connect with
  const DEMO_PEOPLE = [
    { name: "Maya Chen", location: "San Francisco", acts: 42, emoji: "🌸", color: "#ff8fa3" },
    { name: "Jordan Rivers", location: "New York", acts: 28, emoji: "🌊", color: "#7cc4ff" },
    { name: "Priya Sharma", location: "London", acts: 67, emoji: "🌟", color: "#ffd166" },
    { name: "Marcus Green", location: "Toronto", acts: 15, emoji: "🌱", color: "#7be3b1" },
  ];
  const filteredPeople = msgSearch.length > 1
    ? DEMO_PEOPLE.filter((p) => p.name.toLowerCase().includes(msgSearch.toLowerCase()) || p.location.toLowerCase().includes(msgSearch.toLowerCase()))
    : DEMO_PEOPLE;

  if (view === "chat") {
    return (
      <Shell>
        <CinematicBG />
        <div className="max-w-md mx-auto px-4 py-6 pb-32">
          <div className="font-bold mb-3" style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: "#fdf3ec" }}>Messages</div>

          {/* Search bar */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
              <input
                value={msgSearch}
                onChange={(e) => setMsgSearch(e.target.value)}
                placeholder="Search kind people…"
                className="w-full rounded-full py-2 pl-9 pr-4 outline-none"
                style={{ ...fieldStyle, fontSize: 13 }}
              />
            </div>
          </div>

          {/* Add by handle */}
          <div className="flex gap-2 mb-4">
            <input
              value={addHandle}
              onChange={(e) => setAddHandle(e.target.value)}
              placeholder="Add by username or @handle"
              className="flex-1 rounded-full px-4 py-2 outline-none"
              style={{ ...fieldStyle, fontSize: 12 }}
            />
            <button
              onClick={() => { if (addHandle.trim()) { showToast("Invite sent 💌 (backend needed for real DMs)"); setAddHandle(""); } }}
              className="rounded-full px-4 py-2 font-bold flex-shrink-0"
              style={{ fontSize: 12, background: "linear-gradient(135deg, #ff5d73, #ffb26b)", color: "#2a0d18" }}
            >
              Add
            </button>
          </div>

          {/* Kind people directory */}
          {msgSearch.length > 0 && (
            <div className="mb-4">
              <div className="uppercase font-semibold mb-2" style={{ fontSize: 10, letterSpacing: "0.25em", color: "rgba(255,209,102,0.7)" }}>People · {filteredPeople.length} found</div>
              {filteredPeople.map((person, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl p-3 mb-2" style={glass}>
                  <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, background: hexToRgba(person.color, 0.18), border: `1px solid ${hexToRgba(person.color, 0.4)}`, fontSize: 18 }}>{person.emoji}</div>
                  <div className="flex-1">
                    <div className="font-semibold" style={{ fontSize: 13, color: "#fdf3ec" }}>{person.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(253,243,236,0.5)" }}>📍 {person.location} · {person.acts} acts</div>
                  </div>
                  <button
                    onClick={() => showToast(`Request sent to ${person.name} 💌`)}
                    className="rounded-full px-3 py-1 font-semibold flex-shrink-0"
                    style={{ fontSize: 11, background: hexToRgba(person.color, 0.15), border: `1px solid ${hexToRgba(person.color, 0.4)}`, color: person.color }}
                  >
                    Connect
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Buddy chat */}
          <div className="uppercase font-semibold mb-2" style={{ fontSize: 10, letterSpacing: "0.25em", color: "rgba(255,209,102,0.7)" }}>Kindness Buddy</div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, background: "rgba(255,209,102,0.15)", border: "1px solid rgba(255,209,102,0.4)", fontSize: 18 }}>
                🤖
              </div>
              <div>
                <div className="font-semibold" style={{ fontSize: 14, color: "#fdf3ec" }}>Kindness Buddy</div>
                <div style={{ fontSize: 10, color: "#7be3b1" }}>● online · demo bot</div>
              </div>
            </div>
            <div className="px-4 py-3 overflow-y-auto" style={{ maxHeight: 340 }}>
              {chatMsgs.length === 0 && (
                <div className="rounded-2xl px-3 py-2 mb-2" style={{ background: "rgba(255,255,255,0.06)", maxWidth: "85%", fontSize: 13, color: "#fdf3ec", lineHeight: 1.5 }}>
                  Hey {firstName}! 💛 I'm your Kindness Buddy. Ask me for ideas, or tell me about your latest good deed!
                </div>
              )}
              {chatMsgs.map((m) => (
                <div key={m.id} className={`flex mb-2 ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="rounded-2xl px-3 py-2"
                    style={{
                      maxWidth: "85%",
                      fontSize: 13,
                      lineHeight: 1.5,
                      background: m.from === "me" ? "linear-gradient(135deg, #ff5d73, #ffb26b)" : "rgba(255,255,255,0.06)",
                      color: m.from === "me" ? "#2a0d18" : "#fdf3ec",
                    }}
                  >
                    {m.text}
                    <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>{timeAgo(m.ts)}</div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2 px-3 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
                maxLength={200}
                placeholder="Say something kind…"
                className="flex-1 rounded-full px-4 py-2 outline-none"
                style={{ ...fieldStyle, fontSize: 13 }}
              />
              <button
                onClick={sendChat}
                className="rounded-full px-4 py-2 font-bold flex-shrink-0"
                style={{ fontSize: 13, background: "linear-gradient(135deg, #ff5d73, #ffb26b)", color: "#2a0d18" }}
              >
                ➤
              </button>
            </div>
          </Card>
          <button
            onClick={inviteFriend}
            className="w-full rounded-2xl py-3 font-bold mt-4"
            style={{ fontSize: 13, background: "rgba(124,196,255,0.1)", border: "1px dashed rgba(124,196,255,0.45)", color: "#7cc4ff" }}
          >
            💌 Invite a kind friend to the app
          </button>
        </div>
        <NavBar view={view} setView={setView} />
        {toastEl}
      </Shell>
    );
  }

  /* ---------- kindness feed (own page, Kindness+ gated) ---------- */
  if (view === "feed") {
    return (
      <Shell>
        <CinematicBG />
        <div className="max-w-md mx-auto px-4 py-6 pb-32">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView("home")}
                className="rounded-full flex items-center justify-center"
                style={{ width: 38, height: 38, ...glass, color: "#fdf3ec", fontSize: 18 }}
              >
                ←
              </button>
              <div className="font-bold" style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: "#fdf3ec" }}>
                Kindness Feed
              </div>
            </div>
            {premium && (
              <span className="rounded-full px-3 py-1 font-bold" style={{ fontSize: 11, background: "rgba(255,209,102,0.15)", border: "1px solid rgba(255,209,102,0.45)", color: "#ffd166" }}>
                ✨ Kindness+
              </span>
            )}
          </div>

          {!premium ? (
            <Card style={{ border: "1px solid rgba(255,209,102,0.45)", background: "linear-gradient(160deg, rgba(255,209,102,0.10), rgba(255,93,115,0.08))" }}>
              <div className="text-center">
                <div style={{ fontSize: 34 }}>✨</div>
                <div className="mt-1 font-bold" style={{ fontFamily: "'Fraunces', serif", fontSize: 24, color: "#ffd166" }}>
                  Kindness+
                </div>
                <div className="mt-1" style={{ fontSize: 13, color: "rgba(253,243,236,0.7)" }}>
                  Unlock the full social feed
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2" style={{ fontSize: 13, color: "#fdf3ec" }}>
                <div>📰 Full kindness feed with every act</div>
                <div>❤️ Hearts & 💬 comments on acts</div>
                <div>↗ One-tap sharing to any app</div>
                <div>🔜 Teams & advanced analytics</div>
              </div>
              {/* Cash App payment */}
              <div className="mt-4 rounded-2xl p-3 flex items-center gap-3" style={{ background: "rgba(0,214,50,0.08)", border: "1px solid rgba(0,214,50,0.3)" }}>
                <div style={{ fontSize: 28 }}>💵</div>
                <div>
                  <div className="font-semibold" style={{ fontSize: 12, color: "#7be3b1" }}>Pay via Cash App</div>
                  <div style={{ fontSize: 11, color: "rgba(253,243,236,0.6)" }}>Send to {CASHAPP_TAG} · activated within 15 min – 8 hrs</div>
                </div>
              </div>
              <button
                onClick={() => subscribePremium("monthly")}
                className="w-full rounded-2xl py-3 font-bold mt-4"
                style={{ fontSize: 15, background: "linear-gradient(135deg, #00D632, #00a825)", color: "#fff", boxShadow: "0 10px 30px rgba(0,214,50,0.3)" }}
              >
                💵 $4.99 / month · Pay via Cash App
              </button>
              <button
                onClick={() => subscribePremium("yearly")}
                className="w-full rounded-2xl py-3 font-bold mt-3"
                style={{ fontSize: 15, background: "rgba(0,214,50,0.12)", border: "1px solid rgba(0,214,50,0.45)", color: "#7be3b1" }}
              >
                💵 $39.99 / year · save 33%
              </button>
              <div className="mt-3 text-center" style={{ fontSize: 10, color: "rgba(253,243,236,0.4)", lineHeight: 1.5 }}>
                Manual approval · verified by admin after Cash App payment confirms
              </div>
            </Card>
          ) : acts.length === 0 ? (
            <Card className="text-center">
              <div style={{ fontSize: 30 }}>💛</div>
              <div className="mt-2 font-semibold" style={{ fontSize: 14, color: "#fdf3ec" }}>No acts yet</div>
              <div className="mt-1" style={{ fontSize: 12, color: "rgba(253,243,236,0.55)" }}>
                Log your first kindness on Home and it lands here.
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {acts.slice(0, 50).map(renderFeedItem)}
              {acts.length > 50 && (
                <div className="text-center" style={{ fontSize: 11, color: "rgba(253,243,236,0.4)" }}>
                  + {acts.length - 50} more acts of kindness
                </div>
              )}
            </div>
          )}
        </div>
        <NavBar view={view} setView={setView} />
        {toastEl}
        {checkoutEl}
        {adminEl}
      </Shell>
    );
  }

  /* ---------- kindness map ---------- */
  if (view === "map") {
    const geoCount = acts.filter((a) => a.loc).length;
    return (
      <Shell>
        <div className="max-w-md mx-auto px-4 py-6 pb-32">
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => setView("home")}
              className="rounded-full flex items-center justify-center"
              style={{ width: 38, height: 38, ...glass, color: "#fdf3ec", fontSize: 18 }}
            >
              ←
            </button>
            <div className="font-bold" style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: "#fdf3ec" }}>
              Kindness Map
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            {[{ id: "flat", label: "🗺️ Flat map" }, { id: "globe", label: "🌍 3D Globe" }].map((m) => (
              <button
                key={m.id}
                onClick={() => setMapMode(m.id)}
                className="flex-1 rounded-full py-2 font-semibold"
                style={{
                  fontSize: 12,
                  background: mapMode === m.id ? "rgba(255,209,102,0.16)" : "rgba(255,255,255,0.05)",
                  border: mapMode === m.id ? "1px solid rgba(255,209,102,0.5)" : "1px solid rgba(255,255,255,0.1)",
                  color: mapMode === m.id ? "#ffd166" : "rgba(253,243,236,0.7)",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          <Card style={{ padding: 8, overflow: "hidden" }}>
            {mapMode === "flat" ? (
              <div ref={mapDivRef} className="rounded-2xl w-full" style={{ height: 420, background: "#1c0b16" }} />
            ) : (
              <div
                ref={globeDivRef}
                className="rounded-2xl w-full overflow-hidden"
                style={{ height: 420, background: "radial-gradient(circle at 50% 40%, #1b0f2a 0%, #0b0410 70%)", touchAction: "none" }}
              />
            )}
          </Card>
          {mapMode === "globe" && (
            <div className="mt-2 text-center" style={{ fontSize: 10, color: "rgba(253,243,236,0.45)" }}>
              drag to spin the world 🌍 · pins pulse where kindness happened
            </div>
          )}

          {mapMode === "flat" && mapStatus === "loading" && (
            <div className="mt-3 text-center" style={{ fontSize: 12, color: "rgba(253,243,236,0.55)" }}>
              Loading map…
            </div>
          )}
          {mapMode === "flat" && mapStatus === "error" && (
            <Card className="mt-3 text-center">
              <div style={{ fontSize: 13, color: "#ff8fa3" }}>Couldn't load the map</div>
              <div className="mt-1" style={{ fontSize: 11, color: "rgba(253,243,236,0.55)" }}>
                Check your internet connection and reopen this screen.
              </div>
            </Card>
          )}
          {mapStatus === "ready" && (
            <div className="mt-3 text-center" style={{ fontSize: 12, color: "rgba(253,243,236,0.55)" }}>
              {geoCount} of {acts.length} acts geo-tagged 📍
            </div>
          )}
          {mapStatus === "ready" && geoCount === 0 && (
            <Card className="mt-3 text-center">
              <div style={{ fontSize: 26 }}>🗺️</div>
              <div className="mt-1" style={{ fontSize: 12, color: "rgba(253,243,236,0.6)", lineHeight: 1.5 }}>
                No pins yet — tap <b>📍 Add location</b> when logging a kindness and it appears here.
              </div>
            </Card>
          )}
        </div>
        <NavBar view={view} setView={setView} />
        {toastEl}
        {globePinEl}
        {adminEl}
      </Shell>
    );
  }

  /* ---------- home ---------- */
  return (
    <Shell>
      {/* 3D hero */}
      <div className="relative w-full overflow-hidden" style={{ height: 360 }}>
        <div ref={mountRef} className="absolute inset-0" style={{ touchAction: "pan-y" }} />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(180deg, rgba(23,8,18,0.3) 0%, rgba(23,8,18,0) 35%, rgba(23,8,18,0.95) 100%)" }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
          <div className="uppercase font-semibold" style={{ letterSpacing: "0.35em", fontSize: 11, color: "rgba(255,209,102,0.9)" }}>
            good to see you, {firstName}
          </div>
          <h1
            className="mt-3 font-bold"
            style={{ fontFamily: "'Fraunces', serif", fontSize: 40, lineHeight: 1.05, color: "#fdf3ec", textShadow: "0 4px 30px rgba(0,0,0,0.55)" }}
          >
            Random Acts
            <br />
            <span style={{ background: "linear-gradient(90deg, #ff8fa3, #ffd166)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              of Kindness
            </span>
          </h1>
        </div>
        {/* profile button */}
        <button onClick={() => setView("profile")} className="absolute z-10" style={{ top: 14, right: 14 }}>
          <Avatar avatar={profile.avatar} size={42} />
        </button>
      </div>

      {/* content */}
      <div className="relative max-w-md mx-auto px-4 pb-32" style={{ marginTop: -36 }}>
        {pendingBanner}

        <div className="grid grid-cols-3 gap-3">
          <StatCard value={stats.total} label="acts" accent="#ff8fa3" delay="0s" />
          <StatCard value={stats.streak > 0 ? `${stats.streak}🔥` : 0} label="day streak" accent="#ffd166" delay="0.6s" />
          <StatCard value={stats.points} label="points" accent="#ffb26b" delay="1.2s" />
        </div>
        <LevelCard stats={stats} />

        {/* log an act */}
        <SectionTitle>Log a kindness</SectionTitle>
        <Card>
          <div className="flex items-center justify-between mb-2">
            <label className="font-semibold" style={{ fontSize: 13, color: "#fdf3ec" }}>
              What good did you do?
            </label>
            <button
              onClick={fillIdea}
              className="rounded-full px-3 py-1 font-semibold"
              style={{ fontSize: 11, background: "rgba(255,209,102,0.12)", border: "1px solid rgba(255,209,102,0.35)", color: "#ffd166" }}
            >
              🎲 idea
            </button>
          </div>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addAct(); }}
            maxLength={140}
            placeholder="e.g. Carried a neighbor's groceries upstairs"
            className="w-full rounded-2xl px-4 py-3 outline-none"
            style={fieldStyle}
          />

          <div className="mt-4 mb-2 font-semibold" style={{ fontSize: 13, color: "#fdf3ec" }}>
            Category {profile.prefs && profile.prefs.length > 0 && (
              <span style={{ fontSize: 10, color: "rgba(253,243,236,0.4)", fontWeight: 500 }}> · your favorites first</span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {orderedCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className="flex-shrink-0 rounded-full px-3 py-2 font-semibold"
                style={{
                  fontSize: 12,
                  background: cat === c.id ? c.color : "rgba(255,255,255,0.06)",
                  color: cat === c.id ? "#1c0b16" : "rgba(253,243,236,0.85)",
                  border: cat === c.id ? "1px solid transparent" : "1px solid rgba(255,255,255,0.12)",
                  transition: "all .2s",
                }}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>

          <div className="mt-4 mb-2 font-semibold" style={{ fontSize: 13, color: "#fdf3ec" }}>
            How did it feel?
          </div>
          <div className="flex flex-wrap gap-2">
            {FEELINGS.map((f) => (
              <button
                key={f.label}
                onClick={() => setFeeling(f.label)}
                className="rounded-full px-3 py-2 font-medium"
                style={{
                  fontSize: 12,
                  background: feeling === f.label ? "rgba(255,143,163,0.2)" : "rgba(255,255,255,0.05)",
                  border: feeling === f.label ? "1px solid rgba(255,143,163,0.6)" : "1px solid rgba(255,255,255,0.1)",
                  color: "#fdf3ec",
                  transition: "all .2s",
                }}
              >
                {f.emoji} {f.label}
              </button>
            ))}
          </div>

          <div className="mt-4 mb-2 font-semibold" style={{ fontSize: 13, color: "#fdf3ec" }}>
            Proof & place <span style={{ fontSize: 10, color: "rgba(253,243,236,0.4)", fontWeight: 500 }}>· optional</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {!photoAtt ? (
              <button
                onClick={() => actFileRef.current && actFileRef.current.click()}
                className="rounded-full px-3 py-2 font-semibold"
                style={{ fontSize: 12, background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.25)", color: "rgba(253,243,236,0.85)" }}
              >
                📷 Add photo
              </button>
            ) : (
              <button
                onClick={() => setPhotoAtt(null)}
                className="rounded-full px-3 py-2 font-semibold"
                style={{ fontSize: 12, background: "rgba(255,209,102,0.14)", border: "1px solid rgba(255,209,102,0.45)", color: "#ffd166" }}
              >
                📷 Photo attached ✕
              </button>
            )}
            {!locAtt ? (
              <>
                <button
                  onClick={attachLocation}
                  disabled={locBusy}
                  className="rounded-full px-3 py-2 font-semibold"
                  style={{ fontSize: 12, background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.25)", color: "rgba(253,243,236,0.85)", opacity: locBusy ? 0.6 : 1 }}
                >
                  {locBusy ? "📍 Locating…" : "📍 GPS location"}
                </button>
                <button
                  onClick={() => setShowPlaceInput(!showPlaceInput)}
                  className="rounded-full px-3 py-2 font-semibold"
                  style={{ fontSize: 12, background: showPlaceInput ? "rgba(124,196,255,0.14)" : "rgba(255,255,255,0.06)", border: "1px dashed rgba(124,196,255,0.45)", color: "#7cc4ff" }}
                >
                  🏙️ Type a place
                </button>
              </>
            ) : (
              <button
                onClick={() => { setLocAtt(null); setShowPlaceInput(false); }}
                className="rounded-full px-3 py-2 font-semibold"
                style={{ fontSize: 12, background: "rgba(124,196,255,0.14)", border: "1px solid rgba(124,196,255,0.5)", color: "#7cc4ff" }}
              >
                📍 {locAtt.name} ✕
              </button>
            )}
          </div>
          {showPlaceInput && !locAtt && (
            <div className="flex gap-2 mt-3">
              <input
                value={placeQuery}
                onChange={(e) => setPlaceQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") findPlace(); }}
                maxLength={60}
                placeholder="City or place, e.g. Manila"
                className="flex-1 rounded-full px-4 py-2 outline-none"
                style={{ ...fieldStyle, fontSize: 12 }}
              />
              <button
                onClick={findPlace}
                disabled={placeBusy}
                className="rounded-full px-4 py-2 font-bold flex-shrink-0"
                style={{ fontSize: 12, background: "linear-gradient(135deg, #7cc4ff, #c58bff)", color: "#170812", opacity: placeBusy ? 0.6 : 1 }}
              >
                {placeBusy ? "…" : "Find"}
              </button>
            </div>
          )}
          {photoAtt && (
            <img
              src={photoAtt}
              alt="attachment preview"
              className="rounded-2xl mt-3 w-full object-cover"
              style={{ maxHeight: 180, border: "1px solid rgba(255,255,255,0.12)" }}
            />
          )}
          <input ref={actFileRef} type="file" accept="image/*" onChange={attachActPhoto} style={{ display: "none" }} />

          <button
            onClick={addAct}
            disabled={!desc.trim()}
            className="w-full rounded-2xl py-3 font-bold mt-5"
            style={{
              fontSize: 15,
              background: desc.trim() ? "linear-gradient(135deg, #ff5d73, #ffb26b)" : "rgba(255,255,255,0.08)",
              color: desc.trim() ? "#2a0d18" : "rgba(253,243,236,0.35)",
              boxShadow: desc.trim() ? "0 10px 30px rgba(255,93,115,0.35)" : "none",
              transition: "all .25s",
            }}
          >
            Log this kindness · +{selectedCat.points} pts
          </button>
        </Card>

        {/* badges */}
        <SectionTitle>Badges · {earned.length}/{BADGES.length}</SectionTitle>
        <BadgeRow earned={earned} onSelect={setTrophyBadge} />

        {/* community challenges */}
        <SectionTitle>Community challenges</SectionTitle>
        {challengeInfo.map((ch) => {
          const pct = Math.min(100, (ch.progress / ch.tpl.target) * 100);
          return (
            <div key={ch.id} className="rounded-2xl p-4 mb-3 flex items-center gap-4" style={glass}>
              <CircleProgress pct={pct} done={ch.done} size={56} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-bold" style={{ fontSize: 13, color: "#fdf3ec" }}>{ch.tpl.emoji} {ch.tpl.name}</div>
                  <button onClick={() => abandonChallenge(ch.id)} style={{ fontSize: 12, color: "rgba(253,243,236,0.35)", flexShrink: 0 }}>✕</button>
                </div>
                <div style={{ fontSize: 10, color: "rgba(253,243,236,0.5)" }}>{ch.tpl.desc}</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, background: "rgba(255,255,255,0.08)" }}>
                    <div className="rounded-full" style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: ch.done ? "#7be3b1" : "linear-gradient(90deg,#ff5d73,#ffd166)",
                      transition: "width .6s ease",
                      boxShadow: ch.done ? "0 0 8px #7be3b1" : "0 0 8px rgba(255,93,115,.5)",
                    }} />
                  </div>
                  <span className="font-bold flex-shrink-0" style={{ fontSize: 10, color: ch.done ? "#7be3b1" : ch.expired ? "#ff8fa3" : "rgba(253,243,236,0.6)" }}>
                    {ch.done ? "🎉 done" : ch.expired ? "⏰ expired" : `${ch.daysLeft}d · ${ch.progress}/${ch.tpl.target}`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {showChallengePicker ? (
          <Card>
            <div className="font-semibold mb-2" style={{ fontSize: 13, color: "#fdf3ec" }}>Pick a challenge</div>
            <div className="flex flex-col gap-2">
              {CHALLENGE_TEMPLATES.filter((t) => !challenges.some((c) => c.tplId === t.id)).map((t) => (
                <button
                  key={t.id}
                  onClick={() => startChallenge(t.id)}
                  className="flex items-center justify-between rounded-2xl px-4 py-3 text-left"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <div>
                    <div className="font-semibold" style={{ fontSize: 13, color: "#fdf3ec" }}>{t.emoji} {t.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(253,243,236,0.5)" }}>{t.desc}</div>
                  </div>
                  <span className="font-bold flex-shrink-0" style={{ fontSize: 12, color: "#ffd166" }}>Join →</span>
                </button>
              ))}
              {CHALLENGE_TEMPLATES.every((t) => challenges.some((c) => c.tplId === t.id)) && (
                <div style={{ fontSize: 12, color: "rgba(253,243,236,0.5)" }}>You've joined them all 💪</div>
              )}
            </div>
            <button
              onClick={() => setShowChallengePicker(false)}
              className="w-full rounded-2xl py-2 font-semibold mt-3"
              style={{ fontSize: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(253,243,236,0.7)" }}
            >
              Close
            </button>
          </Card>
        ) : (
          <button
            onClick={() => setShowChallengePicker(true)}
            className="w-full rounded-2xl py-3 font-bold"
            style={{ fontSize: 13, background: "rgba(255,209,102,0.1)", border: "1px dashed rgba(255,209,102,0.4)", color: "#ffd166" }}
          >
            + Start a challenge
          </button>
        )}

        {/* recent activity preview — the full social feed lives on its own page */}
        <SectionTitle>Recent kindness</SectionTitle>
        {acts.length === 0 ? (
          <Card className="text-center">
            <div style={{ fontSize: 30 }}>💛</div>
            <div className="mt-2 font-semibold" style={{ fontSize: 14, color: "#fdf3ec" }}>No acts yet</div>
            <div className="mt-1" style={{ fontSize: 12, color: "rgba(253,243,236,0.55)" }}>
              Your first ripple starts above — log a kindness to watch the hearts fly.
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {acts.slice(0, 3).map((a) => {
              const c = CATEGORIES.find((x) => x.id === a.cat) || CATEGORIES[0];
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-2xl p-4" style={glass}>
                  <div
                    className="flex items-center justify-center rounded-full flex-shrink-0"
                    style={{ width: 38, height: 38, background: hexToRgba(c.color, 0.18), border: `1px solid ${hexToRgba(c.color, 0.4)}`, fontSize: 16 }}
                  >
                    {c.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ color: "#fdf3ec", fontSize: 14 }}>{a.desc}</div>
                    <div style={{ fontSize: 11, color: "rgba(253,243,236,0.5)" }}>
                      {c.label} · {timeAgo(a.ts)}
                    </div>
                  </div>
                  <div className="font-bold flex-shrink-0" style={{ color: "#ffd166", fontSize: 13 }}>+{c.points + (a.bonus || 0)}</div>
                </div>
              );
            })}
          </div>
        )}
        <button
          onClick={() => setView("feed")}
          className="w-full rounded-2xl py-3 font-bold mt-3"
          style={{ fontSize: 13, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#fdf3ec" }}
        >
          📰 Open the full feed {premium ? "" : "· ✨ Kindness+"}
        </button>

        {/* footer */}
        <div className="mt-10 text-center" style={{ fontSize: 11, color: "rgba(253,243,236,0.4)" }}>
          Your kindness log is saved on this device between sessions.
          {acts.length > 0 && (
            <div className="mt-2">
              <button
                onClick={resetActs}
                className="underline"
                style={{ color: confirmReset ? "#ff8fa3" : "rgba(253,243,236,0.5)", fontSize: 11 }}
              >
                {confirmReset ? "Tap again to erase everything" : "Reset my data"}
              </button>
            </div>
          )}
        </div>
      </div>
      <NavBar view={view} setView={setView} />
      {toastEl}
      {trophyEl}
      {globePinEl}
      {adminEl}
    </Shell>
  );
}
