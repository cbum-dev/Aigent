"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Table2,
    Rows3,
    Columns3,
    Database,
    Loader2,
    AlertCircle,
    RefreshCw,
    DollarSign,
    Users,
    ShoppingCart,
    TrendingUp,
    Sparkles,
} from "lucide-react";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
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

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    dollar: <DollarSign className="w-5 h-5" />,
    users: <Users className="w-5 h-5" />,
    orders: <ShoppingCart className="w-5 h-5" />,
    trend: <TrendingUp className="w-5 h-5" />,
};

const DB_TYPE_BADGE: Record<string, string> = {
    sales: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    ecommerce: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    users: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    finance: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    healthcare: "bg-red-500/10 text-red-500 border-red-500/20",
    inventory: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    blog: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    general: "bg-muted text-muted-foreground border-border",
};

interface DbDashboardProps {
    connectionId: string;
}

export default function DbDashboard({ connectionId }: DbDashboardProps) {
    const { accessToken } = useAuthStore();
    const [payload, setPayload] = useState<DashboardPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboard = useCallback(async (isRefresh = false) => {
        if (!accessToken || !connectionId) return;
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        try {
            const data = await api.getDashboardMetrics(accessToken, connectionId, isRefresh);
            setPayload(data);
        } catch (err: any) {
            setError(err?.message || "Failed to load dashboard metrics");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [accessToken, connectionId]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-5 py-24">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                    <div className="relative p-5 rounded-2xl bg-primary/10 border border-primary/20">
                        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-foreground font-semibold">Analyzing your database…</p>
                    <p className="text-muted-foreground text-sm mt-1">AI is crafting a personalized dashboard</p>
                </div>
                <div className="flex gap-1.5 mt-2">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="w-2 h-2 rounded-full bg-primary animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
                <AlertCircle className="w-10 h-10 text-destructive" />
                <p className="text-destructive text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={() => fetchDashboard()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Retry
                </Button>
            </div>
        );
    }

    if (!payload) return null;

    const badgeClass = DB_TYPE_BADGE[payload.db_type] || DB_TYPE_BADGE.general;

    return (
        <div className="p-6 space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-bold tracking-tight">
                            {payload.connection_name}
                        </h2>
                        <Badge
                            variant="outline"
                            className={`text-xs font-medium capitalize px-2.5 py-0.5 border ${badgeClass}`}
                        >
                            {payload.db_type}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm max-w-xl">
                        {payload.summary}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDashboard(true)}
                    disabled={refreshing}
                    className="shrink-0"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                    {refreshing ? "Refreshing…" : "Refresh"}
                </Button>
            </div>

            {/* Overview Stats */}
            {payload.overview.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {payload.overview.map((stat, i) => (
                        <OverviewCard key={i} stat={stat} index={i} />
                    ))}
                </div>
            )}

            {/* Widgets Grid */}
            {payload.widgets.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {payload.widgets.map((widget) => (
                        <WidgetCard key={widget.id} widget={widget} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Database className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No analytics widgets available yet.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Try starting a conversation to explore your data.</p>
                </div>
            )}
        </div>
    );
}

/* ── Overview Stat Card ─────────────────────────────────────────── */

const ACCENT_COLORS = [
    "from-primary/30 via-primary/10 to-transparent",
    "from-cyan-500/30 via-cyan-500/10 to-transparent",
    "from-emerald-500/30 via-emerald-500/10 to-transparent",
    "from-amber-500/30 via-amber-500/10 to-transparent",
];

function OverviewCard({ stat, index }: { stat: StatCard; index: number }) {
    const gradient = ACCENT_COLORS[index % ACCENT_COLORS.length];
    return (
        <Card className="relative overflow-hidden border-border/50 hover:border-primary/30 transition-colors duration-300">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                            {stat.label}
                        </p>
                        <p className="text-2xl font-bold mt-1 leading-tight truncate">{stat.value}</p>
                        {stat.subtitle && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                                {stat.subtitle}
                            </p>
                        )}
                    </div>
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                        {ICON_MAP[stat.icon || ""] || <Database className="w-5 h-5" />}
                    </div>
                </div>
            </CardContent>
            <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-linear-to-br ${gradient} blur-xl opacity-60`} />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-primary/60 to-transparent" />
        </Card>
    );
}

/* ── Widget Card ────────────────────────────────────────────────── */

function WidgetCard({ widget }: { widget: DashboardWidget }) {
    const isWide = widget.widget_type === "table" || widget.widget_type === "line";
    return (
        <Card className={`border-border/50 overflow-hidden ${isWide ? "lg:col-span-2" : ""}`}>
            <CardHeader className="pb-0 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">{widget.title}</CardTitle>
                {widget.data && (
                    <CardDescription className="text-xs">
                        {widget.data.length} records
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="pt-3 px-5 pb-5">
                {widget.widget_type === "bar" && (
                    <BarWidget data={widget.data || []} config={widget.config || {}} />
                )}
                {widget.widget_type === "line" && (
                    <LineWidget data={widget.data || []} config={widget.config || {}} />
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

const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: 12,
    color: "hsl(var(--foreground))",
};

const axisStyle = {
    fontSize: 11,
    fill: "hsl(var(--muted-foreground))",
};

function BarWidget({ data, config }: { data: Record<string, any>[]; config: Record<string, any> }) {
    const xKey = config.x_key || Object.keys(data[0] || {})[0] || "name";
    const yKey = config.y_key || Object.keys(data[0] || {})[1] || "value";
    const color = config.color || CHART_COLORS[0];

    return (
        <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 28 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} angle={-25} textAnchor="end" height={55} />
                    <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey={yKey} fill={color} radius={[5, 5, 0, 0]} maxBarSize={48} name={config.y_label || yKey} animationDuration={700}>
                        {data.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ── Line Chart Widget ──────────────────────────────────────────── */

function LineWidget({ data, config }: { data: Record<string, any>[]; config: Record<string, any> }) {
    const xKey = config.x_key || Object.keys(data[0] || {})[0] || "date";
    const yKey = config.y_key || Object.keys(data[0] || {})[1] || "value";

    return (
        <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                    <defs>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey={xKey} tick={axisStyle} tickLine={false} />
                    <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                        type="monotone"
                        dataKey={yKey}
                        stroke={CHART_COLORS[0]}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: CHART_COLORS[0] }}
                        activeDot={{ r: 5 }}
                        name={config.y_label || yKey}
                        animationDuration={700}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ── Pie Chart Widget ───────────────────────────────────────────── */

function PieWidget({ data, config }: { data: Record<string, any>[]; config: Record<string, any> }) {
    const nameKey = config.name_key || Object.keys(data[0] || {})[0] || "name";
    const valueKey = config.value_key || Object.keys(data[0] || {})[1] || "value";

    return (
        <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey={valueKey}
                        nameKey={nameKey}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        strokeWidth={0}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        animationDuration={700}
                    >
                        {data.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ── Table Widget ───────────────────────────────────────────────── */

function TableWidget({ data, config }: { data: Record<string, any>[]; config: Record<string, any> }) {
    const firstKey = data.length > 0 && data[0] ? Object.keys(data[0]) : [];
    const columns: string[] = config.columns || firstKey;

    const formatCell = (val: any) => {
        if (val == null) return "—";
        if (typeof val === "number") {
            if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
            if (Math.abs(val) >= 1000) return val.toLocaleString();
            return String(val);
        }
        const s = String(val);
        // Truncate ISO dates to just YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
        return s.length > 40 ? s.slice(0, 38) + "…" : s;
    };

    return (
        <div className="overflow-x-auto rounded-lg border border-border/50 max-h-72">
            <table className="w-full text-sm">
                <thead className="sticky top-0">
                    <tr className="bg-muted/70 backdrop-blur-sm">
                        {columns.map((col) => (
                            <th key={col} className="px-4 py-2.5 text-left font-medium text-muted-foreground text-xs tracking-wide whitespace-nowrap">
                                {String(col).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                            {columns.map((col) => (
                                <td key={col} className="px-4 py-2.5 text-xs font-mono">
                                    {formatCell(row[col])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
