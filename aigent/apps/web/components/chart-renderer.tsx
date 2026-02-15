"use client";

import { useMemo } from "react";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

interface ChartConfig {
    chart_type: "bar" | "line" | "pie" | "area" | "table";
    title: string;
    x_axis: string;
    y_axis: string;
    x_label: string;
    y_label: string;
    datasets: { label: string; data: any[] }[];
    labels: string[];
}

export function ChartRenderer({ config }: { config: ChartConfig }) {
    const data = config.datasets[0]?.data || [];

    const ChartComponent = useMemo(() => {
        switch (config.chart_type) {
            case "bar":
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey={config.x_axis} />
                            <YAxis />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#1f2937", border: "none" }}
                                itemStyle={{ color: "#fff" }}
                            />
                            <Legend />
                            <Bar dataKey={config.y_axis} fill="#8884d8" name={config.y_label} />
                        </BarChart>
                    </ResponsiveContainer>
                );
            case "line":
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey={config.x_axis} />
                            <YAxis />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#1f2937", border: "none" }}
                                itemStyle={{ color: "#fff" }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey={config.y_axis}
                                stroke="#82ca9d"
                                name={config.y_label}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                );
            case "area":
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey={config.x_axis} />
                            <YAxis />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#1f2937", border: "none" }}
                                itemStyle={{ color: "#fff" }}
                            />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey={config.y_axis}
                                stroke="#8884d8"
                                fill="#8884d8"
                                name={config.y_label}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                );
            case "pie":
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) =>
                                    `${name} ${(percent * 100).toFixed(0)}%`
                                }
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey={config.y_axis}
                                nameKey={config.x_axis}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                );
            default:
                // Fallback to table if type is table or unknown
                return (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-muted/50">
                                <tr>
                                    {config.labels.map((col) => (
                                        <th key={col} className="px-4 py-2">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, i) => (
                                    <tr key={i} className="border-b border-border/50">
                                        {config.labels.map((col) => (
                                            <td key={col} className="px-4 py-2">
                                                {String(row[col])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
        }
    }, [config, data]);

    return (
        <Card className="mt-4 border-border/50">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {config.title}
                </CardTitle>
            </CardHeader>
            <CardContent>{ChartComponent}</CardContent>
        </Card>
    );
}
