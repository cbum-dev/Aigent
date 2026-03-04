"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    Database, Loader2, AlertCircle, RefreshCw, Sparkles,
    TrendingUp, Users, DollarSign, ShoppingCart, BarChart2,
    Play, Table2, ChevronRight, Code2, LayoutDashboard, Clock,
    CheckCircle2, XCircle, Columns3, Rows3,
} from "lucide-react";
import {
    BarChart, Bar, AreaChart, Area, LineChart, Line,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/hooks/use-auth";
import {
    api,
    type DashboardPayload, type DashboardWidget, type StatCard, type RunQueryResult,
} from "@/lib/api";

// ── Constants ────────────────────────────────────────────────────

const COLORS = [
    "hsl(262,83%,58%)", "hsl(199,89%,48%)", "hsl(142,71%,45%)",
    "hsl(38,92%,50%)", "hsl(347,77%,50%)", "hsl(215,70%,55%)",
    "hsl(160,60%,45%)", "hsl(280,60%,55%)",
];
const DB_BADGE: Record<string, string> = {
    sales: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
    ecommerce: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
    users: "border-blue-500/30 text-blue-400 bg-blue-500/10",
    finance: "border-amber-500/30 text-amber-400 bg-amber-500/10",
    analytics: "border-violet-500/30 text-violet-400 bg-violet-500/10",
    content: "border-pink-500/30 text-pink-400 bg-pink-500/10",
    inventory: "border-orange-500/30 text-orange-400 bg-orange-500/10",
    hr: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10",
    general: "border-muted text-muted-foreground bg-muted/30",
};
const ICON_FOR: Record<string, React.ReactNode> = {
    rows: <TrendingUp className="w-4 h-4" />,
    users: <Users className="w-4 h-4" />,
    dollar: <DollarSign className="w-4 h-4" />,
    orders: <ShoppingCart className="w-4 h-4" />,
    database: <Database className="w-4 h-4" />,
};
const TOOLTIP_STYLE = {
    background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: 8, fontSize: 12, color: "var(--foreground)",
};
const TICK = { fontSize: 11, fill: "var(--muted-foreground)" };

type Tab = "overview" | "sql" | "schema";

// ── Main Component ────────────────────────────────────────────────

interface DbDashboardProps {
    connectionId: string;
    onAskQuestion?: (q: string) => void;
}

export default function DbDashboard({ connectionId, onAskQuestion }: DbDashboardProps) {
    const { accessToken } = useAuthStore();
    const [payload, setPayload] = useState<DashboardPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>("overview");

    const load = useCallback(async (isRefresh = false) => {
        if (!accessToken || !connectionId) return;
        isRefresh ? setRefreshing(true) : setLoading(true);
        setError(null);
        try {
            const data = await api.getDashboardMetrics(accessToken, connectionId, isRefresh);
            setPayload(data);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load dashboard");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [accessToken, connectionId]);

    useEffect(() => { load(); }, [load]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full gap-5 py-28">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <div className="relative p-5 rounded-2xl bg-primary/10 border border-primary/20">
                    <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                </div>
            </div>
            <div className="text-center space-y-1">
                <p className="font-semibold">Analysing your database…</p>
                <p className="text-muted-foreground text-sm">AI is building a personalised dashboard</p>
            </div>
            <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
            </div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <p className="text-destructive text-sm max-w-sm text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={() => load()}>
                <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
        </div>
    );

    if (!payload) return null;

    const badgeClass = DB_BADGE[payload.db_type] ?? DB_BADGE.general;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-border/40 flex items-start justify-between gap-4 shrink-0">
                <div>
                    <div className="flex items-center gap-2.5 mb-0.5">
                        <h2 className="text-lg font-bold tracking-tight">{payload.connection_name}</h2>
                        <Badge variant="outline" className={`text-[10px] capitalize border ${badgeClass}`}>
                            {payload.db_type}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">{payload.summary}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing} className="shrink-0 h-8 text-xs">
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
                    {refreshing ? "…" : "Refresh"}
                </Button>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 px-5 pt-3 shrink-0">
                {([
                    { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
                    { id: "sql", label: "SQL Editor", icon: <Code2 className="w-3.5 h-3.5" /> },
                    { id: "schema", label: "Schema", icon: <Database className="w-3.5 h-3.5" /> },
                ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors border-b-2 ${tab === t.id
                                ? "border-primary text-foreground bg-primary/5"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                            }`}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
                {tab === "overview" && <OverviewTab payload={payload} />}
                {tab === "sql" && <SqlTab connectionId={connectionId} />}
                {tab === "schema" && <SchemaTab connectionId={connectionId} />}
            </div>
        </div>
    );
}

// ── Overview Tab ──────────────────────────────────────────────────

function OverviewTab({ payload }: { payload: DashboardPayload }) {
    return (
        <div className="p-5 space-y-5">
            {/* Stat cards */}
            {payload.overview.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {payload.overview.map((s, i) => <StatCardUI key={i} stat={s} index={i} />)}
                </div>
            )}

            {/* Charts grid */}
            {payload.widgets.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {payload.widgets.map(w => <WidgetCard key={w.id} widget={w} />)}
                </div>
            ) : (
                <EmptyState
                    icon={<BarChart2 className="w-12 h-12 text-muted-foreground/20" />}
                    title="No charts yet"
                    subtitle="Try the SQL editor or chat to explore your data"
                />
            )}
        </div>
    );
}

// ── SQL Editor Tab ────────────────────────────────────────────────

const SQL_EXAMPLES = [
    "SELECT * FROM {TABLE} LIMIT 10",
    "SELECT COUNT(*) FROM {TABLE}",
    "SELECT * FROM {TABLE} ORDER BY 1 DESC LIMIT 20",
];

function SqlTab({ connectionId }: { connectionId: string }) {
    const { accessToken } = useAuthStore();
    const [sql, setSql] = useState("SELECT 1");
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<RunQueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [chartType, setChartType] = useState<"table" | "bar" | "line" | "pie">("table");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const run = async () => {
        if (!accessToken || !sql.trim()) return;
        setRunning(true);
        setError(null);
        setResult(null);
        try {
            const res = await api.runQuery(accessToken, connectionId, sql);
            setResult(res);
            // Auto-pick chart type
            if (res.columns.length === 2 && res.row_count <= 8) setChartType("pie");
            else if (res.columns.length >= 2) setChartType("bar");
            else setChartType("table");
        } catch (e: any) {
            setError(e?.message ?? "Query failed");
        } finally {
            setRunning(false);
        }
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") run();
    };

    const xKey = result?.columns[0] ?? "x";
    const yKey = result?.columns[1] ?? "y";

    return (
        <div className="p-5 space-y-4">
            {/* Editor area */}
            <Card className="border-border/50">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">SQL Query</span>
                        <span className="text-xs text-muted-foreground">(Ctrl+Enter to run)</span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={run}
                            disabled={running}
                            className="h-7 text-xs gap-1.5"
                        >
                            {running
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Play className="w-3.5 h-3.5" />}
                            {running ? "Running…" : "Run"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-0 px-4 pb-4">
                    <textarea
                        ref={textareaRef}
                        value={sql}
                        onChange={e => setSql(e.target.value)}
                        onKeyDown={handleKey}
                        rows={6}
                        spellCheck={false}
                        className="w-full resize-none rounded-lg bg-muted/40 border border-border/40 p-3 font-mono text-sm outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder-muted-foreground"
                        placeholder="SELECT * FROM your_table LIMIT 50;"
                    />
                </CardContent>
            </Card>

            {/* Error */}
            {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span className="font-mono text-xs">{error}</span>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-3">
                    {/* Results header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="font-medium text-foreground">{result.row_count} rows</span>
                            <span>·</span>
                            <span>{result.columns.length} cols</span>
                            {result.execution_time_ms != null && (
                                <>
                                    <span>·</span>
                                    <Clock className="w-3 h-3" />
                                    <span>{result.execution_time_ms}ms</span>
                                </>
                            )}
                        </div>
                        {result.columns.length >= 2 && result.row_count > 0 && (
                            <div className="flex gap-1">
                                {(["table", "bar", "line", "pie"] as const).map(ct => (
                                    <button
                                        key={ct}
                                        onClick={() => setChartType(ct)}
                                        className={`px-2.5 py-1 text-[10px] rounded font-medium transition-colors ${chartType === ct
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                            }`}
                                    >
                                        {ct}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Chart or table */}
                    {chartType !== "table" && result.columns.length >= 2 && result.row_count >= 2 ? (
                        <Card className="border-border/50">
                            <CardContent className="pt-4 px-4 pb-4">
                                {chartType === "bar" && (
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={result.rows} margin={{ bottom: 28, top: 4, right: 8, left: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                                                <XAxis dataKey={xKey} tick={TICK} tickLine={false} angle={-20} textAnchor="end" height={50} tickFormatter={v => fmtLabel(String(v))} />
                                                <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={fmtTick} />
                                                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [fmtTick(v), yKey]} />
                                                <Bar dataKey={yKey} radius={[4, 4, 0, 0]} maxBarSize={52} animationDuration={500} fill={COLORS[0]}>
                                                    {result.rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                                {chartType === "line" && (
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={result.rows} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                                                <defs>
                                                    <linearGradient id="sqlGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                                                <XAxis dataKey={xKey} tick={TICK} tickLine={false} tickFormatter={v => fmtLabel(String(v))} />
                                                <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={fmtTick} />
                                                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [fmtTick(v), yKey]} />
                                                <Area type="monotone" dataKey={yKey} stroke={COLORS[0]} strokeWidth={2} fill="url(#sqlGrad)" dot={{ r: 3 }} activeDot={{ r: 5 }} animationDuration={500} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                                {chartType === "pie" && (
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={result.rows} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" innerRadius={45} outerRadius={90} paddingAngle={3} strokeWidth={0} animationDuration={500}
                                                    label={({ name, percent }) => `${fmtLabel(String(name))} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                                                    {result.rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : null}

                    {/* Data table */}
                    <Card className="border-border/50 overflow-hidden">
                        <div className="overflow-x-auto max-h-72">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-muted/80 backdrop-blur-sm">
                                        <th className="px-3 py-2 text-left w-8 text-muted-foreground font-medium">#</th>
                                        {result.columns.map(col => (
                                            <th key={col} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap text-[10px]">
                                                {String(col)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.rows.map((row, i) => (
                                        <tr key={i} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                                            <td className="px-3 py-2 text-muted-foreground/50">{i + 1}</td>
                                            {result.columns.map(col => (
                                                <td key={col} className="px-3 py-2 font-mono whitespace-nowrap">{fmtCell(row[col])}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {!result && !error && !running && (
                <EmptyState
                    icon={<Code2 className="w-12 h-12 text-muted-foreground/20" />}
                    title="Write a SQL query above"
                    subtitle="Only SELECT is allowed. Press Ctrl+Enter to run."
                />
            )}
        </div>
    );
}

// ── Schema Tab ────────────────────────────────────────────────────

function SchemaTab({ connectionId }: { connectionId: string }) {
    const { accessToken } = useAuthStore();
    const [schema, setSchema] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!accessToken) return;
        (async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/connections/${connectionId}/schema`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                if (res.ok) setSchema(await res.json());
            } finally {
                setLoading(false);
            }
        })();
    }, [connectionId, accessToken]);

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
    );

    if (!schema?.tables?.length) return (
        <EmptyState
            icon={<Database className="w-12 h-12 text-muted-foreground/20" />}
            title="No schema found"
            subtitle="Make sure your database has at least one table."
        />
    );

    const toggle = (name: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
        });
    };

    const TYPE_COLOR: Record<string, string> = {
        Numeric: "text-blue-400",
        Text: "text-emerald-400",
        "Date/Time": "text-amber-400",
        Boolean: "text-rose-400",
        UUID: "text-muted-foreground",
        JSON: "text-violet-400",
    };

    const classifyType = (t: string) => {
        t = t.toLowerCase();
        if (/int|float|numeric|decimal|real/.test(t)) return "Numeric";
        if (/char|text|varchar/.test(t)) return "Text";
        if (/timestamp|date|time/.test(t)) return "Date/Time";
        if (/bool/.test(t)) return "Boolean";
        if (/uuid/.test(t)) return "UUID";
        if (/json/.test(t)) return "JSON";
        return "Other";
    };

    return (
        <div className="p-5 space-y-2">
            <div className="flex items-center gap-2 pb-2">
                <Database className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">{schema.tables.length} Tables</span>
                <span className="text-xs text-muted-foreground ml-auto">
                    {schema.tables.reduce((acc: number, t: any) => acc + t.columns.length, 0)} columns total
                </span>
            </div>

            {schema.tables.map((table: any) => {
                const isOpen = expanded.has(table.name);
                return (
                    <Card key={table.name} className="border-border/40 overflow-hidden">
                        <button
                            className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                            onClick={() => toggle(table.name)}
                        >
                            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                            <Table2 className="w-4 h-4 text-primary" />
                            <span className="font-mono text-sm font-medium">{table.full_name}</span>
                            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                                <Columns3 className="w-3 h-3" /> {table.columns.length} cols
                            </span>
                        </button>

                        {isOpen && (
                            <div className="border-t border-border/30">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-muted/50">
                                                <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Column</th>
                                                <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Type</th>
                                                <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Kind</th>
                                                <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Nullable</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {table.columns.map((col: any) => {
                                                const kind = classifyType(col.type);
                                                const colorClass = TYPE_COLOR[kind] ?? "text-muted-foreground";
                                                return (
                                                    <tr key={col.name} className="border-t border-border/20 hover:bg-muted/20">
                                                        <td className="px-4 py-2 font-mono font-medium">{col.name}</td>
                                                        <td className="px-4 py-2 font-mono text-muted-foreground">{col.type}</td>
                                                        <td className={`px-4 py-2 font-medium ${colorClass}`}>{kind}</td>
                                                        <td className="px-4 py-2">
                                                            {col.is_nullable === "YES" || col.nullable
                                                                ? <span className="text-amber-500">nullable</span>
                                                                : <span className="text-muted-foreground/50">—</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}

// ── Widget Cards ──────────────────────────────────────────────────

function WidgetCard({ widget }: { widget: DashboardWidget }) {
    const data = widget.data ?? [];
    const cfg = widget.config ?? {};
    const firstRow = data[0] ?? {};
    const dataKeys = Object.keys(firstRow);

    const xKey = typeof cfg.x_key === "string" && dataKeys.includes(cfg.x_key) ? cfg.x_key : dataKeys[0] ?? "x";
    const yKey = typeof cfg.y_key === "string" && dataKeys.includes(cfg.y_key) ? cfg.y_key : dataKeys[1] ?? "y";
    const nameKey = typeof cfg.name_key === "string" && dataKeys.includes(cfg.name_key) ? cfg.name_key : dataKeys[0] ?? "name";
    const valueKey = typeof cfg.value_key === "string" && dataKeys.includes(cfg.value_key) ? cfg.value_key : dataKeys[1] ?? "value";
    const colorEach = !!cfg.color_each;

    const isWide = ["line", "area", "table"].includes(widget.widget_type);

    return (
        <Card className={`border-border/50 overflow-hidden ${isWide ? "lg:col-span-2" : ""}`}>
            <CardHeader className="pt-4 pb-0 px-5">
                <CardTitle className="text-sm font-semibold">{widget.title}</CardTitle>
                {data.length > 0 && <CardDescription className="text-xs">{data.length} records</CardDescription>}
            </CardHeader>
            <CardContent className="px-4 pt-2 pb-4">
                {data.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground text-xs">No data</div>
                ) : (
                    <>
                        {widget.widget_type === "bar" && <BarW data={data} xKey={xKey} yKey={yKey} colorEach={colorEach} />}
                        {widget.widget_type === "area" && <AreaW data={data} xKey={xKey} yKey={yKey} />}
                        {widget.widget_type === "line" && (
                            data.length >= 2
                                ? <AreaW data={data} xKey={xKey} yKey={yKey} />
                                : <BarW data={data} xKey={xKey} yKey={yKey} colorEach />
                        )}
                            {widget.widget_type === "pie" && <PieW data={data} nameKey={nameKey} valueKey={valueKey} />}
                            {widget.widget_type === "table" && <TableW data={data} />}
                        </>
                )}
            </CardContent>
        </Card>
    );
}

// ── Stat Card ─────────────────────────────────────────────────────

const GRADIENTS = [
    "from-primary/25 to-transparent",
    "from-cyan-500/25 to-transparent",
    "from-emerald-500/25 to-transparent",
    "from-amber-500/25 to-transparent",
];

function StatCardUI({ stat, index }: { stat: StatCard; index: number }) {
    return (
        <Card className="relative overflow-hidden border-border/50 hover:border-primary/40 transition-all duration-300">
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1 pr-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">{stat.label}</p>
                        <p className="text-2xl font-bold mt-1 leading-tight">{String(stat.value)}</p>
                        {stat.subtitle && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{stat.subtitle}</p>}
                    </div>
                    <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                        {ICON_FOR[stat.icon ?? ""] ?? <Database className="w-4 h-4" />}
                    </div>
                </div>
            </CardContent>
            <div className={`absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-linear-to-br ${GRADIENTS[index % GRADIENTS.length]} blur-xl pointer-events-none`} />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-primary/50 to-transparent" />
        </Card>
    );
}

// ── Chart primitives ─────────────────────────────────────────────

function BarW({ data, xKey, yKey, colorEach }: { data: Record<string, any>[]; xKey: string; yKey: string; colorEach: boolean }) {
    return (
        <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 4, right: 8, bottom: 32, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                    <XAxis dataKey={xKey} tick={TICK} tickLine={false} angle={-20} textAnchor="end" height={50} tickFormatter={v => fmtLabel(String(v))} />
                    <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={fmtTick} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} formatter={(v: any) => [fmtTick(v), yKey.replace(/_/g, " ")]} />
                    <Bar dataKey={yKey} radius={[4, 4, 0, 0]} maxBarSize={52} animationDuration={600} fill={COLORS[0]}>
                        {colorEach && data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function AreaW({ data, xKey, yKey }: { data: Record<string, any>[]; xKey: string; yKey: string }) {
    return (
        <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                    <XAxis dataKey={xKey} tick={TICK} tickLine={false} tickFormatter={v => fmtLabel(String(v))} />
                    <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={fmtTick} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [fmtTick(v), yKey.replace(/_/g, " ")]} />
                    <Area type="monotone" dataKey={yKey} stroke={COLORS[0]} strokeWidth={2.5} fill="url(#areaGrad)" dot={{ r: 3 }} activeDot={{ r: 5 }} animationDuration={600} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

function PieW({ data, nameKey, valueKey }: { data: Record<string, any>[]; nameKey: string; valueKey: string }) {
    return (
        <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%" innerRadius={45} outerRadius={90} paddingAngle={3} strokeWidth={0} animationDuration={600}
                        label={({ name, percent }) => `${fmtLabel(String(name))} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

function TableW({ data }: { data: Record<string, any>[] }) {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    return (
        <div className="overflow-x-auto rounded-lg border border-border/40 max-h-64">
            <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                    <tr className="bg-muted/80 backdrop-blur-sm">
                        {columns.map(col => (
                            <th key={col} className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap text-[10px]">
                                {String(col).replace(/_/g, " ")}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                            {columns.map(col => (
                                <td key={col} className="px-3 py-2 font-mono whitespace-nowrap">{fmtCell(row[col])}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ── Empty State ───────────────────────────────────────────────────

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            {icon}
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground/60">{subtitle}</p>
        </div>
    );
}

// ── Formatters ────────────────────────────────────────────────────

function fmtCell(v: any): string {
    if (v == null) return "—";
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = String(v);
    if (s === "[object Object]") return "—";
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
    if (typeof v === "number") return fmtTick(v);
    return s.length > 45 ? s.slice(0, 43) + "…" : s;
}

function fmtLabel(s: string): string {
    if (!s) return s;
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return s.length > 14 ? s.slice(0, 12) + "…" : s;
}

function fmtTick(v: any): string {
    const n = Number(v);
    if (isNaN(n)) return String(v);
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n % 1 === 0 ? String(n) : n.toFixed(2);
}
