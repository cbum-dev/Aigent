"use client";

import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { User, Sparkles, ChevronDown, ChevronRight, Terminal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChartRenderer } from "@/components/chart-renderer";
import type { Message } from "@/lib/api";
import type { WsEvent } from "@/hooks/use-chat";

export function ChatMessage({ message }: { message: Message }) {
    const isUser = message.role === "user";

    return (
        <div
            className={cn(
                "flex gap-4 p-6",
                isUser ? "bg-background" : "bg-muted/30"
            )}
        >
            <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback
                    className={cn(
                        "text-xs",
                        isUser ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
                    )}
                >
                    {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4 overflow-hidden">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Markdown>{message.content}</Markdown>
                </div>

                {/* Render chart if config exists */}
                {message.message_metadata?.chart_config && (
                    <div className="mt-4">
                        <ChartRenderer config={message.message_metadata.chart_config as any} />
                    </div>
                )}

                {/* Render SQL if exists (in a collapsed view usually, but inline for now) */}
                {message.message_metadata?.sql_query && (
                    <Collapsible className="mt-2">
                        <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <Terminal className="w-3 h-3" />
                            <span>View SQL Query</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <pre className="mt-2 p-3 rounded-lg bg-black/50 text-xs overflow-x-auto text-green-400 font-mono">
                                {message.message_metadata.sql_query}
                            </pre>
                        </CollapsibleContent>
                    </Collapsible>
                )}
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
