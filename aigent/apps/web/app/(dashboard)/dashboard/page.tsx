"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Database, Loader2, Plus, MessageSquare, ArrowRight, AlertCircle, PanelLeft } from "lucide-react";
import { useAuthStore } from "@/hooks/use-auth";
import { useChat, type WsEvent } from "@/hooks/use-chat";
import { api, type Conversation } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage, AgentThought } from "@/components/chat-message";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
    const { accessToken } = useAuthStore();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [connections, setConnections] = useState<any[]>([]);
    const [selectedConnection, setSelectedConnection] = useState<string>("");
    const [inputValue, setInputValue] = useState("");
    const [isHistoryOpen, setIsHistoryOpen] = useState(true);

    const bottomRef = useRef<HTMLDivElement>(null);

    // Chat hook
    const { messages, thoughts, isTyping, sendMessage, isConnected } = useChat(activeConversationId);

    // Load initial data
    useEffect(() => {
        if (accessToken) {
            loadConnections();
            loadConversations();
        }
    }, [accessToken]);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, thoughts]);

    const loadConnections = async () => {
        if (!accessToken) return;
        try {
            const data = await api.listConnections(accessToken);
            setConnections(data);
            if (data && data.length > 0 && data[0]?.id) setSelectedConnection(data[0].id);
        } catch (err) {
            console.error(err);
        }
    };

    const loadConversations = async () => {
        if (!accessToken) return;
        try {
            const data = await api.listConversations(accessToken);
            setConversations(data.items);
            // Determine which conversation to activate
            // If none, we'll wait for user to start one
            // If sticky/last used logic existed, we'd use that
        } catch (err) {
            console.error(err);
        }
    };

    const handleStartConversation = async () => {
        if (!accessToken || !selectedConnection) return;
        try {
            // Create new conversation
            const conv = await api.createConversation(accessToken, {
                title: "New Analysis",
                database_connection_id: selectedConnection,
            });
            setConversations([conv, ...conversations]);
            setActiveConversationId(conv.id);

            // If there was input, send it immediately
            if (inputValue.trim()) {
                // The hook will pick up the new ID, but we need to wait slightly or just rely on manual send
                // Since hook dependency update is async, better to clear input and let user type or just wait.
                // Actually, let's just create it. User can re-type or we can handle it better.
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        if (!activeConversationId) {
            // Create new conversation first
            await handleStartConversation();
            // We need to wait for state update to send message... 
            // simpler UX: require creating convo or auto-create.
            // For now, let's just auto-create if we have a connection selected
        } else {
            sendMessage(inputValue);
            setInputValue("");
        }
    };

    // Special handler for "new convo then send"
    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!inputValue.trim()) return;

            if (!activeConversationId) {
                if (!accessToken || !selectedConnection) {
                    alert("Please select a database connection first.");
                    return;
                }
                try {
                    const conv = await api.createConversation(accessToken, {
                        title: inputValue.slice(0, 30) + "...",
                        database_connection_id: selectedConnection,
                    });
                    setConversations([conv, ...conversations]);
                    setActiveConversationId(conv.id);
                    // Wait a tick for hook to update? 
                    // Actually we can't easily send immediately with the hook pattern unless we wait.
                    // Let's just switch and let user send again or find a way.
                    // For this MVP, we will just set the ID. 
                    // The user will see empty chat and can hit enter again.
                    // A better way is to move sendMessage logic to not depend on hook state for the *function* identity
                    // but the socket needs to connect.

                    // Let's just create the convo.
                } catch (err) {
                    console.error(err);
                }
            } else {
                sendMessage(inputValue);
                setInputValue("");
            }
        }
    };

    // If no conversation selected, show empty state or list
    const showEmptyState = !activeConversationId;

    return (
        <div className="flex h-screen overflow-hidden bg-background relative">
            {/* Mobile Sidebar Toggle - visible only when sidebar is closed or on mobile if needed */}
            {/* Actually, we can put the toggle outside or inside. 
                 If outside, it needs to be absolute or part of the main area.
             */}

            {/* Conversations Sidebar */}
            <div
                className={cn(
                    "border-r border-border/40 bg-muted/10 hidden md:flex flex-col shrink-0 transition-all duration-300 ease-in-out",
                    isHistoryOpen ? "w-64 opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-full overflow-hidden border-none"
                )}
            >
                <div className="p-4 h-16 flex items-center border-b border-border/40 justify-between">
                    <Button
                        onClick={handleStartConversation}
                        className="flex-1 justify-start gap-2 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-colors border border-primary/20 shadow-none mr-2"
                        variant="ghost"
                        size="sm"
                        disabled={!selectedConnection}
                    >
                        <Plus className="w-4 h-4" />
                        <span className="truncate">New Analysis</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setIsHistoryOpen(false)}
                    >
                        <PanelLeft className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {conversations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-xs">
                            No history yet
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => setActiveConversationId(conv.id)}
                                className={cn(
                                    "w-full text-left p-3 rounded-lg text-sm transition-all duration-200 border border-transparent group relative",
                                    activeConversationId === conv.id
                                        ? "bg-background border-border/60 shadow-sm text-foreground font-medium"
                                        : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                                )}
                            >
                                <div className="truncate pr-4">{conv.title || "Untitled Analysis"}</div>
                                <div className="text-[10px] opacity-60 mt-1 flex items-center justify-between">
                                    <span>{new Date(conv.created_at).toLocaleDateString()}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-border/40 bg-muted/5">
                    <div className="text-xs font-medium mb-2 text-muted-foreground">Active Database</div>
                    <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                        <SelectTrigger className="w-full text-xs h-8 bg-background border-border/60">
                            <SelectValue placeholder="Select Database" />
                        </SelectTrigger>
                        <SelectContent>
                            {connections.map((conn) => (
                                <SelectItem key={conn.id} value={conn.id} className="text-xs">
                                    <div className="flex items-center gap-2">
                                        <Database className="w-3 h-3" />
                                        {conn.name}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-background/50 backdrop-blur-3xl relative">
                {/* Header */}
                <header className="h-16 border-b border-border/40 flex items-center justify-between px-6 bg-background/60 backdrop-blur-xl shrink-0 sticky top-0 z-10 transition-all">
                    <div className="flex items-center gap-4">
                        {!isHistoryOpen && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground mr-2 hidden md:flex"
                                onClick={() => setIsHistoryOpen(true)}
                            >
                                <PanelLeft className="w-4 h-4" />
                            </Button>
                        )}
                        <div className="flex flex-col">
                            <h1 className="font-semibold text-sm flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-primary" />
                                {conversations.find(c => c.id === activeConversationId)?.title || "New Analysis"}
                            </h1>
                            {activeConversationId && (
                                <span className="text-[10px] text-muted-foreground">
                                    {connections.find(c => c.id === conversations.find(cv => cv.id === activeConversationId)?.database_connection_id)?.name || "Active Session"}
                                </span>
                            )}
                        </div>
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto scroll-smooth">
                    {showEmptyState ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                                <div className="relative p-6 rounded-2xl bg-linear-to-tr from-primary/10 to-accent/10 border border-primary/10 shadow-xl">
                                    <Sparkles className="w-12 h-12 text-primary" />
                                </div>
                            </div>

                            <h2 className="text-3xl font-bold mb-3 tracking-tight bg-clip-text text-transparent bg-linear-to-b from-foreground to-foreground/70">
                                Welcome to Aigent
                            </h2>
                            <p className="text-muted-foreground text-lg max-w-md mb-12 leading-relaxed">
                                Select a database connection and start asking questions.
                                I'll analyze your data and visualize the results instantly.
                            </p>

                            {!selectedConnection && (
                                <div className="mb-8 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-600 dark:text-yellow-500 text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Please create a database connection in the "Connections" tab first.
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                                {["Show total revenue", "Count users by month", "Top 5 products", "Sales trends"].map(qs => (
                                    <button
                                        key={qs}
                                        className="group relative p-4 rounded-xl text-left border border-border/40 bg-card/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300 hover:shadow-md"
                                        onClick={() => {
                                            setInputValue(qs);
                                            // Optional: auto-focus input
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-foreground group-hover:text-primary transition-colors">{qs}</span>
                                            <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Generate chart and SQL analysis</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col min-h-full pb-4">
                            {messages.map((msg) => (
                                <ChatMessage key={msg.id} message={msg} />
                            ))}

                            {/* Streaming Thoughts */}
                            {isTyping && thoughts.length > 0 && (
                                    <div className="border-t border-border/50 bg-muted/10 mx-6 md:mx-12 rounded-lg my-6 overflow-hidden animate-in fade-in slide-in-from-bottom-2 shadow-sm">
                                    <div className="px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground flex items-center gap-2">
                                            <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                        Thinking Process
                                    </div>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                            {thoughts.map((t, i) => (
                                                t.type === "thought" && <AgentThought key={i} thought={t} />
                                            ))}
                                        </div>
                                </div>
                            )}

                                <div ref={bottomRef} className="h-4" />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-background/80 backdrop-blur-xl border-t border-border/40">
                    <div className="max-w-4xl mx-auto relative">
                        <div className={cn(
                            "relative flex items-center gap-2 rounded-2xl bg-muted/20 border border-border/60 p-1.5 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 focus-within:bg-background shadow-sm hover:border-primary/30",
                            isTyping && "opacity-80 pointer-events-none"
                        )}>
                            <div className="pl-3">
                                <Sparkles className={cn("w-5 h-5 text-muted-foreground", inputValue && "text-primary")} />
                            </div>
                            <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={
                                    !activeConversationId
                                        ? "Ask your data a question..."
                                        : "Ask a follow-up question..."
                                }
                                className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-12 text-base px-2 placeholder:text-muted-foreground/60"
                                disabled={isTyping && !!activeConversationId}
                            />
                            <Button
                                onClick={(e) => {
                                    // manually submit form behavior
                                    e.preventDefault();
                                    if (activeConversationId) {
                                        sendMessage(inputValue);
                                        setInputValue("");
                                    } else {
                                        // Trigger new convo logic via existing handlers or simple button click simulation
                                        const event = { preventDefault: () => { } } as React.FormEvent;
                                        handleSubmit(event);
                                    }
                                }}
                                size="icon"
                                className={cn(
                                    "h-10 w-10 rounded-xl transition-all duration-300",
                                    !inputValue.trim() ? "opacity-0 scale-90" : "opacity-100 scale-100",
                                    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                                )}
                                disabled={!inputValue.trim() || (isTyping && !!activeConversationId)}
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="text-center mt-3 text-[10px] text-muted-foreground font-medium opacity-60">
                            Aigent allows you to chat with your database. Generated queries should be reviewed.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
