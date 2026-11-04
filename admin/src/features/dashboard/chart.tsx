import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
export default function RequestChart({
  rows,
}: {
  rows: { date: string; requests: number }[];
}) {
  return (
    <div className="request-chart">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={rows}
          accessibilityLayer
          margin={{ left: -20, right: 12, top: 12, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => value.slice(5)}
            minTickGap={35}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              borderColor: "var(--border)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
          />
          <Line
            name="Successful detail API requests"
            dataKey="requests"
            type="monotone"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
