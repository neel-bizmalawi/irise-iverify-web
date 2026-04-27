import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config";
import {
  MapPin,
  Users,
  AlertCircle,
  Home,
  Download,
  TrendingUp,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US"));

const csvDownload = (rows, filename) => {
  const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
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

const Sk = ({ w = 80, h = 24, r = 5 }) => (
  <span
    style={{
      display: "inline-block",
      width: w,
      height: h,
      borderRadius: r,
      background: "linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)",
      backgroundSize: "200% 100%",
      animation: "dbShimmer 1.4s infinite",
    }}
  />
);

const StatCard = ({ icon: Icon, label, value, delta, deltaLabel, loading }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 14,
      padding: "18px 18px 16px",
      border: "1.5px solid #dcf0dc",
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
      minWidth: 0,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}
  >
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: 10,
        background: "#e8f5e9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={20} color="#2e7d32" strokeWidth={1.8} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: "#6b7280",
          textTransform: "uppercase",
          letterSpacing: "0.13em",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "clamp(20px,2.2vw,28px)",
          fontWeight: 800,
          color: "#111827",
          lineHeight: 1,
          marginBottom: 8,
          fontFamily: "'Inter',sans-serif",
        }}
      >
        {loading ? <Sk w={64} h={26} /> : fmt(value)}
      </div>
      {delta != null && !loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            flexWrap: "wrap",
          }}
        >
          <TrendingUp size={12} color="#16a34a" />
          <span style={{ color: "#16a34a", fontWeight: 700 }}>+{delta}%</span>
          <span style={{ color: "#9ca3af" }}>{deltaLabel}</span>
        </div>
      )}
    </div>
  </div>
);

const BAR_W = 200; // px per bar
const BAR_GAP = 20; // px between bars
const Y_AXIS = 44; // px for y-axis labels
const LBL_H = 30; // px for label row at bottom
const CHART_H = 320; // px for bar area

// Single bar with tooltip — overflow visible so tooltip shows above panel
const BarCol = ({ d, pct, barW }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      style={{
        width: barW,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        position: "relative",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip — shown above bar via fixed position trick */}

      {/* Value label above bar */}
      {hovered && d.v > 0 && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#374151",
            marginBottom: 3,
            lineHeight: 1,
            textAlign: "center",
          }}
        >
          {fmt(d.v)}
        </div>
      )}
      {/* Green bar */}
      <div
        style={{
          width: "60%",
          minWidth: 12,
          height: `${pct}%`,
          background: hovered ? "#1b5e20" : "#2e7d32",
          borderRadius: "5px 5px 0 0",
          transition:
            "height 0.9s cubic-bezier(.22,.68,0,1.2), background 0.15s",
          minHeight: d.v > 0 ? 4 : 0,
        }}
      />
    </div>
  );
};

const BarChart = ({ data = [] }) => {
  if (!data.length)
    return (
      <div
        style={{
          height: CHART_H + LBL_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "#9ca3af" }}>No data</span>
      </div>
    );

  const max = Math.max(...data.map((d) => d.v), 1);
  const gridMax = Math.ceil(max / 20) * 20 || 20;
  // 5 grid lines: top, 75%, 50%, 25%, 0
  const gridLines = [
    gridMax,
    Math.round(gridMax * 0.75),
    Math.round(gridMax * 0.5),
    Math.round(gridMax * 0.25),
    0,
  ];
  // total scrollable width
  const scrollW =
    Y_AXIS + data.length * BAR_W + Math.max(0, data.length - 1) * BAR_GAP + 8;
  const totalH = CHART_H + LBL_H; // total panel content height

  return (
    // Outer wrapper — overflow visible so tooltips aren't clipped
    <div style={{ position: "relative", overflow: "visible" }}>
      {/* Scrollable container — clips only horizontally */}
      <div
        className="db-bar-scroll"
        style={{
          overflowX: "auto",
          overflowY: "visible", // VISIBLE so tooltip shows above panel edge
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Inner fixed-width content */}
        <div
          style={{ minWidth: scrollW, height: totalH, position: "relative" }}
        >
          {/* ── Y-axis grid lines (behind bars) ── */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: CHART_H,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              pointerEvents: "none",
            }}
          >
            {gridLines.map((g, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                    width: Y_AXIS - 6,
                    textAlign: "right",
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  {g}
                </span>
                <div style={{ flex: 1, borderTop: "1px dashed #c8e6c9" }} />
              </div>
            ))}
          </div>

          {/* ── Bars row ── */}
          <div
            style={{
              position: "absolute",
              left: Y_AXIS,
              top: 0,
              height: CHART_H,
              display: "flex",
              alignItems: "flex-end",
              gap: BAR_GAP,
            }}
          >
            {data.map((d, i) => {
              const pct = Math.max((d.v / gridMax) * 100, d.v > 0 ? 2 : 0);
              return <BarCol key={i} d={d} pct={pct} barW={BAR_W} />;
            })}
          </div>

          {/* ── Labels row — directly below bars, no gap ── */}
          <div
            style={{
              position: "absolute",
              left: Y_AXIS,
              top: CHART_H,
              height: LBL_H,
              display: "flex",
              alignItems: "flex-start",
              gap: BAR_GAP,
              paddingTop: 6,
            }}
          >
            {data.map((d, i) => (
              <div
                key={i}
                style={{ width: BAR_W, flexShrink: 0, textAlign: "center" }}
              >
                <span
                  title={d.fullLabel || d.l}
                  style={{
                    fontSize: 10,
                    color: "#6b7280",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "block",
                    maxWidth: "100%",
                  }}
                >
                  {d.l}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Horizontal Bar row with tooltip on truncated label
// ─────────────────────────────────────────────────────────────────────────────
const HBar = ({ label, fullLabel, value, max }) => {
  const [hov, setHov] = React.useState(false);
  const isTrunc = (fullLabel || label) !== label || label.endsWith("…");
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          gap: 8,
        }}
      >
        <div
          style={{ position: "relative", flex: 1, minWidth: 0 }}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
        >
          <span
            title={fullLabel || label}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#111827",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "block",
            }}
          >
            {label}
          </span>
          {hov && isTrunc && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 5px)",
                left: 0,
                zIndex: 999,
                background: "#1f2937",
                color: "#fff",
                fontSize: 12,
                fontWeight: 500,
                padding: "5px 10px",
                borderRadius: 6,
                whiteSpace: "nowrap",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                pointerEvents: "none",
              }}
            >
              {fullLabel || label}
              <div
                style={{
                  position: "absolute",
                  top: -5,
                  left: 10,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderBottom: "5px solid #1f2937",
                }}
              />
            </div>
          )}
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#111827",
            fontFamily: "'Inter',sans-serif",
            flexShrink: 0,
          }}
        >
          {fmt(value)}
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "#e5e7eb",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(((value || 0) / (max || 1)) * 100, 100)}%`,
            height: "100%",
            background: "#2e7d32",
            borderRadius: 99,
            transition: "width 1.3s cubic-bezier(.22,.68,0,1)",
          }}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// White panel card
// ─────────────────────────────────────────────────────────────────────────────
const Panel = ({ children, delay = 0, style = {}, overflowVis = false }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 16,
      padding: "20px 22px 22px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
      animationDelay: `${delay}ms`,
      animation: "dbFadeUp 0.4s ease both",
      minWidth: 0,
      overflow: overflowVis ? "visible" : "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);

const PanelHead = ({ title, subtitle, badge, onDL }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: subtitle ? 4 : 16,
      gap: 8,
      flexWrap: "wrap",
    }}
  >
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "#111827",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          lineHeight: 1.35,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 11,
            color: "#9ca3af",
            marginTop: 3,
            marginBottom: 6,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}
    >
      {badge && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: "#2e7d32",
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#2e7d32",
              display: "inline-block",
            }}
          />
          {badge}
        </span>
      )}
      {onDL && (
        <button
          onClick={onDL}
          title="Download CSV"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <Download size={15} color="#6b7280" />
        </button>
      )}
    </div>
  </div>
);

const ChartSkel = ({ h = 200 }) => (
  <div
    style={{
      height: h,
      background: "linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)",
      backgroundSize: "200% 100%",
      animation: "dbShimmer 1.4s infinite",
      borderRadius: 8,
    }}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const width = useWindowWidth();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const isDesktop = width >= 1024;
  const userName =
    (typeof localStorage !== "undefined" && localStorage.getItem("userName")) ||
    "Admin";

  // ── State ───────────────────────────────────────────────────────────────────
  const [counts, setCounts] = useState({
    registration: null,
    distribution: null,
    identification: null,
    totalDeployment: null,
  });
  const [countsLoading, setCountsLoading] = useState(true);
  const [monthData, setMonthData] = useState({ value: null, pct: null });
  const [monthLoading, setMonthLoading] = useState(true);
  const [taChartData, setTaChartData] = useState([]);
  const [districtHBarData, setDistrictHBarData] = useState([]);
  const [taHBarData, setTaHBarData] = useState([]);
  const [customerData, setCustomerData] = useState({
    catona: 0,
    other: 0,
    total: 0,
    pct: 0,
  });
  const [cookingMethodData, setCookingMethodData] = useState([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const allBenRef = useRef([]);
  const allSitesRef = useRef([]);

  // ── fetchCounts ─────────────────────────────────────────────────────────────

  const fetchCounts = useCallback(async () => {
    setCountsLoading(true);
    try {
      const [sites, bens, missID, households] = await Promise.allSettled([
        axios.post(
          `${API_BASE_URL}/training-site/list`,
          { filters: [] },
          { params: { page: 1, limit: 1 } },
        ),
        axios.post(
          `${API_BASE_URL}/beneficiary/list`,
          { filters: [] },
          { params: { page: 1, limit: 1 } },
        ),
        axios.get(`${API_BASE_URL}/beneficiary/get_miss_natinoID`),
        axios.get(`${API_BASE_URL}/beneficiary/get_household_count`),
      ]);
      const registration =
        sites.status === "fulfilled"
          ? (sites.value.data?.totalRecords ?? 0)
          : 0;
      const distribution =
        bens.status === "fulfilled" ? (bens.value.data?.totalRecords ?? 0) : 0;

      const missData = missID.status === "fulfilled" ? missID.value.data : null;
      const identification = missData?.data ?? 0;

      const hhData =
        households.status === "fulfilled" ? households.value.data : null;
      const totalDeployment = hhData?.data ?? 0;
      setCounts({
        registration,
        distribution,
        identification,
        totalDeployment,
      });
    } catch (e) {
      console.error("fetchCounts:", e);
    } finally {
      setCountsLoading(false);
    }
  }, []);

  // ── computeMonthData — client-side, no date filter API calls ────────────────
  const computeMonthData = useCallback((beneficiaries) => {
    setMonthLoading(true);
    try {
      const now = new Date();
      const thisMonthStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0,
        0,
        0,
        0,
      );
      const prevMonthStart = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
        0,
        0,
        0,
        0,
      );
      const parseDate = (raw) => {
        if (!raw) return null;
        const d = new Date(raw);
        return isNaN(d.getTime()) ? null : d;
      };
      const thisCount = beneficiaries.filter((r) => {
        const d = parseDate(r.created_date);
        return d && d >= thisMonthStart;
      }).length;
      const prevCount = beneficiaries.filter((r) => {
        const d = parseDate(r.created_date);
        return d && d >= prevMonthStart && d < thisMonthStart;
      }).length;
      const pct =
        prevCount > 0
          ? +(((thisCount - prevCount) / prevCount) * 100).toFixed(1)
          : null;
      setMonthData({ value: thisCount, pct });
    } catch (e) {
      console.error("computeMonthData:", e);
      setMonthData({ value: 0, pct: null });
    } finally {
      setMonthLoading(false);
    }
  }, []);

  // ── Bulk fetches ─────────────────────────────────────────────────────────────
  const fetchAllBeneficiaries = useCallback(async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/beneficiary/list`,
        { filters: [] },
        { params: { page: 1, limit: 100000 } },
      );
      return res.data?.data ?? [];
    } catch {
      return [];
    }
  }, []);

  const fetchAllTrainingSites = useCallback(async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/training-site/list`,
        { filters: [] },
        { params: { page: 1, limit: 100000 } },
      );
      return res.data?.data ?? [];
    } catch {
      return [];
    }
  }, []);

  // ── buildChartData ──────────────────────────────────────────────────────────
  // ── Fetch T/A Data ─────────────────────────────
  const fetchTAData = useCallback(async () => {
    try {
      const res = await axios.get(
        "http://192.168.0.106:3001/training-site/authority_count_slug",
      );

      const data = res.data?.data || [];

      const formatted = data
        .sort((a, b) => b.trainingSiteCount - a.trainingSiteCount)
        .map((item) => ({
          label:
            (item.authority_name || "Unknown").length > 14
              ? item.authority_name.substring(0, 13) + "…"
              : item.authority_name || "Unknown",
          fullLabel: item.authority_name || "Unknown",
          value: item.trainingSiteCount || 0,
        }));

      setTaHBarData(formatted);
    } catch (e) {
      console.error("fetchTAData:", e);
      setTaHBarData([]);
    }
  }, []);

  // ── Fetch District Data ─────────────────────────
  const fetchDistrictData = useCallback(async () => {
    try {
      const res = await axios.get(
        "http://192.168.0.106:3001/training-site/district_count_slug",
      );

      const data = res.data?.data || [];

      const formatted = data
        .sort((a, b) => b.trainingSiteCount - a.trainingSiteCount)
        .map((item) => ({
          label:
            (item.district_name || "Unknown").length > 16
              ? item.district_name.substring(0, 15) + "…"
              : item.district_name || "Unknown",
          fullLabel: item.district_name || "Unknown",
          value: item.trainingSiteCount || 0,
        }));

      setDistrictHBarData(formatted);
    } catch (e) {
      console.error("fetchDistrictData:", e);
      setDistrictHBarData([]);
    }
  }, []);
  const buildChartData = useCallback((beneficiaries, trainingSites) => {
    const siteMap = {};
    trainingSites.forEach((s) => {
      if (s.training_site) siteMap[s.training_site] = s;
    });

    // ── Fetch T/A Data from API ─────────────────────────────
    // const fetchTAData = useCallback(async () => {
    //   try {
    //     const res = await axios.get(
    //       "http://192.168.0.106:3001/training-site/authority_count_slug",
    //     );

    //     const data = res.data?.data || [];

    //     const formatted = data
    //       .sort((a, b) => b.count - a.count)
    //       .map((item) => ({
    //         label:
    //           item.traditional_authority.length > 14
    //             ? item.traditional_authority.substring(0, 13) + "…"
    //             : item.traditional_authority,
    //         fullLabel: item.traditional_authority,
    //         value: item.count,
    //       }));

    //     setTaHBarData(formatted);
    //   } catch (e) {
    //     console.error("fetchTAData:", e);
    //     setTaHBarData([]);
    //   }
    // }, []);

    // // ── Fetch District Data from API ─────────────────────────
    // const fetchDistrictData = useCallback(async () => {
    //   try {
    //     const res = await axios.get(
    //       "http://192.168.0.106:3001/training-site/district_count_slug",
    //     );

    //     const data = res.data?.data || [];

    //     const formatted = data
    //       .sort((a, b) => b.count - a.count)
    //       .map((item) => ({
    //         label:
    //           item.district.length > 16
    //             ? item.district.substring(0, 15) + "…"
    //             : item.district,
    //         fullLabel: item.district,
    //         value: item.count,
    //       }));

    //     setDistrictHBarData(formatted);
    //   } catch (e) {
    //     console.error("fetchDistrictData:", e);
    //     setDistrictHBarData([]);
    //   }
    // }, []);

    // Cooking method bar chart — group beneficiaries by cooking_method
    const cookMap = {};
    beneficiaries.forEach((r) => {
      const m =
        r.cooking_method &&
        r.cooking_method.trim() &&
        r.cooking_method !== "-" &&
        r.cooking_method !== "null"
          ? r.cooking_method.trim()
          : "Not Specified";
      cookMap[m] = (cookMap[m] || 0) + 1;
    });
    setCookingMethodData(
      Object.entries(cookMap)
        .sort((a, b) => b[1] - a[1])
        .map(([label, v]) => ({
          l: label.length > 14 ? label.substring(0, 13) + "…" : label,
          fullLabel: label,
          v,
        })),
    );
    // Keep customerData for CSV download
    const withCooking = beneficiaries.filter(
      (r) =>
        r.cooking_method &&
        r.cooking_method.trim() &&
        r.cooking_method !== "-" &&
        r.cooking_method !== "null",
    ).length;
    const total = beneficiaries.length || 1;
    setCustomerData({
      catona: withCooking,
      other: total - withCooking,
      total,
      pct: Math.round((withCooking / total) * 100),
    });
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setChartsLoading(true);
      await fetchCounts();
      const bens = await fetchAllBeneficiaries();

      await Promise.all([fetchTAData(), fetchDistrictData()]);
      allBenRef.current = bens;
      buildChartData(bens, []);
      computeMonthData(bens);
      setChartsLoading(false);
    })();
  }, []);

  // ── CSV ──────────────────────────────────────────────────────────────────────
  const dl = {
    taChart: () =>
      csvDownload(
        [
          ["T/A", "Count"],
          ...taChartData.map((d) => [d.fullLabel || d.l, d.v]),
        ],
        "ta_bar.csv",
      ),

    district: () =>
      csvDownload(
        [
          ["District", "Count"],
          ...districtHBarData.map((d) => [d.fullLabel || d.label, d.value]),
        ],
        "district.csv",
      ),
    taHBar: () =>
      csvDownload(
        [
          ["T/A", "Count"],
          ...taHBarData.map((d) => [d.fullLabel || d.label, d.value]),
        ],
        "ta_bar.csv",
      ),
    customer: () =>
      csvDownload(
        [
          ["Cooking Method", "Count"],
          ...cookingMethodData.map((d) => [d.fullLabel || d.l, d.v]),
        ],
        "cooking_method.csv",
      ),
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const distMax = Math.max(...districtHBarData.map((d) => d.value), 1);
  const taHMax = Math.max(...taHBarData.map((d) => d.value), 1);
  const catonaPct = customerData.pct ?? 0;

  // ── Layout ────────────────────────────────────────────────────────────────────
  const cardCols = isDesktop
    ? "repeat(4,1fr)"
    : isTablet
      ? "repeat(2,1fr)"
      : "repeat(2,1fr)";
  const chartsCols = width >= 900 ? "1.6fr 1fr" : "1fr";
  const heroPad = isMobile ? "20px 16px 22px" : "28px 28px 30px";
  const contentPad = isMobile ? "14px 12px 40px" : "20px 20px 40px";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; }
        .db-root { font-family: 'Inter', sans-serif; background: #f0faf0; min-height: 100vh; }
        @keyframes dbShimmer  { 0%  { background-position: 200% 0; }  100% { background-position: -200% 0; } }
        @keyframes dbFadeUp   { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .charts-wrap { background: #e8f5e9; border-radius: 20px; padding: 16px; }
        /* Hide scrollbars everywhere — scroll still works */
        .db-bar-scroll::-webkit-scrollbar  { display: none; }
        .db-hbar-scroll::-webkit-scrollbar { display: none; }
        @media (max-width: 480px) {
          .db-stat-grid  { grid-template-columns: repeat(2,1fr) !important; }
          .db-chart-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="db-root">
        {/* ── Hero ── */}
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
                fontSize: isMobile ? 20 : isTablet ? 24 : 28,
                fontWeight: 800,
                margin: 0,
                lineHeight: 1.25,
              }}
            >
              Here's what's happening today
            </h1>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: contentPad }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#111827",
              marginBottom: 14,
            }}
          >
            Today's Deployment Summary
          </div>

          {/* Stat cards */}
          <div
            className="db-stat-grid"
            style={{
              display: "grid",
              gridTemplateColumns: cardCols,
              gap: isMobile ? 10 : 14,
              marginBottom: 20,
            }}
          >
            <StatCard
              icon={MapPin}
              label="Training Sites"
              value={counts.registration}
              delta={null}
              loading={countsLoading}
            />
            <StatCard
              icon={Users}
              label="Beneficiaries"
              value={counts.distribution}
              delta={null}
              loading={countsLoading}
            />
            <StatCard
              icon={AlertCircle}
              label="Missing National ID"
              value={counts.identification}
              delta={null}
              loading={countsLoading}
            />
            <StatCard
              icon={Home}
              label="Total Households"
              value={counts.totalDeployment}
              delta={null}
              loading={countsLoading}
            />
          </div>

          {/* ── Charts section ── */}
          <div className="charts-wrap">
            {/* Row 1 — Bar chart + District HBar */}
            <div
              className="db-chart-grid"
              style={{
                display: "grid",
                gridTemplateColumns: chartsCols,
                gap: 16,
                marginBottom: 16,
              }}
            >
              {/* Deployment By T/A — horizontally scrollable bar chart */}
              <Panel delay={60}>
                <PanelHead title="Deployment By T/A" onDL={dl.taHBar} />
                {chartsLoading ? (
                  <ChartSkel h={200} />
                ) : taHBarData.length === 0 ? (
                  <div
                    style={{
                      color: "#9ca3af",
                      fontSize: 13,
                      textAlign: "center",
                      padding: "30px 0",
                    }}
                  >
                    No T/A data
                  </div>
                ) : (
                  <div
                    className="db-hbar-scroll"
                    style={{
                      maxHeight: 320,
                      overflowY: "auto",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    {taHBarData.map((d) => (
                      <HBar
                        key={d.label}
                        label={d.label}
                        fullLabel={d.fullLabel}
                        value={d.value}
                        max={taHMax}
                      />
                    ))}
                  </div>
                )}
              </Panel>

              {/* Deployment By District */}
              <Panel delay={100}>
                <PanelHead title="Deployment By District" onDL={dl.district} />
                {chartsLoading ? (
                  <ChartSkel h={200} />
                ) : districtHBarData.length === 0 ? (
                  <div
                    style={{
                      color: "#9ca3af",
                      fontSize: 13,
                      textAlign: "center",
                      padding: "30px 0",
                    }}
                  >
                    No district data
                  </div>
                ) : (
                  <div
                    className="db-hbar-scroll"
                    style={{
                      maxHeight: 320,
                      overflowY: "auto",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                    }}
                  >
                    {districtHBarData.map((d) => (
                      <HBar
                        key={d.label}
                        label={d.label}
                        fullLabel={d.fullLabel}
                        value={d.value}
                        max={distMax}
                      />
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            {/* Row 2  */}
            <div>
              <Panel delay={140} style={{ height: "auto" }} overflowVis={true}>
                <PanelHead
                  title="Deployment By Customer"
                  subtitle="Cooking method distribution"
                  onDL={dl.customer}
                />
                {chartsLoading ? (
                  <ChartSkel h={50} />
                ) : (
                  <BarChart data={cookingMethodData} />
                )}
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
