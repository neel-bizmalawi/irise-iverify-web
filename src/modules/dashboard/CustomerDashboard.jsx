import React, { useCallback, useEffect, useRef, useState } from "react"
import axios from "axios"
import { API_BASE_URL } from "../../config"
import "leaflet/dist/leaflet.css"
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet"
import L from "leaflet"
import {
  Baby,
  Download,
  Mars,
  TrendingUp,
  UserRound,
  Venus,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL CONSTANTS — update these to match your programme targets
// ─────────────────────────────────────────────────────────────────────────────
const CREDITS_PER_STOVE = 8.6688 // carbon credits per stove
const AVG_SAVINGS_MWK = 3000 // fallback if no monitoring savings data
const AVG_WOOD_KG = 4.53 // fallback if no monitoring fuel data
const TREES_FALLBACK = 38 // fallback trees saved per month
const SHOW_MONITORING_CARDS = false // keep Environmental, Economic, Health hidden for now
const BENEFICIARY_MARKER_ICON = L.divIcon({
  className: "beneficiary-map-marker",
  html: `<span class="beneficiary-map-marker-pin"></span>`,
  iconSize: [22, 28],
  iconAnchor: [11, 28],
  popupAnchor: [0, -26],
})
const getClusterMarkerIcon = (count) =>
  L.divIcon({
    className: "beneficiary-map-cluster",
    html: `<span class="beneficiary-map-cluster-dot">${Number(count || 0).toLocaleString("en-US")}</span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
  })
// ─────────────────────────────────────────────────────────────────────────────
// APIs USED IN THIS DASHBOARD:
//
//  1. GET /customer/dashboard-summary
//     → aggregated dashboard metrics, gender totals, carbon monthly bars,
//       and map locations without loading the full beneficiary table.
//
//  2. POST /monitoring/list  { filters:[] } ?page=1&limit=100000
//     → data[].health_better_air === "yes"  → Health gauge %
//     → data[].savings_3_months             → Economic avg savings
//     → data[].est_fuel_last3meals_kg       → Environmental avg wood saved
//
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("en-US"))
const fmtDec = (n, d = 2) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("en-US", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      })

const toCoordinate = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const getBeneficiaryLocations = (rows = []) => {
  const mapped = rows
    .map((row, index) => {
      const lat = toCoordinate(row.latitude)
      const lng = toCoordinate(row.longitude)
      if (lat == null || lng == null) return null
      return {
        id: row.beneficiary_id ?? row.id ?? `beneficiary-${index}`,
        name:
          [row.first_name, row.last_name].filter(Boolean).join(" ") ||
          row.name ||
          "Beneficiary",
        trainingSite:
          row.training_site_name ?? row.training_site ?? row.training_site_id ?? null,
        mobile: row.mobile_no ?? row.mobile ?? row.contact_no ?? null,
        lat,
        lng,
      }
    })
    .filter(Boolean)

  return mapped
}

const getAuthConfig = () => {
  const token =
    typeof localStorage !== "undefined" ? localStorage.getItem("token") : null
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {}
}

const normalizeMapClusters = (rows = []) =>
  rows
    .map((row, index) => {
      const lat = toCoordinate(row.latitude)
      const lng = toCoordinate(row.longitude)
      if (lat == null || lng == null) return null
      return {
        id: row.id ?? `cluster-${index}`,
        lat,
        lng,
        count: Number(row.count ?? row.total ?? 0),
      }
    })
    .filter(Boolean)

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "April",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

const parseMonthKey = (value) => {
  const raw = String(value ?? "")
  const match = raw.match(/^(\d{4})-(\d{1,2})/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || month < 1 || month > 12) return null
  return { year, month, sort: year * 100 + month, label: MONTH_LABELS[month - 1] }
}

const normalizeCarbonBars = (rows = []) =>
  rows
    .map((row) => {
      const monthValue =
        row.l ?? row.month ?? row.label ?? row.yearMonth ?? row.year_month ?? ""
      const parsedMonth = parseMonthKey(monthValue)
      const beneficiaryCount = Number(
        row.count ?? row.beneficiaryCount ?? row.beneficiary_count ?? 0,
      )
      const value = Number(
        row.v ??
          row.value ??
          row.credits ??
          row.carbonCredits ??
          row.carbon_credits ??
          row.totalCredits ??
          row.total_credits ??
          row.total ??
          (beneficiaryCount ? beneficiaryCount * CREDITS_PER_STOVE : 0),
      )

      return {
        l: parsedMonth?.label ?? monthValue,
        v: Number.isFinite(value) ? value : 0,
        sort: parsedMonth?.sort ?? 0,
      }
    })
    .sort((a, b) => b.sort - a.sort)
    .map(({ l, v }) => ({ l, v }))

const normalizeDashboardSummary = (payload = {}) => {
  const source = payload.data ?? payload
  const gender = source.gender ?? {}
  const mapLocations =
    source.mapLocations ?? source.map_locations ?? source.locations ?? []
  const carbonCreditsByMonth =
    source.carbonCreditsByMonth ??
    source.carbon_credits_by_month ??
    source.monthlyBars ??
    []

  return {
    scope: source.scope ?? null,
    totalCookstovesDeployed: Number(
      source.totalCookstovesDeployed ??
        source.total_cookstoves_deployed ??
        source.totalBeneficiaries ??
        0,
    ),
    totalCarbonCredits: Number(
      source.totalCarbonCredits ?? source.total_carbon_credits ?? 0,
    ),
    estimatedTco2eReduction: Number(
      source.estimatedTco2eReduction ??
        source.estimated_tco2e_reduction ??
        source.totalCarbonCredits ??
        source.total_carbon_credits ??
        0,
    ),
    totalPeopleImpacted: Number(
      source.totalPeopleImpacted ?? source.total_people_impacted ?? 0,
    ),
    verifiedHouseholds: Number(
      source.verifiedHouseholds ??
        source.verified_households ??
        source.totalCookstovesDeployed ??
        source.total_cookstoves_deployed ??
        0,
    ),
    mapLocationCount: Number(
      source.mapLocationCount ?? source.map_location_count ?? mapLocations.length ?? 0,
    ),
    deployedLast3Months:
      source.deployedLast3Months ??
      source.deployed_last_3_months ??
      source.last3MonthsCount ??
      0,
    gender: {
      girlsBelow18: Number(
        gender.girlsBelow18 ?? gender.girls_below_18 ?? gender.females_below_18 ?? 0,
      ),
      boysBelow18: Number(
        gender.boysBelow18 ?? gender.boys_below_18 ?? gender.males_below_18 ?? 0,
      ),
      adultWomen18Plus: Number(
        gender.adultWomen18Plus ??
          gender.adult_women_18_plus ??
          gender.females_above_18 ??
          0,
      ),
      adultMen18Plus: Number(
        gender.adultMen18Plus ??
          gender.adult_men_18_plus ??
          gender.males_above_18 ??
          0,
      ),
    },
    carbonCreditsByMonth: normalizeCarbonBars(carbonCreditsByMonth),
  }
}

const EMPTY_DASHBOARD_SUMMARY = normalizeDashboardSummary()

const getDashboardSummaryParams = (selectedCustomerId) => {
  const customerId =
    selectedCustomerId ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("customer_id")
      : "")
  return customerId ? { customer_id: customerId } : {}
}

const csvDL = (rows, name) => {
  const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], {
    type: "text/csv",
  })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: name,
  })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const useWindowWidth = () => {
  const [w, setW] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  )
  useEffect(() => {
    const h = () => setW(window.innerWidth)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])
  return w
}

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
)

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
)

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
)

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
)

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
    cy = size / 2
  const circ = 2 * Math.PI * r
  const tot = segments.reduce((s, x) => s + (x.value || 0), 0) || 1
  const preparedSegments = segments.reduce(
    (acc, seg) => {
      const dash = ((seg.value || 0) / tot) * circ
      acc.items.push({ ...seg, dash, offset: acc.offset })
      acc.offset += dash
      return acc
    },
    { items: [], offset: 0 },
  ).items

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
      {preparedSegments.map((seg, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={seg.color}
          strokeWidth={sw}
          strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
          strokeDashoffset={-(seg.offset - circ * 0.25)}
          style={{
            transition: "stroke-dasharray 1.2s cubic-bezier(.22,.68,0,1)",
          }}
        />
      ))}
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
  )
}

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
    )
  const max = Math.max(...data, 1)
  const min = 0
  const rng = max - min || 1
  const pts = data.map(
    (v, i) =>
      `${(i / (data.length - 1)) * w},${h - ((v - min) / rng) * (h - 10) - 5}`,
  )
  const [lx, ly] = pts[pts.length - 1].split(",").map(Number)
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
  )
}

// ── Carbon Credits Bar Chart ──────────────────────────────────────────────────
const CarbonBar = ({ data = [], height = 220 }) => {
  if (!data.length)
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 12, color: "#9ca3af" }}>No data yet</span>
      </div>
    )
  const max = Math.max(...data.map((d) => d.v), 1)
  const gridMax = Math.ceil(max / 20) * 20 || 80
  const plotTop = 10
  const labelHeight = 26
  const axisWidth = 36
  const plotHeight = height - plotTop - labelHeight
  const steps = [
    gridMax,
    Math.round(gridMax * 0.67),
    Math.round(gridMax * 0.33),
    0,
  ]
  return (
    <div
      style={{
        position: "relative",
        height,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: plotTop,
          height: plotHeight,
          pointerEvents: "none",
        }}
      >
        {steps.map((g) => {
          const y = ((gridMax - g) / gridMax) * plotHeight
          return (
            <div
              key={g}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: y,
                display: "flex",
                alignItems: "center",
                gap: 5,
                transform: "translateY(-50%)",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  width: axisWidth - 8,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {Number(g).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
              <div style={{ flex: 1, borderTop: "1px dashed #e8f5e9" }} />
            </div>
          )
        })}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "end",
          gap: 8,
          height: plotHeight,
          marginTop: plotTop,
          marginLeft: axisWidth,
          paddingRight: 4,
          position: "relative",
          zIndex: 1,
        }}
      >
        {data.map((d, i) => {
          const pct = Math.max((d.v / gridMax) * 100, d.v > 0 ? 5 : 0)
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
                alignSelf: "stretch",
                height: "100%",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div
                title={`${d.l}: ${Number(d.v).toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })} credits`}
                style={{
                  width: "48%",
                  background: "#2e7d32",
                  borderRadius: "4px 4px 0 0",
                  height: `${pct}%`,
                  transition: "height 0.9s cubic-bezier(.22,.68,0,1.2)",
                  minWidth: 10,
                  alignSelf: "flex-end",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: "100%",
                  marginTop: 8,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  fontSize: 10,
                  color: "#6b7280",
                  whiteSpace: "nowrap",
                }}
              >
                {d.l}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const MapViewportLoader = ({ onViewportChange }) => {
  const map = useMapEvents({
    moveend: () => onViewportChange(map),
    zoomend: () => onViewportChange(map),
  })

  useEffect(() => {
    onViewportChange(map)
  }, [map, onViewportChange])

  return null
}

const BeneficiaryMap = ({
  height = 240,
  scrollWheelZoom = false,
  selectedCustomerId = "",
  userRole = "",
}) => {
  const [mapData, setMapData] = useState({
    mode: "none",
    message: "",
    points: [],
    clusters: [],
    loading: false,
  })
  const debounceRef = useRef(null)
  const requestIdRef = useRef(0)
  const isAdmin = String(userRole).toLowerCase() === "admin"
  const shouldFetch = !isAdmin || Boolean(selectedCustomerId)
  const points = getBeneficiaryLocations(mapData.points)
  const clusters = normalizeMapClusters(mapData.clusters)
  const center = [-13.5, 34.3]

  const fetchMapLocations = useCallback(
    (map) => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)

      debounceRef.current = window.setTimeout(async () => {
        if (!shouldFetch) {
          setMapData({
            mode: "none",
            message: "Select a customer to view beneficiary locations",
            points: [],
            clusters: [],
            loading: false,
          })
          return
        }

        const bounds = map.getBounds()
        const requestId = requestIdRef.current + 1
        requestIdRef.current = requestId
        setMapData((current) => ({ ...current, loading: true }))

        try {
          const params = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
            zoom: map.getZoom(),
            ...(selectedCustomerId ? { customer_id: selectedCustomerId } : {}),
          }
          const res = await axios.get(`${API_BASE_URL}/customer/map-locations`, {
            ...getAuthConfig(),
            params,
          })
          if (requestIdRef.current !== requestId) return
          setMapData({
            mode: res.data?.mode ?? "none",
            message: res.data?.message ?? "",
            points: res.data?.points ?? [],
            clusters: res.data?.clusters ?? [],
            loading: false,
          })
        } catch (error) {
          if (requestIdRef.current !== requestId) return
          console.error("Map locations fetch error:", error)
          setMapData({
            mode: "none",
            message: "Unable to load beneficiary locations",
            points: [],
            clusters: [],
            loading: false,
          })
        }
      }, 350)
    },
    [selectedCustomerId, shouldFetch],
  )

  useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    },
    [],
  )

  return (
    <div
      style={{
        borderRadius: 10,
        overflow: "hidden",
        height,
        background: "#e8f5e9",
        position: "relative",
      }}
    >
      <MapContainer
        center={center}
        zoom={7}
        scrollWheelZoom={scrollWheelZoom}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewportLoader onViewportChange={fetchMapLocations} />
        {mapData.mode === "clusters" &&
          clusters.map((cluster) => (
            <Marker
              key={cluster.id}
              position={[cluster.lat, cluster.lng]}
              icon={getClusterMarkerIcon(cluster.count)}
            >
              <Popup>{fmt(cluster.count)} beneficiaries in this area</Popup>
            </Marker>
          ))}
        {mapData.mode === "points" &&
          points.map((point) => (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
              icon={BENEFICIARY_MARKER_ICON}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>
                    {point.name}
                  </div>
                  <div>Beneficiary ID: {point.id}</div>
                  {point.trainingSite && (
                    <div>Training Site: {point.trainingSite}</div>
                  )}
                  {point.mobile && <div>Mobile: {point.mobile}</div>}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
      {(mapData.loading || mapData.message) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#166534",
            fontSize: 13,
            fontWeight: 800,
            textAlign: "center",
            padding: 18,
            pointerEvents: "none",
          }}
        >
          {mapData.loading ? "Loading beneficiary locations..." : mapData.message}
        </div>
      )}
    </div>
  )
}

const getNiceDemographicAxisMax = (value) => {
  if (value <= 500) return 500
  if (value <= 1000) return 1000
  if (value <= 5000) return 5000
  return Math.ceil(value / 5000) * 5000
}

const DemographicIcon = ({ age = "adult", gender = "female" }) => {
  const BaseIcon = age === "child" ? Baby : UserRound
  const GenderIcon = gender === "female" ? Venus : Mars

  return (
    <span
      style={{
        position: "relative",
        width: 28,
        height: 28,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <BaseIcon size={24} strokeWidth={2.8} />
      <GenderIcon
        size={12}
        strokeWidth={3}
        style={{
          position: "absolute",
          right: -3,
          bottom: -2,
          background: "#e8f5e9",
          borderRadius: "50%",
        }}
      />
    </span>
  )
}

// ── Household Demographic Impact Chart ───────────────────────────────────────
const HouseholdDemographicChart = ({ rows = [] }) => {
  const visibleRows = rows.filter(
    (row) => (row.leftValue || 0) > 0 || (row.rightValue || 0) > 0,
  )
  const dataMax = Math.max(
    ...visibleRows.flatMap((row) => [row.leftValue || 0, row.rightValue || 0]),
    1,
  )
  const axisMax = getNiceDemographicAxisMax(dataMax)
  const max = axisMax
  const axisTicks = [
    axisMax,
    Math.round(axisMax * 0.75),
    Math.round(axisMax * 0.5),
    Math.round(axisMax * 0.25),
    0,
    Math.round(axisMax * 0.25),
    Math.round(axisMax * 0.5),
    Math.round(axisMax * 0.75),
    axisMax,
  ]
  const formatAxisTick = (value) => {
    if (value === 0) return "0"
    if (value < 1000) return fmt(value)
    const thousands = value / 1000
    return `${Number.isInteger(thousands) ? thousands : Number(thousands.toFixed(2))}K`
  }

  if (!visibleRows.length) {
    return (
      <div
        style={{
          minHeight: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#9ca3af",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        No demographic data yet
      </div>
    )
  }

  return (
    <div style={{ minWidth: 0, overflowX: "auto", paddingBottom: 4 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "180px minmax(120px,1fr) 2px minmax(120px,1fr) 180px",
          minWidth: 760,
          gap: 0,
          alignItems: "end",
          marginBottom: 18,
        }}
      >
        <div />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            color: "#229b42",
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: "0.08em",
          }}
        >
          FEMALE
          <Venus size={18} strokeWidth={3} />
        </div>
        <div />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            color: "#229b42",
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: "0.08em",
          }}
        >
          <Mars size={18} strokeWidth={3} />
          MALE
        </div>
        <div />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {visibleRows.map((row) => {
          const leftPct = ((row.leftValue || 0) / max) * 100
          const rightPct = ((row.rightValue || 0) / max) * 100

          return (
            <div
              key={`${row.leftLabel}-${row.rightLabel}`}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "180px minmax(120px,1fr) 2px minmax(120px,1fr) 180px",
                minWidth: 760,
                alignItems: "center",
                minHeight: 58,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: "#e8f5e9",
                    color: "#229b42",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {row.leftIcon}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#111827",
                      lineHeight: 1.2,
                    }}
                  >
                    {row.leftLabel}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginTop: 4,
                      fontWeight: 600,
                    }}
                  >
                    {row.leftSubLabel}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                {row.leftValue > 0 && (
                  <>
                    <span
                      style={{
                        color: "#26b34b",
                        fontSize: 14,
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmt(row.leftValue)}
                    </span>
                    <div
                      title={`${row.leftLabel}: ${fmt(row.leftValue)} beneficiaries`}
                      style={{
                        width: `${Math.max(leftPct, 4)}%`,
                        height: 38,
                        background:
                          "linear-gradient(90deg,#5ec777 0%,#27a84d 100%)",
                        borderRadius: "6px 0 0 6px",
                      }}
                    />
                  </>
                )}
              </div>

              <div
                style={{
                  width: 2,
                  height: 54,
                  background: "#d1d5db",
                  justifySelf: "center",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                {row.rightValue > 0 && (
                  <>
                    <div
                      title={`${row.rightLabel}: ${fmt(row.rightValue)} beneficiaries`}
                      style={{
                        width: `${Math.max(rightPct, 4)}%`,
                        height: 38,
                        background:
                          "linear-gradient(90deg,#1167d8 0%,#0b74e8 100%)",
                        borderRadius: "0 6px 6px 0",
                      }}
                    />
                    <span
                      style={{
                        color: "#1167d8",
                        fontSize: 14,
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {fmt(row.rightValue)}
                    </span>
                  </>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 12,
                  minWidth: 0,
                  paddingLeft: 14,
                }}
              >
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#111827",
                      lineHeight: 1.2,
                    }}
                  >
                    {row.rightLabel}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginTop: 4,
                      fontWeight: 600,
                    }}
                  >
                    {row.rightSubLabel}
                  </div>
                </div>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: "#e8f5e9",
                    color: "#229b42",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {row.rightIcon}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "180px minmax(120px,1fr) 2px minmax(120px,1fr) 180px",
          minWidth: 760,
          marginTop: 12,
        }}
      >
        <div />
        <div style={{ gridColumn: "2 / 5" }}>
          <div
            style={{
              position: "relative",
              height: 14,
              gridTemplateColumns: "repeat(8,1fr)",
            }}
          >
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                style={{
                  position: "absolute",
                  left: `${(index / 8) * 100}%`,
                  top: 0,
                  width: 1,
                  height: 12,
                  background: "#d1d5db",
                  transform: "translateX(-0.5px)",
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                borderTop: "1px solid #d1d5db",
              }}
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(9,1fr)",
              color: "#374151",
              fontSize: 13,
              fontWeight: 800,
              marginTop: 2,
            }}
          >
            {axisTicks.map((tick, index) => (
              <span
                key={`${tick}-${index}`}
                style={{
                  textAlign:
                    index === 0
                      ? "left"
                      : index === axisTicks.length - 1
                        ? "right"
                        : "center",
                }}
              >
                {formatAxisTick(tick)}
              </span>
            ))}
          </div>
          <div
            style={{
              textAlign: "center",
              color: "#6b7280",
              fontSize: 13,
              fontWeight: 700,
              marginTop: 12,
            }}
          >
            Number of People
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Health Gauge (orange arc) ─────────────────────────────────────────────────
const HealthGauge = ({ pct = 0 }) => {
  const r = 40,
    cx = 55,
    cy = 55
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
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
  )
}

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
)
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
)
const IcoReduction = () => (
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
    <path d="M12 2v20" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7H14a3.5 3.5 0 010 7H6" />
    <path d="M19 14l3 3-3 3" />
  </svg>
)
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
)

// ── Top Stat Card ─────────────────────────────────────────────────────────────
const StatCard = ({
  icon: Icon,
  label,
  mainValue,
  mainSuffix,
  recentValue,
  recentLabel = "In the Last 3 months",
  loading,
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
        {React.createElement(Icon)}
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
    {loading ? (
      <div style={{ textAlign: "center", margin: "18px 0 22px" }}>
        <Sk w={120} h={38} />
      </div>
    ) : (
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
          textAlign: "center",
          margin: "18px 0 22px",
        }}
      >
        <span
          style={{
            fontSize: "clamp(26px,3.2vw,38px)",
            fontWeight: 900,
            color: "#35c96d",
            lineHeight: 1,
            fontFamily: "'DM Mono',monospace",
            letterSpacing: 0,
          }}
        >
          {mainValue}
        </span>
        {mainSuffix && (
          <span
            style={{
              fontSize: "clamp(12px,1.2vw,16px)",
              fontWeight: 900,
              color: "#111827",
              lineHeight: 1.1,
              textAlign: "left",
            }}
          >
            {mainSuffix}
          </span>
        )}
      </div>
    )}
    {recentValue != null && (
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 8,
          flexWrap: "wrap",
          color: "#4a4a4a",
          fontSize: "clamp(11px,1vw,13px)",
          fontWeight: 700,
          lineHeight: 1.25,
        }}
      >
        <span style={{ color: "#35c96d", fontWeight: 800 }}>
          {loading ? <Sk w={58} h={16} /> : recentValue}
        </span>
        <span>{recentLabel}</span>
      </div>
    )}
  </Panel>
)

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CustomerDashboard
// ─────────────────────────────────────────────────────────────────────────────
const CustomerDashboard = () => {
  const width = useWindowWidth()
  const isMobile = width < 640
  const userName =
    (typeof localStorage !== "undefined" && localStorage.getItem("userName")) ||
    "Customer"
  const userRole =
    (typeof localStorage !== "undefined" && localStorage.getItem("role")) || ""
  const isAdmin = String(userRole).toLowerCase() === "admin"

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [dashboardSummary, setDashboardSummary] = useState(EMPTY_DASHBOARD_SUMMARY)
  const [allMonitoring, setAllMonitoring] = useState([])
  const [customerOptions, setCustomerOptions] = useState([])
  const [selectedMapCustomerId, setSelectedMapCustomerId] = useState(
    () =>
      (typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("customer_id")) ||
      "",
  )
  const [mapModalOpen, setMapModalOpen] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    ;(async () => {
      try {
        const res = await axios.post(
          `${API_BASE_URL}/customer/list`,
          { filters: [] },
          { ...getAuthConfig(), params: { page: 1, limit: 1000 } },
        )
        setCustomerOptions(
          (res.data?.data ?? []).map((customer) => ({
            id:
              customer.adminID ??
              customer.customer_id ??
              customer.customerID ??
              customer.id,
            label:
              customer.name ??
              customer.customer_name ??
              customer.user_name ??
              customer.userName ??
              customer.email ??
              "Customer",
          })),
        )
      } catch (error) {
        console.error("Customer dropdown fetch error:", error)
        setCustomerOptions([])
      }
    })()
  }, [isAdmin])

  // ── Fetch dashboard data ───────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const token =
          typeof localStorage !== "undefined"
            ? localStorage.getItem("token")
            : null
        const authConfig = token
          ? { headers: { Authorization: `Bearer ${token}` } }
          : {}
        const summaryParams = getDashboardSummaryParams(
          isAdmin ? selectedMapCustomerId : "",
        )
        const summaryConfig = {
          ...authConfig,
          ...(Object.keys(summaryParams).length ? { params: summaryParams } : {}),
        }
        const [summaryResult, mBulk] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/customer/dashboard-summary`, summaryConfig),
          // Kept ready for the hidden Environmental, Economic, and Health cards.
          SHOW_MONITORING_CARDS
            ? axios.post(
                `${API_BASE_URL}/monitoring/list`,
                { filters: [] },
                { ...authConfig, params: { page: 1, limit: 100000 } },
              )
            : Promise.resolve({ data: { data: [] } }),
        ])
        setDashboardSummary(
          normalizeDashboardSummary(
            summaryResult.status === "fulfilled" ? summaryResult.value.data : {},
          ),
        )
        setAllMonitoring(
          mBulk.status === "fulfilled" ? (mBulk.value.data?.data ?? []) : [],
        )
      } catch (e) {
        console.error("CustomerDashboard fetch error:", e)
        setDashboardSummary(EMPTY_DASHBOARD_SUMMARY)
      } finally {
        setLoading(false)
      }
    })()
  }, [isAdmin, selectedMapCustomerId])

  // ── All derived values computed from API data ──────────────────────────────

  const totalCookstovesDeployed = dashboardSummary.totalCookstovesDeployed
  const totalCredits =
    dashboardSummary.totalCarbonCredits ||
    totalCookstovesDeployed * CREDITS_PER_STOVE
  const estimatedTco2eReduction =
    dashboardSummary.estimatedTco2eReduction || totalCredits
  const deployedLast3Months = dashboardSummary.deployedLast3Months
  const peopleImpacted = dashboardSummary.totalPeopleImpacted
  const verifiedHouseholds = dashboardSummary.verifiedHouseholds
  const monthlyBars = dashboardSummary.carbonCreditsByMonth
  const genderTotals = dashboardSummary.gender

  const femaleCount = genderTotals.girlsBelow18 + genderTotals.adultWomen18Plus
  const maleCount = genderTotals.boysBelow18 + genderTotals.adultMen18Plus
  const demographicRows = [
    {
      leftLabel: "Girls (<18)",
      leftSubLabel: "Children",
      leftIcon: <DemographicIcon age="child" gender="female" />,
      leftValue: genderTotals.girlsBelow18,
      rightLabel: "Boys (<18)",
      rightSubLabel: "Children",
      rightIcon: <DemographicIcon age="child" gender="male" />,
      rightValue: genderTotals.boysBelow18,
    },
    {
      leftLabel: "Adult Women (18+)",
      leftSubLabel: "Adults",
      leftIcon: <DemographicIcon age="adult" gender="female" />,
      leftValue: genderTotals.adultWomen18Plus,
      rightLabel: "Adult Men (18+)",
      rightSubLabel: "Adults",
      rightIcon: <DemographicIcon age="adult" gender="male" />,
      rightValue: genderTotals.adultMen18Plus,
    },
  ]
  const genderTot = femaleCount + maleCount || 1
  const femalePct = Math.round((femaleCount / genderTot) * 100)

  // ── Hidden Monitoring Cards: keep calculations ready for later ────────────
  const thisMonthCnt = monthlyBars.at(-1)?.v ?? 0
  const prevMonthCnt = monthlyBars.at(-2)?.v ?? 0
  const creditsPct =
    prevMonthCnt > 0
      ? Math.round(((thisMonthCnt - prevMonthCnt) / prevMonthCnt) * 100)
      : null

  const monTot = allMonitoring.length || 1
  const betterAirCnt = allMonitoring.filter(
    (r) => r.health_better_air === "yes" || r.health_better_air === true,
  ).length
  const healthPct = Math.round((betterAirCnt / monTot) * 100)

  const monWithSav = allMonitoring.filter((r) => Number(r.savings_3_months) > 0)
  const avgSavings =
    monWithSav.length > 0
      ? Math.round(
          monWithSav.reduce((s, r) => s + Number(r.savings_3_months), 0) /
            monWithSav.length,
        )
      : AVG_SAVINGS_MWK

  const monWithFuel = allMonitoring.filter(
    (r) => Number(r.est_fuel_last3meals_kg) > 0,
  )
  const avgWoodKg =
    monWithFuel.length > 0
      ? (
          monWithFuel.reduce(
            (s, r) => s + Number(r.est_fuel_last3meals_kg),
            0,
          ) / monWithFuel.length
        ).toFixed(2)
      : AVG_WOOD_KG

  const treesPerMonth =
    totalCookstovesDeployed > 0
      ? Math.max(
          Math.round(totalCookstovesDeployed * 0.00076 * 12),
          TREES_FALLBACK,
        )
      : TREES_FALLBACK

  const sparkData = monthlyBars.map((row) => row.v)

  // ── CSV download handlers ──────────────────────────────────────────────────
  const dlGender = () =>
    csvDL(
      [
        ["Gender", "Count"],
        ["Female", femaleCount],
        ["Male", maleCount],
      ],
      "gender_distribution.csv",
    )
  const dlDemographics = () =>
    csvDL(
      [
        ["Female Group", "Female Count", "Male Group", "Male Count"],
        ...demographicRows.map((row) => [
          row.leftLabel,
          row.leftValue,
          row.rightLabel,
          row.rightValue,
        ]),
      ],
      "household_demographic_impact.csv",
    )
  const dlEnv = () =>
    csvDL(
      [
        ["Metric", "Value"],
        ["Avg Wood Saved/Month (kg)", avgWoodKg],
        ["Trees Saved/Month", treesPerMonth],
      ],
      "environmental.csv",
    )
  const dlEcon = () =>
    csvDL(
      [
        ["Metric", "Value"],
        ["Avg 3-Month Savings (MWK)", avgSavings],
      ],
      "economic.csv",
    )
  const dlHealth = () =>
    csvDL(
      [
        ["Metric", "Value"],
        ["Reporting Better Air Quality (%)", healthPct],
      ],
      "health.csv",
    )
  const dlCarbon = () =>
    csvDL(
      [["Month", "Carbon Credits"], ...monthlyBars.map((d) => [d.l, d.v])],
      "carbon_credits.csv",
    )

  // ── Responsive layout ──────────────────────────────────────────────────────
  const heroPad = isMobile ? "20px 16px 22px" : "28px 28px 30px"
  const contentPad = isMobile ? "14px 12px 40px" : "20px 20px 48px"
  const col4 =
    width >= 1100 ? "repeat(4,1fr)" : width >= 640 ? "repeat(2,1fr)" : "1fr"
  const col2 = width >= 820 ? "1fr 1fr" : "1fr"
  const colDemoCarbon = width >= 1024 ? "7fr 3fr" : "1fr"

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800;9..40,900&family=DM+Mono:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;}
        .cd-root{font-family:'DM Sans',sans-serif;background:#f0faf0;min-height:100vh;}
        .beneficiary-map-marker{background:transparent;border:0;}
        .beneficiary-map-marker-pin{
          position:relative;
          display:block;
          width:18px;
          height:18px;
          background:#35c96d;
          border:2px solid #166534;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 2px 7px rgba(22,101,52,0.32);
        }
        .beneficiary-map-marker-pin::after{
          content:"";
          position:absolute;
          width:6px;
          height:6px;
          left:4px;
          top:4px;
          border-radius:50%;
          background:#fff;
        }
        .beneficiary-map-cluster{background:transparent;border:0;}
        .beneficiary-map-cluster-dot{
          display:flex;
          align-items:center;
          justify-content:center;
          width:38px;
          height:38px;
          border-radius:50%;
          background:#35c96d;
          border:3px solid #166534;
          color:#fff;
          font-size:10px;
          font-weight:900;
          box-shadow:0 3px 10px rgba(22,101,52,0.34);
        }
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
          {isAdmin && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 16,
              }}
            >
              <select
                value={selectedMapCustomerId}
                onChange={(event) => setSelectedMapCustomerId(event.target.value)}
                style={{
                  width: isMobile ? "100%" : 240,
                  border: "1px solid #c8e6c9",
                  borderRadius: 6,
                  background: "#fff",
                  color: "#166534",
                  fontSize: 12,
                  fontWeight: 800,
                  padding: "8px 10px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="">Select Customer</option>
                {customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── ROW 1: TOP 4 STAT CARDS ─────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: col4,
              gap: isMobile ? 10 : 16,
              marginBottom: 20,
            }}
          >
            {/* Card 1 — Cookstove Deployed (API 1: /beneficiary/list totalRecords) */}
            <StatCard
              icon={IcoStove}
              label="Total Cookstoves Deployed"
              loading={loading}
              mainValue={fmt(totalCookstovesDeployed)}
              recentValue={fmt(deployedLast3Months)}
            />

            {/* Card 2 — Total Credits (calculated: deployed × CREDITS_PER_STOVE) */}
            <StatCard
              icon={IcoCredit}
              label="Total Carbon Credits"
              loading={loading}
              mainValue={fmtDec(totalCredits, 2)}
            />

            {/* Card 3 — Estimated tCO2e reduction (carbon credits expressed as tCO2e) */}
            <StatCard
              icon={IcoReduction}
              label="Estimated tCO2e reduction"
              loading={loading}
              mainValue={fmt(Math.round(estimatedTco2eReduction))}
              mainSuffix="tCO2e/year"
            />

            {/* Card 4 — People Impacted (API 4: training-site total_people) + Households (house_holds_count) */}
            <StatCard
              icon={IcoPeople}
              label="Total People Impacted"
              loading={loading}
              mainValue={fmt(peopleImpacted)}
              recentValue={fmt(verifiedHouseholds)}
              recentLabel="Verified Households"
            />
          </div>

          {/* ── ROW 2: Household Demographic Impact + Carbon Credits ─────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: colDemoCarbon,
              gap: 16,
              marginBottom: 16,
            }}
          >
            <Panel delay={70} style={{ padding: "26px 24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 8,
                }}
              >
                <PTitle>Household Demographic Impact</PTitle>
                <DLBtn onClick={dlDemographics} />
              </div>
              {loading ? (
                <Sk w="100%" h={320} />
              ) : (
                <HouseholdDemographicChart rows={demographicRows} />
              )}
            </Panel>

            <Panel delay={100}>
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
          </div>

          {SHOW_MONITORING_CARDS && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: col2,
                gap: 16,
                marginBottom: 16,
              }}
            >
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
          )}

          {/* ── ROW 3: Carbon Credits + Distribution Map ─────────────────── */}
          <div
            style={{ display: "grid", gridTemplateColumns: col2, gap: 16 }}
          >
            <Panel delay={220} style={{ minHeight: 316 }}>
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
                <Sk w="100%" h={220} />
              ) : (
                <CarbonBar data={monthlyBars} />
              )}
            </Panel>

            {/* Distribution Map (static OpenStreetMap embed — Malawi region) */}
            <Panel delay={260}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <PTitle>Distribution Map</PTitle>
                <button
                  type="button"
                  onClick={() => setMapModalOpen(true)}
                  disabled={loading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    color: "#2e7d32",
                    fontWeight: 800,
                    textDecoration: "none",
                    background: "#e8f5e9",
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  Full Map ↗
                </button>
              </div>
              {loading ? (
                <Sk w="100%" h={240} />
              ) : (
                <BeneficiaryMap
                  selectedCustomerId={selectedMapCustomerId}
                  userRole={userRole}
                />
              )}
            </Panel>
          </div>
        </div>
      </div>
      {mapModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full beneficiary distribution map"
          onClick={() => setMapModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(17,24,39,0.58)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isMobile ? 12 : 28,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(1120px, 100%)",
              maxHeight: "92vh",
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "14px 16px",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <PTitle>Distribution Map</PTitle>
              <button
                type="button"
                onClick={() => setMapModalOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  border: "none",
                  borderRadius: 6,
                  background: "#f3f4f6",
                  color: "#374151",
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: "pointer",
                  lineHeight: 1,
                }}
                aria-label="Close full map"
              >
                ×
              </button>
            </div>
            <div style={{ padding: isMobile ? 10 : 16 }}>
              <BeneficiaryMap
                selectedCustomerId={selectedMapCustomerId}
                userRole={userRole}
                height={isMobile ? "72vh" : "76vh"}
                scrollWheelZoom
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default CustomerDashboard
