"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Sparkles, Code2, BarChart3, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Terminal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChartRenderer } from "@/components/chart-renderer";
import { DataChart } from "@/components/data-chart";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { Message } from "@/lib/api";
import type { WsEvent } from "@/hooks/use-chat";

export function ChatMessage({ message }: { message: Message }) {
    const isUser = message.role === "user";

    return (
        <div
            className={cn(
                "group flex w-full gap-4 py-6 px-4 md:px-8 transition-colors hover:bg-muted/20",
                isUser ? "bg-muted/5" : "bg-background"
            )}
        >
            <div className={cn(
                "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl border shadow-sm",
                isUser
                    ? "bg-background border-border text-foreground"
                    : "bg-primary/10 border-primary/20 text-primary"
            )}>
                {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
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

                {message.content && (
                    <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none leading-relaxed">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code({ node, inline, className, children, ...props }: any) {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return !inline && match ? (
                                        <div className="relative rounded-lg overflow-hidden my-4 border border-border/40 shadow-sm">
                                            <div className="flex items-center justify-between px-4 py-1.5 bg-muted/40 border-b border-border/40 text-xs text-muted-foreground">
                                                <span>{match[1]}</span>
                                            </div>
                                            <div className="overflow-x-auto bg-muted/20 p-4">
                                                <code className={className} {...props}>
                                                    {children}
                                                </code>
                                            </div>
                                        </div>
                                    ) : (
                                        <code className={cn("bg-muted px-1.5 py-0.5 rounded-md text-primary font-mono text-xs", className)} {...props}>
                                            {children}
                                        </code>
                                    )
                                },
                                table({ children }) {
                                    return (
                                        <div className="my-4 w-full overflow-y-auto rounded-lg border border-border/40 shadow-sm">
                                            <table className="w-full text-sm">
                                                {children}
                                            </table>
                                        </div>
                                    )
                                },
                                th({ children }) {
                                    return <th className="border-b border-border/40 bg-muted/30 px-4 py-2 text-left font-medium">{children}</th>
                                },
                                td({ children }) {
                                    return <td className="border-b border-border/10 px-4 py-2 last:border-0">{children}</td>
                                }
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>
                )}

                {/* SQL Query Visualization */}
                {message.sql_query && (
                    <div className="mt-4 rounded-xl border border-border/40 bg-muted/10 overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border/40 text-xs font-medium text-muted-foreground">
                            <Code2 className="w-3 h-3" />
                            Generated SQL
                        </div>
                        <div className="p-4 overflow-x-auto bg-card">
                            <pre className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                                <code>{message.sql_query}</code>
                            </pre>
                        </div>
                    </div>
                )}

                {/* Data Chart Visualization */}
                {message.data && message.data.length > 0 && (
                    <div className="mt-6 rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between bg-muted/10">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <BarChart3 className="w-4 h-4 text-primary" />
                                Analysis Result
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {message.data.length} records
                            </span>
                        </div>
                        <div className="p-6">
                            <DataChart data={message.data} />
                        </div>
                    </div>
                )}

                {/* Tool Outputs (Error/Success) */}
                {/* ... existing logic ... */}
            </div>
        </div>
    );
}

export function AgentThought({ thought }: { thought: WsEvent & { type: "thought" } }) {
    const [isOpen, setIsOpen] = useState(true);

    // Map agent names to specific colors or icons if desired
    const agentColor = {
        "query_planner": "text-blue-400",
        "sql_writer": "text-yellow-400",
        "sql_executor": "text-green-400",
        "visualization": "text-purple-400",
        "insight": "text-pink-400",
        "supervisor": "text-gray-400",
    }[thought.agent] || "text-muted-foreground";

    return (
        <div className="px-6 py-2">
            <div className="flex items-start gap-3 text-sm text-muted-foreground/80">
                <div className={cn("mt-0.5 text-xs font-mono uppercase shrink-0 w-24 text-right", agentColor)}>
                    {thought.agent}
                </div>
                <div className="flex-1 border-l border-border/50 pl-3">
                    {thought.content}
                </div>
            </div>
        </div>
    );
}
