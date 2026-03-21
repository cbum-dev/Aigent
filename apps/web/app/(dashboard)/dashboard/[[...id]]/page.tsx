"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    Send, Sparkles, Database, Loader2, Plus, MessageSquare,
    ArrowRight, AlertCircle, PanelLeft, Pencil, Trash2, Check, X,
    MoreHorizontal, Pause, Play,
} from "lucide-react";
import { useAuthStore } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import { api, type Conversation, type Message } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage, AgentThought } from "@/components/chat-message";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import DbDashboard from "@/components/db-dashboard";

export default function DashboardPage() {
    const params = useParams();
    const { accessToken } = useAuthStore();
    
    // Check if URL has an ID initially using [[...id]] catch-all
    const initialId = params?.id?.[0] || null;
    
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(initialId);
    const [connections, setConnections] = useState<any[]>([]);
    const [selectedConnection, setSelectedConnection] = useState<string>("");
    const [inputValue, setInputValue] = useState("");
    const [isHistoryOpen, setIsHistoryOpen] = useState(true);
    const [viewMode, setViewMode] = useState<"dashboard" | "chat">("dashboard");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);

    const { messages, thoughts, isTyping, sendMessage, isPaused, setIsPaused } = useChat(activeConversationId);

    const handleSaveReport = async (message: Message) => {
        if (!accessToken || !activeConversationId) return;
        const meta = message.message_metadata;
        try {
            await api.createReport(accessToken, {
                conversation_id: activeConversationId,
                title: meta?.chart_config?.title || "Saved Analysis",
                description: message.content?.slice(0, 200),
                sql_query: meta?.sql_query,
                chart_type: meta?.chart_config?.chart_type,
                chart_config: meta?.chart_config,
                insights: meta?.insights,
            });
        } catch { }
    };

    useEffect(() => {
        if (accessToken) {
            loadConnections();
            loadConversations();
        }
    }, [accessToken]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, thoughts]);

    useEffect(() => {
        if (renamingId && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [renamingId]);

    // Sync active conversation ID to URL without triggering a full page remount
    useEffect(() => {
        if (activeConversationId) {
            window.history.replaceState(null, '', `/dashboard/${activeConversationId}`);
        } else {
            window.history.replaceState(null, '', `/dashboard`);
        }
    }, [activeConversationId]);

    const loadConnections = async () => {
        if (!accessToken) return;
        try {
            const data = await api.listConnections(accessToken);
            setConnections(data);
            if (data?.length > 0 && data[0]?.id) setSelectedConnection(data[0].id);
        } catch { }
    };

    const loadConversations = async () => {
        if (!accessToken) return;
        try {
            const data = await api.listConversations(accessToken);
            setConversations(data.items);
        } catch { }
    };

    const handleStartConversation = async () => {
        if (!accessToken || !selectedConnection) return;
        try {
            const conv = await api.createConversation(accessToken, {
                title: "New Analysis",
                database_connection_id: selectedConnection,
            });
            setConversations([conv, ...conversations]);
            setActiveConversationId(conv.id);
        } catch { }
    };

    const handleDeleteConversation = async (id: string) => {
        if (!accessToken) return;
        setDeletingId(id);
        try {
            await api.deleteConversation(accessToken, id);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (activeConversationId === id) setActiveConversationId(null);
        } catch { } finally {
            setDeletingId(null);
            setMenuOpenId(null);
        }
    };

    const handleStartRename = (conv: Conversation) => {
        setRenamingId(conv.id);
        setRenameValue(conv.title || "Untitled Analysis");
        setMenuOpenId(null);
    };

    const handleConfirmRename = async (id: string) => {
        if (!accessToken || !renameValue.trim()) {
            setRenamingId(null);
            return;
        }
        try {
            const updated = await api.updateConversation(accessToken, id, { title: renameValue.trim() });
            setConversations(prev => prev.map(c => c.id === id ? { ...c, title: updated.title } : c));
        } catch { } finally {
            setRenamingId(null);
        }
    };

    const handleKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!inputValue.trim()) return;
            if (!activeConversationId) {
                if (!accessToken || !selectedConnection) return;
                try {
                    const conv = await api.createConversation(accessToken, {
                        title: inputValue.slice(0, 40),
                        database_connection_id: selectedConnection,
                    });
                    setConversations([conv, ...conversations]);
                    setActiveConversationId(conv.id);
                } catch { }
            } else {
                sendMessage(inputValue);
                setInputValue("");
                setViewMode("chat");
            }
        }
    };

    const showEmptyState = !activeConversationId;
    const activeConv = conversations.find(c => c.id === activeConversationId);
    const activeConnectionId = activeConv?.database_connection_id || selectedConnection;
    const showDashboard = viewMode === "dashboard" && !!activeConnectionId;

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-background relative">
            <div className="flex flex-1 overflow-hidden">

                <div className={cn(
                    "border-r border-border/40 bg-muted/10 hidden md:flex flex-col shrink-0 transition-[width,opacity] duration-300 ease-in-out overflow-hidden",
                    isHistoryOpen ? "w-64 opacity-100" : "w-0 opacity-0 border-none"
                )}>
                    <div className="p-4 h-16 flex items-center border-b border-border/40 justify-between shrink-0">
                        <Button
                            onClick={handleStartConversation}
                            className="w-full justify-start gap-2 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-colors border border-primary/20 shadow-none"
                            variant="ghost"
                            size="sm"
                            disabled={!selectedConnection}
                        >
                            <Plus className="w-4 h-4" />
                            <span className="truncate">New Analysis</span>
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar w-64">
                        {conversations.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-xs">No history yet</div>
                        ) : (
                            conversations.map((conv) => (
                                <ConversationItem
                                    key={conv.id}
                                    conv={conv}
                                    isActive={activeConversationId === conv.id}
                                    isRenaming={renamingId === conv.id}
                                    isDeleting={deletingId === conv.id}
                                    menuOpen={menuOpenId === conv.id}
                                    renameValue={renameValue}
                                    renameInputRef={renamingId === conv.id ? renameInputRef : undefined}
                                    onSelect={() => { setActiveConversationId(conv.id); setMenuOpenId(null); }}
                                    onMenuToggle={() => setMenuOpenId(menuOpenId === conv.id ? null : conv.id)}
                                    onRename={() => handleStartRename(conv)}
                                    onDelete={() => handleDeleteConversation(conv.id)}
                                    onRenameChange={setRenameValue}
                                    onRenameConfirm={() => handleConfirmRename(conv.id)}
                                    onRenameCancel={() => setRenamingId(null)}
                                />
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-border/40 bg-muted/5 w-64 shrink-0">
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

                <div className="flex-1 flex flex-col min-w-0 bg-background/50 backdrop-blur-3xl relative">
                    <header className="h-16 border-b border-border/40 flex items-center justify-between px-6 bg-background/60 backdrop-blur-xl shrink-0 sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground mr-2 hidden md:flex shrink-0"
                                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                            >
                                <PanelLeft className="w-4 h-4" />
                            </Button>

                            <div className="flex flex-col">
                                <h1 className="font-semibold text-sm flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-primary" />
                                    {activeConv?.title || "New Analysis"}
                                </h1>
                                {activeConversationId && (
                                    <span className="text-[10px] text-muted-foreground">
                                        {connections.find(c => c.id === activeConv?.database_connection_id)?.name || "Active Session"}
                                    </span>
                                )}
                            </div>
                        </div>

                        {activeConnectionId && (
                            <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5 border border-border/40">
                                <button
                                    onClick={() => setViewMode("dashboard")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                        viewMode === "dashboard" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Dashboard
                                </button>
                                <button
                                    onClick={() => setViewMode("chat")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                        viewMode === "chat" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    Chat
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-2 ml-4">
                            {activeConversationId && viewMode === "chat" && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsPaused(!isPaused)}
                                    className={cn(
                                        "h-8 px-3 gap-1.5 text-xs font-medium transition-all",
                                        isPaused
                                            ? "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20"
                                            : "hover:bg-muted"
                                    )}
                                >
                                    {isPaused ? (
                                        <>
                                            <Play className="w-3.5 h-3.5" />
                                            Resume Chat
                                        </>
                                    ) : (
                                        <>
                                            <Pause className="w-3.5 h-3.5" />
                                            Pause Chat
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-scroll scroll-smooth scrollbar scrollbar-thumb-primary/90 scrollbar-track-primary/10">
                        {showDashboard ? (
                            <DbDashboard connectionId={activeConnectionId} />
                        ) : showEmptyState ? (
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
                                            onClick={() => setInputValue(qs)}
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
                                        <ChatMessage key={msg.id} message={msg} onSaveReport={handleSaveReport} />
                                    ))}
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

                    <div className="p-4 md:p-6 bg-background/80 backdrop-blur-xl border-t border-border/40">
                        <div className="max-w-4xl mx-auto relative">
                            <div className={cn(
                                "relative flex items-center gap-2 rounded-2xl bg-muted/20 border border-border/60 p-1.5 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 focus-within:bg-background shadow-sm hover:border-primary/30",
                                (isTyping || isPaused) && "opacity-80 pointer-events-none"
                            )}>
                                <div className="pl-3">
                                    <Sparkles className={cn("w-5 h-5 text-muted-foreground", inputValue && "text-primary")} />
                                </div>
                                <Input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isPaused ? "Chat is paused" : (!activeConversationId ? "Ask your data a question..." : "Ask a follow-up question...")}
                                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-12 text-base px-2 placeholder:text-muted-foreground/60"
                                    disabled={isPaused || (isTyping && !!activeConversationId)}
                                />
                                <Button
                                    onClick={() => {
                                        if (activeConversationId) {
                                            sendMessage(inputValue);
                                            setInputValue("");
                                            setViewMode("chat");
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
        </div>
    );
}

interface ConversationItemProps {
    conv: Conversation;
    isActive: boolean;
    isRenaming: boolean;
    isDeleting: boolean;
    menuOpen: boolean;
    renameValue: string;
    renameInputRef?: React.RefObject<HTMLInputElement | null>;
    onSelect: () => void;
    onMenuToggle: () => void;
    onRename: () => void;
    onDelete: () => void;
    onRenameChange: (v: string) => void;
    onRenameConfirm: () => void;
    onRenameCancel: () => void;
}

function ConversationItem({
    conv, isActive, isRenaming, isDeleting, menuOpen, renameValue, renameInputRef,
    onSelect, onMenuToggle, onRename, onDelete, onRenameChange, onRenameConfirm, onRenameCancel,
}: ConversationItemProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onMenuToggle();
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [menuOpen, onMenuToggle]);

    return (
        <div ref={ref} className="relative group">
            {isRenaming ? (
                <div className="flex items-center gap-1 p-1.5 rounded-lg bg-background border border-primary/40">
                    <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={e => onRenameChange(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === "Enter") onRenameConfirm();
                            if (e.key === "Escape") onRenameCancel();
                        }}
                        className="flex-1 min-w-0 text-xs bg-transparent outline-none px-1"
                    />
                    <button onClick={onRenameConfirm} className="p-1 rounded hover:bg-emerald-500/10 text-emerald-500">
                        <Check className="w-3 h-3" />
                    </button>
                    <button onClick={onRenameCancel} className="p-1 rounded hover:bg-destructive/10 text-destructive">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <button
                    onClick={onSelect}
                    className={cn(
                        "w-full text-left p-3 rounded-lg text-sm transition-all duration-200 border border-transparent",
                        isActive
                            ? "bg-background border-border/60 shadow-sm text-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                    )}
                >
                    <div className="flex items-start justify-between gap-1">
                        <span className="truncate pr-1 text-xs leading-relaxed">{conv.title || "Untitled Analysis"}</span>
                        <button
                            onClick={e => { e.stopPropagation(); onMenuToggle(); }}
                            className={cn(
                                "shrink-0 p-0.5 rounded hover:bg-muted transition-opacity",
                                menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}
                        >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="text-[10px] opacity-50 mt-0.5">
                        {new Date(conv.created_at).toLocaleDateString()}
                    </div>
                </button>
            )}

            {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-32 animate-in fade-in-0 zoom-in-95 duration-100">
                    <button
                        onClick={onRename}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                    >
                        <Pencil className="w-3 h-3 text-muted-foreground" /> Rename
                    </button>
                    <button
                        onClick={onDelete}
                        disabled={isDeleting}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-destructive/10 text-destructive transition-colors"
                    >
                        {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}