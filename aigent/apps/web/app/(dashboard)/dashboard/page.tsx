"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Database, Loader2, Plus } from "lucide-react";
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
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar for conversations (could be merged with main sidebar, but keeping separate for now) */}
            <div className="w-64 border-r border-border bg-muted/10 flex flex-col hidden lg:flex">
                <div className="p-4 border-b border-border">
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                            setActiveConversationId(null);
                            setInputValue("");
                        }}
                    >
                        <Plus className="w-4 h-4" />
                        New Chat
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => setActiveConversationId(conv.id)}
                            className={cn(
                                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate",
                                activeConversationId === conv.id
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-muted text-muted-foreground"
                            )}
                        >
                            {conv.title}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/50 backdrop-blur shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="font-semibold text-sm">
                            {conversations.find(c => c.id === activeConversationId)?.title || "New Analysis"}
                        </h1>
                        {/* Connection Selector (only if new) */}
                        {(!activeConversationId) && (
                            <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                                <SelectTrigger className="w-[200px] h-8 text-xs">
                                    <SelectValue placeholder="Select Database" />
                                </SelectTrigger>
                                <SelectContent>
                                    {connections.map((conn) => (
                                        <SelectItem key={conn.id} value={conn.id}>
                                            <div className="flex items-center gap-2">
                                                <Database className="w-3 h-3" />
                                                {conn.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto">
                    {showEmptyState ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                            <div className="p-4 rounded-full bg-primary/10 mb-6">
                                <Sparkles className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Welcome to Aigent</h2>
                            <p className="text-muted-foreground max-w-md mb-8">
                                Select a database connection and start asking questions.
                                I will plan queries, execute them, and visualize the results.
                            </p>

                            {!selectedConnection && (
                                <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 text-sm">
                                    Please create a database connection in the "Connections" tab first.
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                                {["Show total revenue", "Count users by month", "Top 5 products", "Sales trends"].map(qs => (
                                    <Button
                                        key={qs}
                                        variant="outline"
                                        className="h-auto py-4 justify-start"
                                        onClick={() => {
                                            setInputValue(qs);
                                            // handleStartConversation(); // Simplification: just populate input
                                        }}
                                    >
                                        {qs}
                                    </Button>
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
                                <div className="border-t border-border/50 bg-muted/10 mx-6 rounded-lg my-4 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                    <div className="px-4 py-2 bg-muted/30 text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Thinking Process
                                    </div>
                                    {thoughts.map((t, i) => (
                                        t.type === "thought" && <AgentThought key={i} thought={t} />
                                    ))}
                                </div>
                            )}

                            <div ref={bottomRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-border bg-background">
                    <form
                        onSubmit={handleSubmit}
                        className="max-w-4xl mx-auto relative flex items-center gap-2"
                    >
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                !activeConversationId
                                    ? "Start a new analysis..."
                                    : "Ask a follow-up question..."
                            }
                            className="pr-12 h-12 text-base"
                            disabled={isTyping && !!activeConversationId} // Disable only if busy in active chat
                        />
                        <Button
                            type="submit"
                            size="icon"
                            className="absolute right-1 top-1 h-10 w-10"
                            disabled={!inputValue.trim() || (isTyping && !!activeConversationId)}
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                    <div className="text-center mt-2 text-xs text-muted-foreground">
                        Aigent can allow AI to run SQL queries on your database. Review generated queries carefully.
                    </div>
                </div>
            </div>
        </div>
    );
}
