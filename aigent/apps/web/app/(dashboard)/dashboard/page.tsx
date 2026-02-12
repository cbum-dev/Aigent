"use client";

import { useState } from "react";
import { Send, Sparkles, Database, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setIsLoading(true);
        // TODO: Implement chat with AI agents (Phase 3)
        setTimeout(() => {
            setIsLoading(false);
            setMessage("");
        }, 1000);
    };

    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-border flex items-center px-6">
                <h1 className="text-xl font-semibold">Analytics Chat</h1>
            </header>

            {/* Chat area */}
            <div className="flex-1 overflow-auto p-6">
                {/* Empty state */}
                <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto">
                    <div className="p-4 rounded-2xl bg-primary/10 mb-6">
                        <Sparkles className="w-12 h-12 text-primary" />
                    </div>

                    <h2 className="text-2xl font-bold mb-2 text-center">
                        Ask anything about your data
                    </h2>
                    <p className="text-muted-foreground text-center mb-8 max-w-md">
                        I'll analyze your databases and provide insights using natural language queries.
                    </p>

                    {/* Quick actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg mb-8">
                        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                            <CardHeader className="p-4">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Database className="w-4 h-4 text-primary" />
                                    Connect Database
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Add your PostgreSQL database
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                            <CardHeader className="p-4">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-accent" />
                                    Example Query
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    "Show sales by region"
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* Example prompts */}
                    <div className="text-sm text-muted-foreground">
                        <p className="mb-2">Try asking:</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {[
                                "Show me total revenue this month",
                                "Compare sales across regions",
                                "What's our top-selling product?",
                                "Create a monthly trend chart",
                            ].map((prompt) => (
                                <button
                                    key={prompt}
                                    onClick={() => setMessage(prompt)}
                                    className="px-3 py-1.5 rounded-full glass text-xs hover:bg-primary/10 transition-colors"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Input area */}
            <div className="border-t border-border p-4">
                <form
                    onSubmit={handleSubmit}
                    className="max-w-3xl mx-auto flex gap-2"
                >
                    <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Ask a question about your data..."
                        className="flex-1"
                        disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading || !message.trim()}>
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
