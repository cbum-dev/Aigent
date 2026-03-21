"use client";

import { useMemo, useState, useRef, useCallback } from "react";
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
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    BarChart3,
    LineChart as LineIcon,
    PieChart as PieIcon,
    AreaChart as AreaIcon,
    Table2,
    Download,
} from "lucide-react";

const CHART_COLORS = [
    "hsl(262, 83%, 58%)", // purple primary
    "hsl(199, 89%, 48%)", // cyan accent
    "hsl(142, 71%, 45%)", // emerald
    "hsl(38, 92%, 50%)",  // amber
    "hsl(347, 77%, 50%)", // rose
    "hsl(199, 89%, 65%)", // sky
    "hsl(262, 83%, 72%)", // purple light
    "hsl(142, 71%, 65%)", // emerald light
];

interface ChartConfig {
    chart_type: "bar" | "line" | "pie" | "area" | "table" | "stat";
    title: string;
    x_axis: string;
    y_axis: string;
    x_label: string;
    y_label: string;
    datasets: { label: string; data: any[] }[];
    labels: string[];
}

type ChartType = "bar" | "line" | "pie" | "area" | "table" | "stat";

const chartIcons: Record<ChartType, React.ReactNode> = {
    bar: <BarChart3 className="w-3.5 h-3.5" />,
    line: <LineIcon className="w-3.5 h-3.5" />,
    pie: <PieIcon className="w-3.5 h-3.5" />,
    area: <AreaIcon className="w-3.5 h-3.5" />,
    table: <Table2 className="w-3.5 h-3.5" />,
    stat: <BarChart3 className="w-3.5 h-3.5 rotate-90" />,
};

const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    borderColor: "hsl(var(--border))",
    borderRadius: "0.5rem",
    color: "hsl(var(--foreground))",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    fontSize: "12px",
    padding: "8px 12px",
};

export function ChartRenderer({ config }: { config: ChartConfig }) {
    const [activeType, setActiveType] = useState<ChartType>(config.chart_type);
    const chartRef = useRef<HTMLDivElement>(null);
    const data = config.datasets?.[0]?.data || [];

    const handleExportPNG = useCallback(() => {
        if (!chartRef.current) return;
        const svg = chartRef.current.querySelector("svg");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width * 2;
            canvas.height = img.height * 2;
            if (ctx) {
                ctx.scale(2, 2);
                ctx.fillStyle = "hsl(224, 71%, 4%)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            }
            const link = document.createElement("a");
            link.download = `${config.title || "chart"}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        };

        img.src =
            "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    }, [config.title]);

    const axisStyle = {
        fontSize: 11,
        fill: "hsl(var(--muted-foreground))",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    };

    const renderChart = useMemo(() => {
        if (activeType === "stat") {
            const firstRow = data[0] || {};
            const firstKey = Object.keys(firstRow)[0];
            const val = firstRow[config.y_axis] ?? (firstKey ? firstRow[firstKey] : "N/A");
            const isNumber = typeof val === "number";
            const formattedVal = isNumber
                ? new Intl.NumberFormat('en-US', {
                    style: val > 1000 ? 'currency' : 'decimal',
                    currency: 'USD',
                    maximumFractionDigits: 2
                }).format(val)
                : String(val);

            return (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-in zoom-in-95 duration-500">
                    <div className="text-5xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-primary via-primary/80 to-accent animate-in slide-in-from-bottom-4 duration-700">
                        {formattedVal}
                    </div>
                    <div className="text-muted-foreground font-medium mt-4 text-sm uppercase tracking-widest opacity-70">
                        {config.y_label || config.title}
                    </div>
                </div>
            );
        }

        if (activeType === "table") {
            return (
                <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-muted/50 sticky top-0">
                            <tr>
                                {config.labels?.map((col) => (
                                    <th
                                        key={col}
                                        className="px-4 py-3 font-medium text-muted-foreground"
                                    >
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr
                                    key={i}
                                    className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                                >
                                    {config.labels?.map((col) => (
                                        <td key={col} className="px-4 py-2.5">
                                            {String(
                                                row[col] ?? ""
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        switch (activeType) {
            case "bar":
                return (
                    <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                            data={data}
                            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                                opacity={0.3}
                            />
                            <XAxis
                                dataKey={config.x_axis}
                                tick={axisStyle}
                                tickLine={false}
                                axisLine={{
                                    stroke: "hsl(var(--border))",
                                }}
                                label={{
                                    value: config.x_label,
                                    position: "insideBottom",
                                    offset: -5,
                                    style: { ...axisStyle, fontSize: 12 },
                                }}
                            />
                            <YAxis
                                tick={axisStyle}
                                tickLine={false}
                                axisLine={{
                                    stroke: "hsl(var(--border))",
                                }}
                                label={{
                                    value: config.y_label,
                                    angle: -90,
                                    position: "insideLeft",
                                    style: { ...axisStyle, fontSize: 12 },
                                }}
                            />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                            <Legend
                                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                            />
                            <Bar
                                dataKey={config.y_axis}
                                fill={CHART_COLORS[0]}
                                name={config.y_label}
                                radius={[6, 6, 0, 0]}
                                animationDuration={800}
                                animationEasing="ease-out"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                );
            case "line":
                return (
                    <ResponsiveContainer width="100%" height={320}>
                        <LineChart
                            data={data}
                            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                                opacity={0.3}
                            />
                            <XAxis
                                dataKey={config.x_axis}
                                tick={axisStyle}
                                tickLine={false}
                                axisLine={{
                                    stroke: "hsl(var(--border))",
                                }}
                            />
                            <YAxis
                                tick={axisStyle}
                                tickLine={false}
                                axisLine={{
                                    stroke: "hsl(var(--border))",
                                }}
                            />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend
                                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                            />
                            <Line
                                type="monotone"
                                dataKey={config.y_axis}
                                stroke={CHART_COLORS[1]}
                                strokeWidth={2.5}
                                name={config.y_label}
                                dot={{ r: 4, fill: CHART_COLORS[1] }}
                                activeDot={{ r: 6, strokeWidth: 2 }}
                                animationDuration={800}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                );
            case "area":
                return (
                    <ResponsiveContainer width="100%" height={320}>
                        <AreaChart
                            data={data}
                            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                        >
                            <defs>
                                <linearGradient
                                    id="areaFill"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor={CHART_COLORS[0]}
                                        stopOpacity={0.3}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={CHART_COLORS[0]}
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="hsl(var(--border))"
                                opacity={0.3}
                            />
                            <XAxis
                                dataKey={config.x_axis}
                                tick={axisStyle}
                                tickLine={false}
                                axisLine={{
                                    stroke: "hsl(var(--border))",
                                }}
                            />
                            <YAxis
                                tick={axisStyle}
                                tickLine={false}
                                axisLine={{
                                    stroke: "hsl(var(--border))",
                                }}
                            />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend
                                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                            />
                            <Area
                                type="monotone"
                                dataKey={config.y_axis}
                                stroke={CHART_COLORS[0]}
                                strokeWidth={2}
                                fill="url(#areaFill)"
                                name={config.y_label}
                                animationDuration={800}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                );
            case "pie":
                return (
                    <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({
                                    name,
                                    percent,
                                }: {
                                    name?: string | number;
                                    percent?: number;
                                }) =>
                                    `${name ?? ""} ${((percent || 0) * 100).toFixed(0)}%`
                                }
                                outerRadius={110}
                                innerRadius={50}
                                fill={CHART_COLORS[0]}
                                dataKey={config.y_axis}
                                nameKey={config.x_axis}
                                animationDuration={800}
                                paddingAngle={2}
                                strokeWidth={0}
                            >
                                {data.map((_entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={
                                            CHART_COLORS[
                                            index % CHART_COLORS.length
                                            ]
                                        }
                                    />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend
                                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                );
            default:
                return null;
        }
    }, [activeType, config, data, axisStyle]);

    return (
        <Card className="border-border/50 shadow-md overflow-hidden bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-semibold truncate">
                            {config.title}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            {data.length} records
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Select
                            value={activeType}
                            onValueChange={(v) =>
                                setActiveType(v as ChartType)
                            }
                        >
                            <SelectTrigger className="h-8 w-[120px] text-xs border-border/40">
                                <div className="flex items-center gap-1.5">
                                    {chartIcons[activeType]}
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bar">
                                    <div className="flex items-center gap-2">
                                        <BarChart3 className="w-3.5 h-3.5" />
                                        Bar
                                    </div>
                                </SelectItem>
                                <SelectItem value="line">
                                    <div className="flex items-center gap-2">
                                        <LineIcon className="w-3.5 h-3.5" />
                                        Line
                                    </div>
                                </SelectItem>
                                <SelectItem value="area">
                                    <div className="flex items-center gap-2">
                                        <AreaIcon className="w-3.5 h-3.5" />
                                        Area
                                    </div>
                                </SelectItem>
                                <SelectItem value="pie">
                                    <div className="flex items-center gap-2">
                                        <PieIcon className="w-3.5 h-3.5" />
                                        Pie
                                    </div>
                                </SelectItem>
                                <SelectItem value="table">
                                    <div className="flex items-center gap-2">
                                        <Table2 className="w-3.5 h-3.5" />
                                        Table
                                    </div>
                                </SelectItem>
                                <SelectItem value="stat">
                                    <div className="flex items-center gap-2">
                                        <BarChart3 className="w-3.5 h-3.5 rotate-90" />
                                        Stat
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        {activeType !== "table" && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={handleExportPNG}
                                title="Download as PNG"
                            >
                                <Download className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div ref={chartRef}>{renderChart}</div>
            </CardContent>
        </Card>
    );
}
