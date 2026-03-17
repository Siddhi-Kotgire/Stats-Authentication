"use client";

import { useState, useEffect, useRef } from "react";
import {
  users as rawUsers,
  tools as rawTools,
  ORG,
  getDataForPeriod,
} from "./data";

// ─── TOKENS ───────────────────────────────────────────────────────────────────
const T = {
  white: "#ffffff",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",
  blue: "#2563EB",
  blueLight: "#EFF6FF",
  blueMid: "#DBEAFE",
  green: "#16A34A",
  greenLight: "#F0FDF4",
  amber: "#D97706",
  amberLight: "#FFFBEB",
  red: "#DC2626",
  redLight: "#FEF2F2",
  purple: "#7C3AED",
  purpleLight: "#F5F3FF",
};

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; font-size: 14px; }
  body { background: ${T.gray50}; color: ${T.gray900}; }
  input, select, button { font-family: inherit; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: ${T.gray100}; }
  ::-webkit-scrollbar-thumb { background: ${T.gray300}; border-radius: 3px; }

  .card { background: ${T.white}; border: 1px solid ${T.gray200}; border-radius: 10px; }
  .card-hover { transition: border-color .15s, box-shadow .15s; }
  .card-hover:hover { border-color: ${T.gray300}; box-shadow: 0 1px 8px rgba(0,0,0,.06); }
  .btn { cursor: pointer; transition: background .12s, color .12s, border-color .12s; }
  .btn-ghost { background: transparent; border: 1px solid ${T.gray200}; color: ${T.gray600}; border-radius: 7px; padding: 0 12px; height: 32px; font-size: 13px; font-weight: 500; }
  .btn-ghost:hover { background: ${T.gray100}; border-color: ${T.gray300}; color: ${T.gray800}; }
  .btn-primary { background: ${T.gray900}; border: 1px solid ${T.gray900}; color: ${T.white}; border-radius: 7px; padding: 0 14px; height: 32px; font-size: 13px; font-weight: 500; }
  .btn-primary:hover { background: ${T.gray700}; border-color: ${T.gray700}; }
  .trow { transition: background .08s; cursor: pointer; }
  .trow:hover td { background: ${T.gray50} !important; }
  .nav-link { color: ${T.gray500}; font-size: 13px; font-weight: 500; padding: 0 12px; height: 36px; border-radius: 7px; display: flex; align-items: center; border: none; background: transparent; cursor: pointer; transition: all .12s; gap: 7px; }
  .nav-link:hover { color: ${T.gray800}; background: ${T.gray100}; }
  .nav-link.active { color: ${T.gray900}; background: ${T.gray100}; font-weight: 600; }

  .drawer { position: fixed; right: 0; top: 0; bottom: 0; width: 420px; background: ${T.white}; border-left: 1px solid ${T.gray200}; z-index: 200; overflow-y: auto; box-shadow: -8px 0 32px rgba(0,0,0,.08); animation: slideIn .22s cubic-bezier(.25,.8,.25,1); }
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.3); z-index: 199; animation: fadeIn .2s ease; }
  @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }

  @media (max-width: 1100px) { .hide-md { display: none !important; } .grid-2col { grid-template-columns: 1fr !important; } }
  @media (max-width: 750px)  { .grid-kpi { grid-template-columns: repeat(2,1fr) !important; } .grid-charts { grid-template-columns: 1fr !important; } .drawer { width: 100% !important; } }
`;

// ─── CHART.JS ─────────────────────────────────────────────────────────────────
const CJSURL =
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";

function loadCJS(cb) {
  if (typeof window === "undefined") return;
  if (window.Chart) return cb();
  const ex = document.querySelector(`script[src="${CJSURL}"]`);
  if (ex) {
    ex.addEventListener("load", cb);
    return;
  }
  const s = document.createElement("script");
  s.src = CJSURL;
  s.onload = cb;
  document.head.appendChild(s);
}

const CHART_TOOLTIP = {
  backgroundColor: "#ffffff",
  borderColor: "#E5E7EB",
  borderWidth: 1,
  titleColor: "#111827",
  bodyColor: "#6B7280",
  padding: 12,
  cornerRadius: 10,
  titleFont: { family: "'Inter'", size: 12, weight: "600" },
  bodyFont: { family: "'Inter'", size: 11 },
};

// ─── BAR CHART ────────────────────────────────────────────────────────────────
function BarChart({ labels, data, colors, height = 220, unit = "hrs" }) {
  const ref = useRef(null);
  const ch = useRef(null);

  useEffect(() => {
    loadCJS(() => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2";
      script.onload = () => {
        if (!ref.current) return;
        const ctx = ref.current.getContext("2d");
        const gradient = ctx.createLinearGradient(0, 0, 400, 0);
        gradient.addColorStop(0, "#3B82F6");
        gradient.addColorStop(1, "#2563EB");
        ch.current?.destroy();
        ch.current = new window.Chart(ctx, {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                data,
                backgroundColor: colors || gradient,
                borderRadius: 8,
                borderSkipped: false,
              },
            ],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800, easing: "easeOutQuart" },
            plugins: {
              legend: { display: false },
              tooltip: {
                ...CHART_TOOLTIP,
                callbacks: { label: (c) => ` ${c.raw} ${unit}` },
              },
              datalabels: {
                anchor: "center",
                align: "center",
                color: "#ffffff",
                font: { weight: "bold", size: 12 },
                formatter: (v) => `${v} ${unit}`,
              },
            },
            layout: { padding: 10 },
            scales: {
              x: {
                grid: { display: false },
                border: { display: false },
                ticks: {
                  color: "#9CA3AF",
                  font: { size: 11, family: "'Inter'" },
                },
              },
              y: {
                grid: { color: "#F1F5F9" },
                border: { display: false },
                ticks: {
                  color: "#9CA3AF",
                  font: { size: 11, family: "'Inter'" },
                },
              },
            },
          },
          plugins: [window.ChartDataLabels],
        });
      };
      if (!window.ChartDataLabels) document.head.appendChild(script);
      else script.onload();
    });
    return () => ch.current?.destroy();
  }, [JSON.stringify({ labels, data, unit })]);

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <canvas ref={ref} />
    </div>
  );
}

// ─── STACKED CHART ────────────────────────────────────────────────────────────
function StackedChart({ labels, datasets, height = 240, unit = "hrs" }) {
  const ref = useRef(null);
  const chart = useRef(null);

  useEffect(() => {
    loadCJS(() => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2";
      script.onload = () => {
        if (!ref.current) return;
        chart.current?.destroy();
        chart.current = new window.Chart(ref.current, {
          type: "bar",
          data: {
            labels,
            datasets: datasets.map((d, i) => ({
              label: d.label,
              data: d.data,
              backgroundColor: d.color,
              borderRadius:
                i === 0
                  ? { topLeft: 3, bottomLeft: 3 }
                  : i === datasets.length - 1
                    ? { topRight: 3, bottomRight: 3 }
                    : 0,
              borderSkipped: false,
              barThickness: 18,
            })),
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: "y",
            animation: { duration: 700, easing: "easeOutQuart" },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "#fff",
                borderColor: "#E5E7EB",
                borderWidth: 1,
                titleColor: "#111827",
                bodyColor: "#6B7280",
                padding: 10,
                cornerRadius: 8,
                callbacks: {
                  label: (ctx) => {
                    const value = ctx.raw;
                    const total = ctx.chart.data.datasets.reduce(
                      (s, d) => s + d.data[ctx.dataIndex],
                      0,
                    );
                    const pct = Math.round((value / total) * 100);
                    return ` ${ctx.dataset.label}: ${value} ${unit} (${pct}%)`;
                  },
                },
              },
              datalabels: {
                anchor: "center",
                align: "center",
                color: "#ffffff",
                font: { weight: "bold", size: 11 },
                formatter: (v) => (v > 0 ? v : ""),
              },
            },
            layout: { padding: { left: 10, right: 10 } },
            scales: {
              x: {
                stacked: true,
                grid: { color: "#F1F5F9" },
                border: { display: false },
                ticks: { color: "#9CA3AF", font: { size: 11 } },
              },
              y: {
                stacked: true,
                grid: { display: false },
                border: { display: false },
                ticks: { color: "#6B7280", font: { size: 12, weight: "500" } },
              },
            },
          },
          plugins: [window.ChartDataLabels],
        });
      };
      if (!window.ChartDataLabels) document.head.appendChild(script);
      else script.onload();
    });
    return () => chart.current?.destroy();
  }, [JSON.stringify({ labels, datasets, unit })]);

  return (
    <div style={{ width: "100%", height }}>
      <canvas ref={ref} />
    </div>
  );
}

// ─── LINE CHART ───────────────────────────────────────────────────────────────
function LineChart({ labels, datasets, height = 220 }) {
  const ref = useRef(null);
  const ch = useRef(null);

  useEffect(() => {
    loadCJS(() => {
      if (!ref.current) return;
      ch.current?.destroy();
      ch.current = new window.Chart(ref.current, {
        type: "line",
        data: {
          labels,
          datasets: datasets.map((d) => ({
            label: d.label,
            data: d.data,
            borderColor: d.color,
            backgroundColor: d.color + "18",
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.4,
            fill: true,
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 700 },
          plugins: {
            legend: { display: false },
            tooltip: CHART_TOOLTIP,
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: "#9CA3AF", font: { size: 11 } },
            },
            y: {
              grid: { color: "#F1F5F9" },
              border: { display: false },
              ticks: { color: "#9CA3AF", font: { size: 11 } },
            },
          },
        },
      });
    });
    return () => ch.current?.destroy();
  }, [JSON.stringify({ labels, datasets })]);

  return (
    <div style={{ width: "100%", height }}>
      <canvas ref={ref} />
    </div>
  );
}

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function Avatar({ name, idx, size = 32 }) {
  const colors = [
    { bg: T.blueLight, text: T.blue },
    { bg: T.greenLight, text: T.green },
    { bg: T.purpleLight, text: T.purple },
    { bg: T.amberLight, text: T.amber },
    { bg: T.redLight, text: T.red },
  ];
  const c = colors[idx % 5];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: c.bg,
        color: c.text,
        fontSize: size > 36 ? 14 : 11,
        fontWeight: 600,
        letterSpacing: ".02em",
      }}
    >
      {name
        .split(" ")
        .map((n) => n[0])
        .join("")}
    </div>
  );
}

const STATUS_CFG = {
  online: { color: T.green, label: "Online" },
  away: { color: T.amber, label: "Away" },
  offline: { color: T.gray300, label: "Offline" },
};

function SectionHeading({ title, sub, right }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: T.gray900 }}>
          {title}
        </h2>
        {sub && <span style={{ fontSize: 12, color: T.gray400 }}>{sub}</span>}
      </div>
      {right}
    </div>
  );
}

function Divider({ label }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "28px 0 20px",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: T.gray400,
          textTransform: "uppercase",
          letterSpacing: ".07em",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: T.gray200 }} />
    </div>
  );
}

// ─── PERIOD TOGGLE ────────────────────────────────────────────────────────────
function PeriodToggle({ value, onChange }) {
  const options = [
    { value: "hours", label: "Hours" },
    { value: "days", label: "Days" },
  ];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: T.gray100,
        borderRadius: 8,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            height: 28,
            padding: "0 14px",
            fontSize: 12,
            fontWeight: value === o.value ? 600 : 500,
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background: value === o.value ? T.white : "transparent",
            color: value === o.value ? T.gray900 : T.gray500,
            boxShadow: value === o.value ? "0 1px 3px rgba(0,0,0,.1)" : "none",
            transition: "all .15s",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  const ac = accent || T.blue;
  return (
    <div className="card card-hover" style={{ padding: "20px 22px" }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: T.gray400,
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: ".06em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1,
          marginBottom: 6,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.03em",
          color: ac,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: T.gray400 }}>{sub}</div>}
    </div>
  );
}

// ─── EXPORT UTILS ─────────────────────────────────────────────────────────────
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ExportMenu({ users, tools, period }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unit = period === "hours" ? "hrs" : "days";

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  const options = [
    {
      label: "Print / Save PDF",
      icon: "🖨",
      desc: "Browser print dialog",
      action: () => {
        window.print();
        setOpen(false);
      },
    },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="btn btn-ghost"
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 6 }}
      >
        Export
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: T.white,
            border: `1px solid ${T.gray200}`,
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,.10)",
            minWidth: 210,
            zIndex: 100,
            overflow: "hidden",
            animation: "fadeIn .12s ease",
          }}
        >
          <div style={{ padding: "6px 0" }}>
            {options.map((opt) => (
              <button
                key={opt.label}
                onClick={opt.action}
                style={{
                  width: "100%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "9px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textAlign: "left",
                  transition: "background .1s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = T.gray50)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>
                  {opt.icon}
                </span>
                <div>
                  <div
                    style={{ fontSize: 13, fontWeight: 500, color: T.gray800 }}
                  >
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: T.gray400, marginTop: 1 }}>
                    {opt.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TOOL PANEL ───────────────────────────────────────────────────────────────
function ToolPanel({ tools, unit }) {
  const total = tools.reduce((s, t) => s + t.total, 0);
  const max = Math.max(...tools.map((t) => t.total));
  return (
    <div className="card" style={{ padding: "20px 24px" }}>
      <SectionHeading title="By tool" sub={`${total} ${unit} total`} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[...tools]
          .sort((a, b) => b.total - a.total)
          .map((tool) => {
            const pct = Math.round((tool.total / total) * 100);
            const barPct = Math.round((tool.total / max) * 100);
            return (
              <div key={tool.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 7,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: tool.color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: T.gray700,
                      }}
                    >
                      {tool.name}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.gray900,
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      {tool.total} {unit}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: T.gray400,
                        minWidth: 28,
                        textAlign: "right",
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    height: 3,
                    background: T.gray100,
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${barPct}%`,
                      background: tool.color,
                      borderRadius: 2,
                      transition: "width .5s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── USER DRAWER ──────────────────────────────────────────────────────────────
function UserDrawer({ user, onClose, tools, users, unit }) {
  if (!user) return null;
  const rank =
    [...users]
      .sort((a, b) => b.total - a.total)
      .findIndex((u2) => u2.id === user.id) + 1;
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="drawer">
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${T.gray200}`,
            position: "sticky",
            top: 0,
            background: T.white,
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: T.gray400,
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              Member profile
            </span>
            <button
              className="btn btn-ghost"
              style={{ padding: "0 10px", fontSize: 12 }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar name={user.name} idx={user.colorIdx} size={48} />
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: T.gray900,
                  marginBottom: 3,
                }}
              >
                {user.name}
              </div>
              <div style={{ fontSize: 12, color: T.gray500 }}>
                {user.role} · {user.dept}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 6,
                }}
              >
                <span style={{ color: T.gray300 }}>·</span>
                <span style={{ fontSize: 12, color: T.gray400 }}>
                  {user.lastActive}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Quick stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,1fr)",
              gap: 10,
            }}
          >
            {[
              { l: "Total", v: `${user.total} ${unit}`, u: "this period" },
              { l: "Rank", v: `#${rank}`, u: `of ${users.length}` },
            ].map((s) => (
              <div
                key={s.l}
                style={{
                  background: T.gray50,
                  borderRadius: 8,
                  padding: "14px",
                  border: `1px solid ${T.gray200}`,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: T.gray400,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    marginBottom: 6,
                  }}
                >
                  {s.l}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: T.gray900,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.v}
                </div>
                <div style={{ fontSize: 11, color: T.gray400, marginTop: 2 }}>
                  {s.u}
                </div>
              </div>
            ))}
          </div>

          {/* Donut chart */}
          {/* <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: T.gray500,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 14,
              }}
            >
              Usage split
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 120, flexShrink: 0 }}>
                <DonutChart
                  labels={tools.map((t) => t.name)}
                  data={user.tools}
                  colors={tools.map((t) => t.color)}
                  height={120}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  flex: 1,
                }}
              >
                {tools.map((t, i) => {
                  const pct = Math.round((user.tools[i] / user.total) * 100);
                  return (
                    <div
                      key={t.id}
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: t.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 12, color: T.gray600, flex: 1 }}>
                        {t.name}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: T.gray900,
                          fontFamily: "'IBM Plex Mono',monospace",
                        }}
                      >
                        {user.tools[i]} {unit}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: T.gray400,
                          fontFamily: "'IBM Plex Mono',monospace",
                          minWidth: 30,
                          textAlign: "right",
                        }}
                      >
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div> */}

          {/* Tool breakdown bars */}
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: T.gray500,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 14,
              }}
            >
              Tool breakdown
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {tools.map((t, i) => {
                const val = user.tools[i];
                const pct = Math.round((val / user.total) * 100);
                return (
                  <div key={t.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            background: t.color,
                          }}
                        />
                        <span style={{ fontSize: 13, color: T.gray600 }}>
                          {t.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: T.gray900,
                            fontFamily: "'IBM Plex Mono',monospace",
                          }}
                        >
                          {val} {unit}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: T.gray400,
                            fontFamily: "'IBM Plex Mono',monospace",
                            minWidth: 32,
                            textAlign: "right",
                          }}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        height: 3,
                        background: T.gray100,
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: t.color,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Account info */}
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: T.gray500,
                textTransform: "uppercase",
                letterSpacing: ".06em",
                marginBottom: 14,
              }}
            >
              Account info
            </div>
            <div
              style={{
                border: `1px solid ${T.gray200}`,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {[
                { k: "Email", v: user.email },
                { k: "Dept", v: user.dept },
                { k: "Member", v: user.id },
              ].map((row, i, arr) => (
                <div
                  key={row.k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "11px 14px",
                    borderBottom:
                      i < arr.length - 1 ? `1px solid ${T.gray100}` : "none",
                    background: T.white,
                  }}
                >
                  <span style={{ fontSize: 12, color: T.gray400 }}>
                    {row.k}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: T.gray700,
                      fontFamily:
                        row.k === "Member"
                          ? "'IBM Plex Mono',monospace"
                          : undefined,
                    }}
                  >
                    {row.v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── CHARTS SECTION ───────────────────────────────────────────────────────────
function ChartsSection({ tools, users, period }) {
  const unit = period === "hours" ? "hrs" : "days";
  const tColors = tools.map((t) => t.color);
  const tNames = tools.map((t) => t.name);
  const tTotals = tools.map((t) => t.total);
  const uFirst = users.map((u) => u.name.split(" ")[0]);
  const barChartHeight = Math.max(240, tNames.length * 52);
  const stackedHeight = Math.max(240, uFirst.length * 44);
  const sharedMinHeight = Math.min(barChartHeight, stackedHeight);

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
      className="grid-charts"
    >
      {/* Tool comparison */}
      <div className="card" style={{ padding: "20px 22px" }}>
        <SectionHeading title="Tool comparison" sub={`Aggregate · ${unit}`} />
        <div
          style={{
            overflowY: "auto",
            maxHeight: sharedMinHeight,
            scrollbarWidth: "thin",
            scrollbarColor: `${T.gray300} transparent`,
          }}
        >
          <div style={{ height: barChartHeight }}>
            <BarChart
              labels={tNames}
              data={tTotals}
              colors={tColors}
              height={barChartHeight}
              unit={unit}
            />
          </div>
        </div>
      </div>

      {/* Activity breakdown */}
      <div className="card" style={{ padding: "20px 22px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: T.gray900 }}>
              Activity breakdown
            </h2>
            <span style={{ fontSize: 12, color: T.gray400 }}>
              Per-member · {unit}
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {tools.map((t) => (
              <span
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  color: T.gray500,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: t.color,
                  }}
                />
                {t.name}
              </span>
            ))}
          </div>
        </div>
        <div
          style={{
            overflowY: "auto",
            maxHeight: sharedMinHeight,
            scrollbarWidth: "thin",
            scrollbarColor: `${T.gray300} transparent`,
          }}
        >
          <div style={{ height: stackedHeight }}>
            <StackedChart
              labels={uFirst}
              datasets={tools.map((t, i) => ({
                label: t.name,
                data: users.map((u) => u.tools[i]),
                color: t.color,
              }))}
              height={stackedHeight}
              unit={unit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
function Leaderboard({ onRowClick, users, tools, unit }) {
  const [sortBy, setSortBy] = useState("total");
  const [search, setSearch] = useState("");
  const maxTotal = Math.max(...users.map((u) => u.total));

  const rows = users
    .filter(
      (u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.dept.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sortBy === "total"
        ? b.total - a.total
        : b.tools[+sortBy] - a.tools[+sortBy],
    );

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div
        style={{ padding: "16px 20px", borderBottom: `1px solid ${T.gray100}` }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <span style={{ fontSize: 15, fontWeight: 600, color: T.gray900 }}>
              Members
            </span>
            <span style={{ fontSize: 12, color: T.gray400, marginLeft: 8 }}>
              Click a row for details
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
            <svg
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: T.gray400,
                pointerEvents: "none",
              }}
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle
                cx="7"
                cy="7"
                r="5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M11 11L14 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              placeholder="Search by name, email, or dept…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: 34,
                padding: "0 12px 0 32px",
                fontSize: 12,
                border: `1px solid ${T.gray200}`,
                borderRadius: 7,
                background: T.white,
                color: T.gray900,
                outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = T.blue)}
              onBlur={(e) => (e.target.style.borderColor = T.gray200)}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              height: 34,
              padding: "0 10px",
              fontSize: 12,
              border: `1px solid ${T.gray200}`,
              borderRadius: 7,
              background: T.white,
              color: T.gray700,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="total">Sort: Total</option>
            {tools.map((t, i) => (
              <option key={i} value={String(i)}>
                Sort: {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.gray100}` }}>
              {[
                { l: "#", left: true, w: 44 },
                { l: "Member", left: true },
                ...tools.map((t) => ({
                  l: t.name,
                  left: false,
                  color: t.color,
                })),
                { l: `Total (${unit})`, left: false },
                { l: "Status", left: true, w: 100 },
              ].map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: "10px 14px",
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                    color: h.color || T.gray400,
                    textAlign: h.left ? "left" : "right",
                    background: T.gray50,
                    whiteSpace: "nowrap",
                    ...(h.w ? { width: h.w } : {}),
                  }}
                >
                  {h.l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((u, idx) => {
              const rank = idx + 1;
              const pct = Math.round((u.total / maxTotal) * 100);
              const isTop = rank === 1 && sortBy === "total" && !search;
              return (
                <tr
                  key={u.id}
                  className="trow"
                  onClick={() => onRowClick(u)}
                  style={{
                    borderBottom: `1px solid ${T.gray100}`,
                    background: T.white,
                  }}
                >
                  <td
                    style={{
                      padding: "12px 14px",
                      verticalAlign: "middle",
                      color: rank <= 3 ? T.amber : T.gray400,
                      fontSize: rank <= 3 ? 14 : 12,
                      fontWeight: 600,
                      fontFamily: "'IBM Plex Mono',monospace",
                    }}
                  >
                    {rank <= 3 ? ["①", "②", "③"][rank - 1] : rank}
                  </td>
                  <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <Avatar name={u.name} idx={u.colorIdx} />
                      <div>
                        <div
                          style={{
                            fontWeight: 500,
                            color: T.gray900,
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          {u.name}
                          {isTop && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                background: T.blueLight,
                                color: T.blue,
                                padding: "1px 7px",
                                borderRadius: 20,
                              }}
                            >
                              Top
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: T.gray400,
                            marginTop: 1,
                          }}
                        >
                          {u.role}
                        </div>
                      </div>
                    </div>
                  </td>
                  {u.tools.map((v, ti) => (
                    <td
                      key={ti}
                      style={{
                        padding: "12px 14px",
                        verticalAlign: "middle",
                        textAlign: "right",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono',monospace",
                          fontVariantNumeric: "tabular-nums",
                          color:
                            sortBy === String(ti) ? tools[ti].color : T.gray600,
                          fontWeight: sortBy === String(ti) ? 600 : 400,
                        }}
                      >
                        {v}
                      </span>
                    </td>
                  ))}
                  <td
                    style={{
                      padding: "12px 14px",
                      verticalAlign: "middle",
                      textAlign: "right",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: T.gray900,
                        fontFamily: "'IBM Plex Mono',monospace",
                      }}
                    >
                      {u.total}
                    </div>
                    <div
                      style={{
                        height: 2,
                        background: T.gray100,
                        borderRadius: 1,
                        overflow: "hidden",
                        marginTop: 4,
                        width: 48,
                        marginLeft: "auto",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: T.blue,
                          borderRadius: 1,
                        }}
                      />
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 7 }}
                    >
                    
                      <span style={{ fontSize: 11, color: T.gray400 }}>
                        {u.lastActive}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          padding: "10px 20px",
          borderTop: `1px solid ${T.gray100}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: T.gray50,
        }}
      >
        <span style={{ fontSize: 11, color: T.gray400 }}>
          {rows.length} of {users.length} members
        </span>
        <div style={{ display: "flex", gap: 16 }}>
          {["online", "away", "offline"].map((s) => (
            <div
              key={s}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              
              <span
                style={{
                  fontSize: 11,
                  color: T.gray400,
                  textTransform: "capitalize",
                }}
              >
                {s} · {users.filter((u) => u.status === s).length}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STATS PAGE ───────────────────────────────────────────────────────────────
function StatsPage({ period, users, tools, orgStats }) {
  const [selUser, setSelUser] = useState(null);
  const unit = period === "hours" ? "hrs" : "days";
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [selectedTools, setSelectedTools] = useState(tools.map((t) => t.id));
  const trendData = tools.map((t) => ({
    label: t.name,
    color: t.color,
    data: weekDays.map(() =>
      Math.round(t.total * 0.1 + Math.random() * t.total * 0.2),
    ),
  }));

  const kpis = [
    {
      label: "Members",
      value: orgStats.totalUsers,
      sub: "in organization",
      accent: T.gray900,
    },
    {
      label: "Total usage",
      value: orgStats.totalVal.toLocaleString(),
      sub: `${unit} this period`,
      accent: T.blue,
    },
    {
      label: "Avg / member",
      value: orgStats.avgPerUser,
      sub: `${unit} per member`,
      accent: T.gray900,
    },
    {
      label: "Top member",
      value: orgStats.mostActiveUser.name.split(" ")[0],
      sub: `${orgStats.mostActiveUser.total} ${unit}`,
      accent: T.gray900,
    },
    {
      label: "Top tool",
      value: orgStats.mostUsedTool.name,
      sub: `${orgStats.mostUsedTool.total} ${unit}`,
      accent: T.gray900,
    },
  ];

  return (
    <>
      {/* KPIs */}
      <div
        className="grid-kpi"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6,1fr)",
          gap: 12,
          marginBottom: 4,
        }}
      >
        {kpis.map((k) => (
          <StatCard key={k.label} {...k} />
        ))}
      </div>

      <Divider label="Charts" />
      <ChartsSection tools={tools} users={users} period={period} />

      <Divider label="Trends" />

      {/* Weekly trend line chart */}
      {/* Weekly trend line chart */}
      <div className="card" style={{ padding: "20px 22px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 14,
          }}
        >
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: T.gray900 }}>
              Weekly trend
            </h2>
            <span style={{ fontSize: 12, color: T.gray400 }}>
              Tool usage over last 7 days · {unit}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tools.map((t) => (
              <button
                key={t.id}
                onClick={() =>
                  setSelectedTools((prev) =>
                    prev.includes(t.id)
                      ? prev.length === 1
                        ? prev // prevent deselecting all
                        : prev.filter((id) => id !== t.id)
                      : [...prev, t.id],
                  )
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 20,
                  border: `1px solid ${selectedTools.includes(t.id) ? t.color : T.gray200}`,
                  background: selectedTools.includes(t.id)
                    ? t.color + "18"
                    : T.white,
                  color: selectedTools.includes(t.id) ? t.color : T.gray400,
                  cursor: "pointer",
                  fontWeight: selectedTools.includes(t.id) ? 600 : 400,
                  transition: "all .15s",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: selectedTools.includes(t.id)
                      ? t.color
                      : T.gray300,
                    flexShrink: 0,
                  }}
                />
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <LineChart
          labels={weekDays}
          datasets={trendData.filter((d) =>
            selectedTools.includes(tools.find((t) => t.name === d.label)?.id),
          )}
          height={220}
        />
      </div>

      <Divider label="Members" />
      <div
        className="grid-2col"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 14,
          alignItems: "start",
        }}
      >
        <Leaderboard
          onRowClick={setSelUser}
          users={users}
          tools={tools}
          unit={unit}
        />
        <ToolPanel tools={tools} unit={unit} />
      </div>

      {selUser && (
        <UserDrawer
          user={selUser}
          onClose={() => setSelUser(null)}
          tools={tools}
          users={users}
          unit={unit}
        />
      )}
    </>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("stats");
  const [period, setPeriod] = useState("hours");

  const { users, tools, orgStats } = getDataForPeriod(period);

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: "100vh", background: T.gray50 }}>
        {/* ── HEADER ── */}
        <header
          style={{
            background: T.white,
            borderBottom: `1px solid ${T.gray200}`,
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <div
            style={{
              maxWidth: 1400,
              margin: "0 auto",
              padding: "0 32px",
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            {/* Left: wordmark + nav */}
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: T.gray900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect
                      x=".5"
                      y=".5"
                      width="4.5"
                      height="4.5"
                      rx="1"
                      fill="white"
                    />
                    <rect
                      x="7"
                      y=".5"
                      width="4.5"
                      height="4.5"
                      rx="1"
                      fill="white"
                      opacity=".6"
                    />
                    <rect
                      x=".5"
                      y="7"
                      width="4.5"
                      height="4.5"
                      rx="1"
                      fill="white"
                      opacity=".6"
                    />
                    <rect
                      x="7"
                      y="7"
                      width="4.5"
                      height="4.5"
                      rx="1"
                      fill="white"
                    />
                  </svg>
                </div>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: T.gray900,
                    letterSpacing: "-.01em",
                  }}
                >
                  {ORG.name}
                </span>
              </div>
            </div>

            {/* Right: period toggle + actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PeriodToggle value={period} onChange={setPeriod} />
              <div style={{ width: 1, height: 20, background: T.gray200 }} />
              <ExportMenu users={users} tools={tools} period={period} />
            </div>
          </div>
        </header>

        {/* ── MAIN ── */}
        <main
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "32px 32px 64px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 6,
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: T.gray900,
                  letterSpacing: "-0.02em",
                }}
              >
                {activePage === "stats" ? "Usage overview" : "Data explorer"}
              </h1>
              {/* <p style={{ fontSize: 13, color: T.gray400, marginTop: 3 }}>
                {activePage === "stats"
                  ? `${ORG.name} · ${period === "hours" ? "Hours" : "Days"} view`
                  : `Full breakdown · trends · raw data`}
              </p> */}
            </div>
          </div>

          {activePage === "stats" ? (
            <StatsPage
              period={period}
              users={users}
              tools={tools}
              orgStats={orgStats}
            />
          ) : (
            <DataPage period={period} />
          )}
        </main>

        {/* ── FOOTER ── */}
        <footer
          style={{
            borderTop: `1px solid ${T.gray200}`,
            background: T.white,
            padding: "14px 32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 11, color: T.gray400 }}>
            {ORG.name} · {ORG.plan} · since {ORG.since}
          </span>
          <span style={{ fontSize: 11, color: T.gray400 }}>
            Viewing: {period} · Last updated just now
          </span>
        </footer>
      </div>
    </>
  );
}
