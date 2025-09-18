import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * 🍀 Four-Leaf Clover Hunt — final polish
 * - Modal: body 포털 + 강제 배경(#clover-modal-card)으로 투명 문제 완전 차단
 * - Buttons: color/variant 지원 컴포넌트로 교체(emerald/sky/amber/rose/slate)
 */

// ---------- Config ----------
const CONFIG = {
  padding: 16,
  minSize: 36,
  maxSize: 64,
  amount: { easy: 45, normal: 90, hard: 150, insane: 240 },
};

// ---------- Utils ----------
const rand = (min, max) => Math.random() * (max - min) + min;
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
function useMeasure() {
  const ref = useRef(null);
  const [r, setR] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const o = new ResizeObserver((es) => {
      for (const e of es) {
        const c = e.contentRect;
        setR({ width: c.width, height: c.height });
      }
    });
    o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return [ref, r];
}

// ---------- Visual atoms ----------
function GroundShadow({ w }) {
  return (
    <div
      aria-hidden
      style={{
        width: w,
        height: w * 0.28,
        filter: "blur(3px)",
        background:
          "radial-gradient(ellipse at center, rgba(0,0,0,0.35), rgba(0,0,0,0) 70%)",
      }}
      className="absolute left-1/2 -translate-x-1/2 top-full -mt-2 opacity-60"
    />
  );
}
function LightHalo({ w }) {
  return (
    <div
      aria-hidden
      style={{
        width: w * 1.05,
        height: w * 1.05,
        background:
          "radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.28) 40%, rgba(255,255,255,0.06) 65%, rgba(255,255,255,0) 72%)",
      }}
      className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 rounded-full mix-blend-screen"
    />
  );
}

// ---------- Buttons ----------
function Button({
  children,
  onClick,
  color = "emerald",     // emerald | sky | amber | rose | slate
  variant = "solid",     // solid | soft | outline | ghost
  size = "md",           // sm | md | lg
  className = "",
}) {
  const base =
    "btn"; // 실제 스타일은 아래 <style>에 정의. 여기 className은 스코프 키만 역할.

  // data-attribute로 테마 전달 (CSS에서 처리)
  return (
    <button
      onClick={onClick}
      data-color={color}
      data-variant={variant}
      data-size={size}
      className={`${base} ${className}`}
    >
      {children}
    </button>
  );
}


// ---------- Stat Card ----------
function StatCard({ title, value, hint }) {
  return (
    <div className="rounded-2xl bg-white border border-emerald-100 shadow-sm p-4 flex flex-col gap-2">
      <div className="text-sm text-emerald-900/80">{title}</div>
      <div className="text-3xl font-extrabold tracking-tight text-gray-900 tabular-nums">{value}</div>
      {hint && <div className="text-[12px] text-gray-500">{hint}</div>}
    </div>
  );
}

// ---------- Portal Modal (강제 배경 규칙 포함) ----------
function ModalAt({ open, anchor, children }) {
  if (!open) return null;

  const cx = anchor?.cx ?? window.innerWidth / 2;
  const cy = anchor?.cy ?? window.innerHeight / 2;

  return createPortal(
    <div
      id="clover-modal-root"
      style={{ position: "fixed", inset: 0, zIndex: 2147483646, pointerEvents: "auto" }}
    >
      <div
        style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      />
      <div
        style={{ position: "absolute", left: cx, top: cy, transform: "translate(-50%, -50%)", zIndex: 2147483647 }}
      >
        {children}
      </div>
      <style>{`
        #clover-modal-card { background: #f3f4f6 !important; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 12px 32px rgba(0,0,0,0.22); }
      `}</style>
    </div>,
    document.body
  );
}

// ---------- Main Game ----------
export default function FourLeafCloverGame() {
  // assets
  let grassUrl, threeUrl, fourUrl;
  try { grassUrl = new URL("./assets/grass.webp", import.meta.url).href; } catch { grassUrl = "/grass.webp"; }
  try { threeUrl = new URL("./assets/three_leaf_clover.webp", import.meta.url).href; } catch { threeUrl = "/three_leaf_clover.webp"; }
  try { fourUrl = new URL("./assets/four_leaf_clover.webp", import.meta.url).href; } catch { fourUrl = "/four_leaf_clover.webp"; }

  const [difficulty, setDifficulty] = useState("normal");
  const [count, setCount] = useState(CONFIG.amount.normal);
  const [items, setItems] = useState([]);
  const [targetId, setTargetId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [round, setRound] = useState(0);
  const [startAt, setStartAt] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [bestMs, setBestMs] = useState(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [boardRef, rect] = useMeasure();
  const [anchor, setAnchor] = useState(null);

  useEffect(() => {
    function updateAnchor() {
      if (!boardRef.current) return;
      const r = boardRef.current.getBoundingClientRect();
      setAnchor({ cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
    }
    updateAnchor();
    if (status === "success") updateAnchor();
    window.addEventListener("resize", updateAnchor, { passive: true });
    window.addEventListener("scroll", updateAnchor, { passive: true });
    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor);
    };
  }, [status, boardRef]);

  useEffect(() => {
    if (status !== "playing" || !startAt) return;
    const t = setInterval(() => setElapsedMs(Date.now() - startAt), 33);
    return () => clearInterval(t);
  }, [status, startAt]);

  useEffect(() => setCount(CONFIG.amount[difficulty] ?? 120), [difficulty]);

  useEffect(() => {
    if (rect.width <= 0 || rect.height <= 0) return;
    const pad = CONFIG.padding; const w = Math.max(0, rect.width - pad * 2); const h = Math.max(0, rect.height - pad * 2);
    const cols = Math.ceil(Math.sqrt(count * (w / h))); const rows = Math.ceil(count / cols);
    const cellW = w / cols, cellH = h / rows;
    const cells = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ r, c });
    const chosen = shuffle(cells).slice(0, count);
    const next = chosen.map((cell, i) => {
      const size = Math.random() * (CONFIG.maxSize - CONFIG.minSize) + CONFIG.minSize;
      const x0 = pad + cell.c * cellW; const y0 = pad + cell.r * cellH;
      const x = Math.min(Math.max(x0 + Math.random() * (cellW * 0.6) + cellW * 0.2 - size / 2, pad), rect.width - pad - size);
      const y = Math.min(Math.max(y0 + Math.random() * (cellH * 0.6) + cellH * 0.2 - size / 2, pad), rect.height - pad - size);
      return { id: i, x, y, size, isFour: false, rot: (Math.random() * 24) - 12 };
    });
    const tIdx = Math.floor(Math.random() * next.length); next[tIdx].isFour = true; setTargetId(next[tIdx].id); setItems(next);
  }, [rect.width, rect.height, round, count]);

  useEffect(() => { if (status === "idle" && rect.width > 0 && rect.height > 0) start(); }, [rect.width, rect.height]);

  function start() { setStatus("playing"); setStartAt(Date.now()); setElapsedMs(0); setRound((r) => r + 1); }
  function reshuffle() { setRound((r) => r + 1); }
  const ms = (n = 0) => (n / 1000).toFixed(2) + "s";

  function clickClover(it) {
    if (status === "idle") start(); if (status !== "playing") return;
    if (it.id === targetId) { const spent = Date.now() - startAt; setElapsedMs(spent); setStatus("success"); setBestMs((b) => (b == null ? spent : Math.min(b, spent))); }
    else { setShakeKey(Date.now()); }
  }

  return (
    <div className="min-h-[80vh] w-full flex items-start justify-center p-4 sm:p-6 bg-gradient-to-b from-white to-emerald-50">
      <div className="w-full max-w-6xl">
        {/* Header */}
          <div className="clover-ui">
  {/* 헤더/툴바 */}
  <div className="toolbar">
    <h1 className="title">🍀 네잎클로버 찾기</h1>
    <div className="controls">
      <label className="label">난이도</label>
      <select
        className="select"
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
      >
        <option value="easy">쉬움</option>
        <option value="normal">보통</option>
        <option value="hard">어려움</option>
        <option value="insane">극악</option>
      </select>

      <Button color="emerald" variant="solid" size="sm" onClick={start}>새 게임</Button>
      <Button color="slate"   variant="outline" size="sm" onClick={reshuffle}>재배치</Button>
    </div>
  </div>

  {/* 통계 카드 */}
  <div className="stats">
    <div className="card hide-sm"><div className="card-title">시도</div><div className="card-value">{round}</div></div>    
    <div className="card"><div className="card-title">경과</div><div className="card-value">{ms(elapsedMs)}</div></div>
    <div className="card"><div className="card-title">상태</div><div className="card-value">{status==='playing'?'진행중':status==='success'?'성공':'대기'}</div></div>
    <div className="card"><div className="card-title">최고</div><div className="card-value">{bestMs==null?'-':ms(bestMs)}</div></div>        
  </div>
</div>


        {/* Board */}
        <div
          ref={boardRef}
          role="application"
          aria-label="네잎클로버 보드"
          className="relative w-full aspect-[3/2] overflow-hidden select-none border border-emerald-900/40 shadow-[inset_0_2px_10px_rgba(0,0,0,0.35),0_8px_16px_rgba(0,0,0,0.12)]"
          style={{ backgroundImage: `url(${grassUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)" }} />
          <div key={shakeKey} className="absolute inset-0" style={{ animation: shakeKey ? "clover-shake 160ms ease-in-out" : undefined }} aria-hidden />

          {items.map((it) => (
            <div key={it.id} className="absolute" style={{ left: it.x, top: it.y }}>
              <LightHalo w={it.size} />
              <GroundShadow w={it.size} />
              <button
                onClick={() => clickClover(it)}
                className="group relative outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 rounded-xl active:scale-95 bg-transparent border-0 p-0 appearance-none cursor-pointer"
                aria-label={it.isFour ? "네잎 클로버" : "세잎 클로버"}
              >
                <img src={it.isFour ? fourUrl : threeUrl} alt="clover" width={it.size} height={it.size} className="pointer-events-none select-none transform transition-transform duration-150 will-change-transform group-hover:scale-110 group-hover:-rotate-2" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.35))", imageRendering: "auto" }} />
                <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-emerald-300/0 group-hover:ring-emerald-300/70 transition" />
              </button>
            </div>
          ))}
        </div>

        {/* Success Modal (board center) */}
        <ModalAt open={status === "success"} anchor={anchor}>
          <div id="clover-modal-card" style={{ width: "min(85vw, 360px)", padding: 24, textAlign: "center", position: "relative", isolation: "isolate", opacity: 1 }}>
            <div style={{ color: "#047857", fontSize: 12, marginBottom: 8 }}>기록</div>
            <div style={{ color: "#065f46", fontWeight: 800, fontSize: 28, margin: "8px 0 16px" }}>{ms(elapsedMs)}</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              <Button color="emerald" variant="solid" onClick={start}>다시 도전</Button>
              <Button color="slate" variant="soft" onClick={() => setStatus("idle")}>닫기</Button>
            </div>
          </div>
        </ModalAt>

        <style>{`
          @keyframes clover-shake {0%{transform:translate3d(0,0,0)}25%{transform:translate3d(-4px,0,0)}50%{transform:translate3d(4px,0,0)}75%{transform:translate3d(-3px,0,0)}100%{transform:translate3d(0,0,0)}}
        `}</style>

        <style>{`
/* ---- 스코프: 상단 UI 전용 (Tailwind 없이도 동작) ---- */
.clover-ui { margin-bottom: 12px; }
.clover-ui .toolbar{
  display:flex; justify-content:space-between; align-items:center; gap:12px;
  padding:12px 16px; border-radius:14px; background:rgba(255,255,255,.85);
  backdrop-filter:saturate(130%) blur(6px);
  border:1px solid rgba(2,6,23,.06); box-shadow:0 6px 18px rgba(2,6,23,.08);
}
.clover-ui .title{margin:0;display:flex;align-items:center;gap:8px;color:#064e3b;font-weight:800;font-size:22px;letter-spacing:-.01em}
.clover-ui .controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.clover-ui .label{font-size:12px;color:#065f46;opacity:.8}
.clover-ui .select{
  appearance:auto; padding:6px 10px; border-radius:10px; background:#fff;
  border:1px solid #cbd5e1; color:#0f172a;
}
.clover-ui .stats{
  display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-top:12px;
}
@media (max-width:1024px){ .clover-ui .stats{ grid-template-columns:repeat(3,minmax(0,1fr)); } }
@media (max-width:640px){ .clover-ui .stats{ grid-template-columns:repeat(2,minmax(0,1fr)); } .clover-ui .hide-sm{ display:none; } }
.clover-ui .card{
  background:#fff; border:1px solid #e2e8f0; border-radius:16px;
  box-shadow:0 2px 10px rgba(2,6,23,.06); padding:14px 16px;
}
.clover-ui .card-title{font-size:12px;color:#065f46;opacity:.85;margin-bottom:4px}
.clover-ui .card-value{font-size:26px;font-weight:900;color:#0f172a;letter-spacing:-.01em}
.clover-ui .card-value.small{font-size:14px;font-weight:700;color:#134e4a}

/* ---- 버튼 테마 (data-* 속성으로 제어) ---- */
.btn{
  border-radius:12px; padding:8px 12px; font-weight:700; cursor:pointer;
  transition:transform .12s ease, box-shadow .2s ease, background .2s ease, color .2s ease, border .2s ease;
  border:1px solid transparent; user-select:none;
}
.btn:active{ transform:scale(.96); }

/* size */
.btn[data-size="sm"]{ padding:6px 10px; font-size:14px; }
.btn[data-size="lg"]{ padding:10px 14px; font-size:17px; }

/* solid */
.btn[data-variant="solid"][data-color="emerald"]{ background:#059669; color:#fff; box-shadow:0 2px 6px rgba(5,150,105,.24); }
.btn[data-variant="solid"][data-color="emerald"]:hover{ background:#047857; }
.btn[data-variant="solid"][data-color="sky"]{ background:#0284c7; color:#fff; }
.btn[data-variant="solid"][data-color="amber"]{ background:#f59e0b; color:#111827; }
.btn[data-variant="solid"][data-color="rose"]{ background:#e11d48; color:#fff; }
.btn[data-variant="solid"][data-color="slate"]{ background:#334155; color:#fff; }

/* outline */
.btn[data-variant="outline"][data-color="slate"]{ border-color:#cbd5e1; color:#0f172a; background:#fff; }
.btn[data-variant="outline"][data-color="slate"]:hover{ background:#f8fafc; }
.btn[data-variant="outline"][data-color="emerald"]{ border-color:#86efac; color:#065f46; background:#fff; }
.btn[data-variant="outline"][data-color="emerald"]:hover{ background:#ecfdf5; }

/* soft */
.btn[data-variant="soft"][data-color="slate"]{ background:#f1f5f9; color:#0f172a; border-color:#e2e8f0; }
.btn[data-variant="soft"][data-color="slate"]:hover{ background:#e2e8f0; }
.btn[data-variant="soft"][data-color="emerald"]{ background:#d1fae5; color:#065f46; border-color:#a7f3d0; }
.btn[data-variant="soft"][data-color="emerald"]:hover{ background:#a7f3d0; }

/* ghost */
.btn[data-variant="ghost"][data-color="emerald"]{ color:#065f46; }
.btn[data-variant="ghost"][data-color="emerald"]:hover{ background:#ecfdf5; }
`}</style>
      </div>
    </div>
  );
}