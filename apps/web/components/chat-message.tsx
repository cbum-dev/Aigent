"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    User,
    Sparkles,
    Code2,
    BarChart3,
    BookmarkPlus,
    Lightbulb,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChartRenderer } from "@/components/chart-renderer";
import type { Message } from "@/lib/api";
import type { WsEvent } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";

export function ChatMessage({
    message,
    onSaveReport,
}: {
    message: Message;
    onSaveReport?: (message: Message) => void;
}) {
    const isUser = message.role === "user";
    const meta = message.message_metadata;
    const [sqlOpen, setSqlOpen] = useState(false);

    return (
        <div
            className={cn(
                "group flex w-full gap-4 py-6 px-4 md:px-8 transition-colors hover:bg-muted/20",
                isUser ? "bg-muted/5" : "bg-background"
            )}
        >
            <div
                className={cn(
                    "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl border shadow-sm",
                    isUser
                        ? "bg-background border-border text-foreground"
                        : "bg-primary/10 border-primary/20 text-primary"
                )}
            >
                {isUser ? (
                    <User className="h-4 w-4" />
                ) : (
                    <Sparkles className="h-4 w-4" />
                )}
            </div>

            <div className="flex-1 space-y-2 overflow-hidden">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                        {isUser ? "You" : "Aigent"}
                    </span>
                    {!isUser && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md font-medium">
                            AI
                        </span>
                    )}
                </div>

                {/* Main content */}
                {message.content && (
                    <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none leading-relaxed">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({
                                    inline,
                                    className,
                                    children,
                                    ...props
                                }: any) {
                                    const match = /language-(\w+)/.exec(
                                        className || ""
                                    );
                                    return !inline && match ? (
                                        <div className="relative rounded-lg overflow-hidden my-4 border border-border/40 shadow-sm">
                                            <div className="flex items-center justify-between px-4 py-1.5 bg-muted/40 border-b border-border/40 text-xs text-muted-foreground">
                                                <span>{match[1]}</span>
                                            </div>
                                            <div className="overflow-x-auto bg-muted/20 p-4 scrollbar scrollbar-thumb-primary/90 scrollbar-track-primary/10">
                                                <code
                                                    className={className}
                                                    {...props}
                                                >
                                                    {children}
                                                </code>
                                            </div>
                                        </div>
                                    ) : (
                                            <code
                                                className={cn(
                                                    "bg-muted px-1.5 py-0.5 rounded-md text-primary font-mono text-xs",
                                                    className
                                                )}
                                                {...props}
                                            >
                                            {children}
                                        </code>
                                    );
                                },
                                table({ children }) {
                                    return (
                                        <div className="my-4 w-full overflow-y-auto rounded-lg border border-border/40 shadow-sm">
                                            <table className="w-full text-sm">
                                                {children}
                                            </table>
                                        </div>
                                    );
                                },
                                th({ children }) {
                                    return (
                                        <th className="border-b border-border/40 bg-muted/30 px-4 py-2 text-left font-medium">
                                            {children}
                                        </th>
                                    );
                                },
                                td({ children }) {
                                    return (
                                        <td className="border-b border-border/10 px-4 py-2 last:border-0">
                                            {children}
                                        </td>
                                    );
                                },
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>
                )}

                {/* Insights */}
                {meta?.insights && (
                    <div className="mt-4 rounded-xl border border-border/40 bg-primary/5 overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-b border-border/40 text-xs font-medium text-primary">
                            <Lightbulb className="w-3 h-3" />
                            Key Insights
                        </div>
                        <div className="p-4 prose prose-sm prose-neutral dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {meta.insights}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}

                {/* SQL Query */}
                {meta?.sql_query && (
                    <div className="mt-4 rounded-xl border border-border/40 bg-muted/10 overflow-hidden shadow-sm">
                        <button
                            onClick={() => setSqlOpen(!sqlOpen)}
                            className="flex items-center gap-2 px-4 py-2 w-full bg-muted/30 border-b border-border/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Code2 className="w-3 h-3" />
                            Generated SQL
                            {sqlOpen ? (
                                <ChevronDown className="w-3 h-3 ml-auto" />
                            ) : (
                                <ChevronRight className="w-3 h-3 ml-auto" />
                            )}
                        </button>
                        {sqlOpen && (
                            <div className="p-4 overflow-x-auto bg-card">
                                <pre className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                                    <code>{meta.sql_query}</code>
                                </pre>
                            </div>
                        )}
                    </div>
                )}

                {/* Chart Visualization */}
                {meta?.chart_config && (
                    <div className="mt-4">
                        <ChartRenderer config={meta.chart_config} />
                    </div>
                )}

                {/* Save as Report button */}
                {!isUser && meta?.chart_config && onSaveReport && (
                    <div className="mt-3 flex items-center">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-xs text-muted-foreground hover:text-primary border-border/40"
                            onClick={() => onSaveReport(message)}
                        >
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            Save as Report
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

export function AgentThought({
    thought,
}: {
    thought: WsEvent & { type: "thought" };
}) {
    const agentColor =
        {
            query_planner: "text-blue-400",
            sql_writer: "text-yellow-400",
            sql_executor: "text-green-400",
            visualization: "text-purple-400",
            insight: "text-pink-400",
            supervisor: "text-gray-400",
        }[thought.agent] || "text-muted-foreground";

    return (
        <div className="px-6 py-2">
            <div className="flex items-start gap-3 text-sm text-muted-foreground/80">
                <div
                    className={cn(
                        "mt-0.5 text-xs font-mono uppercase shrink-0 w-24 text-right",
                        agentColor
                    )}
                >
                    {thought.agent}
                </div>
                <div className="flex-1 border-l border-border/50 pl-3">
                    {thought.content}
                </div>
            </div>
        </div>
    );
}
