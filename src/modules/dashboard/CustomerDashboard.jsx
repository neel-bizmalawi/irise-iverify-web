import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import { Download, TrendingUp } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL CONSTANTS — update these to match your programme targets
// ─────────────────────────────────────────────────────────────────────────────
const COOKSTOVE_TARGET = 50000; // target cookstoves for progress bar
const CREDITS_PER_STOVE = 8.6688; // carbon credits per stove
const AVG_SAVINGS_MWK = 3000; // fallback if no monitoring savings data
const AVG_WOOD_KG = 4.53; // fallback if no monitoring fuel data
const TREES_FALLBACK = 38; // fallback trees saved per month

// ─────────────────────────────────────────────────────────────────────────────
// APIs USED IN THIS DASHBOARD:
//
//  1. POST /beneficiary/list  { filters:[] } ?page=1&limit=1
//     → totalRecords           → "Cookstove Deployed" count & progress bar
//
//  2. POST /beneficiary/list  { filters:[] } ?page=1&limit=100000
//     → data[].created_date    → Carbon Credits bar chart (group by month × CREDITS_PER_STOVE)
//     → data[].created_date    → Sparkline (monthly registrations)
//     → data[].females_above_18, females_below_18,
//        males_above_18, males_below_18  → Gender Distribution donut
//     → totalRecords           → People Impacted (fallback if training-site empty)
//     → data[].national_id     → Households count (unique national_ids as proxy)
//
//  3. POST /training-site/list { filters:[] } ?page=1&limit=100000
//     → data[].total_people    → "People Impacted" (sum)          ← NEEDS BACKEND
//     → data[].house_holds_count → "Households" (sum)             ← NEEDS BACKEND
//
//  4. POST /monitoring/list  { filters:[] } ?page=1&limit=100000
//     → data[].health_better_air === "yes"  → Health gauge %
//     → data[].savings_3_months             → Economic avg savings
//     → data[].est_fuel_last3meals_kg       → Environmental avg wood saved
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US"));
const fmtDec = (n, d) => (n == null ? "—" : Number(n).toFixed(d ?? 2));

const csvDL = (rows, name) => {
  const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: name,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const useWindowWidth = () => {
  const [w, setW] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
};

// ── Skeleton loader ───────────────────────────────────────────────────────────
const Sk = ({ w = 80, h = 28 }) => (
  <span
    style={{
      display: "inline-block",
      width: w,
      height: h,
      borderRadius: 6,
      background: "linear-gradient(90deg,#f0f7f0 25%,#d1fae5 50%,#f0f7f0 75%)",
      backgroundSize: "200% 100%",
      animation: "cdShimmer 1.4s infinite",
    }}
  />
);

// ── White card panel ──────────────────────────────────────────────────────────
const Panel = ({ children, style = {}, delay = 0 }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 16,
      padding: "18px 20px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
      animation: `cdRise 0.45s ease ${delay}ms both`,
      minWidth: 0,
      ...style,
    }}
  >
    {children}
  </div>
);

const PTitle = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 800,
      color: "#111827",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      marginBottom: 12,
    }}
  >
    {children}
  </div>
);

const DLBtn = ({ onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 4,
      borderRadius: 6,
      display: "flex",
      alignItems: "center",
      flexShrink: 0,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "#f0faf0")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
  >
    <Download size={15} color="#2e7d32" />
  </button>
);

// ── Donut Chart ───────────────────────────────────────────────────────────────
const Donut = ({
  segments = [],
  centerLabel = "",
  centerValue = "",
  size = 190,
  sw = 26,
}) => {
  const r = size / 2 - sw,
    cx = size / 2,
    cy = size / 2;
  const circ = 2 * Math.PI * r;
  const tot = segments.reduce((s, x) => s + (x.value || 0), 0) || 1;
  let off = 0;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      style={{ flexShrink: 0 }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={sw}
      />
      {segments.map((seg, i) => {
        const dash = ((seg.value || 0) / tot) * circ;
        const el = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={sw}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-(off - circ * 0.25)}
            style={{
              transition: "stroke-dasharray 1.2s cubic-bezier(.22,.68,0,1)",
            }}
          />
        );
        off += dash;
        return el;
      })}
      {centerLabel && (
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          fontSize={10}
          fill="#6b7280"
          fontWeight={700}
          letterSpacing={1.5}
          fontFamily="'DM Sans',sans-serif"
        >
          {centerLabel}
        </text>
      )}
      {centerValue && (
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          fontSize={28}
          fill="#2e7d32"
          fontWeight={900}
          fontFamily="'DM Sans',sans-serif"
        >
          {centerValue}
        </text>
      )}
    </svg>
  );
};

// ── Sparkline ─────────────────────────────────────────────────────────────────
const Spark = ({ data = [], color = "#2e7d32", w = 130, h = 70 }) => {
  if (!data || data.length < 2)
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <line
          x1={0}
          y1={h / 2}
          x2={w}
          y2={h / 2}
          stroke="#e5e7eb"
          strokeWidth={2}
          strokeDasharray="4 4"
        />
      </svg>
    );
  const max = Math.max(...data, 1);
  const min = 0;
  const rng = max - min || 1;
  const pts = data.map(
    (v, i) =>
      `${(i / (data.length - 1)) * w},${h - ((v - min) / rng) * (h - 10) - 5}`,
  );
  const [lx, ly] = pts[pts.length - 1].split(",").map(Number);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lx} cy={ly} r={4} fill={color} />
    </svg>
  );
};

// ── Carbon Credits Bar Chart ──────────────────────────────────────────────────
const CarbonBar = ({ data = [] }) => {
  if (!data.length)
    return (
      <div
        style={{
          height: 150,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "#9ca3af" }}>No data yet</span>
      </div>
    );
  const max = Math.max(...data.map((d) => d.v), 1);
  const gridMax = Math.ceil(max / 20) * 20 || 80;
  const steps = [
    gridMax,
    Math.round(gridMax * 0.6),
    Math.round(gridMax * 0.3),
    0,
  ];
  return (
    <div style={{ position: "relative", height: 160, paddingTop: 8 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 8,
          bottom: 28,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          pointerEvents: "none",
        }}
      >
        {steps.map((g, i) => (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                fontSize: 10,
                color: "#9ca3af",
                width: 22,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {g}
            </span>
            <div style={{ flex: 1, borderTop: "1px dashed #e8f5e9" }} />
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 14,
          height: "100%",
          paddingBottom: 28,
          paddingLeft: 30,
          position: "relative",
          zIndex: 1,
        }}
      >
        {data.map((d, i) => {
          const pct = Math.max((d.v / gridMax) * 100, d.v > 0 ? 5 : 0);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                gap: 5,
                height: "100%",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  width: "55%",
                  background: "#2e7d32",
                  borderRadius: "4px 4px 0 0",
                  height: `${pct}%`,
                  transition: "height 0.9s cubic-bezier(.22,.68,0,1.2)",
                  minWidth: 10,
                }}
              />
              <span
                style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}
              >
                {d.l}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Health Gauge (orange arc) ─────────────────────────────────────────────────
const HealthGauge = ({ pct = 0 }) => {
  const r = 40,
    cx = 55,
    cy = 55;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={110} height={110} viewBox="0 0 110 110">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={14}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={14}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ * 0.25}
        style={{ transition: "stroke-dasharray 1.2s ease" }}
      />
      <text
        x={cx}
        y={cy + 7}
        textAnchor="middle"
        fontSize={18}
        fill="#f59e0b"
        fontWeight={800}
        fontFamily="'DM Sans',sans-serif"
      >
        {pct}%
      </text>
    </svg>
  );
};

// ── Progress Bar ──────────────────────────────────────────────────────────────
const Progress = ({ pct }) => (
  <div style={{ marginTop: 12 }}>
    <div
      style={{
        height: 8,
        background: "#e5e7eb",
        borderRadius: 99,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: "linear-gradient(90deg,#2e7d32,#66bb6a)",
          borderRadius: 99,
          transition: "width 1.4s cubic-bezier(.22,.68,0,1)",
        }}
      />
    </div>
    <div
      style={{
        fontSize: 12,
        color: "#2e7d32",
        fontWeight: 700,
        marginTop: 6,
        textAlign: "center",
      }}
    >
      {pct}% Complete
    </div>
  </div>
);

// ── Inline Icons ──────────────────────────────────────────────────────────────
const IcoStove = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#2e7d32"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IcoCredit = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#2e7d32"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);
const IcoPeople = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#2e7d32"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

// ── Top Stat Card ─────────────────────────────────────────────────────────────
const StatCard = ({
  icon: Icon,
  label,
  mainValue,
  loading,
  subLabel,
  subValue,
  extra,
}) => (
  <Panel style={{ border: "1.5px solid #e8f5e9" }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: "#e8f5e9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon />
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </span>
    </div>
    <div
      style={{
        fontSize: "clamp(22px,2.8vw,32px)",
        fontWeight: 900,
        color: "#111827",
        lineHeight: 1,
        fontFamily: "'DM Mono',monospace",
        marginBottom: 4,
      }}
    >
      {loading ? <Sk w={100} h={30} /> : mainValue}
    </div>
    {extra}
    {subLabel && (
      <div style={{ marginTop: 10 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 3,
          }}
        >
          {subLabel}
        </div>
        <div
          style={{
            fontSize: "clamp(16px,2vw,22px)",
            fontWeight: 800,
            color: "#2e7d32",
            fontFamily: "'DM Mono',monospace",
          }}
        >
          {loading ? <Sk w={70} h={20} /> : subValue}
        </div>
      </div>
    )}
  </Panel>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CustomerDashboard
// ─────────────────────────────────────────────────────────────────────────────
const CustomerDashboard = () => {
  const width = useWindowWidth();
  const isMobile = width < 640;
  const userName =
    (typeof localStorage !== "undefined" && localStorage.getItem("userName")) ||
    "Customer";

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [benCount, setBenCount] = useState(null);
  const [allBens, setAllBens] = useState([]);
  const [allMonitoring, setAllMonitoring] = useState([]);
  const [allSites, setAllSites] = useState([]); // from /training-site/list
  const [monthlyBars, setMonthlyBars] = useState([]);

  // ── Fetch ALL data ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [bCnt, bBulk, mBulk, sBulk] = await Promise.allSettled([
          // ── API 1: Beneficiary count (cheap — limit:1) ──────────────────────
          // Used for: Cookstove Deployed number + progress bar
          axios.post(
            `${API_BASE_URL}/beneficiary/list`,
            { filters: [] },
            { params: { page: 1, limit: 1 } },
          ),

          // ── API 2: All beneficiary records ─────────────────────────────────
          // Used for:
          //   • females_above_18 + females_below_18 → Gender Distribution donut
          //   • males_above_18 + males_below_18     → Gender Distribution donut
          //   • created_date                         → Monthly carbon credits bar
          //   • created_date                         → Sparkline trend line
          //   • national_id (unique count)           → Households fallback
          axios.post(
            `${API_BASE_URL}/beneficiary/list`,
            { filters: [] },
            { params: { page: 1, limit: 100000 } },
          ),

          // ── API 3: All monitoring records ───────────────────────────────────
          // Used for:
          //   • health_better_air === "yes"  → Health gauge percentage
          //   • savings_3_months             → Economic avg savings (MWK)
          //   • est_fuel_last3meals_kg       → Environmental avg wood saved (kg)
          axios.post(
            `${API_BASE_URL}/monitoring/list`,
            { filters: [] },
            { params: { page: 1, limit: 100000 } },
          ),

          // ── API 4: All training-site records ────────────────────────────────
          // Used for:
          //   • total_people      → "People Impacted" (sum of all sites)
          //   • house_holds_count → "Households" (sum of all sites)
          //
          // NOTE: If this API returns empty or 0, the dashboard falls back to
          // beneficiary totalRecords for People Impacted and unique national_ids
          // for Households. Make sure your backend populates these fields.
          axios.post(
            `${API_BASE_URL}/training-site/list`,
            { filters: [] },
            { params: { page: 1, limit: 100000 } },
          ),
        ]);

        // ── Process API 1: beneficiary count ────────────────────────────────
        const benTotal =
          bCnt.status === "fulfilled"
            ? (bCnt.value.data?.totalRecords ?? 0)
            : 0;
        setBenCount(benTotal);

        // ── Process API 2: all beneficiary records ───────────────────────────
        const bens =
          bBulk.status === "fulfilled" ? (bBulk.value.data?.data ?? []) : [];
        setAllBens(bens);

        // ── Process API 3: all monitoring records ────────────────────────────
        const mons =
          mBulk.status === "fulfilled" ? (mBulk.value.data?.data ?? []) : [];
        setAllMonitoring(mons);

        // ── Process API 4: all training-site records ─────────────────────────
        const sites =
          sBulk.status === "fulfilled" ? (sBulk.value.data?.data ?? []) : [];
        setAllSites(sites);

        // ── Build last-5-months carbon credits bar chart ─────────────────────
        // Groups beneficiary registrations by month → multiplies by CREDITS_PER_STOVE
        const MONTHS = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const now = new Date();
        const bars = Array.from({ length: 5 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
          const nd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
          const cnt = bens.filter((r) => {
            if (!r.created_date) return false;
            const rd = new Date(r.created_date);
            return rd >= d && rd < nd;
          }).length;
          return {
            l: MONTHS[d.getMonth()],
            v: Math.round(cnt * CREDITS_PER_STOVE),
          };
        });
        setMonthlyBars(bars);
      } catch (e) {
        console.error("CustomerDashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── All derived values computed from API data ──────────────────────────────

  const deployed = benCount ?? 0;
  const pct = Math.min(Math.round((deployed / COOKSTOVE_TARGET) * 100), 100);
  const totalCredits = deployed * CREDITS_PER_STOVE;

  // This-month vs last-month % badge (from beneficiary created_date)
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthCnt = allBens.filter(
    (r) => r.created_date && new Date(r.created_date) >= thisMonthStart,
  ).length;
  const prevMonthCnt = allBens.filter((r) => {
    if (!r.created_date) return false;
    const d = new Date(r.created_date);
    return d >= prevMonthStart && d < thisMonthStart;
  }).length;
  const creditsPct =
    prevMonthCnt > 0
      ? Math.round(((thisMonthCnt - prevMonthCnt) / prevMonthCnt) * 100)
      : null;

  // ── People Impacted & Households ──────────────────────────────────────────
  // Primary source: training-site API (total_people, house_holds_count)
  // Fallback: beneficiary count & unique national_ids
  const sitesPeopleTotal = allSites.reduce(
    (s, r) => s + (Number(r.total_people) || 0),
    0,
  );
  const sitesHouseholdsTotal = allSites.reduce(
    (s, r) => s + (Number(r.house_holds_count) || 0),
    0,
  );

  const peopleImpacted = sitesPeopleTotal > 0 ? sitesPeopleTotal : deployed; // fallback: 1 person per stove

  const householdsCount =
    sitesHouseholdsTotal > 0
      ? sitesHouseholdsTotal
      : new Set(
          allBens
            .map((r) => r.national_id)
            .filter((id) => id && id !== "-" && id !== ""),
        ).size || deployed;

  // ── Gender Distribution (from beneficiary females/males fields) ────────────
  const femaleCount = allBens.reduce(
    (s, r) =>
      s + (Number(r.females_above_18) || 0) + (Number(r.females_below_18) || 0),
    0,
  );
  const maleCount = allBens.reduce(
    (s, r) =>
      s + (Number(r.males_above_18) || 0) + (Number(r.males_below_18) || 0),
    0,
  );
  const genderTot = femaleCount + maleCount || 1;
  const femalePct = Math.round((femaleCount / genderTot) * 100);

  // ── Health (from monitoring.health_better_air) ────────────────────────────
  const monTot = allMonitoring.length || 1;
  const betterAirCnt = allMonitoring.filter(
    (r) => r.health_better_air === "yes" || r.health_better_air === true,
  ).length;
  const healthPct = Math.round((betterAirCnt / monTot) * 100);

  // ── Economic (from monitoring.savings_3_months) ───────────────────────────
  const monWithSav = allMonitoring.filter(
    (r) => Number(r.savings_3_months) > 0,
  );
  const avgSavings =
    monWithSav.length > 0
      ? Math.round(
          monWithSav.reduce((s, r) => s + Number(r.savings_3_months), 0) /
            monWithSav.length,
        )
      : AVG_SAVINGS_MWK;

  // ── Environmental (from monitoring.est_fuel_last3meals_kg) ────────────────
  const monWithFuel = allMonitoring.filter(
    (r) => Number(r.est_fuel_last3meals_kg) > 0,
  );
  const avgWoodKg =
    monWithFuel.length > 0
      ? (
          monWithFuel.reduce(
            (s, r) => s + Number(r.est_fuel_last3meals_kg),
            0,
          ) / monWithFuel.length
        ).toFixed(2)
      : AVG_WOOD_KG;

  // Trees saved — formula: deployed stoves × rate × 12 months (or fallback)
  const treesPerMonth =
    deployed > 0
      ? Math.max(Math.round(deployed * 0.00076 * 12), TREES_FALLBACK)
      : TREES_FALLBACK;

  // ── Sparkline (monthly beneficiary registrations, last 6 months) ──────────
  const sparkData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const nd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return allBens.filter((r) => {
      if (!r.created_date) return false;
      const rd = new Date(r.created_date);
      return rd >= d && rd < nd;
    }).length;
  });

  // ── CSV download handlers ──────────────────────────────────────────────────
  const dlGender = () =>
    csvDL(
      [
        ["Gender", "Count"],
        ["Female", femaleCount],
        ["Male", maleCount],
      ],
      "gender_distribution.csv",
    );
  const dlEnv = () =>
    csvDL(
      [
        ["Metric", "Value"],
        ["Avg Wood Saved/Month (kg)", avgWoodKg],
        ["Trees Saved/Month", treesPerMonth],
      ],
      "environmental.csv",
    );
  const dlEcon = () =>
    csvDL(
      [
        ["Metric", "Value"],
        ["Avg 3-Month Savings (MWK)", avgSavings],
      ],
      "economic.csv",
    );
  const dlHealth = () =>
    csvDL(
      [
        ["Metric", "Value"],
        ["Reporting Better Air Quality (%)", healthPct],
      ],
      "health.csv",
    );
  const dlCarbon = () =>
    csvDL(
      [["Month", "Carbon Credits"], ...monthlyBars.map((d) => [d.l, d.v])],
      "carbon_credits.csv",
    );

  // ── Responsive layout ──────────────────────────────────────────────────────
  const heroPad = isMobile ? "20px 16px 22px" : "28px 28px 30px";
  const contentPad = isMobile ? "14px 12px 40px" : "20px 20px 48px";
  const col3 =
    width >= 900 ? "repeat(3,1fr)" : width >= 560 ? "repeat(2,1fr)" : "1fr";
  const col2 = width >= 820 ? "1fr 1fr" : "1fr";
  const colBot = width >= 860 ? "1.3fr 1fr" : "1fr";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&family=DM+Mono:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;}
        .cd-root{font-family:'DM Sans',sans-serif;background:#f0faf0;min-height:100vh;}
        @keyframes cdShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes cdRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      `}</style>

      <div className="cd-root">
        {/* ── Hero Banner ───────────────────────────────────────────────── */}
        <div
          style={{
            background:
              "linear-gradient(135deg,#1b5e20 0%,#2e7d32 55%,#43a047 100%)",
            padding: heroPad,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px)",
              backgroundSize: "22px 22px",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "rgba(255,255,255,0.65)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              WELCOME BACK, {userName.toUpperCase()}
            </div>
            <h1
              style={{
                color: "#fff",
                fontSize: isMobile ? 20 : 28,
                fontWeight: 800,
                margin: 0,
                lineHeight: 1.25,
              }}
            >
              Here's what's happening today
            </h1>
          </div>
        </div>

        {/* ── Main Content ──────────────────────────────────────────────── */}
        <div style={{ padding: contentPad }}>
          {/* ── ROW 1: TOP 3 STAT CARDS ─────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: col3,
              gap: isMobile ? 10 : 16,
              marginBottom: 20,
            }}
          >
            {/* Card 1 — Cookstove Deployed (API 1: /beneficiary/list totalRecords) */}
            <StatCard
              icon={IcoStove}
              label="Cookstove Deployed"
              loading={loading}
              mainValue={fmt(deployed)}
              extra={<Progress pct={pct} />}
            />

            {/* Card 2 — Total Credits (calculated: deployed × CREDITS_PER_STOVE) */}
            <StatCard
              icon={IcoCredit}
              label="Total Credits"
              loading={loading}
              mainValue={fmtDec(totalCredits, 2)}
              extra={
                !loading && creditsPct != null ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      marginTop: 8,
                    }}
                  >
                    <TrendingUp size={13} color="#2e7d32" />
                    <span style={{ color: "#2e7d32", fontWeight: 700 }}>
                      {creditsPct >= 0 ? "+" : ""}
                      {creditsPct}%
                    </span>
                    <span style={{ color: "#9ca3af" }}>vs last month</span>
                  </div>
                ) : null
              }
            />

            {/* Card 3 — People Impacted (API 4: training-site total_people) + Households (house_holds_count) */}
            <StatCard
              icon={IcoPeople}
              label="People Impacted"
              loading={loading}
              mainValue={fmt(peopleImpacted)}
              subLabel="Households"
              subValue={fmt(householdsCount)}
            />
          </div>

          {/* ── ROW 2: Gender Distribution + Environmental ───────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: col2,
              gap: 16,
              marginBottom: 16,
            }}
          >
            {/* Gender Distribution (API 2: beneficiary females_above_18, females_below_18, males_above_18, males_below_18) */}
            <Panel delay={80}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <PTitle>Gender Distribution</PTitle>
                <DLBtn onClick={dlGender} />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "12px 0 8px",
                }}
              >
                {loading ? (
                  <Sk w={190} h={190} />
                ) : (
                  <Donut
                    segments={[
                      { value: femaleCount, color: "#2e7d32" },
                      { value: maleCount, color: "#d1d5db" },
                    ]}
                    centerLabel="FEMALE"
                    centerValue={`${femalePct}%`}
                    size={190}
                    sw={26}
                  />
                )}
                <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
                  {[
                    ["#2e7d32", "Female"],
                    ["#d1d5db", "Male"],
                  ].map(([c, l]) => (
                    <div
                      key={l}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: c,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#374151",
                        }}
                      >
                        {l}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            {/* Environmental (API 3: monitoring est_fuel_last3meals_kg) */}
            <Panel delay={120}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <PTitle>Environmental</PTitle>
                <DLBtn onClick={dlEnv} />
              </div>
              <div
                style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
              >
                {/* Metric boxes */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    flex: "0 0 auto",
                    width: "55%",
                  }}
                >
                  <div
                    style={{
                      background: "#f9fafb",
                      borderRadius: 10,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#111827",
                        fontFamily: "'DM Mono',monospace",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {loading ? <Sk w={70} h={20} /> : `${avgWoodKg} KG`}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}
                    >
                      Avg Wood Saved / Month
                    </div>
                  </div>
                  <div
                    style={{
                      background: "#f9fafb",
                      borderRadius: 10,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: "#111827",
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {loading ? <Sk w={50} h={20} /> : fmt(treesPerMonth)}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}
                    >
                      Trees Saved per Month
                    </div>
                  </div>
                </div>
                {/* Sparkline */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingTop: 4,
                  }}
                >
                  {loading ? (
                    <Sk w={120} h={70} />
                  ) : (
                    <Spark
                      data={sparkData}
                      color="#2e7d32"
                      w={Math.max(width >= 820 ? 130 : 100, 80)}
                      h={70}
                    />
                  )}
                  {!loading && creditsPct != null && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                      }}
                    >
                      <TrendingUp size={12} color="#2e7d32" />
                      <span style={{ color: "#2e7d32", fontWeight: 700 }}>
                        {creditsPct >= 0 ? "+" : ""}
                        {creditsPct}%
                      </span>
                      <span style={{ color: "#9ca3af" }}>vs Last Month</span>
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          </div>

          {/* ── ROW 3: Economic + Health ─────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: col2,
              gap: 16,
              marginBottom: 16,
            }}
          >
            {/* Economic (API 3: monitoring.savings_3_months averaged) */}
            <Panel delay={160}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <PTitle>Economic</PTitle>
                <DLBtn onClick={dlEcon} />
              </div>
              <div
                style={{
                  fontSize: "clamp(20px,2.5vw,28px)",
                  fontWeight: 900,
                  color: "#111827",
                  fontFamily: "'DM Mono',monospace",
                  marginBottom: 6,
                }}
              >
                {loading ? <Sk w={120} h={28} /> : `${fmt(avgSavings)} MWK`}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Average 3-Month Savings
              </div>
            </Panel>

            {/* Health (API 3: monitoring.health_better_air === "yes" percentage) */}
            <Panel delay={200}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <PTitle>Health</PTitle>
                <DLBtn onClick={dlHealth} />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  paddingTop: 4,
                }}
              >
                {loading ? (
                  <Sk w={110} h={110} />
                ) : (
                  <HealthGauge pct={healthPct} />
                )}
                <div
                  style={{
                    fontSize: 13,
                    color: "#6b7280",
                    textAlign: "center",
                    fontWeight: 500,
                    lineHeight: 1.45,
                  }}
                >
                  Reporting Better
                  <br />
                  Air Quality
                </div>
              </div>
            </Panel>
          </div>

          {/* ── ROW 4: Carbon Credits Bar + Distribution Map ─────────────── */}
          <div
            style={{ display: "grid", gridTemplateColumns: colBot, gap: 16 }}
          >
            {/* Carbon Credit Generated (API 2: beneficiary created_date grouped by month × CREDITS_PER_STOVE) */}
            <Panel delay={240}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <PTitle>Carbon Credit Generated</PTitle>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      marginTop: -10,
                      marginBottom: 14,
                    }}
                  >
                    Last 5 months
                  </div>
                </div>
                <DLBtn onClick={dlCarbon} />
              </div>
              {loading ? (
                <Sk w="100%" h={160} />
              ) : (
                <CarbonBar data={monthlyBars} />
              )}
            </Panel>

            {/* Distribution Map (static OpenStreetMap embed — Malawi region) */}
            <Panel delay={280}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <PTitle>Distribution Map</PTitle>
                <a
                  href="https://www.openstreetmap.org/#map=7/-13.5/34.3"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    color: "#2e7d32",
                    fontWeight: 700,
                    textDecoration: "none",
                    background: "#e8f5e9",
                    padding: "4px 10px",
                    borderRadius: 6,
                  }}
                >
                  Full Map ↗
                </a>
              </div>
              <div
                style={{
                  borderRadius: 10,
                  overflow: "hidden",
                  height: 200,
                  background: "#e8f5e9",
                  position: "relative",
                }}
              >
                <iframe
                  title="Distribution Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=32.0,-17.5,36.5,-8.5&layer=mapnik&marker=-13.2543,34.3015"
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    zIndex: 10,
                  }}
                >
                  {["+", "−"].map((s, i) => (
                    <div
                      key={i}
                      style={{
                        width: 26,
                        height: 26,
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#374151",
                        cursor: "pointer",
                        borderRadius: i === 0 ? "4px 4px 0 0" : "0 0 4px 4px",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                      }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerDashboard;
