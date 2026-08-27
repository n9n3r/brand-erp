'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function shortDate(iso: string) {
  return iso.slice(5); // MM-DD
}

const axisTick = { fontSize: 11, fill: '#94a3b8' };
const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
  fontSize: 12,
};

/** Daily revenue area chart (Reports page). */
export function RevenueAreaChart({ data }: { data: { date: string; revenue: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: shortDate(d.date) }));
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={52} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(label, payload) => {
              const full = payload?.[0]?.payload?.date;
              return typeof full === 'string' ? full : String(label);
            }}
            formatter={(value) => [Number(value).toLocaleString(), 'Revenue']}
          />
          <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} fill="url(#revenueFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Daily logins bar chart (super admin overview). */
export function LoginBarChart({ data }: { data: { date: string; logins: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: shortDate(d.date) }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(label, payload) => {
              const full = payload?.[0]?.payload?.date;
              return typeof full === 'string' ? full : String(label);
            }}
            formatter={(value) => [Number(value).toLocaleString(), 'Logins']}
            cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
          />
          <Bar dataKey="logins" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
