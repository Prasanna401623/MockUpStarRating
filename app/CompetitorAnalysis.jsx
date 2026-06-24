"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SN_GREEN = "#2e7d32";
const SN_RED = "#c62828";
const COMP_GREY = "#9e9e9e";
const BORDER = "#e6e6e6";
const MUTED = "#666";

const fmt = (n) => n.toLocaleString("en-US");

export default function CompetitorAnalysis({ categoryComparison, brandsByCategory }) {
  const [selected, setSelected] = useState(null);

  // Summary: per-category win/loss + review-weighted overall averages.
  const summary = useMemo(() => {
    let wins = 0,
      losses = 0,
      tied = 0;
    let snWeighted = 0,
      snTotal = 0,
      compWeighted = 0,
      compTotal = 0;
    for (const c of categoryComparison) {
      const diff = c.sn - c.competitor;
      if (Math.abs(diff) < 0.005) tied++;
      else if (diff > 0) wins++;
      else losses++;
      snWeighted += c.sn * c.snReviews;
      snTotal += c.snReviews;
      compWeighted += c.competitor * c.competitorReviews;
      compTotal += c.competitorReviews;
    }
    return {
      wins,
      losses,
      tied,
      snAvg: snWeighted / snTotal,
      compAvg: compWeighted / compTotal,
    };
  }, [categoryComparison]);

  // Reshape for the grouped bar chart; mark winner for per-bar coloring.
  const chartData = useMemo(
    () =>
      categoryComparison.map((c) => ({
        ...c,
        snWins: c.sn >= c.competitor,
      })),
    [categoryComparison]
  );

  const selectedBrands = useMemo(() => {
    if (!selected) return [];
    return (brandsByCategory[selected] || [])
      .filter((b) => b.reviews >= 100)
      .sort((a, b) => b.rating - a.rating);
  }, [selected, brandsByCategory]);

  const selectedRow = categoryComparison.find((c) => c.category === selected);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 64px" }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, letterSpacing: 1, color: MUTED, textTransform: "uppercase" }}>
          SharkNinja · Star Rating Dashboard
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: "4px 0 0" }}>Competitor Analysis</h1>
        <p style={{ color: MUTED, margin: "6px 0 0", fontSize: 14 }}>
          SharkNinja average star rating vs combined competitors, by product category.
        </p>
      </header>

      {/* Section 1 — Summary bar */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 36,
        }}
      >
        <SummaryCard label="Categories winning" value={summary.wins} accent={SN_GREEN} />
        <SummaryCard label="Categories losing" value={summary.losses} accent={SN_RED} />
        <SummaryCard label="Tied" value={summary.tied} accent={MUTED} />
        <SummaryCard label="SN avg rating" value={summary.snAvg.toFixed(2)} accent={SN_GREEN} />
        <SummaryCard label="Competitor avg" value={summary.compAvg.toFixed(2)} accent={MUTED} />
      </section>

      {/* Section 2 — Category comparison bar chart */}
      <section style={{ marginBottom: 40 }}>
        <SectionTitle>Average rating by category</SectionTitle>
        <p style={{ color: MUTED, fontSize: 13, margin: "0 0 12px" }}>
          SN bars are <span style={{ color: SN_GREEN, fontWeight: 600 }}>green</span> where SN leads,{" "}
          <span style={{ color: SN_RED, fontWeight: 600 }}>red</span> where competitors lead. Click a
          category to see the competitor brands behind it.
        </p>
        <div style={{ width: "100%", height: 420 }}>
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 56 }}
              barGap={2}
              onClick={(e) => {
                const cat = e?.activePayload?.[0]?.payload?.category;
                if (cat) setSelected((prev) => (prev === cat ? null : cat));
              }}
            >
              <CartesianGrid vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="category"
                tick={<CategoryTick chartData={chartData} />}
                interval={0}
                tickLine={false}
                axisLine={{ stroke: BORDER }}
                height={56}
              />
              <YAxis
                domain={[3, 5]}
                ticks={[3, 3.5, 4, 4.5, 5]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: MUTED }}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Bar dataKey="competitor" name="Competitors" fill={COMP_GREY} radius={[2, 2, 0, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.category} cursor="pointer" />
                ))}
              </Bar>
              <Bar dataKey="sn" name="SharkNinja" radius={[2, 2, 0, 0]}>
                {chartData.map((d) => (
                  <Cell
                    key={d.category}
                    cursor="pointer"
                    fill={d.snWins ? SN_GREEN : SN_RED}
                    stroke={selected === d.category ? "#000" : "none"}
                    strokeWidth={selected === d.category ? 1.5 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Legend />
      </section>

      {/* Section 3 — Competitor brand breakdown */}
      <section>
        <SectionTitle>
          {selected ? `Competitor brands · ${selected}` : "Competitor brand breakdown"}
        </SectionTitle>
        {!selected ? (
          <EmptyState />
        ) : (
          <>
            <p style={{ color: MUTED, fontSize: 13, margin: "0 0 12px" }}>
              Brands with 100+ reviews, sorted by average rating. SN in {selected}:{" "}
              <strong style={{ color: selectedRow.sn >= selectedRow.competitor ? SN_GREEN : SN_RED }}>
                {selectedRow.sn.toFixed(2)}
              </strong>{" "}
              ({fmt(selectedRow.snReviews)} reviews).
            </p>
            <BrandTable rows={selectedBrands} snRating={selectedRow.sn} />
          </>
        )}
      </section>
    </main>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "14px 16px" }}>
      <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: accent, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>{children}</h2>;
}

function Legend() {
  const item = (color, text) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED }}>
      <span style={{ width: 12, height: 12, background: color, borderRadius: 2, display: "inline-block" }} />
      {text}
    </span>
  );
  return (
    <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 4 }}>
      {item(SN_GREEN, "SN leads")}
      {item(SN_RED, "SN trails")}
      {item(COMP_GREY, "Competitors")}
    </div>
  );
}

// X-axis tick: category name + review-count context on a second line.
function CategoryTick({ x, y, payload, chartData }) {
  const row = chartData.find((d) => d.category === payload.value);
  const reviews = row ? row.snReviews + row.competitorReviews : 0;
  const words = payload.value.split(" ");
  return (
    <g transform={`translate(${x},${y + 12})`}>
      {words.map((w, i) => (
        <text key={i} x={0} y={i * 12} textAnchor="middle" fontSize={11} fill="#333">
          {w}
        </text>
      ))}
      <text x={0} y={words.length * 12} textAnchor="middle" fontSize={10} fill={MUTED}>
        {fmt(reviews)} reviews
      </text>
    </g>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${BORDER}`,
        borderRadius: 6,
        padding: "8px 10px",
        fontSize: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.category}</div>
      <div style={{ color: d.snWins ? SN_GREEN : SN_RED }}>
        SN: {d.sn.toFixed(2)} ({fmt(d.snReviews)})
      </div>
      <div style={{ color: MUTED }}>
        Competitors: {d.competitor.toFixed(2)} ({fmt(d.competitorReviews)})
      </div>
    </div>
  );
}

function BrandTable({ rows, snRating }) {
  const th = { textAlign: "left", padding: "10px 12px", fontSize: 12, color: MUTED, fontWeight: 600, borderBottom: `1px solid ${BORDER}` };
  const td = { padding: "10px 12px", fontSize: 14, borderBottom: `1px solid #f2f2f2` };
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${BORDER}`, borderRadius: 8 }}>
      <thead>
        <tr>
          <th style={th}>#</th>
          <th style={th}>Brand</th>
          <th style={{ ...th, textAlign: "right" }}>Reviews</th>
          <th style={{ ...th, textAlign: "right" }}>Avg rating</th>
          <th style={{ ...th, textAlign: "right" }}>vs SN</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((b, i) => {
          const diff = b.rating - snRating;
          const beatsSn = diff > 0;
          return (
            <tr key={b.brand}>
              <td style={{ ...td, color: MUTED }}>{i + 1}</td>
              <td style={{ ...td, fontWeight: 500 }}>{b.brand}</td>
              <td style={{ ...td, textAlign: "right", color: MUTED }}>{fmt(b.reviews)}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{b.rating.toFixed(2)}</td>
              <td style={{ ...td, textAlign: "right", color: beatsSn ? SN_RED : SN_GREEN }}>
                {diff >= 0 ? "+" : ""}
                {diff.toFixed(2)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        border: `1px dashed ${BORDER}`,
        borderRadius: 8,
        padding: "28px 16px",
        textAlign: "center",
        color: MUTED,
        fontSize: 14,
      }}
    >
      Click a category in the chart above to see its competitor brands.
    </div>
  );
}
