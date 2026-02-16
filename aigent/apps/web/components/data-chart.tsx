"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DataChartProps {
  data: any[];
}

export function DataChart({ data }: DataChartProps) {
  if (!data || data.length === 0) return null;

  // Attempt to infer keys
  const keys = Object.keys(data[0]);
  if (keys.length < 2) return <div className="text-muted-foreground">Not enough data to chart</div>;

  // Simple heuristic: assume first key is X-axis (category), rest are numeric values
  const xKey = keys[0];
  const numericKeys = keys.slice(1).filter(k => typeof data[0][k] === 'number');

  if (numericKeys.length === 0) return <div className="text-muted-foreground">No numeric data to chart</div>;

  // Generate theme-aware colors
  // We can't easily access CSS variables in JS without a helper, but we can try to use the primary color 
  // or just use a harmonious palette that looks good in both modes.
  // For now, let's use a refined palette.
  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];
  // Fallback if vars are not defined (though they should be in standard shadcn setup)
  // If chart-* vars are missing, we might want to stick to hex or define them. 
  // Given we didn't define chart-* in globals.css, let's use a nice hex palette that matches the premium feel.
  const staticColors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088fe", "#00c49f"];

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            dataKey={xKey} 
            tick={{ fontSize: 12, fill: "var(--foreground)" }} 
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: "var(--foreground)" }} 
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <Tooltip 
            contentStyle={{ 
                backgroundColor: "var(--background)", 
                borderColor: "var(--border)",
                borderRadius: "8px",
                color: "var(--foreground)"
            }}
          />
          <Legend />
          {numericKeys.map((key, index) => (
            <Bar 
                key={key} 
                dataKey={key} 
                fill={staticColors[index % staticColors.length]} 
                radius={[4, 4, 0, 0]} 
                className="fill-primary" 
                // We use fill-primary for the first one to match theme, but if multiple bars, we need distinct colors.
                // Recharts doesn't support className for individual bars easily in a loop without custom shapes.
                // So we stick to fill prop.
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
