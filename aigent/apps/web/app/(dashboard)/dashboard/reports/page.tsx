"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    FileText,
    Trash2,
    BarChart3,
    Calendar,
    Search,
    ChevronDown,
    ChevronRight,
    Code2,
    Lightbulb,
    Loader2,
} from "lucide-react";
import { useAuthStore } from "@/hooks/use-auth";
import { api, type Report } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { ChartRenderer } from "@/components/chart-renderer";
import { cn } from "@/lib/utils";

export default function ReportsPage() {
    const { accessToken } = useAuthStore();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadReports = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const data = await api.listReports(accessToken);
            setReports(data.items);
        } catch (err) {
            console.error("Failed to load reports:", err);
        } finally {
            setLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const handleDelete = async (reportId: string) => {
        if (!accessToken) return;
        setDeletingId(reportId);
        try {
            await api.deleteReport(accessToken, reportId);
            setReports((prev) => prev.filter((r) => r.id !== reportId));
            if (expandedId === reportId) setExpandedId(null);
        } catch (err) {
            console.error("Failed to delete report:", err);
        } finally {
            setDeletingId(null);
        }
    };

    const filteredReports = reports.filter(
        (r) =>
            r.title.toLowerCase().includes(search.toLowerCase()) ||
            r.description?.toLowerCase().includes(search.toLowerCase())
    );

    const chartTypeLabel: Record<string, string> = {
        bar: "Bar Chart",
        line: "Line Chart",
        pie: "Pie Chart",
        area: "Area Chart",
        table: "Table",
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Saved Reports
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        View and manage your saved analyses and visualizations
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/40">
                    <FileText className="w-3.5 h-3.5" />
                    {reports.length} report{reports.length !== 1 ? "s" : ""}
                </div>
            </div>

            {/* Search */}
            {reports.length > 0 && (
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search reports..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 bg-muted/20 border-border/40 focus-visible:ring-primary/20"
                    />
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            )}

            {/* Empty State */}
            {!loading && reports.length === 0 && (
                <Card className="text-center py-16 border-border/40">
                    <CardContent>
                        <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                            <div className="relative p-5 rounded-2xl bg-primary/10 border border-primary/20">
                                <FileText className="w-10 h-10 text-primary" />
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                            No reports saved yet
                        </h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            When you get a chart result in chat, click "Save as
                            Report" to store it here for quick reference.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* No search results */}
            {!loading && reports.length > 0 && filteredReports.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    No reports match "{search}"
                </div>
            )}

            {/* Reports List */}
            {!loading && (
                <div className="space-y-4">
                    {filteredReports.map((report) => {
                        const isExpanded = expandedId === report.id;
                        return (
                            <Card
                                key={report.id}
                                className={cn(
                                    "border-border/40 transition-all duration-300 overflow-hidden",
                                    isExpanded
                                        ? "shadow-lg border-primary/20"
                                        : "hover:border-border/60 hover:shadow-sm"
                                )}
                            >
                                {/* Report Header */}
                                <button
                                    onClick={() =>
                                        setExpandedId(
                                            isExpanded ? null : report.id
                                        )
                                    }
                                    className="w-full text-left"
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2.5 mb-1">
                                                    {isExpanded ? (
                                                        <ChevronDown className="w-4 h-4 text-primary shrink-0" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                                                    )}
                                                    <CardTitle className="text-base font-semibold truncate">
                                                        {report.title}
                                                    </CardTitle>
                                                </div>
                                                {report.description && (
                                                    <CardDescription className="ml-6.5 line-clamp-2">
                                                        {report.description}
                                                    </CardDescription>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                {report.chart_type && (
                                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-1 rounded-md font-medium">
                                                        {chartTypeLabel[
                                                            report.chart_type
                                                        ] || report.chart_type}
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(
                                                        report.created_at
                                                    ).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                </button>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <CardContent className="pt-0 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="border-t border-border/30 pt-4 space-y-4">
                                            {/* Chart */}
                                            {report.chart_config && (
                                                <ChartRenderer
                                                    config={
                                                        report.chart_config as any
                                                    }
                                                />
                                            )}

                                            {/* Insights */}
                                            {report.insights && (
                                                <div className="rounded-xl border border-border/40 bg-primary/5 overflow-hidden">
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-b border-border/40 text-xs font-medium text-primary">
                                                        <Lightbulb className="w-3 h-3" />
                                                        Insights
                                                    </div>
                                                    <div className="p-4 prose prose-sm prose-neutral dark:prose-invert max-w-none">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {report.insights}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            )}

                                            {/* SQL */}
                                            {report.sql_query && (
                                                <div className="rounded-xl border border-border/40 bg-muted/10 overflow-hidden">
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border/40 text-xs font-medium text-muted-foreground">
                                                        <Code2 className="w-3 h-3" />
                                                        SQL Query
                                                    </div>
                                                    <div className="p-4 overflow-x-auto bg-card">
                                                        <pre className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                                                            <code>
                                                                {
                                                                    report.sql_query
                                                                }
                                                            </code>
                                                        </pre>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex items-center justify-end pt-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(
                                                            report.id
                                                        );
                                                    }}
                                                    disabled={
                                                        deletingId ===
                                                        report.id
                                                    }
                                                >
                                                    {deletingId ===
                                                        report.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    )}
                                                    Delete Report
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
