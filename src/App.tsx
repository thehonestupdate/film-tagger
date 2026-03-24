import { useEffect, useMemo, useRef, useState } from "react";

type Position = "" | "QB" | "RB" | "WR" | "TE" | "OL" | "DL" | "LB" | "DB";
type SectionKey = "athletic" | "qb" | "rb" | "wr" | "te" | "ol" | "dl" | "lb" | "db";
type Screen = "start" | "tag" | "done";

type Player = { name: string; school: string; yearClass: string; position: Position };

type State = {
  v: number;
  screen: Screen;
  player: Player;
  active: SectionKey;
  counts: Record<string, number>;
  undo: string[];
  notes: string;
  out: string;
  outMode: "ai" | "local" | "";
  prompt: string;
};

const V = 1;

const KEY = "film_tagger_v1";

// API base:
// - Dev (with Vite proxy): leave VITE_API_BASE empty so calls go to "/api/..."
// - Prod (hosted UI): set VITE_API_BASE to your Worker URL
const API_BASE = String(import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

const PINNED = [
  "Game Speed",
  "Short-Area Burst",
  "Functional Strength",
  "Football IQ",
  "Motor / Relentless Effort",
] as const;

const RAW = `
\tAthletic & Attitude
1.\tGame Speed
\t2.\tShort-Area Burst
\t3.\tLong Speed
\t4.\tAcceleration
\t5.\tFluidity
\t6.\tLateral Quickness
\t7.\tChange of Direction
\t8.\tLoose Hips
\t9.\tBalance & Body Control
\t10.\tStop-Start Ability
\t11.\tFunctional Strength
\t12.\tCore Strength
\t13.\tPower Through Contact
\t14.\tLeverage & Pad Level
\t15.\tLength / Reach Advantage
\t16.\tToughness
\t17.\tCompetitive Edge
\t18.\tNo Regard for Contact
\t19.\tFinisher Mentality
\t20.\tBounce-Back Response
\t21.\tMotor / Relentless Effort
\t22.\tPursuit / Hustle To The Ball
\t23.\tPoise Under Stress
\t24.\tFootball IQ
\t25.\tInstincts / Feel for the Game
QB
\t1.\tPre-Snap Recognition
\t2.\tProtection ID
\t3.\tPost-Snap Processing
\t4.\tGoing Through Progressions
\t5.\tAnticipation Throws
\t6.\tRisk Management
\t7.\tFast Correct Decisions
\t8.\tManipulates Defenders With Eyes
\t9.\tPocket Feel
\t10.\tClimbs The Pocket
\t11.\tSlides/Resets Smoothly
\t12.\tCreates Space
\t13.\tEscapes With Purpose
\t14.\tThrows Under Duress
\t15.\tQuick Release
\t16.\tCompact Delivery
\t17.\tThrows From Multiple Platforms
\t18.\tArm Strength
\t19.\tConsistent Base
\t20.\tSmoother Upper-Lower Sync
\t21.\tBall Placement
\t22.\tAccuracy on the Move
\t23.\tTouch / Trajectory Control
\t24.\tThrows Receivers Open
\t25.\tRed-Zone Precision
RB
\t1.\tVision
\t2.\tPatience / Tempo
\t3.\tDecisiveness
\t4.\tPresses The Hole
\t5.\tReads Leverage
\t6.\tAnticipates Creases
\t7.\tCut Timing
\t8.\tStays On Track
\t9.\tBurst Through The Line
\t10.\tContact Balance
\t11.\tRuns Behind Pads
\t12.\tPower Finish
\t13.\tBreaks Arm Tackles
\t14.\tLeg Drive
\t15.\tTrue Bruiser
\t16.\tMake-You-Miss Ability
\t17.\tLateral Agility In The Hole
\t18.\tJump Cut
\t19.\tChange Of Pace
\t20.\tCreativity In Space
\t21.\tSecond-Level Feel
\t22.\tHands / Reliability
\t23.\tRoute Ability
\t24.\tYAC As A Receiver
\t25.\tPass Protection
WR
\t1.\tRelease Package
\t2.\tBeats Press
\t3.\tHand Fighting
\t4.\tStacking DBs
\t5.\tLate Hands
\t6.\tPhysical At The Line
\t7.\tRoute Pacing
\t8.\tSharp Breaks
\t9.\tSells The Route
\t10.\tSeparation Quickness
\t11.\tStem Work
\t12.\tFinds Soft Spots
\t13.\tWorks Back To QB
\t14.\tSideline Awareness
\t15.\tStrong Hands
\t16.\tCatches Away From Frame
\t17.\tContested Catch Ability
\t18.\tBall Tracking
\t19.\tBody Control
\t20.\tFinishes Through Contact
\t21.\tYAC Creativity
\t22.\tAcceleration After Catch
\t23.\tTough Runner
\t24.\tBlocks With Effort
\t25.\tVersatility / Alignments
TE
\t1.\tIn-Line Blocking
\t2.\tBlock Sustain
\t3.\tHand Placement
\t4.\tPad Level / Leverage
\t5.\tDrive Blocking
\t6.\tSeals The Edge
\t7.\tReach Blocks
\t8.\tSecond-Level Blocking
\t9.\tPass Pro Anchor
\t10.\tBlocking Effort
\t11.\tHands / Reliability
\t12.\tCatch Through Contact
\t13.\tContested Catch Ability
\t14.\tBall Tracking
\t15.\tStrong At The Catch Point
\t16.\tDeep Ball Threat
\t17.\tRoute Efficiency
\t18.\tFinds Soft Spots
\t19.\tSeparation In Short Areas
\t20.\tYAC Power
\t21.\tYAC Balance
\t22.\tRun After Catch Vision
\t23.\tInline / Slot Versatility
\t24.\tMotion / H-Back Utility
\t25.\tRed Zone Weapon
OL
\t1.\tPass Set Quickness
\t2.\tKick Slide
\t3.\tHand Timing
\t4.\tIndependent Hands
\t5.\tPunch Power
\t6.\tAnchor vs Power
\t7.\tBalance In Pass Pro
\t8.\tRecovery Ability
\t9.\tMirroring
\t10.\tHandles Speed-to-Power
\t11.\tRun-Game Movement
\t12.\tLeverage / Pad Level
\t13.\tDrive
\t14.\tFits Hands In Run Game
\t15.\tFinish / Strain
\t16.\tDown Blocks
\t17.\tCombo Blocks
\t18.\tSecond-Level Targeting
\t19.\tUltra-Aggressive
\t20.\tPulling Ability
\t21.\tLateral Range
\t22.\tSpace Blocking
\t23.\tConsistency
\t24.\tBlitz Pickup Awareness
\t25.\tPenalty Discipline
DL
\t1.\tGet-Off / First Step
\t2.\tEdge Burst
\t3.\tSpeed-to-Power
\t4.\tBend / Cornering
\t5.\tRush Plan
\t6.\tHand Usage
\t7.\tCounters
\t8.\tInside Move Threat
\t9.\tCloses On QB
\t10.\tRush Lane Discipline
\t11.\tPlays With Leverage
\t12.\tHolds The Point
\t13.\tStack & Shed
\t14.\tAnchor vs Double Teams
\t15.\tGap Integrity
\t16.\tSets The Edge
\t17.\tDefeats Reach Blocks
\t18.\tTackling Finish
\t19.\tBackfield Disruption
\t20.\tPursuit Range
\t21.\tScreen Recognition
\t22.\tPursuit Angles
\t23.\tCreates Negative Plays
\t24.\tInside/Outside Versatility
\t25.\tPass-Rush Variety
LB
\t1.\tKey & Diagnose
\t2.\tRun Fits
\t3.\tTrigger / Downhill
\t4.\tBlock Recognition
\t5.\tPatience In The Box
\t6.\tGap Shooting
\t7.\tTakes On Blocks
\t8.\tStack & Shed
\t9.\tEdge Setting
\t10.\tPursuit Angles
\t11.\tSideline-to-Sideline Range
\t12.\tClosing Burst
\t13.\tTackling Technique
\t14.\tOpen-Field Tackling
\t15.\tThump / Pop
\t16.\tSure Tackler
\t17.\tFinishes Plays
\t18.\tZone Awareness
\t19.\tMan Coverage Ability
\t20.\tRoute Recognition
\t21.\tDepth In Drops
\t22.\tBall Skills
\t23.\tBlitz Timing
\t24.\tCommunication / Traffic Control
\t25.\tPlaymaker Instincts
DB
\t1.\tFeet / Foot Quickness
\t2.\tBackpedal Control
\t3.\tTransitions
\t4.\tHip Fluidity
\t5.\tSpacial Awareness
\t6.\tBalance At The Break Point
\t7.\tLeverage Discipline
\t8.\tPatience In Coverage
\t9.\tRoute Recognition
\t10.\tRecovery Speed
\t11.\tPress Technique
\t12.\tJam Timing
\t13.\tStays In Phase
\t14.\tTurns & Finds The Ball
\t15.\tPlays Through The Hands
\t16.\tContest Without Grabbing
\t17.\tZone Awareness
\t18.\tEyes / Discipline
\t19.\tDrive On The Ball
\t20.\tCommunication In The Secondary
\t21.\tBall Skills
\t22.\tHigh-Point Ability
\t23.\tBait & Trap Ability
\t24.\tBig-Play Ability
\t25.\tWilling Tackler / Run Support
`;

const ORDER: SectionKey[] = ["athletic", "qb", "rb", "wr", "te", "ol", "dl", "lb", "db"];

const css = `
:root{--bg:#0b0f16;--panel:#0f1623;--panel2:#101b2b;--text:#e7eefc;--muted:#a8b3c7;--line:rgba(255,255,255,.10);--hot:#8ef;--ok:#7CFC9A;--bad:#ff8080}
*{box-sizing:border-box}html,body,#root{height:100%}html,body,#root{background:var(--bg)}
body{margin:0;color:var(--text);font:14px/1.4 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
button,input,select,textarea{font:inherit;color:inherit}
button{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
a{color:inherit}

.app{min-height:100%;display:flex;flex-direction:column}
.top{position:sticky;top:0;z-index:5;background:linear-gradient(180deg, rgba(11,15,22,.98), rgba(11,15,22,.78));backdrop-filter: blur(10px);border-bottom:1px solid var(--line)}
.topIn{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;gap:10px}
.title{font-weight:800;letter-spacing:.2px}
.sub{color:var(--muted);font-size:12px;margin-top:2px}
.row{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.btn{border:1px solid var(--line);background:rgba(255,255,255,.04);padding:8px 10px;border-radius:10px;cursor:pointer}
.btn:hover{background:rgba(255,255,255,.07)}
.btn:disabled{opacity:.45;cursor:not-allowed}
.primary{background:rgba(142,239,255,.10);border-color:rgba(142,239,255,.35)}
.danger{background:rgba(255,80,80,.10);border-color:rgba(255,80,80,.35)}

.shell{flex:1;display:flex;min-height:0}
.side{width:240px;flex:0 0 240px;border-right:1px solid var(--line);background:rgba(255,255,255,.02);min-height:0}
.sideIn{display:flex;flex-direction:column;min-height:0;height:100%}
.sideHead{padding:12px 12px 8px;border-bottom:1px solid var(--line)}
.sideMeta{display:flex;gap:8px;flex-wrap:wrap;color:var(--muted);font-size:12px;margin-top:6px}
.pill{padding:2px 8px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.03)}
.nav{padding:8px;overflow:auto}
.navBtn{width:100%;text-align:left;display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid transparent;background:transparent;padding:10px;border-radius:10px;cursor:pointer}
.navBtn:hover{background:rgba(255,255,255,.05)}
.navBtn.on{border-color:rgba(142,239,255,.30);background:rgba(142,239,255,.08)}
.count{min-width:28px;text-align:center;border:1px solid var(--line);border-radius:999px;padding:2px 8px;color:var(--muted);background:rgba(255,255,255,.03)}
.count.hot{border-color:rgba(142,239,255,.35);color:var(--text)}

.main{flex:1;min-width:0;overflow:auto}
.wrap{max-width:1100px;margin:0 auto;padding:16px}
.card{border:1px solid var(--line);background:linear-gradient(180deg, rgba(15,22,35,.92), rgba(15,22,35,.70));border-radius:16px;padding:14px}
.card + .card{margin-top:12px}
.h1{font-size:16px;font-weight:800;margin:0}
.desc{color:var(--muted);margin-top:4px}

.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
@media (max-width:900px){.grid2{grid-template-columns:1fr}.side{position:fixed;left:0;top:0;bottom:0;transform:translateX(-102%);transition:.2s;z-index:20}
.side.open{transform:translateX(0)}.overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:19}}

.field label{display:block;color:var(--muted);font-size:12px;margin:0 0 6px}
.field input,.field select,textarea{width:100%;padding:10px 10px;border-radius:12px;border:1px solid var(--line);background:rgba(0,0,0,.15);outline:none}
textarea{resize:vertical}

.pinnedRow{margin-top:12px;display:flex;gap:8px;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;padding-bottom:6px;-webkit-overflow-scrolling:touch}
.pinnedRow::-webkit-scrollbar{height:8px}
.pinnedRow::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:999px}

.traitGrid{margin-top:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}
.trait{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid var(--line);background:rgba(255,255,255,.03);padding:10px 10px;border-radius:14px;cursor:pointer;min-height:44px;user-select:none;touch-action:manipulation}
.trait:hover{background:rgba(255,255,255,.06)}
.trait.on{border-color:rgba(142,239,255,.35);background:rgba(142,239,255,.07)}
.lbl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.badge{min-width:24px;text-align:center;border-radius:999px;padding:2px 8px;border:1px solid var(--line);background:rgba(0,0,0,.18)}
.badge.hot{border-color:rgba(142,239,255,.35)}

.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.chip{border:1px solid var(--line);background:rgba(255,255,255,.03);border-radius:999px;padding:6px 10px;font-size:12px}
.chip.hot{border-color:rgba(142,239,255,.35);background:rgba(142,239,255,.07)}

.split{display:grid;grid-template-columns:1.05fr .95fr;gap:12px;margin-top:12px}
@media (max-width:900px){.split{grid-template-columns:1fr}}
.box{border:1px solid var(--line);background:rgba(255,255,255,.03);border-radius:14px;padding:12px;min-height:120px;white-space:pre-wrap}
.small{font-size:12px;color:var(--muted)}
.good{color:var(--ok)}.bad{color:var(--bad)}
.toast{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);background:rgba(10,14,20,.88);border:1px solid var(--line);padding:10px 12px;border-radius:999px;z-index:50}
`;

const clamp = (n: number) => Math.max(0, Math.min(3, n | 0));
const norm = (s: string) => s.trim().toLowerCase();

function parseRaw(raw: string): Record<SectionKey, string[]> {
  // RAW is declared with String.raw, so sequences like "\t" are literal characters.
  // Normalize those into real tabs before trimming/parsing.
  const unescTabs = (s: string) => s.split("\t").join("	");

  const map: Record<string, SectionKey> = {
    "Athletic & Attitude": "athletic",
    QB: "qb",
    RB: "rb",
    WR: "wr",
    TE: "te",
    OL: "ol",
    DL: "dl",
    LB: "lb",
    DB: "db",
  };

  const out: Record<SectionKey, string[]> = { athletic: [], qb: [], rb: [], wr: [], te: [], ol: [], dl: [], lb: [], db: [] };
  const pinned = new Set(PINNED.map(norm));

  let cur: SectionKey | null = null;

  const lines = raw.replace(/\r/g, "").split("\n");
  for (const line of lines) {
    const t = unescTabs(line).trim();
    if (!t) continue;

    const hk = map[t];
    if (hk) {
      cur = hk;
      continue;
    }
    if (!cur) continue;

    // Strip "1." style prefixes without relying on regex.
    let stripped = t;
    const dot = stripped.indexOf(".");
    if (dot > -1) {
      const left = stripped.slice(0, dot).trim();
      let allDigits = left.length > 0;
      for (let i = 0; i < left.length; i++) {
        const ch = left[i];
        if (ch < "0" || ch > "9") {
          allDigits = false;
          break;
        }
      }
      if (allDigits) stripped = stripped.slice(dot + 1).trim();
    }

    if (!stripped) continue;
    if (!pinned.has(norm(stripped))) out[cur].push(stripped);
  }

  return out;
}

function emptyState(): State {
  return {
    v: V,
    screen: "start",
    player: { name: "", school: "", yearClass: "", position: "" },
    active: "athletic",
    counts: {},
    undo: [],
    notes: "",
    out: "",
    outMode: "",
    prompt: "",
  };
}

function countSentences(s: string) {
  // Keep the 1-4 sentence check forgiving around common note shorthand.
  const normalized = s
    .replace(/\b(Mr|Mrs|Ms|Dr|Jr|Sr|St|vs|etc)\./gi, "$1")
    .replace(/\b([A-Z])\./g, "$1")
    .replace(/(\d)\.(\d)/g, "$1$2");

  return normalized
    .split(/[.!?]+/)
    .map((p) => p.trim())
    .filter(Boolean).length;
}

const joinNatural = (a: string[]) => (a.length <= 1 ? (a[0] || "") : a.length === 2 ? `${a[0]} and ${a[1]}` : `${a.slice(0, -1).join(", ")}, and ${a[a.length - 1]}`);

const emphasis = (c: number) => (c >= 3 ? "defining" : c === 2 ? "strong" : "noticeable");

function buildPrompt(player: Player, notes: string, pickedPinned: { label: string; count: number }[], pickedOther: { label: string; count: number }[]) {
  const header = `You are writing a football scouting blurb.\n\nPlayer: ${player.name} | ${player.school} | ${player.yearClass}${player.position ? ` | ${player.position}` : ""}`;
  const rules = [
    "Write ONE long single paragraph (no bullet points, no headings).",
    "Tone: natural, sharp, not corny.",
    "The user's 1–4 sentences are the primary truth—preserve/echo them.",
    "Tap counts are only emphasis: 3=defining, 2=strong, 1=noticeable.",
    "Weave traits into prose—do not list mechanically.",
    "Do NOT invent stats, offers, measurables, or biographical info.",
    "No negatives unless the user wrote them.",
  ].join("\n");
  const fmt = (x: { label: string; count: number }[]) => (x.length ? x.map((t) => `- ${t.label} (${t.count} = ${emphasis(t.count)})`).join("\n") : "(none)");
  return [
    header,
    "\nINSTRUCTIONS:",
    rules,
    "\nUSER SENTENCES (primary truth, preserve):",
    notes.trim(),
    "\nPINNED TRAITS TAPPED:",
    fmt(pickedPinned),
    "\nOTHER TRAITS TAPPED:",
    fmt(pickedOther),
  ].join("\n");
}

function buildLocalDraft(notes: string, all: { label: string; count: number }[]) {
  const clean = notes.trim().replace(/\s+/g, " ");
  const def = all.filter((t) => t.count >= 3).map((t) => t.label);
  const strong = all.filter((t) => t.count === 2).map((t) => t.label);
  const flash = all.filter((t) => t.count === 1).map((t) => t.label);
  const chunks: string[] = [];
  if (clean) chunks.push(/[.!?]$/.test(clean) ? clean : `${clean}.`);
  if (def.length) chunks.push(`What keeps jumping off the screen is ${joinNatural(def)} — those feel like defining traits, not just one-off flashes.`);
  if (strong.length) chunks.push(`${joinNatural(strong)} consistently stood out, showing up in a way that should hold when the pace speeds up.`);
  if (flash.length) chunks.push(`There were also clear flashes of ${joinNatural(flash)} — not every snap, but enough to be part of the profile.`);
  if (!def.length && !strong.length && !flash.length) chunks.push("Trait-wise, keep it simple: the notes above are the takeaways, and this writeup avoids inventing anything beyond what was actually seen on film.");
  chunks.push("Overall, it's a clean snapshot from tape—built around what was actually seen, with trait tags only used to emphasize what popped most.");
  return chunks.join(" ").replace(/\s+/g, " ").trim();
}

async function genAI(prompt: string): Promise<string> {
  // Calls your server route (recommended) so your Gemini key stays off the client.
  // You must implement /api/generate to return JSON: { text: "..." } (or { error: "..." }).
  const resp = await fetch(apiUrl("/api/generate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}${t ? ` — ${t.slice(0, 300)}` : ""}`);
  }

  const data = (await resp.json()) as { text?: string; error?: string };
  const text = String(data?.text ?? "").trim();
  if (!text) throw new Error(String(data?.error || "empty"));
  return text;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function App() {
  const sections = useMemo(() => {
    const p = parseRaw(RAW);
    return {
      athletic: { label: "Athletic & Attitude", traits: p.athletic },
      qb: { label: "QB", traits: p.qb },
      rb: { label: "RB", traits: p.rb },
      wr: { label: "WR", traits: p.wr },
      te: { label: "TE", traits: p.te },
      ol: { label: "OL", traits: p.ol },
      dl: { label: "DL", traits: p.dl },
      lb: { label: "LB", traits: p.lb },
      db: { label: "DB", traits: p.db },
    } as const;
  }, []);

  const allOrdered = useMemo(() => {
    const arr: string[] = [...PINNED];
    for (const k of ORDER) arr.push(...sections[k].traits);
    return arr;
  }, [sections]);

  const [sideOpen, setSideOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastRef = useRef<number | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  const [st, setSt] = useState<State>(() => {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
    if (!raw) return emptyState();
    try {
      const s = JSON.parse(raw) as State;
      if (!s || s.v !== V) return emptyState();
      const counts: Record<string, number> = {};
      for (const [k, v] of Object.entries(s.counts || {})) counts[k] = clamp(Number(v));
      return { ...emptyState(), ...s, counts, undo: Array.isArray(s.undo) ? s.undo.filter((x) => typeof x === "string") : [] };
    } catch {
      return emptyState();
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(st));
    } catch {
      // ignore
    }
  }, [st]);

  const say = (m: string) => {
    setToast(m);
    if (toastRef.current) window.clearTimeout(toastRef.current);
    toastRef.current = window.setTimeout(() => setToast(""), 1600);
  };

  const getCount = (t: string) => clamp(st.counts[t] ?? 0);
  const hasAny = useMemo(() => Object.values(st.counts).some((v) => clamp(v) > 0), [st.counts]);

  const pinnedTapped = useMemo(() => PINNED.reduce((n, t) => n + (getCount(t) > 0 ? 1 : 0), 0), [st.counts]);
  const sectionTapped = (k: SectionKey) => sections[k].traits.reduce((n, t) => n + (getCount(t) > 0 ? 1 : 0), 0);

  const title = useMemo(() => {
    const p = st.player;
    return !p.name && !p.school ? "Film Tagger" : `${p.name || "Player"} • ${p.school || "School"}`;
  }, [st.player]);

  const cur = sections[st.active];

  const tap = (t: string) => {
    const c = getCount(t);
    if (c >= 3) return;
    setSt((s) => ({ ...s, counts: { ...s.counts, [t]: c + 1 }, undo: [...s.undo, t] }));
  };

  const undo = () => {
    setSt((s) => {
      const stack = s.undo.slice();
      const last = stack.pop();
      if (!last) return s;
      const c = clamp(s.counts[last] ?? 0);
      return { ...s, counts: { ...s.counts, [last]: clamp(c - 1) }, undo: stack };
    });
  };

  const resetSection = () => {
    if (!window.confirm(`Reset ${cur.label}? (Pinned stays)`)) return;
    const set = new Set(cur.traits);
    setSt((s) => {
      const next = { ...s.counts };
      for (const t of cur.traits) next[t] = 0;
      return { ...s, counts: next, undo: s.undo.filter((x) => !set.has(x)) };
    });
    say(`Reset ${cur.label}.`);
  };

  const resetAll = () => {
    if (!window.confirm("Reset EVERYTHING?")) return;
    setSt((s) => ({ ...s, counts: {}, undo: [], notes: "", out: "", outMode: "", prompt: "" }));
    say("Reset all.");
  };

  const newPlayer = () => {
    if (!window.confirm("Start a new player?")) return;
    setSt(emptyState());
    say("New player started.");
  };

  const canStart = st.player.name.trim() && st.player.school.trim() && st.player.yearClass.trim();

  const doneSummary = useMemo(() => {
    const pinned = PINNED.map((t) => ({ label: t, count: getCount(t) })).filter((x) => x.count > 0);
    const secs = ORDER
      .map((k) => ({
        k,
        label: sections[k].label,
        traits: sections[k].traits.map((t) => ({ label: t, count: getCount(t) })).filter((x) => x.count > 0),
      }))
      .filter((x) => x.traits.length);
    return { pinned, secs };
  }, [st.counts, sections]);

  const sentenceCount = useMemo(() => countSentences(st.notes), [st.notes]);

  const pickForGen = () => {
    const pinnedSet = new Set<string>(PINNED as unknown as string[]);
    const pickedPinned: { label: string; count: number }[] = [];
    const pickedOtherAll: { label: string; count: number }[] = [];

    for (const t of allOrdered) {
      const c = getCount(t);
      if (!c) continue;
      if (pinnedSet.has(t)) pickedPinned.push({ label: t, count: c });
      else pickedOtherAll.push({ label: t, count: c });
    }

    const c3 = pickedOtherAll.filter((x) => x.count >= 3);
    const c2 = pickedOtherAll.filter((x) => x.count === 2).slice(0, 6);
    const c1 = pickedOtherAll.filter((x) => x.count === 1).slice(0, 6);
    const pickedOther = [...c3, ...c2, ...c1].sort((a, b) => b.count - a.count);
    return { pickedPinned, pickedOther };
  };

  const generate = async () => {
    const sc = countSentences(st.notes);

    // Your notes are still the "truth" and kept tight.
    if (sc < 1 || sc > 4) {
      say("Keep notes to 1–4 sentences.");
      notesRef.current?.focus();
      return;
    }

    const { pickedPinned, pickedOther } = pickForGen();

    // Build prompt like before
    let prompt = buildPrompt(st.player, st.notes, pickedPinned, pickedOther);

    // Override output requirements: 4–8 sentences, single paragraph
    prompt +=
      "\n\nOUTPUT REQUIREMENTS (MUST FOLLOW):\n" +
      "- Write 4–8 sentences total.\n" +
      "- Single paragraph only (no bullet points, no headings).\n" +
      "- Natural scouting voice. Football-smart, not corny.\n" +
      "- Do NOT invent stats, offers, measurables, or background.\n" +
      "- Use my notes as the primary truth.\n" +
      "- If you mention traits, weave them naturally—do not list.\n" +
      "- End with a clean overall takeaway sentence.\n";

    setSt((s) => ({ ...s, prompt, out: "", outMode: "" }));

    try {
      // Call shared helper (server route) so the key never lives on the client
      const ai = await genAI(prompt);

      // Models drift a little. Keep usable AI output instead of failing hard.
      const outSentences = countSentences(ai);
      const cleaned = ai.replace(/\s+/g, " ").trim();

      setSt((s) => ({ ...s, out: cleaned, outMode: "ai" }));
      say(outSentences < 4 || outSentences > 8 ? `Generated with AI (${outSentences} sentences).` : "Generated with AI.");
    } catch (err: any) {
      const msg = String(err?.message || err || "AI failed");

      // local fallback so you still get something usable
      const allPicked = allOrdered
        .map((label) => ({ label, count: getCount(label) }))
        .filter((x) => x.count > 0);

      const local = buildLocalDraft(st.notes, allPicked);

      setSt((s) => ({
        ...s,
        out:
          `AI error: ${msg}\n\n` +
          `Local Draft (fallback):\n` +
          `${local}\n\n` +
          `If AI keeps failing, it usually means:\n` +
          `- /api/generate route isn’t reachable from Pages\n` +
          `- VITE_API_BASE isn’t set correctly in Pages env vars\n`,
        outMode: "local",
      }));

      say("AI failed — local draft generated.");
    }
  };

  const overlay = sideOpen ? <div className="overlay" onClick={() => setSideOpen(false)} /> : null;

  return (
    <div className="app">
      <style>{css}</style>

      <header className="top">
        <div className="topIn">
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {st.screen !== "start" && (
              <button className="btn" onClick={() => setSideOpen(true)} aria-label="Open sections" style={{ display: "inline-flex" }}>
                ☰
              </button>
            )}
            <div>
              <div className="title">{title}</div>
              <div className="sub">
                {st.screen === "start" ? "Set player info, then start tagging." : st.screen === "tag" ? "Tap traits as you watch film." : "Review, write notes, and generate."}
              </div>
            </div>
          </div>

          <div className="row">
            {st.screen === "tag" && (
              <>
                <button className="btn" onClick={undo} disabled={!st.undo.length}>
                  Undo
                </button>
                <button className="btn" onClick={resetSection}>
                  Reset Section
                </button>
                <button className="btn" onClick={resetAll}>
                  Reset All
                </button>
                <button className="btn primary" onClick={() => setSt((s) => ({ ...s, screen: "done" }))} disabled={!hasAny}>
                  Done Watching
                </button>
              </>
            )}
            {st.screen !== "start" && (
              <button className="btn danger" onClick={newPlayer}>
                New Player
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="shell">
        {st.screen !== "start" && (
          <>
            {overlay}
            <aside className={`side ${sideOpen ? "open" : ""}`}>
              <div className="sideIn">
                <div className="sideHead">
                  <div className="title" style={{ fontSize: 14 }}>
                    Sections
                  </div>
                  <div className="sideMeta">
                    <span className="pill">Pinned: {pinnedTapped}</span>
                    <span className="pill">Undo: {st.undo.length}</span>
                  </div>
                </div>

                <div className="nav" aria-label="Trait sections">
                  {ORDER.map((k) => {
                    const on = k === st.active;
                    const cnt = sectionTapped(k);
                    return (
                      <button
                        key={k}
                        className={`navBtn ${on ? "on" : ""}`}
                        onClick={() => {
                          setSt((s) => ({ ...s, active: k }));
                          setSideOpen(false);
                        }}
                      >
                        <span>{sections[k].label}</span>
                        <span className={`count ${cnt ? "hot" : ""}`}>{cnt}</span>
                      </button>
                    );
                  })}

                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn" onClick={resetAll}>
                      Reset All
                    </button>
                    <button className="btn danger" onClick={newPlayer}>
                      New Player
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </>
        )}

        <main className="main">
          <div className="wrap">
            {st.screen === "start" && (
              <>
                <div className="card">
                  <div className="h1">Player Setup</div>
                  <div className="desc">Name, school, and year/class are required. Position is optional.</div>
                  <div className="grid2">
                    <div className="field">
                      <label>Name *</label>
                      <input value={st.player.name} onChange={(e) => setSt((s) => ({ ...s, player: { ...s.player, name: e.target.value } }))} placeholder="e.g., Luke Farrell" />
                    </div>
                    <div className="field">
                      <label>School *</label>
                      <input value={st.player.school} onChange={(e) => setSt((s) => ({ ...s, player: { ...s.player, school: e.target.value } }))} placeholder="e.g., Corona del Sol" />
                    </div>
                    <div className="field">
                      <label>Year / Class *</label>
                      <input value={st.player.yearClass} onChange={(e) => setSt((s) => ({ ...s, player: { ...s.player, yearClass: e.target.value } }))} placeholder="e.g., 2027 / Jr" />
                    </div>
                    <div className="field">
                      <label>Position</label>
                      <select value={st.player.position} onChange={(e) => setSt((s) => ({ ...s, player: { ...s.player, position: e.target.value as Position } }))}>
                        <option value="">—</option>
                        {(["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB"] as Position[]).map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <button
                      className={`btn ${canStart ? "primary" : ""}`}
                      disabled={!canStart}
                      onClick={() => {
                        setSt((s) => ({ ...s, screen: "tag", active: "athletic" }));
                        say("Tagging started.");
                      }}
                    >
                      Start Watching
                    </button>
                  </div>
                </div>

                <div className="card">
                  <div className="h1">How It Works</div>
                  <div className="desc" style={{ marginTop: 8 }}>
                    Tap a trait to increment (0→3). 1 = saw it, 2 = stood out, 3 = rare/defining. Pinned traits are always visible and never duplicated in section grids.
                  </div>
                </div>
              </>
            )}

            {st.screen === "tag" && (
              <>
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <div>
                      <div className="h1">Pinned Traits</div>
                      <div className="desc">Always visible. Forced to ONE row (scroll sideways if needed).</div>
                    </div>
                    <div className="small">Tap = +1 (max 3)</div>
                  </div>

                  <div className="pinnedRow" aria-label="Pinned traits">
                    {PINNED.map((t) => {
                      const c = getCount(t);
                      return (
                        <button key={t} className={`trait ${c ? "on" : ""}`} onClick={() => tap(t)} style={{ minWidth: 210 }}>
                          <span className="lbl">{t}</span>
                          <span className={`badge ${c ? "hot" : ""}`}>{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <div>
                      <div className="h1">{cur.label}</div>
                      <div className="desc">Pinned traits are filtered out.</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button className="btn" onClick={resetSection}>
                        Reset Section
                      </button>
                      <button className="btn primary" onClick={() => setSt((s) => ({ ...s, screen: "done" }))} disabled={!hasAny}>
                        Done Watching
                      </button>
                    </div>
                  </div>

                  {cur.traits.length ? (
                    <div className="traitGrid" aria-label="Section traits">
                      {cur.traits.map((t) => {
                        const c = getCount(t);
                        return (
                          <button key={t} className={`trait ${c ? "on" : ""}`} onClick={() => tap(t)}>
                            <span className="lbl">{t}</span>
                            <span className={`badge ${c ? "hot" : ""}`}>{c}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="desc" style={{ marginTop: 10 }}>
                      No traits parsed for this section. Check RAW formatting.
                    </div>
                  )}

                  <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span className="pill">Undo: {st.undo.length}</span>
                      <span className="pill">Pinned: {pinnedTapped}</span>
                      <span className="pill">{cur.label}: {sectionTapped(st.active)}</span>
                    </div>
                    <button className="btn primary" onClick={() => setSt((s) => ({ ...s, screen: "done" }))} disabled={!hasAny}>
                      Done Watching
                    </button>
                  </div>
                </div>
              </>
            )}

            {st.screen === "done" && (
              <>
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <div>
                      <div className="h1">Done Watching</div>
                      <div className="desc">Review tags, write 1–4 sentences, then generate one long paragraph.</div>
                    </div>
                    <button className="btn" onClick={() => setSt((s) => ({ ...s, screen: "tag" }))}>
                      Back to Tagging
                    </button>
                  </div>

                  <div className="split">
                    <div className="card" style={{ padding: 12, background: "rgba(255,255,255,.02)" }}>
                      <div className="h1" style={{ fontSize: 14 }}>
                        Summary
                      </div>

                      {doneSummary.pinned.length > 0 && (
                        <>
                          <div className="small" style={{ marginTop: 10 }}>
                            Pinned
                          </div>
                          <div className="chips">
                            {doneSummary.pinned.map((t) => (
                              <span key={t.label} className={`chip ${t.count >= 2 ? "hot" : ""}`}>
                                {t.label} <b style={{ marginLeft: 6 }}>{t.count}</b>
                              </span>
                            ))}
                          </div>
                        </>
                      )}

                      {doneSummary.secs.map((s) => (
                        <div key={s.k} style={{ marginTop: 12 }}>
                          <div className="small">{s.label}</div>
                          <div className="chips">
                            {s.traits.map((t) => (
                              <span key={t.label} className={`chip ${t.count >= 2 ? "hot" : ""}`}>
                                {t.label} <b style={{ marginLeft: 6 }}>{t.count}</b>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}

                      {!doneSummary.pinned.length && !doneSummary.secs.length && (
                        <div className="desc" style={{ marginTop: 10 }}>
                          No traits tapped yet.
                        </div>
                      )}

                      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn" onClick={resetAll}>
                          Reset All
                        </button>
                        <button className="btn danger" onClick={newPlayer}>
                          New Player
                        </button>
                      </div>
                    </div>

                    <div className="card" style={{ padding: 12, background: "rgba(255,255,255,.02)" }}>
                      <div className="h1" style={{ fontSize: 14 }}>
                        Your 1–4 Sentences
                      </div>
                      <div className="small" style={{ marginTop: 6 }}>
                        Sentence count: <span className={sentenceCount >= 1 && sentenceCount <= 4 ? "good" : "bad"}>{sentenceCount}</span>
                      </div>

                      <textarea
                        ref={notesRef}
                        value={st.notes}
                        onChange={(e) => setSt((s) => ({ ...s, notes: e.target.value }))}
                        rows={6}
                        placeholder="Write 1–4 sentences. Your sentences are the primary truth."
                        style={{ marginTop: 10 }}
                      />

                      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
                        <button className="btn" onClick={resetAll}>
                          Reset All
                        </button>
                        <button className="btn primary" onClick={generate} disabled={!hasAny}>
                          Generate Paragraph
                        </button>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <div className="small">Output {st.outMode ? `(${st.outMode.toUpperCase()})` : ""}</div>
                        <div className="box" style={{ marginTop: 8 }}>{st.out || "(Generate to see output here)"}</div>
                        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            className="btn"
                            disabled={!st.out}
                            onClick={async () => {
                              const ok = await copy(st.out);
                              say(ok ? "Copied paragraph." : "Copy failed.");
                            }}
                          >
                            Copy Paragraph
                          </button>
                          <button
                            className="btn"
                            disabled={!st.prompt}
                            onClick={async () => {
                              const ok = await copy(st.prompt);
                              say(ok ? "Copied prompt." : "Copy failed.");
                            }}
                          >
                            Copy Prompt
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
