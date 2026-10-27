"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AXIS = { fontSize: 11, fill: "#5B6575" };
const tooltipStyle = { borderRadius: 8, border: "1px solid #E6E1D6", fontSize: 12 };
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const rs = (v: number) => `Rs ${Math.round(v).toLocaleString("en-PK")}`;

export function SalesChart({ data }: { data: { date: string; revenue: number; orders: number }[] }) {
  return (
    <div className="h-64" role="img" aria-label={`Daily sales over ${data.length} days`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#C8A24A" stopOpacity={0.35} />
              <stop offset="1" stopColor="#C8A24A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E6E1D6" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={70} tickFormatter={(v) => `Rs ${Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : v}`} />
          <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={(v, n) => (n === "revenue" ? [rs(Number(v)), "Sales"] : [v, "Orders"])} contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="revenue" stroke="#A8842F" strokeWidth={2} fill="url(#rev)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FunnelChart({ data }: { data: { date: string; views: number; addToCarts: number; orders: number }[] }) {
  return (
    <div className="h-64" role="img" aria-label="Views, add-to-carts and orders per day">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E6E1D6" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} />
          <Tooltip labelFormatter={(l) => fmtDate(String(l))} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="views" name="Views" fill="#1C2A40" radius={[3, 3, 0, 0]} />
          <Bar dataKey="addToCarts" name="Add to cart" fill="#C8A24A" radius={[3, 3, 0, 0]} />
          <Bar dataKey="orders" name="Orders" fill="#1F7A5A" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const PIE = ["#0E1A2B", "#C8A24A", "#1F7A5A", "#5B6575", "#A8842F"];

export function SourcesChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-64" role="img" aria-label={`Traffic sources: ${data.map((d) => `${d.name} ${d.value}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={PIE[i % PIE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
