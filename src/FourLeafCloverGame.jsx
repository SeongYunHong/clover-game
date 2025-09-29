import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuoteBag } from "./quotes";

/**
 * 🍀 Four-Leaf Clover Hunt — fixed & responsive (Tailwind v3.4.17)
 * - Fix: responsive size now uses board width (no window dependency in hot paths)
 * - Fix: buttons wired (start / reshuffle) and compact on one row
 * - Added small button styling token (data-size="xs")
 * - Kept clean, self-contained CSS for .btn theme
 */

// ---------- Config ----------
const CONFIG = {
  padding: 16,
  amount: { easy: 45, normal: 90, hard: 150, insane: 240 },
};

// ---------- Utils ----------
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

// Choose clover size range based on **board width** for true responsiveness
function sizeRangeByWidth(w) {
  if (!w || w < 480) return [18, 36];      // phones
  if (w < 768)        return [24, 48];      // small tablets
  if (w < 1280)       return [28, 56];      // laptops
  return [32, 64];                          // desktops/ultrawide
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
function Button({ children, onClick, color = "emerald", variant = "solid", size = "xs", className = "" }) {
  return (
    <button
      onClick={onClick}
      data-color={color}
      data-variant={variant}
      data-size={size}
      className={`btn ${className}`}
    >
      {children}
    </button>
  );
}

// ---------- Portal Modal ----------
function ModalAt({ open, anchor, children }) {
  if (!open) return null;
  const cx = anchor?.cx ?? window.innerWidth / 2;
  const cy = anchor?.cy ?? window.innerHeight / 2;
  return createPortal(
    <div id="clover-modal-root" style={{ position: "fixed", inset: 0, zIndex: 2147483646 }}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "absolute", left: cx, top: cy, transform: "translate(-50%, -50%)", zIndex: 2147483647 }}>
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

  const wrapRef = useRef(null);
  const containerRef = useRef(null);
  const [boardH, setBoardH] = useState(360); // 최소 가드

  const nextQuote = useQuoteBag();
  const [line, setLine] = useState("");

  useEffect(() => {
    if (open) setLine(nextQuote()); // 모달 열릴 때 새 문구
  }, [open, nextQuote]);

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
    const pad = CONFIG.padding;
    const w = Math.max(0, rect.width - pad * 2);
    const h = Math.max(0, rect.height - pad * 2);

    const cols = Math.ceil(Math.sqrt(count * (w / h)));
    const rows = Math.ceil(count / cols);
    const cellW = w / cols, cellH = h / rows;

    const [minSize, maxSize] = sizeRangeByWidth(rect.width);

    const cells = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ r, c });
    const chosen = shuffle(cells).slice(0, count);
    const next = chosen.map((cell, i) => {
      const size = Math.random() * (maxSize - minSize) + minSize;
      const x0 = pad + cell.c * cellW;
      const y0 = pad + cell.r * cellH;
      const x = Math.min(Math.max(x0 + Math.random() * (cellW * 0.6) + cellW * 0.2 - size / 2, pad), rect.width - pad - size);
      const y = Math.min(Math.max(y0 + Math.random() * (cellH * 0.6) + cellH * 0.2 - size / 2, pad), rect.height - pad - size);
      return { id: i, x, y, size, isFour: false, rot: Math.random() * 24 - 12 };
    });
    const tIdx = Math.floor(Math.random() * next.length);
    next[tIdx].isFour = true;
    setTargetId(next[tIdx].id);
    setItems(next);
  }, [rect.width, rect.height, round, count]);

  useEffect(() => {
    if (status === "idle" && rect.width > 0 && rect.height > 0) start();
  }, [rect.width, rect.height]);

  useEffect(() => {
    function fitBoard() {
      if (!wrapRef.current) return;
      const top = wrapRef.current.getBoundingClientRect().top; // 보드 시작 y
      const vh = window.visualViewport?.height ?? window.innerHeight;
      let bottomPadding = 0; // 바깥 래퍼 pb가 있다면 그 값으로 설정
      if (containerRef.current) {
        const cs = getComputedStyle(containerRef.current);
        bottomPadding = parseFloat(cs.paddingBottom) || 0;
      }
      const epsilon = 1 / (window.devicePixelRatio || 1);
      const h = Math.max(320, vh - top - bottomPadding - epsilon);
      setBoardH(h);
    }
    fitBoard();
    window.addEventListener("resize", fitBoard, { passive: true });
    window.visualViewport?.addEventListener("resize", fitBoard);
    return () => {
      window.removeEventListener("resize", fitBoard);
      window.visualViewport?.removeEventListener("resize", fitBoard);
    };
  }, []);

  function start() {
    setLine(nextQuote());
    setStatus("playing");
    setStartAt(Date.now());
    setElapsedMs(0);
    setRound((r) => r + 1);
  }
  function reshuffle() { setRound((r) => r + 1); }
  const ms = (n = 0) => (n / 1000).toFixed(2) + "s";

  function clickClover(it) {
    if (status === "idle") start();
    if (status !== "playing") return;
    if (it.id === targetId) {
      const spent = Date.now() - startAt;
      setElapsedMs(spent);
      setStatus("success");
      setBestMs((b) => (b == null ? spent : Math.min(b, spent)));
    } else {
      setShakeKey(Date.now());
    }
  }

  return (
    <div className="min-h-dvh w-full flex items-start justify-center bg-gradient-to-b from-white to-emerald-50 overflow-hidden">
      <div ref={containerRef} className="w-full max-w-[120rem] mx-auto flex flex-col gap-3 flex-1 min-h-0 px-3 sm:px-4 md:px-6 py-3 sm:pt-4 md:pt-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100/70 bg-white/85 backdrop-saturate-[1.3] backdrop-blur-md shadow p-3 sm:p-4">
          <h1 className="m-0 flex items-center gap-2 text-emerald-900 font-extrabold text-base sm:text-xl tracking-tight">🍀 네잎클로버 찾기</h1>
          <div className="flex items-center gap-2">
            <Button color="emerald" variant="solid" size="xs" className="h-8 px-3 text-xs whitespace-nowrap" onClick={start}>새 게임</Button>
            <Button color="slate" variant="outline" size="xs" className="h-8 px-3 text-xs whitespace-nowrap" onClick={reshuffle}>재배치</Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-end items-center gap-2">
          <label className="text-[12px] sm:text-sm text-emerald-900/80">난이도</label>
          <select
            className="min-h-9 sm:min-h-10 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm sm:text-base"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="easy">쉬움</option>
            <option value="normal">보통</option>
            <option value="hard">어려움</option>
            <option value="insane">극악</option>
          </select>
        </div>

        {/* Stats */} 
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3" role="group" aria-label="게임 통계" > 
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 sm:p-4"> 
            <div className="text-[11px] sm:text-xs text-emerald-900/80">상태</div> 
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums text-right">{status === "playing" ? "진행중" : status === "success" ? "성공" : "대기"}</div> 
          </div> 
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 sm:p-4"> 
            <div className="text-[11px] sm:text-xs text-emerald-900/80">경과</div> 
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums text-right">{ms(elapsedMs)}</div> 
          </div> 
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 sm:p-4"> 
            <div className="text-[11px] sm:text-xs text-emerald-900/80">시도</div> 
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums text-right">{round}</div> 
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 sm:p-4"> 
            <div className="text-[11px] sm:text-xs text-emerald-900/80">최고</div> 
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums text-right">{bestMs == null ? "-" : ms(bestMs)}</div>
          </div> 
        </div>

        {/* Board */}
        <div ref={wrapRef} className="w-full">
          <div
            ref={boardRef}
            role="application"
            aria-label="네잎클로버 보드"
            className="relative w-full h-full min-h-[320px] overflow-hidden select-none border border-emerald-900/40 shadow-[inset_0_2px_10px_rgba(0,0,0,0.35),_0_8px_16px_rgba(0,0,0,0.12)]"
            style={{ backgroundImage: `url(${grassUrl})`, backgroundSize: "cover", backgroundPosition: "center", height: boardH }}
          >
            <div
              key={shakeKey}
              className="absolute inset-0 motion-safe:animate-[clover-shake_160ms_ease-in-out]"
              aria-hidden
            />

            {items.map((it) => (
              <div key={it.id} className="absolute" style={{ left: it.x, top: it.y }}>
                <LightHalo w={it.size} />
                <GroundShadow w={it.size} />
                <button
                  onClick={() => clickClover(it)}
                  className="group relative outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 rounded-xl active:scale-95 bg-transparent border-0 p-0 appearance-none cursor-pointer touch-manipulation"
                  aria-label={it.isFour ? "네잎 클로버" : "세잎 클로버"}
                >
                  <img
                    src={it.isFour ? fourUrl : threeUrl}
                    alt="clover"
                    width={it.size}
                    height={it.size}
                    className="pointer-events-none select-none transform transition-transform duration-150 will-change-transform group-hover:scale-110 group-hover:-rotate-2"
                    style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.35))", imageRendering: "auto" }}
                  />
                  <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-emerald-300/0 group-hover:ring-emerald-300/70 transition" />
                </button>
              </div>
            ))}
          </div>
        </div>
        {/* Success Modal (board center) */}
        <ModalAt open={status === "success"} anchor={anchor}>
          <div id="clover-modal-card" className="relative isolate opacity-100" style={{ width: "min(92vw, 380px)", padding: 20, textAlign: "center" }}>
            <div className="text-emerald-700 text-xs mb-2">기록</div>
            <div className="text-emerald-700 font-bold text-base mb-2">{line}</div>
            <div className="text-emerald-800 font-extrabold text-2xl sm:text-3xl my-2">{ms(elapsedMs)}</div>
            <div className="flex justify-center gap-2 sm:gap-3 mt-2">
              <Button color="emerald" variant="solid" className="min-h-10 px-4 text-sm" onClick={start}>다시 도전</Button>
              <Button color="slate" variant="soft" className="min-h-10 px-4 text-sm" onClick={() => setStatus("idle")}>닫기</Button>
            </div>
          </div>
        </ModalAt>

        {/* Keyframes + Button theme */}
        <style>{`
          @keyframes clover-shake {0%{transform:translate3d(0,0,0)}25%{transform:translate3d(-4px,0,0)}50%{transform:translate3d(4px,0,0)}75%{transform:translate3d(-3px,0,0)}100%{transform:translate3d(0,0,0)}}

          .btn{ border-radius:12px; padding:8px 12px; font-weight:700; cursor:pointer; transition:transform .12s ease, box-shadow .2s ease, background .2s ease, color .2s ease, border .2s ease; border:1px solid transparent; user-select:none; }
          .btn:active{ transform:scale(.96); }
          .btn[data-size="xs"]{ padding:4px 10px; font-size:12px; line-height:1; border-radius:10px; }

          /* solid */
          .btn[data-variant="solid"][data-color="emerald"]{ background:#059669; color:#fff; box-shadow:0 2px 6px rgba(5,150,105,.24); }
          .btn[data-variant="solid"][data-color="emerald"]:hover{ background:#047857; }

          /* outline */
          .btn[data-variant="outline"][data-color="slate"]{ border-color:#cbd5e1; color:#0f172a; background:#fff; }
          .btn[data-variant="outline"][data-color="slate"]:hover{ background:#f8fafc; }

          /* soft */
          .btn[data-variant="soft"][data-color="slate"]{ background:#f1f5f9; color:#0f172a; border-color:#e2e8f0; }
          .btn[data-variant="soft"][data-color="slate"]:hover{ background:#e2e8f0; }
          .btn[data-variant="soft"][data-color="emerald"]{ background:#d1fae5; color:#065f46; border-color:#a7f3d0; }
          .btn[data-variant="soft"][data-color="emerald"]:hover{ background:#a7f3d0; }
        `}</style>
      </div>
    </div>
  );
}
