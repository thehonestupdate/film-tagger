import { useEffect, useMemo, useRef, useState } from "react";

type Position = "" | "QB" | "RB" | "WR" | "TE" | "OL" | "DL" | "LB" | "DB";
type SectionKey = "athletic" | "qb" | "rb" | "wr" | "te" | "ol" | "dl" | "lb" | "db";
type Screen = "start" | "tag" | "done" | "library";
type TraitLevel = 1 | 2 | 3;

type Player = { name: string; school: string; yearClass: string; position: Position };
type SelectedTrait = { traitName: string; traitLevel: TraitLevel; section: string };
type LibraryEntry = {
  id: number;
  playerName: string;
  school: string;
  yearClass: string;
  position: string;
  notes: string;
  outputText: string;
  createdAt: string;
  traits: { traitName: string; traitLevel: TraitLevel }[];
};
type LibraryFilters = { search: string; school: string; yearClass: string; position: Position; trait: string; level: "" | "1" | "2" | "3" };

type State = {
  v: number;
  screen: Screen;
  player: Player;
  active: SectionKey;
  counts: Record<string, number>;
  undo: string[];
  notes: string;
  out: string;
  outMode: "saved" | "";
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
.libraryGrid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-top:12px}
.libraryGrid .wide{grid-column:span 2}
@media (max-width:900px){.libraryGrid{grid-template-columns:1fr}.libraryGrid .wide{grid-column:auto}}
.entry{border:1px solid var(--line);background:rgba(255,255,255,.025);border-radius:14px;padding:12px;margin-top:10px}
.entryTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
.entryTitle{font-weight:800}
.entryMeta{color:var(--muted);font-size:12px;margin-top:3px}
.entryText{white-space:pre-wrap;margin-top:10px;color:var(--text)}
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

const levelLabel = (level: number) => (level >= 3 ? "elite" : level === 2 ? "above average" : "flashed");

function buildArticleOutput(player: Player, notes: string, traits: SelectedTrait[]) {
  const position = player.position ? ` | Position: ${player.position}` : "";
  const traitLines = traits.map((trait) => `- ${trait.traitName} — ${levelLabel(trait.traitLevel)}`);

  return [
    `Player: ${player.name}`,
    `School: ${player.school}`,
    `Class: ${player.yearClass}${position}`,
    "",
    "My Notes:",
    notes.trim(),
    "",
    "Traits:",
    traitLines.join("\n"),
  ].join("\n");
}

async function addTags(payload: { player: Player; notes: string; outputText: string; traits: SelectedTrait[] }) {
  const resp = await fetch(apiUrl("/api/add-tags"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, traits: payload.traits.map(({ traitName, traitLevel }) => ({ traitName, traitLevel })) }),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}${t ? ` — ${t.slice(0, 300)}` : ""}`);
  }

  return (await resp.json()) as { ok?: boolean; id?: number; error?: string };
}

async function fetchLibrary(filters: LibraryFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }

  const resp = await fetch(apiUrl(`/api/evaluations${params.size ? `?${params}` : ""}`));
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}${t ? ` — ${t.slice(0, 300)}` : ""}`);
  }

  return (await resp.json()) as { evaluations?: LibraryEntry[]; error?: string };
}

async function deleteLibraryEntry(id: number) {
  const resp = await fetch(apiUrl(`/api/evaluations/${id}`), { method: "DELETE" });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}${t ? ` — ${t.slice(0, 300)}` : ""}`);
  }

  return (await resp.json()) as { ok?: boolean; error?: string };
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : String(err || fallback);
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
  const [libraryFilters, setLibraryFilters] = useState<LibraryFilters>({ search: "", school: "", yearClass: "", position: "", trait: "", level: "" });
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(st));
    } catch {
      // ignore
    }
  }, [st]);

  useEffect(() => {
    if (st.screen !== "library") return;
    void refreshLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.screen]);

  const say = (m: string) => {
    setToast(m);
    if (toastRef.current) window.clearTimeout(toastRef.current);
    toastRef.current = window.setTimeout(() => setToast(""), 1600);
  };

  const getCount = (t: string) => clamp(st.counts[t] ?? 0);
  const hasAny = useMemo(() => Object.values(st.counts).some((v) => clamp(v) > 0), [st.counts]);

  const pinnedTapped = PINNED.reduce((n, t) => n + (getCount(t) > 0 ? 1 : 0), 0);
  const sectionTapped = (k: SectionKey) => sections[k].traits.reduce((n, t) => n + (getCount(t) > 0 ? 1 : 0), 0);

  const title = useMemo(() => {
    if (st.screen === "library") return "Film Tagger Library";
    const p = st.player;
    return !p.name && !p.school ? "Film Tagger" : `${p.name || "Player"} • ${p.school || "School"}`;
  }, [st.player, st.screen]);

  const cur = sections[st.active];
  const showTagShell = st.screen === "tag" || st.screen === "done";

  const traitMeta = useMemo(() => {
    const pinned = new Set<string>(PINNED as unknown as string[]);
    const meta = new Map<string, string>();
    for (const trait of PINNED) meta.set(trait, "Pinned");
    for (const key of ORDER) {
      for (const trait of sections[key].traits) {
        if (!pinned.has(trait)) meta.set(trait, sections[key].label);
      }
    }
    return meta;
  }, [sections]);

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

  const doneSummary = (() => {
    const pinned = PINNED.map((t) => ({ label: t, count: getCount(t) })).filter((x) => x.count > 0);
    const secs = ORDER
      .map((k) => ({
        k,
        label: sections[k].label,
        traits: sections[k].traits.map((t) => ({ label: t, count: getCount(t) })).filter((x) => x.count > 0),
      }))
      .filter((x) => x.traits.length);
    return { pinned, secs };
  })();

  const selectedTraits = (() => {
    const traits: SelectedTrait[] = [];
    for (const t of allOrdered) {
      const c = getCount(t);
      if (!c) continue;
      traits.push({ traitName: t, traitLevel: c as TraitLevel, section: traitMeta.get(t) || "Other" });
    }
    return traits.sort((a, b) => b.traitLevel - a.traitLevel || a.traitName.localeCompare(b.traitName));
  })();

  const refreshLibrary = async (filters = libraryFilters) => {
    setLibraryLoading(true);
    setLibraryError("");
    try {
      const data = await fetchLibrary(filters);
      if (data.error) throw new Error(data.error);
      setLibrary(data.evaluations || []);
    } catch (err: unknown) {
      setLibraryError(errorMessage(err, "Failed to load library"));
    } finally {
      setLibraryLoading(false);
    }
  };

  const addCurrentTags = async () => {
    const notes = st.notes.trim();
    if (!notes) {
      say("Add notes before saving.");
      notesRef.current?.focus();
      return;
    }

    if (!selectedTraits.length) {
      say("Tap at least one trait.");
      return;
    }

    const outputText = buildArticleOutput(st.player, notes, selectedTraits);
    setSt((s) => ({ ...s, out: outputText, outMode: "", prompt: "" }));

    try {
      const data = await addTags({ player: st.player, notes, outputText, traits: selectedTraits });
      if (data.error) throw new Error(data.error);
      setSt((s) => ({ ...s, out: outputText, outMode: "saved" }));
      say("Tags added and saved.");
      void refreshLibrary();
    } catch (err: unknown) {
      const msg = errorMessage(err, "Failed to save tags");
      setSt((s) => ({
        ...s,
        out: `${outputText}\n\nSave error: ${msg}`,
        outMode: "",
      }));
      say("Copy block made, but save failed.");
    }
  };

  const removeLibraryEntry = async (entry: LibraryEntry) => {
    if (!window.confirm(`Delete ${entry.playerName} from the database?`)) return;

    try {
      const data = await deleteLibraryEntry(entry.id);
      if (data.error) throw new Error(data.error);
      setLibrary((entries) => entries.filter((item) => item.id !== entry.id));
      say("Deleted from library.");
    } catch (err: unknown) {
      say(errorMessage(err, "Delete failed"));
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
                {st.screen === "start"
                  ? "Set player info, then start tagging."
                  : st.screen === "tag"
                    ? "Tap traits as you watch film."
                    : st.screen === "library"
                      ? "Search saved players, notes, and traits."
                      : "Review notes, add tags, and save."}
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
            {showTagShell && (
              <button className="btn" onClick={() => setSt((s) => ({ ...s, screen: "library" }))}>
                Library
              </button>
            )}
            {st.screen === "library" && (
              <button className="btn primary" onClick={() => setSt((s) => ({ ...s, screen: hasAny ? "done" : "start" }))}>
                Back
              </button>
            )}
            {showTagShell && (
              <button className="btn danger" onClick={newPlayer}>
                New Player
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="shell">
        {showTagShell && (
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
                    Tap a trait to increment (0→3). 1 = flashed, 2 = above average, 3 = elite. Pinned traits are always visible and never duplicated in section grids.
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button className="btn" onClick={() => setSt((s) => ({ ...s, screen: "library" }))}>
                      Open Library
                    </button>
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
                      <div className="desc">Review tags, write your notes, then add tags to save this player and create a copy block.</div>
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
                        My Notes
                      </div>
                      <div className="small" style={{ marginTop: 6 }}>Saved exactly as your source notes for the player.</div>

                      <textarea
                        ref={notesRef}
                        value={st.notes}
                        onChange={(e) => setSt((s) => ({ ...s, notes: e.target.value }))}
                        rows={6}
                        placeholder="Write your notes. These will be saved with the player and included in the copy block."
                        style={{ marginTop: 10 }}
                      />

                      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
                        <button className="btn" onClick={resetAll}>
                          Reset All
                        </button>
                        <button className="btn primary" onClick={addCurrentTags} disabled={!hasAny}>
                          Add Tags
                        </button>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <div className="small">Copy Block {st.outMode ? `(${st.outMode.toUpperCase()})` : ""}</div>
                        <div className="box" style={{ marginTop: 8 }}>{st.out || "(Add tags to create the copy block here)"}</div>
                        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            className="btn"
                            disabled={!st.out}
                            onClick={async () => {
                              const ok = await copy(st.out);
                              say(ok ? "Copied block." : "Copy failed.");
                            }}
                          >
                            Copy Block
                          </button>
                          <button className="btn" onClick={() => setSt((s) => ({ ...s, screen: "library" }))}>
                            Open Library
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {st.screen === "library" && (
              <>
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div>
                      <div className="h1">Player Library</div>
                      <div className="desc">Saved D1 entries from Add Tags. Filter by school, class, position, trait, or level.</div>
                    </div>
                    <div className="row">
                      <button className="btn" onClick={() => void refreshLibrary()}>
                        Refresh
                      </button>
                      <button className="btn primary" onClick={() => setSt((s) => ({ ...s, screen: hasAny ? "done" : "start" }))}>
                        Back
                      </button>
                    </div>
                  </div>

                  <div className="libraryGrid">
                    <div className="field wide">
                      <label>Search</label>
                      <input value={libraryFilters.search} onChange={(e) => setLibraryFilters((f) => ({ ...f, search: e.target.value }))} placeholder="name, notes, school..." />
                    </div>
                    <div className="field">
                      <label>School</label>
                      <input value={libraryFilters.school} onChange={(e) => setLibraryFilters((f) => ({ ...f, school: e.target.value }))} placeholder="school" />
                    </div>
                    <div className="field">
                      <label>Class</label>
                      <input value={libraryFilters.yearClass} onChange={(e) => setLibraryFilters((f) => ({ ...f, yearClass: e.target.value }))} placeholder="2027" />
                    </div>
                    <div className="field">
                      <label>Position</label>
                      <select value={libraryFilters.position} onChange={(e) => setLibraryFilters((f) => ({ ...f, position: e.target.value as Position }))}>
                        <option value="">Any</option>
                        {(["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB"] as Position[]).map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Level</label>
                      <select value={libraryFilters.level} onChange={(e) => setLibraryFilters((f) => ({ ...f, level: e.target.value as LibraryFilters["level"] }))}>
                        <option value="">Any</option>
                        <option value="1">Flashed</option>
                        <option value="2">Above Average</option>
                        <option value="3">Elite</option>
                      </select>
                    </div>
                    <div className="field wide">
                      <label>Trait</label>
                      <input value={libraryFilters.trait} onChange={(e) => setLibraryFilters((f) => ({ ...f, trait: e.target.value }))} placeholder="e.g., agility, Game Speed" />
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn primary" onClick={() => void refreshLibrary()}>
                      Apply Filters
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        const cleared: LibraryFilters = { search: "", school: "", yearClass: "", position: "", trait: "", level: "" };
                        setLibraryFilters(cleared);
                        void refreshLibrary(cleared);
                      }}
                    >
                      Clear
                    </button>
                  </div>

                  {libraryError && (
                    <div className="desc bad" style={{ marginTop: 12 }}>
                      {libraryError}
                    </div>
                  )}

                  <div className="small" style={{ marginTop: 12 }}>
                    {libraryLoading ? "Loading..." : `${library.length} saved ${library.length === 1 ? "entry" : "entries"}`}
                  </div>

                  {!libraryLoading && !library.length && (
                    <div className="desc" style={{ marginTop: 10 }}>
                      No saved entries match those filters yet.
                    </div>
                  )}

                  {library.map((entry) => (
                    <div className="entry" key={entry.id}>
                      <div className="entryTop">
                        <div>
                          <div className="entryTitle">{entry.playerName}</div>
                          <div className="entryMeta">
                            {entry.school} • {entry.yearClass}
                            {entry.position ? ` • ${entry.position}` : ""} • {new Date(entry.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="row">
                          <button
                            className="btn"
                            onClick={async () => {
                              const ok = await copy(entry.outputText);
                              say(ok ? "Copied saved block." : "Copy failed.");
                            }}
                          >
                            Copy
                          </button>
                          <button className="btn danger" onClick={() => void removeLibraryEntry(entry)}>
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="chips">
                        {entry.traits.map((trait) => (
                          <span key={`${entry.id}-${trait.traitName}-${trait.traitLevel}`} className={`chip ${trait.traitLevel >= 2 ? "hot" : ""}`}>
                            {trait.traitName} <b style={{ marginLeft: 6 }}>{levelLabel(trait.traitLevel)}</b>
                          </span>
                        ))}
                      </div>

                      <div className="entryText">{entry.notes}</div>
                    </div>
                  ))}
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
