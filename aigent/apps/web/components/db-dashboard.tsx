"use client";

import { useEffect, useState } from "react";
import {
    Table2,
    Rows3,
    Columns3,
    Database,
    Loader2,
    AlertCircle,
    RefreshCw,
} from "lucide-react";
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/hooks/use-auth";
import {
    api,
    type DashboardPayload,
    type DashboardWidget,
    type StatCard,
} from "@/lib/api";

const CHART_COLORS = [
    "hsl(262, 83%, 58%)",
    "hsl(199, 89%, 48%)",
    "hsl(142, 71%, 45%)",
    "hsl(38, 92%, 50%)",
    "hsl(347, 77%, 50%)",
    "hsl(215, 70%, 55%)",
    "hsl(160, 60%, 45%)",
    "hsl(280, 60%, 55%)",
];

const ICON_MAP: Record<string, React.ReactNode> = {
    table: <Table2 className="w-5 h-5" />,
    rows: <Rows3 className="w-5 h-5" />,
    columns: <Columns3 className="w-5 h-5" />,
    database: <Database className="w-5 h-5" />,
};

interface DbDashboardProps {
    connectionId: string;
}

export default function DbDashboard({ connectionId }: DbDashboardProps) {
    const { accessToken } = useAuthStore();
    const [payload, setPayload] = useState<DashboardPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = async () => {
        if (!accessToken || !connectionId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.getDashboardMetrics(accessToken, connectionId);
            setPayload(data);
        } catch (err: any) {
            setError(err?.message || "Failed to load dashboard metrics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, [connectionId, accessToken]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground text-sm">Analyzing your database…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
                <AlertCircle className="w-10 h-10 text-destructive" />
                <p className="text-destructive text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchDashboard}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Retry
                </Button>
            </div>
        );
    }

    if (!payload) return null;

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        {payload.connection_name}
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Auto-generated database overview
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchDashboard}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {payload.overview.map((stat, i) => (
                    <OverviewCard key={i} stat={stat} />
                ))}
            </div>

            {/* Widgets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {payload.widgets.map((widget) => (
                    <WidgetCard key={widget.id} widget={widget} />
                ))}
            </div>
        </div>
    );
}

/* ── Overview Stat Card ─────────────────────────────────────────── */

function OverviewCard({ stat }: { stat: StatCard }) {
    return (
        <Card className="relative overflow-hidden">
            <CardContent className="p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {stat.label}
                        </p>
                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                        {stat.subtitle && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {stat.subtitle}
                            </p>
                        )}
                    </div>
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        {ICON_MAP[stat.icon || ""] || <Database className="w-5 h-5" />}
                    </div>
                </div>
            </CardContent>
            {/* subtle gradient accent */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-primary/60 to-primary/20" />
        </Card>
    );
}

/* ── Widget Card ────────────────────────────────────────────────── */

function WidgetCard({ widget }: { widget: DashboardWidget }) {
    return (
        <Card className={widget.widget_type === "table" ? "lg:col-span-2" : ""}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                    {widget.title}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                {widget.widget_type === "bar" && (
                    <BarWidget data={widget.data || []} config={widget.config || {}} />
                )}
                {widget.widget_type === "pie" && (
                    <PieWidget data={widget.data || []} config={widget.config || {}} />
                )}
                {widget.widget_type === "table" && (
                    <TableWidget data={widget.data || []} config={widget.config || {}} />
                )}
            </CardContent>
        </Card>
    );
}

/* ── Bar Chart Widget ───────────────────────────────────────────── */

function BarWidget({
    data,
    config,
}: {
    data: Record<string, any>[];
    config: Record<string, any>;
}) {
    const xKey = config.x_key || "name";
    const yKey = config.y_key || "value";
    const color = config.color || CHART_COLORS[0];

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                        dataKey={xKey}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        angle={-30}
                        textAnchor="end"
                        height={60}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                        contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: 12,
                        }}
                    />
                    <Bar
                        dataKey={yKey}
                        fill={color}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={48}
                        name={config.y_label || yKey}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ── Pie Chart Widget ───────────────────────────────────────────── */

function PieWidget({
    data,
    config,
}: {
    data: Record<string, any>[];
    config: Record<string, any>;
}) {
    const nameKey = config.name_key || "name";
    const valueKey = config.value_key || "value";

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey={valueKey}
                        nameKey={nameKey}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={100}
                        paddingAngle={3}
                        label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                    >
                        {data.map((_, idx) => (
                            <Cell
                                key={idx}
                                fill={CHART_COLORS[idx % CHART_COLORS.length]}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: 12,
                        }}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ── Table Widget ───────────────────────────────────────────────── */

function TableWidget({
    data,
    config,
}: {
    data: Record<string, any>[];
    config: Record<string, any>;
}) {
    const columns: string[] = config.columns || (data.length > 0 && data[0] ? Object.keys(data[0]) : []);

    return (
        <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-muted/50">
                        {columns.map((col) => (
                            <th
                                key={col}
                                className="px-4 py-2.5 text-left font-medium text-muted-foreground uppercase text-xs tracking-wider"
                            >
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                            {columns.map((col) => (
                                <td key={col} className="px-4 py-2.5 font-mono text-xs">
                                    {row[col] != null ? String(row[col]) : "—"}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
