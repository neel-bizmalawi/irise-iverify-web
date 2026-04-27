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

// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { API_BASE_URL } from "../../config";
// import { Download, TrendingUp } from "lucide-react";

// // ─────────────────────────────────────────────────────────────────────────────
// // MANUAL DATA — update these to match your programme targets
// // ─────────────────────────────────────────────────────────────────────────────
// /* MANUAL */ const COOKSTOVE_TARGET  = 50000;   // target cookstoves
// /* MANUAL */ const CREDITS_PER_STOVE = 8.6688;  // carbon credits per stove
// /* MANUAL */ const AVG_SAVINGS_MWK   = 3000;    // fallback if no monitoring data

// // ─────────────────────────────────────────────────────────────────────────────
// // Helpers
// // ─────────────────────────────────────────────────────────────────────────────
// const fmt    = (n)    => n == null ? "—" : Number(n).toLocaleString("en-US");
// const fmtDec = (n, d) => n == null ? "—" : Number(n).toFixed(d ?? 2);

// const csvDL = (rows, name) => {
//   const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
//   const url  = URL.createObjectURL(blob);
//   const a    = Object.assign(document.createElement("a"), { href: url, download: name });
//   document.body.appendChild(a); a.click();
//   document.body.removeChild(a); URL.revokeObjectURL(url);
// };

// const useWindowWidth = () => {
//   const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
//   useEffect(() => {
//     const h = () => setW(window.innerWidth);
//     window.addEventListener("resize", h);
//     return () => window.removeEventListener("resize", h);
//   }, []);
//   return w;
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Skeleton loader
// // ─────────────────────────────────────────────────────────────────────────────
// const Sk = ({ w = 80, h = 28 }) => (
//   <span style={{
//     display:"inline-block", width:w, height:h, borderRadius:6,
//     background:"linear-gradient(90deg,#f0f7f0 25%,#d1fae5 50%,#f0f7f0 75%)",
//     backgroundSize:"200% 100%", animation:"cdShimmer 1.4s infinite",
//   }}/>
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // White card panel
// // ─────────────────────────────────────────────────────────────────────────────
// const Panel = ({ children, style = {}, delay = 0 }) => (
//   <div style={{
//     background:"#fff", borderRadius:16, padding:"20px 22px",
//     boxShadow:"0 2px 10px rgba(0,0,0,0.07)",
//     animation:`cdRise 0.45s ease ${delay}ms both`,
//     minWidth:0, ...style,
//   }}>
//     {children}
//   </div>
// );

// const PTitle = ({ children }) => (
//   <div style={{ fontSize:12, fontWeight:800, color:"#111827", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14 }}>
//     {children}
//   </div>
// );

// const DLBtn = ({ onClick }) => (
//   <button onClick={onClick}
//     style={{ background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:6, display:"flex", alignItems:"center", flexShrink:0 }}
//     onMouseEnter={e => e.currentTarget.style.background="#f0faf0"}
//     onMouseLeave={e => e.currentTarget.style.background="none"}>
//     <Download size={16} color="#2e7d32"/>
//   </button>
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // Donut Chart
// // ─────────────────────────────────────────────────────────────────────────────
// const Donut = ({ segments=[], centerLabel="", centerValue="", size=200, sw=26 }) => {
//   const r = size/2 - sw, cx = size/2, cy = size/2;
//   const circ = 2*Math.PI*r;
//   const tot  = segments.reduce((s,x)=>s+(x.value||0),0)||1;
//   let off = 0;
//   return (
//     <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{flexShrink:0}}>
//       <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw}/>
//       {segments.map((seg,i) => {
//         const dash = ((seg.value||0)/tot)*circ;
//         const el = (
//           <circle key={i} cx={cx} cy={cy} r={r} fill="none"
//             stroke={seg.color} strokeWidth={sw}
//             strokeDasharray={`${dash} ${circ-dash}`}
//             strokeDashoffset={-(off - circ*0.25)}
//             style={{transition:"stroke-dasharray 1.2s cubic-bezier(.22,.68,0,1)"}}/>
//         );
//         off += dash; return el;
//       })}
//       {centerLabel && <text x={cx} y={cy-10} textAnchor="middle" fontSize={10} fill="#6b7280" fontWeight={700} letterSpacing={1.5} fontFamily="'DM Sans',sans-serif">{centerLabel}</text>}
//       {centerValue && <text x={cx} y={cy+18} textAnchor="middle" fontSize={28} fill="#2e7d32" fontWeight={900} fontFamily="'DM Sans',sans-serif">{centerValue}</text>}
//     </svg>
//   );
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Sparkline (Environmental trend)
// // ─────────────────────────────────────────────────────────────────────────────
// const Spark = ({ data=[], color="#2e7d32", w=130, h=70 }) => {
//   if (!data || data.length < 2) return (
//     <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
//       <line x1={0} y1={h/2} x2={w} y2={h/2} stroke="#e5e7eb" strokeWidth={2} strokeDasharray="4 4"/>
//     </svg>
//   );
//   const max = Math.max(...data, 1);
//   const min = 0;
//   const rng = max - min || 1;
//   const pts = data.map((v,i) => `${(i/(data.length-1))*w},${h - ((v-min)/rng)*(h-10) - 5}`);
//   const [lx,ly] = pts[pts.length-1].split(",").map(Number);
//   return (
//     <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
//       <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"/>
//       <circle cx={lx} cy={ly} r={4} fill={color}/>
//     </svg>
//   );
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Carbon Credits Bar Chart (last 5 months)
// // ─────────────────────────────────────────────────────────────────────────────
// const CarbonBar = ({ data=[] }) => {
//   if (!data.length) return (
//     <div style={{height:150,display:"flex",alignItems:"center",justifyContent:"center"}}>
//       <span style={{fontSize:12,color:"#9ca3af"}}>No data yet</span>
//     </div>
//   );
//   const max     = Math.max(...data.map(d=>d.v), 1);
//   const gridMax = Math.ceil(max/20)*20 || 80;
//   const steps   = [gridMax, Math.round(gridMax*0.6), Math.round(gridMax*0.3), 0];
//   return (
//     <div style={{position:"relative",height:160,paddingTop:8}}>
//       <div style={{position:"absolute",left:0,right:0,top:8,bottom:28,display:"flex",flexDirection:"column",justifyContent:"space-between",pointerEvents:"none"}}>
//         {steps.map((g,i)=>(
//           <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
//             <span style={{fontSize:10,color:"#9ca3af",width:22,textAlign:"right",flexShrink:0}}>{g}</span>
//             <div style={{flex:1,borderTop:"1px dashed #e8f5e9"}}/>
//           </div>
//         ))}
//       </div>
//       <div style={{display:"flex",alignItems:"flex-end",gap:14,height:"100%",paddingBottom:28,paddingLeft:30,position:"relative",zIndex:1}}>
//         {data.map((d,i)=>{
//           const pct = Math.max((d.v/gridMax)*100, d.v>0?5:0);
//           return (
//             <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1,gap:5,height:"100%",justifyContent:"flex-end"}}>
//               <div style={{width:"55%",background:"#2e7d32",borderRadius:"4px 4px 0 0",height:`${pct}%`,transition:"height 0.9s cubic-bezier(.22,.68,0,1.2)",minWidth:10}}/>
//               <span style={{fontSize:11,color:"#6b7280",whiteSpace:"nowrap"}}>{d.l}</span>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Health Gauge (orange arc — from monitoring.health_better_air API data)
// // ─────────────────────────────────────────────────────────────────────────────
// const HealthGauge = ({ pct=0 }) => {
//   const r=40, cx=55, cy=55;
//   const circ = 2*Math.PI*r;
//   const dash = (pct/100)*circ;
//   return (
//     <svg width={110} height={110} viewBox="0 0 110 110">
//       <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={14}/>
//       <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth={14}
//         strokeDasharray={`${dash} ${circ-dash}`}
//         strokeDashoffset={circ*0.25}
//         style={{transition:"stroke-dasharray 1.2s ease"}}/>
//       <text x={cx} y={cy+7} textAnchor="middle" fontSize={18} fill="#f59e0b" fontWeight={800} fontFamily="'DM Sans',sans-serif">{pct}%</text>
//     </svg>
//   );
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Progress Bar (Cookstove Deployed)
// // ─────────────────────────────────────────────────────────────────────────────
// const Progress = ({ pct }) => (
//   <div style={{marginTop:12}}>
//     <div style={{height:8,background:"#e5e7eb",borderRadius:99,overflow:"hidden"}}>
//       <div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#2e7d32,#66bb6a)",borderRadius:99,transition:"width 1.4s cubic-bezier(.22,.68,0,1)"}}/>
//     </div>
//     <div style={{fontSize:12,color:"#2e7d32",fontWeight:700,marginTop:6,textAlign:"center"}}>{pct}% Complete</div>
//   </div>
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // Inline Icons (no external icon lib needed)
// // ─────────────────────────────────────────────────────────────────────────────
// const IcoStove  = () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
// const IcoCredit = () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
// const IcoPeople = () => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;

// // ─────────────────────────────────────────────────────────────────────────────
// // Top Stat Card
// // ─────────────────────────────────────────────────────────────────────────────
// const StatCard = ({ icon:Icon, label, mainValue, loading, subLabel, subValue, extra }) => (
//   <Panel style={{border:"1.5px solid #e8f5e9"}}>
//     <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
//       <div style={{width:38,height:38,borderRadius:10,background:"#e8f5e9",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
//         <Icon/>
//       </div>
//       <span style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.1em"}}>{label}</span>
//     </div>
//     <div style={{fontSize:"clamp(22px,2.8vw,34px)",fontWeight:900,color:"#111827",lineHeight:1,fontFamily:"'DM Mono',monospace",marginBottom:4}}>
//       {loading ? <Sk w={100} h={30}/> : mainValue}
//     </div>
//     {extra}
//     {subLabel && (
//       <div style={{marginTop:10}}>
//         <div style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>{subLabel}</div>
//         <div style={{fontSize:"clamp(16px,2vw,22px)",fontWeight:800,color:"#2e7d32",fontFamily:"'DM Mono',monospace"}}>
//           {loading ? <Sk w={70} h={20}/> : subValue}
//         </div>
//       </div>
//     )}
//   </Panel>
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // Main CustomerDashboard
// // ─────────────────────────────────────────────────────────────────────────────
// const CustomerDashboard = () => {
//   const width    = useWindowWidth();
//   const isMobile = width < 640;
//   const isTablet = width >= 640 && width < 1024;
//   const userName = (typeof localStorage !== "undefined" && localStorage.getItem("userName")) || "Customer";

//   // ── State ───────────────────────────────────────────────────────────────────
//   const [loading,       setLoading]       = useState(true);
//   const [benCount,      setBenCount]      = useState(null);   // from /beneficiary/list totalRecords
//   const [allBens,       setAllBens]       = useState([]);     // full beneficiary records
//   const [allMonitoring, setAllMonitoring] = useState([]);     // full monitoring records
//   const [monthlyBars,   setMonthlyBars]   = useState([]);     // carbon credits per month

//   // People Impacted & Households — from beneficiary records directly
//   // (training-site total_people is cumulative programme data, too large to display as "impacted today")
//   const [peopleImpacted, setPeopleImpacted] = useState(null);
//   const [householdsCount, setHouseholdsCount] = useState(null);

//   // ── Fetch all data — NO date filters (backend returns 500 with date filters) ─
//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       try {
//         const [bCnt, bBulk, mBulk] = await Promise.allSettled([
//           // 1) Beneficiary count — totalRecords → Cookstove Deployed
//           axios.post(`${API_BASE_URL}/beneficiary/list`, {filters:[]}, {params:{page:1,limit:1}}),
//           // 2) All beneficiary records — used for:
//           //    • females_above_18 + females_below_18 → Gender Distribution donut
//           //    • males_above_18 + males_below_18     → Gender Distribution donut
//           //    • created_date                         → monthly carbon bar + sparkline
//           //    • beneficiary_id count                 → People Impacted (total registered)
//           //    • house_holds_count (from beneficiaries): not available here, use site data
//           axios.post(`${API_BASE_URL}/beneficiary/list`, {filters:[]}, {params:{page:1,limit:100000}}),
//           // 3) All monitoring records — used for:
//           //    • health_better_air === "yes"    → Health % gauge
//           //    • savings_3_months               → Economic avg savings
//           //    • est_fuel_last3meals_kg         → Environmental avg wood saved
//           axios.post(`${API_BASE_URL}/monitoring/list`, {filters:[]}, {params:{page:1,limit:100000}}),
//         ]);

//         // ── Beneficiary count ──────────────────────────────────────────────────
//         const benTotal = bCnt.status === "fulfilled"
//           ? (bCnt.value.data?.totalRecords ?? 0)
//           : 0;
//         setBenCount(benTotal);

//         // ── All beneficiary records ────────────────────────────────────────────
//         const bens = bBulk.status === "fulfilled"
//           ? (bBulk.value.data?.data ?? [])
//           : [];
//         setAllBens(bens);

//         // People Impacted = total unique beneficiaries registered
//         // (direct count from beneficiary API — no manual fallback)
//         setPeopleImpacted(benTotal);

//         // Households = sum of unique households from beneficiaries
//         // Each beneficiary record represents one household registration
//         // We count unique national_ids as proxy for unique households
//         const uniqueHouseholds = new Set(
//           bens.map(r => r.national_id).filter(id => id && id !== "-" && id !== "")
//         ).size;
//         setHouseholdsCount(uniqueHouseholds || benTotal);

//         // ── All monitoring records ─────────────────────────────────────────────
//         const mons = mBulk.status === "fulfilled"
//           ? (mBulk.value.data?.data ?? [])
//           : [];
//         setAllMonitoring(mons);

//         // ── Build last-5-months carbon credits bar (client-side from created_date) ─
//         const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
//         const now    = new Date();
//         const bars   = Array.from({length:5}, (_,i) => {
//           const d  = new Date(now.getFullYear(), now.getMonth()-(4-i), 1);
//           const nd = new Date(d.getFullYear(), d.getMonth()+1, 1);
//           const cnt = bens.filter(r => {
//             if (!r.created_date) return false;
//             const rd = new Date(r.created_date);
//             return rd >= d && rd < nd;
//           }).length;
//           // Carbon credits = number of cookstoves registered that month × credits per stove
//           return { l: MONTHS[d.getMonth()], v: Math.round(cnt * CREDITS_PER_STOVE) };
//         });
//         setMonthlyBars(bars);

//       } catch(e) {
//         console.error("CustomerDashboard fetch error:", e);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, []);

//   // ── All derived values computed from API data ────────────────────────────────

//   const deployed     = benCount ?? 0;
//   // MANUAL: pct uses COOKSTOVE_TARGET constant above
//   const pct          = Math.min(Math.round((deployed / COOKSTOVE_TARGET) * 100), 100);
//   // Total carbon credits = deployed beneficiaries × credits per stove (MANUAL: CREDITS_PER_STOVE)
//   const totalCredits = deployed * CREDITS_PER_STOVE;

//   // This-month vs last-month for +X% badge (from beneficiary created_date — API data)
//   const now            = new Date();
//   const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
//   const prevMonthStart = new Date(now.getFullYear(), now.getMonth()-1, 1);
//   const thisMonthCnt   = allBens.filter(r => r.created_date && new Date(r.created_date) >= thisMonthStart).length;
//   const prevMonthCnt   = allBens.filter(r => {
//     if (!r.created_date) return false;
//     const d = new Date(r.created_date);
//     return d >= prevMonthStart && d < thisMonthStart;
//   }).length;
//   const creditsPct = prevMonthCnt > 0
//     ? Math.round(((thisMonthCnt - prevMonthCnt) / prevMonthCnt) * 100)
//     : null;

//   // Gender — from beneficiary fields: females_above_18, females_below_18, males_above_18, males_below_18
//   const femaleCount = allBens.reduce((s,r) => s + (Number(r.females_above_18)||0) + (Number(r.females_below_18)||0), 0);
//   const maleCount   = allBens.reduce((s,r) => s + (Number(r.males_above_18)||0)   + (Number(r.males_below_18)||0),   0);
//   const genderTot   = femaleCount + maleCount || 1;
//   const femalePct   = Math.round((femaleCount / genderTot) * 100);

//   // Health — from monitoring.health_better_air field ("yes" / true)
//   const monTot       = allMonitoring.length || 1;
//   const betterAirCnt = allMonitoring.filter(r => r.health_better_air === "yes" || r.health_better_air === true).length;
//   const healthPct    = Math.round((betterAirCnt / monTot) * 100);

//   // Economic — from monitoring.savings_3_months field
//   // Falls back to MANUAL constant AVG_SAVINGS_MWK only if no monitoring data
//   const monWithSav = allMonitoring.filter(r => Number(r.savings_3_months) > 0);
//   const avgSavings = monWithSav.length > 0
//     ? Math.round(monWithSav.reduce((s,r) => s+Number(r.savings_3_months), 0) / monWithSav.length)
//     : AVG_SAVINGS_MWK; /* MANUAL fallback */

//   // Environmental — from monitoring.est_fuel_last3meals_kg field
//   // Falls back to MANUAL constant AVG_WOOD_KG only if no monitoring data
//   /* MANUAL fallback */ const AVG_WOOD_KG_FALLBACK = 4.53;
//   const monWithFuel = allMonitoring.filter(r => Number(r.est_fuel_last3meals_kg) > 0);
//   const avgWoodKg   = monWithFuel.length > 0
//     ? (monWithFuel.reduce((s,r) => s+Number(r.est_fuel_last3meals_kg), 0) / monWithFuel.length).toFixed(2)
//     : AVG_WOOD_KG_FALLBACK; /* MANUAL fallback */

//   // Trees saved — from monitoring stoves_present / deployed count
//   // Formula: deployed stoves × avg tree-saves per stove per year / 12 months
//   /* MANUAL fallback */ const TREES_FALLBACK = 38;
//   const treesPerMonth = deployed > 0
//     ? Math.max(Math.round(deployed * 0.00076 * 12), TREES_FALLBACK)
//     : TREES_FALLBACK; /* MANUAL fallback */

//   // Sparkline — monthly beneficiary registration counts (last 6 months)
//   const sparkData = Array.from({length:6}, (_,i) => {
//     const d  = new Date(now.getFullYear(), now.getMonth()-(5-i), 1);
//     const nd = new Date(d.getFullYear(), d.getMonth()+1, 1);
//     return allBens.filter(r => {
//       if (!r.created_date) return false;
//       const rd = new Date(r.created_date);
//       return rd >= d && rd < nd;
//     }).length;
//   });

//   // ── CSV download handlers ────────────────────────────────────────────────────
//   const dlGender = () => csvDL([["Gender","Count"],["Female",femaleCount],["Male",maleCount]], "gender_distribution.csv");
//   const dlEnv    = () => csvDL([["Metric","Value"],["Avg Wood Saved/Month (kg)",avgWoodKg],["Trees Saved/Month",treesPerMonth]], "environmental.csv");
//   const dlEcon   = () => csvDL([["Metric","Value"],["Avg 3-Month Savings (MWK)",avgSavings]], "economic.csv");
//   const dlHealth = () => csvDL([["Metric","Value"],["Reporting Better Air Quality (%)",healthPct]], "health.csv");
//   const dlCarbon = () => csvDL([["Month","Carbon Credits"],...monthlyBars.map(d=>[d.l,d.v])], "carbon_credits.csv");

//   // ── Responsive layout ────────────────────────────────────────────────────────
//   const heroPad    = isMobile ? "20px 16px 22px" : "28px 28px 30px";
//   const contentPad = isMobile ? "14px 12px 40px" : "20px 20px 48px";

//   // Top 3 cards: always 3-col on desktop, 2-col tablet, 1-col mobile
//   const col3 = width >= 900 ? "repeat(3,1fr)" : width >= 560 ? "repeat(2,1fr)" : "1fr";
//   // Main 2-col layout
//   const col2 = width >= 820 ? "1fr 1fr" : "1fr";
//   // Bottom row: bar chart wider
//   const colBot = width >= 860 ? "1.3fr 1fr" : "1fr";

//   // ─────────────────────────────────────────────────────────────────────────
//   return (
//     <>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&family=DM+Mono:wght@400;500;600&display=swap');
//         *,*::before,*::after{box-sizing:border-box;margin:0;}
//         .cd-root{font-family:'DM Sans',sans-serif;background:#f0faf0;min-height:100vh;}
//         @keyframes cdShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
//         @keyframes cdRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
//       `}</style>

//       <div className="cd-root">

//         {/* ── Hero ─────────────────────────────────────────────────────── */}
//         <div style={{
//           background:"linear-gradient(135deg,#1b5e20 0%,#2e7d32 55%,#43a047 100%)",
//           padding:heroPad, position:"relative", overflow:"hidden",
//         }}>
//           <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px)",backgroundSize:"22px 22px",pointerEvents:"none"}}/>
//           <div style={{position:"relative",zIndex:1}}>
//             <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.65)",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:10}}>
//               WELCOME BACK, {userName.toUpperCase()}
//             </div>
//             <h1 style={{color:"#fff",fontSize:isMobile?20:28,fontWeight:800,margin:0,lineHeight:1.25}}>
//               Here's what's happening today
//             </h1>
//           </div>
//         </div>

//         {/* ── Content ──────────────────────────────────────────────────── */}
//         <div style={{padding:contentPad}}>

//           {/* ── TOP 3 STAT CARDS ── */}
//           <div style={{display:"grid",gridTemplateColumns:col3,gap:isMobile?10:16,marginBottom:20}}>

//             {/* Cookstove Deployed — API: /beneficiary/list totalRecords */}
//             <StatCard
//               icon={IcoStove}
//               label="Cookstove Deployed"
//               loading={loading}
//               mainValue={fmt(deployed)}
//               extra={<Progress pct={pct}/>}
//             />

//             {/* Total Credits — calculated: deployed × CREDITS_PER_STOVE */}
//             <StatCard
//               icon={IcoCredit}
//               label="Total Credits"
//               loading={loading}
//               mainValue={fmtDec(totalCredits, 2)}
//               extra={
//                 !loading && creditsPct != null ? (
//                   <div style={{display:"flex",alignItems:"center",gap:4,fontSize:12,marginTop:8}}>
//                     <TrendingUp size={13} color="#2e7d32"/>
//                     <span style={{color:"#2e7d32",fontWeight:700}}>{creditsPct>=0?"+":""}{creditsPct}%</span>
//                     <span style={{color:"#9ca3af"}}>vs last month</span>
//                   </div>
//                 ) : null
//               }
//             />

//             {/* People Impacted — API: beneficiary totalRecords / Households: unique national_ids */}
//             <StatCard
//               icon={IcoPeople}
//               label="People Impacted"
//               loading={loading}
//               mainValue={fmt(peopleImpacted)}
//               subLabel="Households"
//               subValue={fmt(householdsCount)}
//             />
//           </div>

//           {/* ── ROW 2: Gender Distribution + Environmental ── */}
//           <div style={{display:"grid",gridTemplateColumns:col2,gap:16,marginBottom:16}}>

//             {/* Gender Distribution — API: beneficiary females_above_18 + males_above_18 */}
//             <Panel delay={80}>
//               <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:0}}>
//                 <PTitle>Gender Distribution</PTitle>
//                 <DLBtn onClick={dlGender}/>
//               </div>
//               <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"12px 0 8px"}}>
//                 {loading ? <Sk w={190} h={190}/> : (
//                   <Donut
//                     segments={[{value:femaleCount,color:"#2e7d32"},{value:maleCount,color:"#d1d5db"}]}
//                     centerLabel="FEMALE"
//                     centerValue={`${femalePct}%`}
//                     size={190} sw={26}
//                   />
//                 )}
//                 <div style={{display:"flex",gap:24,marginTop:20}}>
//                   {[["#2e7d32","Female"],["#d1d5db","Male"]].map(([c,l])=>(
//                     <div key={l} style={{display:"flex",alignItems:"center",gap:8}}>
//                       <div style={{width:14,height:14,borderRadius:"50%",background:c}}/>
//                       <span style={{fontSize:13,fontWeight:600,color:"#374151"}}>{l}</span>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </Panel>

//             {/* Environmental — API: monitoring est_fuel_last3meals_kg + stoves count */}
//             <Panel delay={120}>
//               <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:0}}>
//                 <PTitle>Environmental</PTitle>
//                 <DLBtn onClick={dlEnv}/>
//               </div>

//               {/* Two-column: metric boxes left, sparkline right */}
//               <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>

//                 {/* Metric boxes */}
//                 <div style={{display:"flex",flexDirection:"column",gap:12,flex:"0 0 auto",minWidth:0,width:"55%"}}>
//                   <div style={{background:"#f9fafb",borderRadius:10,padding:"14px 16px"}}>
//                     <div style={{fontSize:18,fontWeight:800,color:"#111827",fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap"}}>
//                       {loading ? <Sk w={70} h={20}/> : `${avgWoodKg} KG`}
//                     </div>
//                     <div style={{fontSize:12,color:"#6b7280",marginTop:3}}>Avg Wood Saved / Month</div>
//                   </div>
//                   <div style={{background:"#f9fafb",borderRadius:10,padding:"14px 16px"}}>
//                     <div style={{fontSize:18,fontWeight:800,color:"#111827",fontFamily:"'DM Mono',monospace"}}>
//                       {loading ? <Sk w={50} h={20}/> : fmt(treesPerMonth)}
//                     </div>
//                     <div style={{fontSize:12,color:"#6b7280",marginTop:3}}>Trees Saved per Month</div>
//                   </div>
//                 </div>

//                 {/* Sparkline — right column, vertically centered */}
//                 <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,paddingTop:4}}>
//                   {loading
//                     ? <Sk w={120} h={70}/>
//                     : <Spark data={sparkData} color="#2e7d32" w={Math.max(width >= 820 ? 130 : 100, 80)} h={70}/>
//                   }
//                   {!loading && creditsPct != null && (
//                     <div style={{display:"flex",alignItems:"center",gap:4,fontSize:12}}>
//                       <TrendingUp size={12} color="#2e7d32"/>
//                       <span style={{color:"#2e7d32",fontWeight:700}}>{creditsPct>=0?"+":""}{creditsPct}%</span>
//                       <span style={{color:"#9ca3af"}}>vs Last Month</span>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </Panel>
//           </div>

//           {/* ── ROW 3: Economic + Health (side by side within right column) ── */}
//           <div style={{display:"grid",gridTemplateColumns:col2,gap:16,marginBottom:16}}>

//             {/* Economic — API: monitoring.savings_3_months averaged */}
//             <Panel delay={160}>
//               <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:0}}>
//                 <PTitle>Economic</PTitle>
//                 <DLBtn onClick={dlEcon}/>
//               </div>
//               <div style={{fontSize:"clamp(20px,2.5vw,28px)",fontWeight:900,color:"#111827",fontFamily:"'DM Mono',monospace",marginBottom:6}}>
//                 {loading ? <Sk w={120} h={28}/> : `${fmt(avgSavings)} MWK`}
//               </div>
//               <div style={{fontSize:13,color:"#6b7280"}}>Average 3-Month Savings</div>
//             </Panel>

//             {/* Health — API: monitoring.health_better_air === "yes" percentage */}
//             <Panel delay={200}>
//               <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:0}}>
//                 <PTitle>Health</PTitle>
//                 <DLBtn onClick={dlHealth}/>
//               </div>
//               <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,paddingTop:4}}>
//                 {loading ? <Sk w={110} h={110}/> : <HealthGauge pct={healthPct}/>}
//                 <div style={{fontSize:13,color:"#6b7280",textAlign:"center",fontWeight:500,lineHeight:1.45}}>
//                   Reporting Better<br/>Air Quality
//                 </div>
//               </div>
//             </Panel>
//           </div>

//           {/* ── ROW 4: Carbon Credits Bar + Distribution Map ── */}
//           <div style={{display:"grid",gridTemplateColumns:colBot,gap:16}}>

//             {/* Carbon Credit Generated — API: beneficiary created_date grouped by month × CREDITS_PER_STOVE */}
//             <Panel delay={240}>
//               <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:0}}>
//                 <div>
//                   <PTitle>Carbon Credit Generated</PTitle>
//                   <div style={{fontSize:11,color:"#9ca3af",marginTop:-10,marginBottom:14}}>Last 5 months</div>
//                 </div>
//                 <DLBtn onClick={dlCarbon}/>
//               </div>
//               {loading ? <Sk w="100%" h={160}/> : <CarbonBar data={monthlyBars}/>}
//             </Panel>

//             {/* Distribution Map — static OpenStreetMap embed (Malawi region) */}
//             <Panel delay={280}>
//               <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
//                 <PTitle>Distribution Map</PTitle>
//                 <a href="https://www.openstreetmap.org/#map=7/-13.5/34.3" target="_blank" rel="noreferrer"
//                   style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#2e7d32",fontWeight:700,textDecoration:"none",background:"#e8f5e9",padding:"4px 10px",borderRadius:6}}>
//                   Full Map ↗
//                 </a>
//               </div>
//               <div style={{borderRadius:10,overflow:"hidden",height:200,background:"#e8f5e9",position:"relative"}}>
//                 <iframe
//                   title="Distribution Map"
//                   width="100%" height="100%"
//                   style={{border:0}}
//                   loading="lazy"
//                   src="https://www.openstreetmap.org/export/embed.html?bbox=32.0,-17.5,36.5,-8.5&layer=mapnik&marker=-13.2543,34.3015"
//                 />
//                 <div style={{position:"absolute",bottom:10,right:10,display:"flex",flexDirection:"column",gap:1,zIndex:10}}>
//                   {["+","−"].map((s,i)=>(
//                     <div key={i} style={{width:26,height:26,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#374151",cursor:"pointer",borderRadius:i===0?"4px 4px 0 0":"0 0 4px 4px",boxShadow:"0 1px 4px rgba(0,0,0,0.15)"}}>
//                       {s}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </Panel>
//           </div>

//         </div>
//       </div>
//     </>
//   );
// };

// export default CustomerDashboard;

// // import React, { useEffect, useState, useCallback } from "react";
// // import axios from "axios";
// // import { API_BASE_URL } from "../../config";
// // import { Download, TrendingUp } from "lucide-react";

// // // ─────────────────────────────────────────────────────────────────────────────
// // // Constants
// // // ─────────────────────────────────────────────────────────────────────────────
// // const COOKSTOVE_TARGET   = 50000;
// // const CREDITS_PER_STOVE  = 8.6688;
// // const AVG_WOOD_KG        = 4.53;
// // const TREES_PER_MONTH    = 38;
// // const AVG_SAVINGS_MWK    = 3000;

// // // ─────────────────────────────────────────────────────────────────────────────
// // // Helpers
// // // ─────────────────────────────────────────────────────────────────────────────
// // const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US"));
// // const fmtDec = (n, d = 2) => (n == null ? "—" : Number(n).toFixed(d));

// // const csvDL = (rows, name) => {
// //   const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
// //   const url  = URL.createObjectURL(blob);
// //   const a    = Object.assign(document.createElement("a"), { href: url, download: name });
// //   document.body.appendChild(a); a.click();
// //   document.body.removeChild(a); URL.revokeObjectURL(url);
// // };

// // const useWindowWidth = () => {
// //   const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
// //   useEffect(() => {
// //     const h = () => setW(window.innerWidth);
// //     window.addEventListener("resize", h);
// //     return () => window.removeEventListener("resize", h);
// //   }, []);
// //   return w;
// // };

// // // ─────────────────────────────────────────────────────────────────────────────
// // // Skeleton
// // // ─────────────────────────────────────────────────────────────────────────────
// // const Sk = ({ w = 80, h = 28 }) => (
// //   <span style={{
// //     display: "inline-block", width: w, height: h, borderRadius: 6,
// //     background: "linear-gradient(90deg,#f0f7f0 25%,#d1fae5 50%,#f0f7f0 75%)",
// //     backgroundSize: "200% 100%", animation: "cdShimmer 1.4s infinite",
// //   }} />
// // );

// // // ─────────────────────────────────────────────────────────────────────────────
// // // Panel
// // // ─────────────────────────────────────────────────────────────────────────────
// // const Panel = ({ children, style = {}, delay = 0 }) => (
// //   <div style={{
// //     background: "#fff", borderRadius: 16, padding: "20px 22px",
// //     boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
// //     animation: `cdRise 0.45s ease ${delay}ms both`,
// //     minWidth: 0, overflow: "visible", ...style,
// //   }}>
// //     {children}
// //   </div>
// // );

// // const PTitle = ({ children }) => (
// //   <div style={{ fontSize: 12, fontWeight: 800, color: "#111827", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
// //     {children}
// //   </div>
// // );

// // const DLBtn = ({ onClick }) => (
// //   <button onClick={onClick}
// //     style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", flexShrink: 0 }}
// //     onMouseEnter={(e) => (e.currentTarget.style.background = "#f0faf0")}
// //     onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>
// //     <Download size={16} color="#2e7d32" />
// //   </button>
// // );

// // // ─────────────────────────────────────────────────────────────────────────────
// // // Donut Chart
// // // ─────────────────────────────────────────────────────────────────────────────
// // const Donut = ({ segments = [], centerLabel = "", centerValue = "", size = 200, sw = 26 }) => {
// //   const r = size / 2 - sw;
// //   const cx = size / 2, cy = size / 2;
// //   const circ = 2 * Math.PI * r;
// //   const tot  = segments.reduce((s, x) => s + (x.value || 0), 0) || 1;
// //   let off = 0;
// //   return (
// //     <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ flexShrink: 0 }}>
// //       <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={sw} />
// //       {segments.map((seg, i) => {
// //         const dash = ((seg.value || 0) / tot) * circ;
// //         const el = (
// //           <circle key={i} cx={cx} cy={cy} r={r} fill="none"
// //             stroke={seg.color} strokeWidth={sw}
// //             strokeDasharray={`${dash} ${circ - dash}`}
// //             strokeDashoffset={-(off - circ * 0.25)}
// //             style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.22,.68,0,1)" }} />
// //         );
// //         off += dash;
// //         return el;
// //       })}
// //       {centerLabel && (
// //         <text x={cx} y={cy - 10} textAnchor="middle" fontSize={10} fill="#6b7280"
// //           fontWeight={700} letterSpacing={1.5} fontFamily="'DM Sans',sans-serif">
// //           {centerLabel}
// //         </text>
// //       )}
// //       {centerValue && (
// //         <text x={cx} y={cy + 18} textAnchor="middle" fontSize={28} fill="#2e7d32"
// //           fontWeight={900} fontFamily="'DM Sans',sans-serif">
// //           {centerValue}
// //         </text>
// //       )}
// //     </svg>
// //   );
// // };

// // // ─────────────────────────────────────────────────────────────────────────────
// // // Sparkline
// // // ─────────────────────────────────────────────────────────────────────────────
// // const Spark = ({ data = [], color = "#2e7d32", w = 130, h = 60 }) => {
// //   if (data.length < 2) return (
// //     <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
// //       <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="#e5e7eb" strokeWidth={2} strokeDasharray="4 4" />
// //     </svg>
// //   );
// //   const max = Math.max(...data, 1);
// //   const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 8) - 4}`);
// //   const [lx, ly] = pts[pts.length - 1].split(",").map(Number);
// //   return (
// //     <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
// //       <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2.5}
// //         strokeLinejoin="round" strokeLinecap="round" />
// //       <circle cx={lx} cy={ly} r={4} fill={color} />
// //     </svg>
// //   );
// // };

// // // ─────────────────────────────────────────────────────────────────────────────
// // // Carbon Bar Chart (last 5 months)
// // // ─────────────────────────────────────────────────────────────────────────────
// // const CarbonBar = ({ data = [] }) => {
// //   if (!data.length) return (
// //     <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
// //       <span style={{ fontSize: 12, color: "#9ca3af" }}>No data yet</span>
// //     </div>
// //   );
// //   const max     = Math.max(...data.map((d) => d.v), 1);
// //   const gridMax = Math.ceil(max / 20) * 20 || 80;
// //   const steps   = [gridMax, Math.round(gridMax * 0.6), Math.round(gridMax * 0.3), 0];
// //   return (
// //     <div style={{ position: "relative", height: 160, paddingTop: 8 }}>
// //       <div style={{ position: "absolute", left: 0, right: 0, top: 8, bottom: 28, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
// //         {steps.map((g, i) => (
// //           <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
// //             <span style={{ fontSize: 10, color: "#9ca3af", width: 22, textAlign: "right", flexShrink: 0 }}>{g}</span>
// //             <div style={{ flex: 1, borderTop: "1px dashed #e8f5e9" }} />
// //           </div>
// //         ))}
// //       </div>
// //       <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: "100%", paddingBottom: 28, paddingLeft: 30, position: "relative", zIndex: 1 }}>
// //         {data.map((d, i) => {
// //           const pct = Math.max((d.v / gridMax) * 100, d.v > 0 ? 5 : 0);
// //           return (
// //             <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 5, height: "100%", justifyContent: "flex-end" }}>
// //               <div style={{ width: "55%", background: "#2e7d32", borderRadius: "4px 4px 0 0", height: `${pct}%`, transition: "height 0.9s cubic-bezier(.22,.68,0,1.2)", minWidth: 10 }} />
// //               <span style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>{d.l}</span>
// //             </div>
// //           );
// //         })}
// //       </div>
// //     </div>
// //   );
// // };

// // // ─────────────────────────────────────────────────────────────────────────────
// // // Health Gauge (orange arc)
// // // ─────────────────────────────────────────────────────────────────────────────
// // const HealthGauge = ({ pct = 0 }) => {
// //   const r = 40, cx = 55, cy = 55;
// //   const circ = 2 * Math.PI * r;
// //   const dash = (pct / 100) * circ;
// //   return (
// //     <svg width={110} height={110} viewBox="0 0 110 110">
// //       <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={14} />
// //       <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f59e0b" strokeWidth={14}
// //         strokeDasharray={`${dash} ${circ - dash}`}
// //         strokeDashoffset={circ * 0.25}
// //         style={{ transition: "stroke-dasharray 1.2s ease" }} />
// //       <text x={cx} y={cy + 7} textAnchor="middle" fontSize={18} fill="#f59e0b"
// //         fontWeight={800} fontFamily="'DM Sans',sans-serif">{pct}%</text>
// //     </svg>
// //   );
// // };

// // // ─────────────────────────────────────────────────────────────────────────────
// // // Progress Bar
// // // ─────────────────────────────────────────────────────────────────────────────
// // const Progress = ({ pct }) => (
// //   <div style={{ marginTop: 12 }}>
// //     <div style={{ height: 8, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
// //       <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#2e7d32,#66bb6a)", borderRadius: 99, transition: "width 1.4s cubic-bezier(.22,.68,0,1)" }} />
// //     </div>
// //     <div style={{ fontSize: 12, color: "#2e7d32", fontWeight: 700, marginTop: 6, textAlign: "center" }}>{pct}% Complete</div>
// //   </div>
// // );

// // // ─────────────────────────────────────────────────────────────────────────────
// // // Inline SVG Icons
// // // ─────────────────────────────────────────────────────────────────────────────
// // const IcoStove = () => (
// //   <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// //     <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
// //   </svg>
// // );
// // const IcoCredit = () => (
// //   <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// //     <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
// //   </svg>
// // );
// // const IcoPeople = () => (
// //   <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// //     <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
// //     <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
// //   </svg>
// // );

// // // ─────────────────────────────────────────────────────────────────────────────
// // // Stat Card (top 3)
// // // ─────────────────────────────────────────────────────────────────────────────
// // const StatCard = ({ icon: Icon, label, mainValue, mainLoading, subLabel, subValue, subLoading, extra }) => (
// //   <Panel style={{ border: "1.5px solid #e8f5e9" }}>
// //     <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
// //       <div style={{ width: 38, height: 38, borderRadius: 10, background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //         <Icon />
// //       </div>
// //       <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
// //     </div>
// //     <div style={{ fontSize: "clamp(22px,2.8vw,34px)", fontWeight: 900, color: "#111827", lineHeight: 1, fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>
// //       {mainLoading ? <Sk w={100} h={30} /> : mainValue}
// //     </div>
// //     {extra}
// //     {subLabel && (
// //       <div style={{ marginTop: 10 }}>
// //         <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{subLabel}</div>
// //         <div style={{ fontSize: "clamp(16px,2vw,22px)", fontWeight: 800, color: "#2e7d32", fontFamily: "'DM Mono',monospace" }}>
// //           {subLoading ? <Sk w={70} h={20} /> : subValue}
// //         </div>
// //       </div>
// //     )}
// //   </Panel>
// // );

// // // ─────────────────────────────────────────────────────────────────────────────
// // // Main Dashboard
// // // ─────────────────────────────────────────────────────────────────────────────
// // const CustomerDashboard = () => {
// //   const width    = useWindowWidth();
// //   const isMobile = width < 640;
// //   const userName = (typeof localStorage !== "undefined" && localStorage.getItem("userName")) || "Customer";

// //   // ── State ───────────────────────────────────────────────────────────────────
// //   const [loading,       setLoading]       = useState(true);
// //   const [benCount,      setBenCount]      = useState(null);
// //   const [allBens,       setAllBens]       = useState([]);
// //   const [allSites,      setAllSites]      = useState([]);
// //   const [allMonitoring, setAllMonitoring] = useState([]);
// //   const [monthlyBars,   setMonthlyBars]   = useState([]);

// //   // ── Single fetch — NO date filters (backend returns 500 with date filters) ──
// //   useEffect(() => {
// //     (async () => {
// //       setLoading(true);
// //       try {
// //         const [bCnt, bBulk, sBulk, mBulk] = await Promise.allSettled([
// //           // Count only (cheap)
// //           axios.post(`${API_BASE_URL}/beneficiary/list`,   { filters: [] }, { params: { page: 1, limit: 1 } }),
// //           // Full beneficiary records — fields used:
// //           //   females_above_18, females_below_18, males_above_18, males_below_18
// //           //   cooking_method, device_serial_no, created_date, training_site
// //           axios.post(`${API_BASE_URL}/beneficiary/list`,   { filters: [] }, { params: { page: 1, limit: 100000 } }),
// //           // Full training-site records — fields used:
// //           //   total_people, house_holds_count, district, traditional_authority
// //           axios.post(`${API_BASE_URL}/training-site/list`, { filters: [] }, { params: { page: 1, limit: 100000 } }),
// //           // Full monitoring records — fields used:
// //           //   health_better_air, health_hospital_less
// //           //   savings_3_months, daily_fuel_cost
// //           //   est_fuel_last3meals_kg, stoves_present, stove_being_used
// //           axios.post(`${API_BASE_URL}/monitoring/list`,    { filters: [] }, { params: { page: 1, limit: 100000 } }),
// //         ]);

// //         // ── beneficiary count ──
// //         if (bCnt.status === "fulfilled")
// //           setBenCount(bCnt.value.data?.totalRecords ?? 0);

// //         // ── all beneficiaries ──
// //         const bens = bBulk.status === "fulfilled" ? (bBulk.value.data?.data ?? []) : [];
// //         setAllBens(bens);

// //         // ── all training sites ──
// //         const sites = sBulk.status === "fulfilled" ? (sBulk.value.data?.data ?? []) : [];
// //         setAllSites(sites);

// //         // ── all monitoring records ──
// //         const mons = mBulk.status === "fulfilled" ? (mBulk.value.data?.data ?? []) : [];
// //         setAllMonitoring(mons);

// //         // ── build last-5-months carbon credits bar chart (client-side) ──
// //         const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
// //         const now    = new Date();
// //         const bars   = Array.from({ length: 5 }, (_, i) => {
// //           const d  = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
// //           const nd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
// //           const cnt = bens.filter((r) => {
// //             if (!r.created_date) return false;
// //             const rd = new Date(r.created_date);
// //             return rd >= d && rd < nd;
// //           }).length;
// //           return { l: MONTHS[d.getMonth()], v: Math.round(cnt * CREDITS_PER_STOVE) };
// //         });
// //         setMonthlyBars(bars);

// //       } catch (e) {
// //         console.error("CustomerDashboard error:", e);
// //       } finally {
// //         setLoading(false);
// //       }
// //     })();
// //   }, []);

// //   // ── Derived values (all computed client-side from bulk data) ────────────────

// //   const deployed = benCount ?? 0;
// //   const pct      = Math.min(Math.round((deployed / COOKSTOVE_TARGET) * 100), 100);

// //   // Carbon credits
// //   const totalCredits = deployed * CREDITS_PER_STOVE;

// //   // This-month vs last-month for % badge
// //   const now            = new Date();
// //   const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
// //   const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
// //   const thisMonthCnt   = allBens.filter((r) => r.created_date && new Date(r.created_date) >= thisMonthStart).length;
// //   const prevMonthCnt   = allBens.filter((r) => {
// //     if (!r.created_date) return false;
// //     const d = new Date(r.created_date);
// //     return d >= prevMonthStart && d < thisMonthStart;
// //   }).length;
// //   const creditsPct = prevMonthCnt > 0
// //     ? Math.round(((thisMonthCnt - prevMonthCnt) / prevMonthCnt) * 100)
// //     : null;

// //   // Gender distribution
// //   // Beneficiary fields: females_above_18, females_below_18, males_above_18, males_below_18
// //   const femaleCount = allBens.reduce((s, r) =>
// //     s + (Number(r.females_above_18) || 0) + (Number(r.females_below_18) || 0), 0);
// //   const maleCount   = allBens.reduce((s, r) =>
// //     s + (Number(r.males_above_18) || 0)   + (Number(r.males_below_18) || 0), 0);
// //   const genderTot   = femaleCount + maleCount || 1;
// //   const femalePct   = Math.round((femaleCount / genderTot) * 100);

// //   // People impacted & households — from training-site fields: total_people, house_holds_count
// //   const peopleImpacted = allSites.reduce((s, r) => s + (Number(r.total_people)      || 0), 0);
// //   const households     = allSites.reduce((s, r) => s + (Number(r.house_holds_count) || 0), 0);

// //   // Health — monitoring field: health_better_air ("yes" / true)
// //   const monTot       = allMonitoring.length || 1;
// //   const betterAirCnt = allMonitoring.filter((r) =>
// //     r.health_better_air === "yes" || r.health_better_air === true
// //   ).length;
// //   const healthPct = Math.round((betterAirCnt / monTot) * 100);

// //   // Economic — monitoring field: savings_3_months
// //   const monWithSav = allMonitoring.filter((r) => Number(r.savings_3_months) > 0);
// //   const avgSavings = monWithSav.length > 0
// //     ? Math.round(monWithSav.reduce((s, r) => s + Number(r.savings_3_months), 0) / monWithSav.length)
// //     : AVG_SAVINGS_MWK;

// //   // Environmental — monitoring field: est_fuel_last3meals_kg (fuel consumed = proxy for wood saved)
// //   const monWithFuel = allMonitoring.filter((r) => Number(r.est_fuel_last3meals_kg) > 0);
// //   const avgWoodKg   = monWithFuel.length > 0
// //     ? (monWithFuel.reduce((s, r) => s + Number(r.est_fuel_last3meals_kg), 0) / monWithFuel.length).toFixed(2)
// //     : AVG_WOOD_KG;
// //   const treesSaved = Math.max(Math.round(deployed * 0.00076 * 12), TREES_PER_MONTH);

// //   // Sparkline — monthly beneficiary registrations (last 6 months)
// //   const sparkData = Array.from({ length: 6 }, (_, i) => {
// //     const d  = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
// //     const nd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
// //     return allBens.filter((r) => {
// //       if (!r.created_date) return false;
// //       const rd = new Date(r.created_date);
// //       return rd >= d && rd < nd;
// //     }).length;
// //   });

// //   // ── Download CSV handlers ───────────────────────────────────────────────────
// //   const dlGender = () => csvDL([["Gender","Count"],["Female",femaleCount],["Male",maleCount]], "gender_distribution.csv");
// //   const dlEnv    = () => csvDL([["Metric","Value"],["Avg Wood Saved/Month (kg)",avgWoodKg],["Trees Saved/Month",treesSaved]], "environmental.csv");
// //   const dlEcon   = () => csvDL([["Metric","Value"],["Avg 3-Month Savings (MWK)",avgSavings]], "economic.csv");
// //   const dlHealth = () => csvDL([["Metric","Value"],["Reporting Better Air Quality (%)",healthPct]], "health.csv");
// //   const dlCarbon = () => csvDL([["Month","Carbon Credits"],...monthlyBars.map((d) => [d.l,d.v])], "carbon_credits.csv");

// //   // ── Layout ──────────────────────────────────────────────────────────────────
// //   const heroPad    = isMobile ? "20px 16px 22px" : "28px 28px 30px";
// //   const contentPad = isMobile ? "14px 12px 40px" : "20px 20px 48px";
// //   const col2       = width >= 800  ? "1fr 1fr"         : "1fr";
// //   const col3       = width >= 900  ? "repeat(3,1fr)"
// //                    : width >= 560  ? "repeat(2,1fr)"   : "1fr";
// //   const colBot     = width >= 860  ? "1.3fr 1fr"       : "1fr";

// //   // ─────────────────────────────────────────────────────────────────────────
// //   return (
// //     <>
// //       <style>{`
// //         @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&family=DM+Mono:wght@400;500;600&display=swap');
// //         *,*::before,*::after{box-sizing:border-box;margin:0;}
// //         .cd-root{font-family:'DM Sans',sans-serif;background:#f0faf0;min-height:100vh;}
// //         @keyframes cdShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
// //         @keyframes cdRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
// //       `}</style>

// //       <div className="cd-root">

// //         {/* ── Hero ─────────────────────────────────────────────────────── */}
// //         <div style={{
// //           background: "linear-gradient(135deg,#1b5e20 0%,#2e7d32 55%,#43a047 100%)",
// //           padding: heroPad, position: "relative", overflow: "hidden",
// //         }}>
// //           <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px)", backgroundSize:"22px 22px", pointerEvents:"none" }} />
// //           <div style={{ position:"relative", zIndex:1 }}>
// //             <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.65)", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:10 }}>
// //               WELCOME BACK, {userName.toUpperCase()}
// //             </div>
// //             <h1 style={{ color:"#fff", fontSize: isMobile ? 20 : 28, fontWeight:800, margin:0, lineHeight:1.25 }}>
// //               Here's what's happening today
// //             </h1>
// //           </div>
// //         </div>

// //         {/* ── Content ──────────────────────────────────────────────────── */}
// //         <div style={{ padding: contentPad }}>

// //           {/* ── TOP 3 STAT CARDS ── */}
// //           <div style={{ display:"grid", gridTemplateColumns:col3, gap:16, marginBottom:20 }}>

// //             {/* 1. Cookstove Deployed */}
// //             <StatCard
// //               icon={IcoStove}
// //               label="Cookstove Deployed"
// //               mainLoading={loading}
// //               mainValue={fmt(deployed)}
// //               extra={<Progress pct={pct} />}
// //             />

// //             {/* 2. Total Credits */}
// //             <StatCard
// //               icon={IcoCredit}
// //               label="Total Credits"
// //               mainLoading={loading}
// //               mainValue={fmtDec(totalCredits, 2)}
// //               extra={
// //                 !loading && creditsPct != null ? (
// //                   <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, marginTop:8 }}>
// //                     <TrendingUp size={13} color="#2e7d32" />
// //                     <span style={{ color:"#2e7d32", fontWeight:700 }}>{creditsPct >= 0 ? "+" : ""}{creditsPct}%</span>
// //                     <span style={{ color:"#9ca3af" }}>vs last month</span>
// //                   </div>
// //                 ) : null
// //               }
// //             />

// //             {/* 3. People Impacted */}
// //             <StatCard
// //               icon={IcoPeople}
// //               label="People Impacted"
// //               mainLoading={loading}
// //               mainValue={fmt(peopleImpacted || deployed * 6)}
// //               subLabel="Households"
// //               subLoading={loading}
// //               subValue={fmt(households || Math.round(deployed * 0.5))}
// //             />
// //           </div>

// //           {/* ── ROW 2: Gender Distribution + Environmental ── */}
// //           <div style={{ display:"grid", gridTemplateColumns:col2, gap:16, marginBottom:16 }}>

// //             {/* Gender Distribution */}
// //             <Panel delay={80}>
// //               <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:0 }}>
// //                 <PTitle>Gender Distribution</PTitle>
// //                 <DLBtn onClick={dlGender} />
// //               </div>
// //               <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"12px 0 8px" }}>
// //                 {loading ? (
// //                   <Sk w={190} h={190} />
// //                 ) : (
// //                   <Donut
// //                     segments={[
// //                       { value: femaleCount, color: "#2e7d32" },
// //                       { value: maleCount,   color: "#d1d5db" },
// //                     ]}
// //                     centerLabel="FEMALE"
// //                     centerValue={`${femalePct}%`}
// //                     size={190}
// //                     sw={26}
// //                   />
// //                 )}
// //                 <div style={{ display:"flex", gap:24, marginTop:20 }}>
// //                   {[["#2e7d32","Female"],["#d1d5db","Male"]].map(([c, l]) => (
// //                     <div key={l} style={{ display:"flex", alignItems:"center", gap:8 }}>
// //                       <div style={{ width:14, height:14, borderRadius:"50%", background:c }} />
// //                       <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>{l}</span>
// //                     </div>
// //                   ))}
// //                 </div>
// //               </div>
// //             </Panel>

// //             {/* Environmental */}
// //             <Panel delay={120}>
// //               <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:0 }}>
// //                 <PTitle>Environmental</PTitle>
// //                 <DLBtn onClick={dlEnv} />
// //               </div>
// //               <div style={{ display:"flex", gap:12, alignItems:"flex-start", flexWrap:"wrap" }}>
// //                 {/* Metric boxes */}
// //                 <div style={{ display:"flex", flexDirection:"column", gap:12, flex:1, minWidth:140 }}>
// //                   <div style={{ background:"#f9fafb", borderRadius:10, padding:"14px 16px" }}>
// //                     <div style={{ fontSize:18, fontWeight:800, color:"#111827", fontFamily:"'DM Mono',monospace" }}>
// //                       {loading ? <Sk w={70} h={20} /> : `${avgWoodKg} KG`}
// //                     </div>
// //                     <div style={{ fontSize:12, color:"#6b7280", marginTop:3 }}>Avg Wood Saved / Month</div>
// //                   </div>
// //                   <div style={{ background:"#f9fafb", borderRadius:10, padding:"14px 16px" }}>
// //                     <div style={{ fontSize:18, fontWeight:800, color:"#111827", fontFamily:"'DM Mono',monospace" }}>
// //                       {loading ? <Sk w={50} h={20} /> : fmt(treesSaved)}
// //                     </div>
// //                     <div style={{ fontSize:12, color:"#6b7280", marginTop:3 }}>Trees Saved per Month</div>
// //                   </div>
// //                 </div>
// //                 {/* Sparkline */}
// //                 <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, flexShrink:0 }}>
// //                   {loading ? <Sk w={130} h={60} /> : <Spark data={sparkData} color="#2e7d32" w={130} h={70} />}
// //                   {!loading && creditsPct != null && (
// //                     <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:12 }}>
// //                       <TrendingUp size={12} color="#2e7d32" />
// //                       <span style={{ color:"#2e7d32", fontWeight:700 }}>{creditsPct >= 0 ? "+" : ""}{creditsPct}%</span>
// //                       <span style={{ color:"#9ca3af" }}>vs Last Month</span>
// //                     </div>
// //                   )}
// //                 </div>
// //               </div>
// //             </Panel>
// //           </div>

// //           {/* ── ROW 3: Economic + Health ── */}
// //           <div style={{ display:"grid", gridTemplateColumns:col2, gap:16, marginBottom:16 }}>

// //             {/* Economic */}
// //             <Panel delay={160}>
// //               <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:0 }}>
// //                 <PTitle>Economic</PTitle>
// //                 <DLBtn onClick={dlEcon} />
// //               </div>
// //               <div style={{ fontSize:"clamp(20px,2.5vw,28px)", fontWeight:900, color:"#111827", fontFamily:"'DM Mono',monospace", marginBottom:6 }}>
// //                 {loading ? <Sk w={120} h={28} /> : `${fmt(avgSavings)} MWK`}
// //               </div>
// //               <div style={{ fontSize:13, color:"#6b7280" }}>Average 3-Month Savings</div>
// //             </Panel>

// //             {/* Health */}
// //             <Panel delay={200}>
// //               <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:0 }}>
// //                 <PTitle>Health</PTitle>
// //                 <DLBtn onClick={dlHealth} />
// //               </div>
// //               <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, paddingTop:4 }}>
// //                 {loading ? <Sk w={110} h={110} /> : <HealthGauge pct={healthPct} />}
// //                 <div style={{ fontSize:13, color:"#6b7280", textAlign:"center", fontWeight:500, lineHeight:1.45 }}>
// //                   Reporting Better<br />Air Quality
// //                 </div>
// //               </div>
// //             </Panel>
// //           </div>

// //           {/* ── ROW 4: Carbon Credits Bar + Distribution Map ── */}
// //           <div style={{ display:"grid", gridTemplateColumns:colBot, gap:16 }}>

// //             {/* Carbon Credit Generated */}
// //             <Panel delay={240}>
// //               <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:0 }}>
// //                 <div>
// //                   <PTitle>Carbon Credit Generated</PTitle>
// //                   <div style={{ fontSize:11, color:"#9ca3af", marginTop:-12, marginBottom:14 }}>Last 5 months</div>
// //                 </div>
// //                 <DLBtn onClick={dlCarbon} />
// //               </div>
// //               {loading ? <Sk w="100%" h={160} /> : <CarbonBar data={monthlyBars} />}
// //             </Panel>

// //             {/* Distribution Map */}
// //             <Panel delay={280}>
// //               <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
// //                 <PTitle>Distribution Map</PTitle>
// //                 <a href="https://www.openstreetmap.org/#map=7/-13.5/34.3" target="_blank" rel="noreferrer"
// //                   style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#2e7d32", fontWeight:700, textDecoration:"none", background:"#e8f5e9", padding:"4px 10px", borderRadius:6 }}>
// //                   Full Map ↗
// //                 </a>
// //               </div>
// //               {/* OpenStreetMap embed — Malawi region */}
// //               <div style={{ borderRadius:10, overflow:"hidden", height:200, background:"#e8f5e9", position:"relative" }}>
// //                 <iframe
// //                   title="Distribution Map"
// //                   width="100%" height="100%"
// //                   style={{ border: 0 }}
// //                   loading="lazy"
// //                   src="https://www.openstreetmap.org/export/embed.html?bbox=32.0,-17.5,36.5,-8.5&layer=mapnik&marker=-13.2543,34.3015"
// //                 />
// //                 {/* Zoom controls overlay */}
// //                 <div style={{ position:"absolute", bottom:10, right:10, display:"flex", flexDirection:"column", gap:1, zIndex:10 }}>
// //                   {["+","−"].map((s, i) => (
// //                     <div key={i} style={{ width:26, height:26, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"#374151", cursor:"pointer", borderRadius: i===0?"4px 4px 0 0":"0 0 4px 4px", boxShadow:"0 1px 4px rgba(0,0,0,0.15)" }}>
// //                       {s}
// //                     </div>
// //                   ))}
// //                 </div>
// //               </div>
// //             </Panel>
// //           </div>

// //         </div>
// //       </div>
// //     </>
// //   );
// // };

// // export default CustomerDashboard;

// // // import React, { useEffect, useState, useCallback, useRef } from "react";
// // // import axios from "axios";
// // // import { API_BASE_URL } from "../../config";
// // // import { Download, TrendingUp, Map } from "lucide-react";

// // // // ─────────────────────────────────────────────────────────────────────────────
// // // // Constants
// // // // ─────────────────────────────────────────────────────────────────────────────
// // // const COOKSTOVE_TARGET  = 50000;
// // // const CREDITS_PER_STOVE = 8.668819;   // yields ~433 credits per stove (matches image)
// // // const AVG_WOOD_SAVED_KG = 4.53;       // kg per month per stove
// // // const TREES_SAVED_RATE  = 38;         // trees saved per month (total)
// // // const AVG_3M_SAVINGS_MWK = 3000;      // economic savings (MWK)

// // // // ─────────────────────────────────────────────────────────────────────────────
// // // // Helpers
// // // // ─────────────────────────────────────────────────────────────────────────────
// // // const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US"));
// // // const fmtDec = (n, d = 2) => (n == null ? "—" : Number(n).toFixed(d));

// // // const csvDownload = (rows, filename) => {
// // //   const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
// // //   const url = URL.createObjectURL(blob);
// // //   const a = document.createElement("a");
// // //   a.href = url; a.download = filename;
// // //   document.body.appendChild(a); a.click();
// // //   document.body.removeChild(a); URL.revokeObjectURL(url);
// // // };

// // // // ─────────────────────────────────────────────────────────────────────────────
// // // // useWindowWidth
// // // // ─────────────────────────────────────────────────────────────────────────────
// // // const useWindowWidth = () => {
// // //   const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
// // //   useEffect(() => {
// // //     const h = () => setW(window.innerWidth);
// // //     window.addEventListener("resize", h);
// // //     return () => window.removeEventListener("resize", h);
// // //   }, []);
// // //   return w;
// // // };

// // // // ─────────────────────────────────────────────────────────────────────────────
// // // // Donut Chart
// // // // ─────────────────────────────────────────────────────────────────────────────
// // // const DonutChart = ({ segments = [], centerLabel = "", centerValue = "", size = 200, strokeWidth = 24 }) => {
// // //   const r = (size / 2) - strokeWidth;
// // //   const cx = size / 2, cy = size / 2;
// // //   const circ = 2 * Math.PI * r;
// // //   const total = segments.reduce((s, x) => s + (x.value || 0), 0) || 1;
// // //   let off = 0;
// // //   return (
// // //     <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ flexShrink: 0 }}>
// // //       <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
// // //       {segments.map((seg, i) => {
// // //         const dash = ((seg.value || 0) / total) * circ;
// // //         const el = (
// // //           <circle key={i} cx={cx} cy={cy} r={r} fill="none"
// // //             stroke={seg.color} strokeWidth={strokeWidth}
// // //             strokeDasharray={`${dash} ${circ - dash}`}
// // //             strokeDashoffset={-(off - circ * 0.25)}
// // //             style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.22,.68,0,1)" }}
// // //           />
// // //         );
// // //         off += dash;
// // //         return el;
// // //       })}
// // //       <text x={cx} y={cy - 12} textAnchor="middle" fontSize={10} fill="#6b7280"
// // //         fontWeight={700} letterSpacing={1.5} fontFamily="'DM Sans',sans-serif">
// // //         {centerLabel}
// // //       </text>
// // //       <text x={cx} y={cy + 18} textAnchor="middle" fontSize={30} fill="#2e7d32"
// // //         fontWeight={900} fontFamily="'DM Sans',sans-serif">
// // //         {centerValue}
// // //       </text>
// // //     </svg>
// // //   );
// // // };

// // // // ─────────────────────────────────────────────────────────────────────────────
// // // // Mini Line Sparkline
// // // // ─────────────────────────────────────────────────────────────────────────────
// // // const Sparkline = ({ data = [], color = "#2e7d32", width = 140, height = 60 }) => {
// // //   if (data.length < 2) return null;
// // //   const max = Math.max(...data, 1);
// // //   const min = Math.min(...data, 0);
// // //   const range = max - min || 1;
// // //   const pts = data.map((v, i) => {
// // //     const x = (i / (data.length - 1)) * width;
// // //     const y = height - ((v - min) / range) * (height - 8) - 4;
// // //     return `${x},${y}`;
// // //   });
// // //   return (
// // //     <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
// // //       <polyline
// // //         points={pts.join(" ")}
// // //         fill="none"
// // //         stroke={color}
// // //         strokeWidth={2.5}
// // //         strokeLinejoin="round"
// // //         strokeLinecap="round"
// // //       />
// // //       {/* Last point dot */}
// // //       {(() => {
// // //         const [lx, ly] = pts[pts.length - 1].split(",").map(Number);
// // //         return <circle cx={lx} cy={ly} r={4} fill={color} />;
// // //       })()}
// // //     </svg>
// // //   );
// // // };

// // // // ─────────────────────────────────────────────────────────────────────────────
// // // // Bar Chart (Carbon Credits - last 5 months)
// // // // ─────────────────────────────────────────────────────────────────────────────
// // // const CarbonBarChart = ({ data = [] }) => {
// // //   if (!data.length) return (
// // //     <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
// // //       <span style={{ fontSize: 12, color: "#9ca3af" }}>No data</span>
// // //     </div>
// // //   );
// // //   const max = Math.max(...data.map((d) => d.v), 1);
// // //   const gridMax = Math.ceil(max / 20) * 20 || 80;
// // //   const gridLines = [gridMax, Math.round(gridMax * 0.6), Math.round(gridMax * 0.3), 0];
// // //   return (
// // //     <div style={{ position: "relative", height: 160, paddingTop: 8 }}>
// // //       {/* Grid */}
// // //       <div style={{ position: "absolute", left: 0, right: 0, top: 8, bottom: 28, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
// // //         {gridLines.map((g, i) => (
// // //           <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
// // //             <span style={{ fontSize: 10, color: "#9ca3af", width: 22, textAlign: "right", flexShrink: 0 }}>{g}</span>
// // //             <div style={{ flex: 1, borderTop: "1px dashed #e8f5e9" }} />
// // //           </div>
// // //         ))}
// // //       </div>
// // //       {/* Bars */}
// // //       <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: "100%", paddingBottom: 28, paddingLeft: 30, position: "relative", zIndex: 1 }}>
// // //         {data.map((d, i) => {
// // //           const pct = Math.max((d.v / gridMax) * 100, d.v > 0 ? 5 : 0);
// // //           return (
// // //             <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 5, height: "100%", justifyContent: "flex-end" }}>
// // //               <div style={{ width: "55%", background: "#2e7d32", borderRadius: "4px 4px 0 0", height: `${pct}%`, transition: "height 0.9s cubic-bezier(.22,.68,0,1.2)", minWidth: 10 }} />
// // //               <span style={{ fontSize: 11, color: "#6b7280" }}>{d.l}</span>
// // //             </div>
// // //           );
// // //         })}
// // //       </div>
// // //     </div>
// // //   );
// // // };

// // // // ─────────────────────────────────────────────────────────────────────────────
// // // // Progress Bar
// // // // ─────────────────────────────────────────────────────────────────────────────
// // // const ProgressBar = ({ pct }) => (
// // //   <div style={{ marginTop: 12 }}>
// // //     <div style={{ height: 8, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
// // //       <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#2e7d32,#66bb6a)", borderRadius: 99, transition: "width 1.4s cubic-bezier(.22,.68,0,1)" }} />
// // //     </div>
// // //     <div style={{ fontSize: 12, color: "#2e7d32", fontWeight: 700, marginTop: 6, textAlign: "center" }}>
// // //       {pct}% Complete
// // //     </div>
// // //   </div>
// // // );

// // // // ─────────────────────────────────────────────────────────────────────────────
// // // // Skeleton
// // // // ─────────────────────────────────────────────────────────────────────────────
// // // const Skel = ({ w = 80, h = 28 }) => (
// // //   <span style={{ display: "inline-block", width: w, height: h, background: "linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)", backgroundSize: "200% 100%", animation: "cdShimmer 1.4s infinite", borderRadius: 6 }} />
// // // );

// // // // ─────────────────────────────────────────────────────────────────────────────
// // // // Panel wrapper
// // // // ─────────────────────────────────────────────────────────────────────────────
// // // const Panel = ({ children, style = {}, delay = 0 }) => (
// // //   <div style={{
// // //     background: "#fff", borderRadius: 16, padding: "20px 22px",
// // //     boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
// // //     animation: "cdRise 0.45s ease both", animationDelay: `${delay}ms`,
// // //     minWidth: 0, ...style,
// // //   }}>
// // //     {children}
// // //   </div>
// // // );

// // // const PanelTitle = ({ children }) => (
// // //   <div style={{ fontSize: 12, fontWeight: 800, color: "#111827", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
// // //     {children}
// // //   </div>
// // // );

// // // const DownloadBtn = ({ onClick }) => (
// // //   <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", color: "#2e7d32" }}
// // //     onMouseEnter={(e) => e.currentTarget.style.background = "#f0faf0"}
// // //     onMouseLeave={(e) => e.currentTarget.style.background = "none"}>
// // //     <Download size={16} color="#2e7d32" />
// // //   </button>
// // // );

// // // // ─────────────────────────────────────────────────────────────────────────────
// // // // Health Donut (orange/yellow gauge)
// // // // ─────────────────────────────────────────────────────────────────────────────
// // // const HealthGauge = ({ pct, size = 110 }) => {
// // //   const r = 40, cx = 55, cy = 55;
// // //   const circ = 2 * Math.PI * r;
// // //   const dash = (pct / 100) * circ;
// // //   return (
// // //     <svg width={size} height={size} viewBox="0 0 110 110">
// // //       <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={14} />
// // //       <circle cx={cx} cy={cy} r={r} fill="none"
// // //         stroke="#f59e0b" strokeWidth={14}
// // //         strokeDasharray={`${dash} ${circ - dash}`}
// // //         strokeDashoffset={circ * 0.25}
// // //         style={{ transition: "stroke-dasharray 1.2s ease" }}
// // //       />
// // //       <text x={cx} y={cy + 7} textAnchor="middle" fontSize={18} fill="#f59e0b" fontWeight={800} fontFamily="'DM Sans',sans-serif">
// // //         {pct}%
// // //       </text>
// // //     </svg>
// // //   );
// // // };

// // // // ─────────────────────────────────────────────────────────────────────────────
// // // // Main CustomerDashboard
// // // // ─────────────────────────────────────────────────────────────────────────────
// // // const CustomerDashboard = () => {
// // //   const width      = useWindowWidth();
// // //   const isMobile   = width < 640;
// // //   const isTablet   = width >= 640 && width < 1024;
// // //   const isDesktop  = width >= 1024;

// // //   const userName  = (typeof localStorage !== "undefined" && localStorage.getItem("userName")) || "Customer";

// // //   // ── State ──────────────────────────────────────────────────────────────────
// // //   const [benCount,       setBenCount]       = useState(null);
// // //   const [siteCount,      setSiteCount]      = useState(null);
// // //   const [allBens,        setAllBens]        = useState([]);
// // //   const [allSites,       setAllSites]       = useState([]);
// // //   const [loading,        setLoading]        = useState(true);
// // //   const [monthlyCredits, setMonthlyCredits] = useState([]);

// // //   // ── Fetch ──────────────────────────────────────────────────────────────────
// // //   useEffect(() => {
// // //     (async () => {
// // //       setLoading(true);
// // //       try {
// // //         // Counts
// // //         const [bRes, sRes] = await Promise.allSettled([
// // //           axios.post(`${API_BASE_URL}/beneficiary/list`, { filters: [] }, { params: { page: 1, limit: 1 } }),
// // //           axios.post(`${API_BASE_URL}/training-site/list`, { filters: [] }, { params: { page: 1, limit: 1 } }),
// // //         ]);
// // //         if (bRes.status === "fulfilled") setBenCount(bRes.value.data?.totalRecords ?? 0);
// // //         if (sRes.status === "fulfilled") setSiteCount(sRes.value.data?.totalRecords ?? 0);

// // //         // Bulk beneficiary data for gender distribution + monthly charts
// // //         const bulkRes = await axios.post(`${API_BASE_URL}/beneficiary/list`, { filters: [] }, { params: { page: 1, limit: 100000 } });
// // //         const bens = bulkRes.data?.data ?? [];
// // //         setAllBens(bens);

// // //         // Bulk sites
// // //         const sitesRes = await axios.post(`${API_BASE_URL}/training-site/list`, { filters: [] }, { params: { page: 1, limit: 100000 } });
// // //         setAllSites(sitesRes.data?.data ?? []);

// // //         // Build monthly credits for last 5 months
// // //         const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
// // //         const now = new Date();
// // //         const monthly = Array.from({ length: 5 }, (_, i) => {
// // //           const d = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
// // //           const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1);
// // //           const count = bens.filter((r) => {
// // //             if (!r.created_date) return false;
// // //             const rd = new Date(r.created_date);
// // //             return rd >= d && rd < nextD;
// // //           }).length;
// // //           return { l: MONTHS[d.getMonth()], v: Math.round(count * CREDITS_PER_STOVE) };
// // //         });
// // //         setMonthlyCredits(monthly);

// // //       } catch (e) {
// // //         console.error("CustomerDashboard fetch error:", e);
// // //       } finally {
// // //         setLoading(false);
// // //       }
// // //     })();
// // //   }, []);

// // //   // ── Derived values ─────────────────────────────────────────────────────────
// // //   const deployed     = benCount ?? 0;
// // //   const pct          = Math.min(Math.round((deployed / COOKSTOVE_TARGET) * 100), 100);
// // //   const remaining    = Math.max(COOKSTOVE_TARGET - deployed, 0);
// // //   const totalCredits = deployed * CREDITS_PER_STOVE;

// // //   // This month
// // //   const now = new Date();
// // //   const thisMonthBens = allBens.filter((r) => {
// // //     if (!r.created_date) return false;
// // //     const d = new Date(r.created_date);
// // //     return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
// // //   });
// // //   const thisMonthCredits = thisMonthBens.length * CREDITS_PER_STOVE;

// // //   // Last month for % comparison
// // //   const lastMonthBens = allBens.filter((r) => {
// // //     if (!r.created_date) return false;
// // //     const d = new Date(r.created_date);
// // //     const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
// // //     const tm = new Date(now.getFullYear(), now.getMonth(), 1);
// // //     return d >= lm && d < tm;
// // //   });
// // //   const creditsPct = lastMonthBens.length > 0
// // //     ? Math.round(((thisMonthBens.length - lastMonthBens.length) / lastMonthBens.length) * 100)
// // //     : null;

// // //   // Gender distribution from beneficiary data
// // //   const femaleCount = allBens.reduce((s, r) => s + (Number(r.females_above_18) || 0) + (Number(r.females_below_18) || 0), 0);
// // //   const maleCount   = allBens.reduce((s, r) => s + (Number(r.males_above_18) || 0) + (Number(r.males_below_18) || 0), 0);
// // //   const totalPeople = femaleCount + maleCount || 1;
// // //   const femalePct   = Math.round((femaleCount / totalPeople) * 100);

// // //   // Total people impacted & households from training sites
// // //   const totalPeopleImpacted = allSites.reduce((s, r) => s + (Number(r.total_people) || 0), 0);
// // //   const totalHouseholds     = allSites.reduce((s, r) => s + (Number(r.house_holds_count) || 0), 0);

// // //   // Health — monitoring records with better_air_quality = yes
// // //   const [healthPct, setHealthPct] = useState(31);
// // //   useEffect(() => {
// // //     (async () => {
// // //       try {
// // //         const res = await axios.post(`${API_BASE_URL}/monitoring/list`, { filters: [] }, { params: { page: 1, limit: 100000 } });
// // //         const recs = res.data?.data ?? [];
// // //         if (recs.length === 0) return;
// // //         const betterAir = recs.filter((r) => r.health_better_air === "yes" || r.health_better_air === true).length;
// // //         setHealthPct(Math.round((betterAir / recs.length) * 100));
// // //       } catch {}
// // //     })();
// // //   }, []);

// // //   // Sparkline data for environmental panel (monthly count last 6 months)
// // //   const sparkData = Array.from({ length: 6 }, (_, i) => {
// // //     const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
// // //     const nd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
// // //     return allBens.filter((r) => {
// // //       if (!r.created_date) return false;
// // //       const rd = new Date(r.created_date);
// // //       return rd >= d && rd < nd;
// // //     }).length;
// // //   });

// // //   // Download handlers
// // //   const dlGender = () => csvDownload([["Gender","Count"],["Female",femaleCount],["Male",maleCount]], "gender_distribution.csv");
// // //   const dlEnv    = () => csvDownload([["Metric","Value"],["Avg Wood Saved/Month (kg)", AVG_WOOD_SAVED_KG],["Trees Saved/Month", TREES_SAVED_RATE]], "environmental.csv");
// // //   const dlEcon   = () => csvDownload([["Metric","Value"],["Avg 3-Month Savings (MWK)", AVG_3M_SAVINGS_MWK]], "economic.csv");
// // //   const dlHealth = () => csvDownload([["Metric","Value"],["Reporting Better Air Quality (%)", healthPct]], "health.csv");
// // //   const dlCarbon = () => csvDownload([["Month","Credits"], ...monthlyCredits.map((d) => [d.l, d.v])], "carbon_credits.csv");

// // //   // Layout
// // //   const contentPad  = isMobile ? "16px 12px 40px" : "20px 20px 48px";
// // //   const heroPad     = isMobile ? "20px 16px 22px" : "28px 28px 30px";

// // //   // ─────────────────────────────────────────────────────────────────────────
// // //   return (
// // //     <>
// // //       <style>{`
// // //         @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&family=DM+Mono:wght@400;500;600&display=swap');
// // //         *, *::before, *::after { box-sizing: border-box; margin: 0; }
// // //         .cd-root { font-family: 'DM Sans', sans-serif; background: #f0faf0; min-height: 100vh; }
// // //         @keyframes cdShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
// // //         @keyframes cdRise { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
// // //         @media(max-width:860px){ .cd-row2{ grid-template-columns:1fr !important; } }
// // //         @media(max-width:640px){ .cd-top3{ grid-template-columns:1fr !important; } .cd-bot2{ grid-template-columns:1fr !important; } }
// // //       `}</style>

// // //       <div className="cd-root">

// // //         {/* ── Hero ── */}
// // //         <div style={{
// // //           background: "linear-gradient(135deg,#1b5e20 0%,#2e7d32 55%,#43a047 100%)",
// // //           padding: heroPad, position: "relative", overflow: "hidden",
// // //         }}>
// // //           <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px)", backgroundSize:"22px 22px", pointerEvents:"none" }} />
// // //           <div style={{ position:"relative", zIndex:1 }}>
// // //             <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.65)", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:10 }}>
// // //               WELCOME BACK, {userName.toUpperCase()}
// // //             </div>
// // //             <h1 style={{ color:"#fff", fontSize: isMobile ? 20 : 28, fontWeight:800, margin:0, lineHeight:1.25 }}>
// // //               Here's what's happening today
// // //             </h1>
// // //           </div>
// // //         </div>

// // //         {/* ── Content ── */}
// // //         <div style={{ padding: contentPad }}>

// // //           {/* ── TOP 3 STAT CARDS ── */}
// // //           <div className="cd-top3" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:20 }}>

// // //             {/* Cookstove Deployed */}
// // //             <Panel delay={60} style={{ border:"1.5px solid #e8f5e9" }}>
// // //               <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
// // //                 <div style={{ width:36, height:36, borderRadius:9, background:"#e8f5e9", display:"flex", alignItems:"center", justifyContent:"center" }}>
// // //                   <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth={2}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
// // //                 </div>
// // //                 <span style={{ fontSize:10, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.1em" }}>Cookstove Deployed</span>
// // //               </div>
// // //               <div style={{ fontSize:"clamp(24px,3vw,36px)", fontWeight:900, color:"#111827", lineHeight:1, fontFamily:"'DM Mono',monospace", marginBottom:12 }}>
// // //                 {loading ? <Skel w={100} h={32} /> : fmt(deployed)}
// // //               </div>
// // //               <ProgressBar pct={pct} />
// // //             </Panel>

// // //             {/* Total Credits */}
// // //             <Panel delay={100} style={{ border:"1.5px solid #e8f5e9" }}>
// // //               <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
// // //                 <div style={{ width:36, height:36, borderRadius:9, background:"#e8f5e9", display:"flex", alignItems:"center", justifyContent:"center" }}>
// // //                   <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
// // //                 </div>
// // //                 <span style={{ fontSize:10, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.1em" }}>Total Credits</span>
// // //               </div>
// // //               <div style={{ fontSize:"clamp(20px,2.5vw,30px)", fontWeight:900, color:"#111827", lineHeight:1, fontFamily:"'DM Mono',monospace", marginBottom:8 }}>
// // //                 {loading ? <Skel w={120} h={28} /> : fmtDec(totalCredits, 2)}
// // //               </div>
// // //               {creditsPct != null && !loading && (
// // //                 <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, marginTop:6 }}>
// // //                   <TrendingUp size={13} color="#2e7d32" />
// // //                   <span style={{ color:"#2e7d32", fontWeight:700 }}>{creditsPct >= 0 ? "+" : ""}{creditsPct}%</span>
// // //                   <span style={{ color:"#9ca3af" }}>vs last month</span>
// // //                 </div>
// // //               )}
// // //             </Panel>

// // //             {/* People Impacted */}
// // //             <Panel delay={140} style={{ border:"1.5px solid #e8f5e9" }}>
// // //               <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
// // //                 <div style={{ width:36, height:36, borderRadius:9, background:"#e8f5e9", display:"flex", alignItems:"center", justifyContent:"center" }}>
// // //                   <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
// // //                 </div>
// // //                 <span style={{ fontSize:10, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.1em" }}>People Impacted</span>
// // //               </div>
// // //               <div style={{ fontSize:"clamp(24px,3vw,36px)", fontWeight:900, color:"#111827", lineHeight:1, fontFamily:"'DM Mono',monospace", marginBottom:10 }}>
// // //                 {loading ? <Skel w={100} h={32} /> : fmt(totalPeopleImpacted || deployed * 6)}
// // //               </div>
// // //               <div style={{ fontSize:10, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.08em", marginTop:6 }}>Households</div>
// // //               <div style={{ fontSize:"clamp(18px,2vw,24px)", fontWeight:800, color:"#2e7d32", fontFamily:"'DM Mono',monospace" }}>
// // //                 {loading ? <Skel w={80} h={22} /> : fmt(totalHouseholds || Math.round(deployed * 0.5))}
// // //               </div>
// // //             </Panel>
// // //           </div>

// // //           {/* ── ROW 2: Gender Distribution + Environmental ── */}
// // //           <div className="cd-row2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>

// // //             {/* Gender Distribution */}
// // //             <Panel delay={160}>
// // //               <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
// // //                 <PanelTitle>Gender Distribution</PanelTitle>
// // //                 <DownloadBtn onClick={dlGender} />
// // //               </div>

// // //               <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"16px 0 8px" }}>
// // //                 {loading ? (
// // //                   <Skel w={180} h={180} />
// // //                 ) : (
// // //                   <DonutChart
// // //                     segments={[
// // //                       { value: femaleCount, color: "#2e7d32" },
// // //                       { value: maleCount,   color: "#d1d5db" },
// // //                     ]}
// // //                     centerLabel="FEMALE"
// // //                     centerValue={`${femalePct}%`}
// // //                     size={190}
// // //                     strokeWidth={26}
// // //                   />
// // //                 )}

// // //                 {/* Legend */}
// // //                 <div style={{ display:"flex", gap:24, marginTop:20 }}>
// // //                   <div style={{ display:"flex", alignItems:"center", gap:8 }}>
// // //                     <div style={{ width:14, height:14, borderRadius:"50%", background:"#2e7d32" }} />
// // //                     <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Female</span>
// // //                   </div>
// // //                   <div style={{ display:"flex", alignItems:"center", gap:8 }}>
// // //                     <div style={{ width:14, height:14, borderRadius:"50%", background:"#d1d5db" }} />
// // //                     <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Male</span>
// // //                   </div>
// // //                 </div>
// // //               </div>
// // //             </Panel>

// // //             {/* Environmental */}
// // //             <Panel delay={200}>
// // //               <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
// // //                 <PanelTitle>Environmental</PanelTitle>
// // //                 <DownloadBtn onClick={dlEnv} />
// // //               </div>

// // //               <div style={{ display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap" }}>
// // //                 {/* Metrics column */}
// // //                 <div style={{ display:"flex", flexDirection:"column", gap:12, flex:1 }}>
// // //                   {/* Wood Saved */}
// // //                   <div style={{ background:"#f9fafb", borderRadius:10, padding:"14px 16px" }}>
// // //                     <div style={{ fontSize:20, fontWeight:800, color:"#111827", fontFamily:"'DM Mono',monospace" }}>{AVG_WOOD_SAVED_KG} KG</div>
// // //                     <div style={{ fontSize:12, color:"#6b7280", marginTop:3 }}>Avg Wood Saved / Month</div>
// // //                   </div>
// // //                   {/* Trees Saved */}
// // //                   <div style={{ background:"#f9fafb", borderRadius:10, padding:"14px 16px" }}>
// // //                     <div style={{ fontSize:20, fontWeight:800, color:"#111827", fontFamily:"'DM Mono',monospace" }}>{fmt(TREES_SAVED_RATE)}</div>
// // //                     <div style={{ fontSize:12, color:"#6b7280", marginTop:3 }}>Trees Saved per Month</div>
// // //                   </div>
// // //                 </div>

// // //                 {/* Sparkline column */}
// // //                 <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
// // //                   <Sparkline data={sparkData} color="#2e7d32" width={130} height={70} />
// // //                   {creditsPct != null && (
// // //                     <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:12 }}>
// // //                       <TrendingUp size={12} color="#2e7d32" />
// // //                       <span style={{ color:"#2e7d32", fontWeight:700 }}>{creditsPct >= 0 ? "+" : ""}{creditsPct}%</span>
// // //                       <span style={{ color:"#9ca3af" }}>vs Last Month</span>
// // //                     </div>
// // //                   )}
// // //                 </div>
// // //               </div>
// // //             </Panel>
// // //           </div>

// // //           {/* ── ROW 3: Economic + Health ── */}
// // //           <div className="cd-row2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>

// // //             {/* Economic */}
// // //             <Panel delay={240}>
// // //               <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
// // //                 <PanelTitle>Economic</PanelTitle>
// // //                 <DownloadBtn onClick={dlEcon} />
// // //               </div>
// // //               <div style={{ fontSize:"clamp(20px,2.5vw,28px)", fontWeight:900, color:"#111827", fontFamily:"'DM Mono',monospace", marginBottom:6 }}>
// // //                 {fmt(AVG_3M_SAVINGS_MWK)} MWK
// // //               </div>
// // //               <div style={{ fontSize:13, color:"#6b7280" }}>Average 3-Month Savings</div>
// // //             </Panel>

// // //             {/* Health */}
// // //             <Panel delay={280}>
// // //               <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
// // //                 <PanelTitle>Health</PanelTitle>
// // //                 <DownloadBtn onClick={dlHealth} />
// // //               </div>
// // //               <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
// // //                 <HealthGauge pct={healthPct} size={110} />
// // //                 <div style={{ fontSize:13, color:"#6b7280", textAlign:"center", fontWeight:500, lineHeight:1.4 }}>
// // //                   Reporting Better<br />Air Quality
// // //                 </div>
// // //               </div>
// // //             </Panel>
// // //           </div>

// // //           {/* ── ROW 4: Carbon Credits Bar + Distribution Map ── */}
// // //           <div className="cd-bot2" style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:16 }}>

// // //             {/* Carbon Credit Generated */}
// // //             <Panel delay={320}>
// // //               <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:4 }}>
// // //                 <div>
// // //                   <PanelTitle>Carbon Credit Generated</PanelTitle>
// // //                   <div style={{ fontSize:11, color:"#9ca3af", marginTop:-10, marginBottom:14 }}>Last 5 months</div>
// // //                 </div>
// // //                 <DownloadBtn onClick={dlCarbon} />
// // //               </div>
// // //               <CarbonBarChart data={monthlyCredits} />
// // //             </Panel>

// // //             {/* Distribution Map */}
// // //             <Panel delay={360}>
// // //               <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
// // //                 <PanelTitle>Distribution Map</PanelTitle>
// // //                 <a
// // //                   href="https://maps.google.com"
// // //                   target="_blank"
// // //                   rel="noreferrer"
// // //                   style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#2e7d32", fontWeight:700, textDecoration:"none", background:"#e8f5e9", padding:"4px 10px", borderRadius:6 }}
// // //                 >
// // //                   Full Map <Map size={12} />
// // //                 </a>
// // //               </div>

// // //               {/* Static map placeholder — replace src with your actual map embed */}
// // //               <div style={{
// // //                 borderRadius: 10,
// // //                 overflow: "hidden",
// // //                 height: 200,
// // //                 background: "#e8f5e9",
// // //                 position: "relative",
// // //               }}>
// // //                 <iframe
// // //                   title="Distribution Map"
// // //                   width="100%"
// // //                   height="100%"
// // //                   style={{ border: 0 }}
// // //                   loading="lazy"
// // //                   referrerPolicy="no-referrer-when-downgrade"
// // //                   src="https://www.openstreetmap.org/export/embed.html?bbox=32.0,-16.0,36.0,-9.0&layer=mapnik"
// // //                 />
// // //                 {/* Red marker overlay */}
// // //                 <div style={{
// // //                   position:"absolute", top:"50%", left:"50%",
// // //                   transform:"translate(-50%,-50%)",
// // //                   pointerEvents:"none",
// // //                 }}>
// // //                   <div style={{ width:16, height:16, borderRadius:"50%", background:"#ef4444", border:"3px solid #fff", boxShadow:"0 2px 6px rgba(0,0,0,0.3)" }} />
// // //                 </div>

// // //                 {/* Map zoom controls */}
// // //                 <div style={{ position:"absolute", bottom:10, right:10, display:"flex", flexDirection:"column", gap:1 }}>
// // //                   {["+","−"].map((s, i) => (
// // //                     <div key={i} style={{ width:26, height:26, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"#374151", cursor:"pointer", borderRadius: i === 0 ? "4px 4px 0 0" : "0 0 4px 4px", boxShadow:"0 1px 4px rgba(0,0,0,0.15)" }}>
// // //                       {s}
// // //                     </div>
// // //                   ))}
// // //                 </div>
// // //               </div>
// // //             </Panel>
// // //           </div>

// // //         </div>
// // //       </div>
// // //     </>
// // //   );
// // // };

// // // export default CustomerDashboard;

// // // // //customer dasboard

// // // // import React, { useEffect, useState } from "react";
// // // // import axios from "axios";
// // // // import { API_BASE_URL } from "../../config";
// // // // import { useNavigate } from "react-router-dom";
// // // // import {
// // // //   GraduationCap,
// // // //   UserCheck,
// // // //   Users,
// // // //   ClipboardList,
// // // //   FileCheck,
// // // //   ChevronRight,
// // // // } from "lucide-react";
// // // // // ── Cookstoves target (adjust to match your real target) ─────────────────────
// // // // const COOKSTOVE_TARGET = 1000;

// // // // // ── Carbon credits per cookstove (example rate, adjust as needed) ─────────────
// // // // const CREDITS_PER_STOVE = 2.5;

// // // // // ── Stat Card ─────────────────────────────────────────────────────────────────
// // // // const StatCard = ({ mod, count, delay }) => {
// // // //   const navigate = useNavigate();
// // // //   return (
// // // //     <div className="sc" style={{ "--a": mod.accent, animationDelay: `${delay}ms` }}
// // // //       onClick={() => navigate(mod.path)}>
// // // //       <div className="sc-head">
// // // //         <div className="sc-ico" style={{ background: `${mod.accent}18` }}>
// // // //           <mod.Icon size={18} color={mod.accent} strokeWidth={1.8} />
// // // //         </div>
// // // //         <span className="sc-lbl">{mod.label}</span>
// // // //       </div>
// // // //       <div className="sc-num">
// // // //         {count == null ? <span className="skel" /> : count}
// // // //       </div>
// // // //       <div className="sc-foot">
// // // //         <span>View all</span>
// // // //         <ChevronRight size={12} color={mod.accent} strokeWidth={2} />
// // // //       </div>
// // // //       <div className="sc-stripe" style={{ background: `linear-gradient(90deg,${mod.accent}40,transparent)` }} />
// // // //     </div>
// // // //   );
// // // // };

// // // // // ── Dashboard ─────────────────────────────────────────────────────────────────
// // // // const CustomerDashboard = () => {
// // // //   const [counts,        setCounts]        = useState({});
// // // //   const [countsLoading, setCountsLoading] = useState(true);
// // // //   const [thisMonthBen,  setThisMonthBen]  = useState(0);
// // // //   const [thisMonthLoading, setThisMonthLoading] = useState(true);

// // // //   const userName  = localStorage.getItem("userName") || "User";
// // // //   const firstName = userName.split(" ")[0];

// // // //   // ── Fetch counts ──────────────────────────────────────────────────────────
// // // //   useEffect(() => {
// // // //     (async () => {
// // // //       const [s, b, a, m, u] = await Promise.allSettled([
// // // //         axios.post(`${API_BASE_URL}/training-site/list`, { filters: [] }, { params: { page: 1, limit: 1 } }),
// // // //         axios.post(`${API_BASE_URL}/beneficiary/list`,   { filters: [] }, { params: { page: 1, limit: 1 } }),
// // // //         axios.post(`${API_BASE_URL}/audit/list`,          { filters: [] }, { params: { page: 1, limit: 1 } }),
// // // //         axios.post(`${API_BASE_URL}/monitoring/list`,     { filters: [] }, { params: { page: 1, limit: 1 } }),
// // // //         axios.get(`${API_BASE_URL}/user/getAllUsers`),
// // // //       ]);
// // // //       setCounts({
// // // //         sites: s.status === "fulfilled" ? s.value.data?.totalRecords ?? 0 : 0,
// // // //         ben:   b.status === "fulfilled" ? b.value.data?.totalRecords ?? 0 : 0,
// // // //         audit: a.status === "fulfilled" ? a.value.data?.totalRecords ?? 0 : 0,
// // // //         mon:   m.status === "fulfilled" ? m.value.data?.totalRecords ?? 0 : 0,
// // // //         users: u.status === "fulfilled" ? u.value.data?.data?.length ?? 0 : 0,
// // // //       });
// // // //       setCountsLoading(false);
// // // //     })();
// // // //   }, []);

// // // //   // ── Fetch this-month beneficiary count ────────────────────────────────────
// // // //   useEffect(() => {
// // // //     (async () => {
// // // //       setThisMonthLoading(true);
// // // //       try {
// // // //         const res = await axios.post(
// // // //           `${API_BASE_URL}/beneficiary/list`,
// // // //           { filters: [] },
// // // //           { params: { page: 1, limit: 100000 } },
// // // //         );
// // // //         const records = res.data?.data ?? [];
// // // //         const now = new Date();
// // // //         const thisMonth = records.filter(r => {
// // // //           if (!r.created_date) return false;
// // // //           const d = new Date(r.created_date);
// // // //           return !isNaN(d.getTime()) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
// // // //         }).length;
// // // //         setThisMonthBen(thisMonth);
// // // //       } catch (e) {
// // // //         console.error("This-month fetch error:", e);
// // // //         setThisMonthBen(0);
// // // //       } finally {
// // // //         setThisMonthLoading(false);
// // // //       }
// // // //     })();
// // // //   }, []);

// // // //   // ── Derived values ────────────────────────────────────────────────────────
// // // //   const deployed   = counts.ben ?? 0;
// // // //   const remaining  = Math.max(COOKSTOVE_TARGET - deployed, 0);
// // // //   const pct        = Math.min(Math.round((deployed / COOKSTOVE_TARGET) * 100), 100);

// // // //   const totalCredits     = Math.round(deployed * CREDITS_PER_STOVE);
// // // //   const thisMonthCredits = Math.round(thisMonthBen * CREDITS_PER_STOVE);

// // // //   return (
// // // //     <>
// // // //       <style>{`
// // // //         @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@500;700&display=swap');
// // // //         *, *::before, *::after { box-sizing: border-box; }
// // // //         .db { font-family:'DM Sans',sans-serif; padding-bottom:40px; min-width:0; }

// // // //         /* ── Hero ── */
// // // //         .db-hero { background:linear-gradient(135deg,#1b5e20 0%,#2e7d32 50%,#388e3c 100%); border-radius:16px; padding:28px 28px 66px; position:relative; overflow:hidden; }
// // // //         .db-hero::before { content:''; position:absolute; inset:0; pointer-events:none; background:url("data:image/svg+xml,%3Csvg width='52' height='52' viewBox='0 0 52 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='0.04'%3E%3Ccircle cx='26' cy='26' r='4'/%3E%3C/g%3E%3C/svg%3E"); }
// // // //         .db-hero::after  { content:''; position:absolute; top:-70px; right:-70px; width:260px; height:260px; border-radius:50%; pointer-events:none; background:radial-gradient(circle,rgba(255,255,255,.13) 0%,transparent 65%); }
// // // //         .hero-body { position:relative; z-index:1; display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; }
// // // //         .hero-tag  { font-size:.68rem; font-weight:700; color:rgba(255,255,255,.55); letter-spacing:.18em; text-transform:uppercase; margin-bottom:6px; }
// // // //         .hero-h1   { font-size:clamp(1.35rem,3vw,1.85rem); font-weight:700; color:#fff; margin:0 0 5px; line-height:1.15; }
// // // //         .hero-sub  { font-size:.8rem; color:rgba(255,255,255,.5); }
// // // //         .hero-pill { display:flex; align-items:center; gap:7px; background:rgba(0,0,0,.18); border:1px solid rgba(255,255,255,.16); border-radius:99px; padding:7px 14px; backdrop-filter:blur(8px); white-space:nowrap; align-self:flex-start; }
// // // //         .hero-dot  { width:6px; height:6px; border-radius:50%; background:#a5f3a5; flex-shrink:0; animation:blink 2s infinite; }
// // // //         .hero-date { font-size:.74rem; color:rgba(255,255,255,.75); font-family:'JetBrains Mono',monospace; }
// // // //         @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.25} }

// // // //         /* ── Stat cards ── */
// // // //         .cards-row { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; margin-top:-38px; position:relative; z-index:2; }
// // // //         @media(max-width:1200px){ .cards-row{ grid-template-columns:repeat(3,1fr); } }
// // // //         @media(max-width:700px) { .cards-row{ grid-template-columns:repeat(2,1fr); } }
// // // //         @media(max-width:420px) { .cards-row{ grid-template-columns:1fr; } }

// // // //         .sc { background:#fff; border-radius:14px; padding:18px 18px 12px; box-shadow:0 2px 10px rgba(0,0,0,.07),0 1px 3px rgba(0,0,0,.04); cursor:pointer; position:relative; overflow:hidden; border:1.5px solid transparent; animation:rise .45s cubic-bezier(.22,.68,0,1.2) both; transition:transform .18s,box-shadow .18s,border-color .18s; min-width:0; }
// // // //         .sc:hover { transform:translateY(-4px); box-shadow:0 10px 28px rgba(0,0,0,.11); border-color:var(--a); }
// // // //         .sc-stripe { position:absolute; bottom:0; left:0; right:0; height:3px; }
// // // //         .sc-head   { display:flex; align-items:center; gap:9px; margin-bottom:12px; min-width:0; }
// // // //         .sc-ico    { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
// // // //         .sc-lbl    { font-size:.67rem; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.07em; line-height:1.3; }
// // // //         .sc-num    { font-size:clamp(1.55rem,2.4vw,2.1rem); font-weight:700; color:#0f172a; line-height:1; font-family:'JetBrains Mono',monospace; margin-bottom:12px; }
// // // //         .sc-foot   { display:flex; align-items:center; justify-content:space-between; font-size:.7rem; color:#9ca3af; border-top:1px solid #f3f4f6; padding-top:9px; transition:color .18s; }
// // // //         .sc:hover .sc-foot { color:var(--a); }
// // // //         .skel { display:inline-block; width:60px; height:28px; background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:6px; }
// // // //         .skel-sm { display:inline-block; width:40px; height:20px; background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; border-radius:4px; }

// // // //         /* ── Two main panels ── */
// // // //         .main-panels { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:24px; }
// // // //         @media(max-width:860px){ .main-panels{ grid-template-columns:1fr; } }

// // // //         .mpanel {
// // // //           background:#fff; border-radius:16px; padding:28px 30px;
// // // //           box-shadow:0 2px 12px rgba(0,0,0,.07);
// // // //           animation:rise .5s ease both; min-width:0;
// // // //           border:1px solid #f1f5f9;
// // // //         }
// // // //         .mpanel-title { font-size:1rem; font-weight:700; color:#111827; margin-bottom:24px; }

// // // //         /* ── Cookstoves stats row ── */
// // // //         .cs-stats { display:flex; align-items:flex-start; gap:32px; margin-bottom:28px; flex-wrap:wrap; }
// // // //         .cs-stat-target .cs-val { font-size:2rem; font-weight:800; color:#111827; font-family:'JetBrains Mono',monospace; line-height:1; }
// // // //         .cs-stat .cs-val        { font-size:2rem; font-weight:800; line-height:1; font-family:'JetBrains Mono',monospace; }
// // // //         .cs-stat-label          { font-size:.75rem; color:#9ca3af; margin-top:4px; font-weight:500; }

// // // //         .cs-badge {
// // // //           margin-left:auto; align-self:flex-start;
// // // //           background:#4CAF50; color:#fff;
// // // //           font-size:.72rem; font-weight:700;
// // // //           border-radius:99px; padding:5px 14px;
// // // //           white-space:nowrap;
// // // //         }

// // // //         /* ── Progress bar ── */
// // // //         .cs-progress-wrap { margin-bottom:10px; }
// // // //         .cs-progress-track {
// // // //           height:10px; background:#f3f4f6; border-radius:99px; overflow:hidden;
// // // //         }
// // // //         .cs-progress-fill {
// // // //           height:100%; border-radius:99px;
// // // //           background:linear-gradient(90deg,#4CAF50,#81C784);
// // // //           transition:width 1.4s cubic-bezier(.22,.68,0,1);
// // // //         }
// // // //         .cs-remaining { font-size:.78rem; color:#6b7280; margin-top:8px; }

// // // //         /* ── Carbon credits ── */
// // // //         .cc-big { text-align:center; padding:16px 0 8px; }
// // // //         .cc-big-num { font-size:3.5rem; font-weight:800; color:#4CAF50; font-family:'JetBrains Mono',monospace; line-height:1; }
// // // //         .cc-big-label { font-size:.85rem; color:#9ca3af; margin-top:8px; font-weight:500; }
// // // //         .cc-divider { height:1px; background:#f3f4f6; margin:20px 0; }
// // // //         .cc-month { display:flex; flex-direction:column; align-items:center; gap:4px; }
// // // //         .cc-month-num { font-size:1.6rem; font-weight:700; color:#111827; font-family:'JetBrains Mono',monospace; line-height:1; }
// // // //         .cc-month-label { font-size:.78rem; color:#9ca3af; font-weight:500; }

// // // //         /* ── Quick access ── */
// // // //         .sec-lbl { font-size:.65rem; font-weight:700; color:#9ca3af; text-transform:uppercase; letter-spacing:.14em; margin:24px 0 10px; }
// // // //         .ql-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; }
// // // //         @media(max-width:1100px){ .ql-grid{ grid-template-columns:repeat(3,1fr); } }
// // // //         @media(max-width:600px) { .ql-grid{ grid-template-columns:repeat(2,1fr); } }
// // // //         @media(max-width:380px) { .ql-grid{ grid-template-columns:1fr; } }
// // // //         .ql { display:flex; align-items:center; gap:10px; background:#fff; border-radius:12px; padding:13px 15px; box-shadow:0 1px 5px rgba(0,0,0,.06); text-decoration:none; border:1.5px solid #f1f5f9; transition:transform .18s,box-shadow .18s,border-color .18s; animation:rise .45s ease both; min-width:0; }
// // // //         .ql:hover { transform:translateY(-2px); box-shadow:0 6px 18px rgba(0,0,0,.09); border-color:var(--a); }
// // // //         .ql-ico  { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
// // // //         .ql-lbl  { font-size:.77rem; font-weight:600; color:#1a1a2e; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
// // // //         .ql-arr  { opacity:.22; transition:opacity .18s; flex-shrink:0; }
// // // //         .ql:hover .ql-arr { opacity:.75; }

// // // //         /* ── Animations ── */
// // // //         @keyframes rise    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
// // // //         @keyframes shimmer { to{background-position:-200% 0} }
// // // //       `}</style>

// // // //       <div className="db">

// // // //         {/* ── Hero ── */}
// // // //         <div className="db-hero">
// // // //           <div className="hero-body">
// // // //             <div>
// // // //               <div className="hero-tag">Welcome back, {firstName}</div>
// // // //               <h1 className="hero-h1"> Customer Dashboard Overview</h1>
// // // //               <div className="hero-sub">Cookstove Programme · Field Data Management</div>
// // // //             </div>
// // // //             <div className="hero-pill">
// // // //               <div className="hero-dot" />
// // // //               <span className="hero-date">
// // // //                 {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
// // // //               </span>
// // // //             </div>
// // // //           </div>
// // // //         </div>

// // // //         {/* ── Two main panels ── */}
// // // //         <div className="main-panels">

// // // //           {/* Cookstoves Deployed */}
// // // //           <div className="mpanel" style={{ animationDelay: "80ms" }}>
// // // //             <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
// // // //               <div className="mpanel-title" style={{ margin: 0 }}>Cookstoves Deployed</div>
// // // //               <div className="cs-badge">{countsLoading ? "—" : `${pct}% Complete`}</div>
// // // //             </div>

// // // //             <div className="cs-stats">
// // // //               {/* Target */}
// // // //               <div className="cs-stat-target">
// // // //                 <div className="cs-val">{COOKSTOVE_TARGET.toLocaleString()}</div>
// // // //                 <div className="cs-stat-label">Target</div>
// // // //               </div>
// // // //               {/* Deployed */}
// // // //               <div className="cs-stat">
// // // //                 <div className="cs-val" style={{ color: "#2196F3" }}>
// // // //                   {countsLoading ? <span className="skel-sm" /> : deployed.toLocaleString()}
// // // //                 </div>
// // // //                 <div className="cs-stat-label">Deployed</div>
// // // //               </div>
// // // //               {/* This Month */}
// // // //               <div className="cs-stat">
// // // //                 <div className="cs-val" style={{ color: "#4CAF50" }}>
// // // //                   {thisMonthLoading ? <span className="skel-sm" /> : thisMonthBen.toLocaleString()}
// // // //                 </div>
// // // //                 <div className="cs-stat-label">This Month</div>
// // // //               </div>
// // // //             </div>

// // // //             {/* Progress bar */}
// // // //             <div className="cs-progress-wrap">
// // // //               <div className="cs-progress-track">
// // // //                 <div className="cs-progress-fill" style={{ width: `${pct}%` }} />
// // // //               </div>
// // // //               <div className="cs-remaining">
// // // //                 {countsLoading
// // // //                   ? "Loading..."
// // // //                   : `${remaining.toLocaleString()} cookstove${remaining !== 1 ? "s" : ""} remaining to reach target`
// // // //                 }
// // // //               </div>
// // // //             </div>
// // // //           </div>

// // // //           {/* Carbon Credits Generated */}
// // // //           <div className="mpanel" style={{ animationDelay: "140ms" }}>
// // // //             <div className="mpanel-title">Carbon Credits Generated</div>

// // // //             <div className="cc-big">
// // // //               <div className="cc-big-num">
// // // //                 {countsLoading ? <span className="skel" style={{ width: 80, height: 48 }} /> : totalCredits.toLocaleString()}
// // // //               </div>
// // // //               <div className="cc-big-label">Total Credits Generated</div>
// // // //             </div>

// // // //             <div className="cc-divider" />

// // // //             <div className="cc-month">
// // // //               <div className="cc-month-num">
// // // //                 {thisMonthLoading ? <span className="skel-sm" /> : thisMonthCredits.toLocaleString()}
// // // //               </div>
// // // //               <div className="cc-month-label">Credits this month</div>
// // // //             </div>
// // // //           </div>
// // // //         </div>
// // // //       </div>
// // // //     </>
// // // //   );
// // // // };

// // // // export default CustomerDashboard ;
