import { useEffect, useRef, useState, useCallback } from "react";
import { useAuthStore } from "@/hooks/use-auth";
import { api, type Message, type AgentMessage } from "@/lib/api";

export type WsEvent =
    | { type: "ping" }
    | { type: "thought"; agent: string; content: string; msg_type?: string }
    | {
        type: "result";
        content: string;
        sql_query?: string;
        query_results?: any;
        chart_config?: any;
        insights?: string;
    }
    | { type: "error"; content: string };

export function useChat(conversationId: string | null) {
    const { accessToken } = useAuthStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [thoughts, setThoughts] = useState<WsEvent[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);

    // Load history
    useEffect(() => {
        if (conversationId && accessToken) {
            api.getMessages(accessToken, conversationId)
                .then(setMessages)
                .catch(console.error);
        }
    }, [conversationId, accessToken]);

    // Connect WebSocket
    useEffect(() => {
        if (!accessToken || !conversationId) return;

        // cleanup previous connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        const wsUrl = api.getWsUrl(accessToken, conversationId);
        console.log("Connecting to:", wsUrl);

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log("WS Connected");
            setIsConnected(true);
            setError(null);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as WsEvent;
                // console.log("WS Message:", data);

                if (data.type === "thought") {
                    setThoughts((prev) => [...prev, data]);
                    setIsTyping(true);
                } else if (data.type === "result") {
                    setIsTyping(false);
                    setThoughts([]); // Clear thoughts after result

                    // Construct a Message object from the result
                    const newMessage: Message = {
                        id: crypto.randomUUID(), // temp ID
                        role: "assistant", // string literal matching type
                        content: data.content,
                        created_at: new Date().toISOString(),
                        conversation_id: conversationId,
                        message_metadata: {
                            sql_query: data.sql_query,
                            chart_config: data.chart_config,
                            insights: data.insights,
                        },
                    };
                    setMessages((prev) => [...prev, newMessage]);
                } else if (data.type === "error") {
                    console.error("WS Error:", data.content);
                    setError(data.content);
                    setIsTyping(false);
                }
            } catch (err) {
                console.error("WS Parse Error", err);
            }
        };

        ws.onclose = (e) => {
            console.log("WS Closed", e.code, e.reason);
            setIsConnected(false);
            setIsTyping(false);
        };

        ws.onerror = (e) => {
            console.error("WS Error Event", e);
            // Don't set error immediately on onerror as it often fires with onclose
        };

        wsRef.current = ws;

        return () => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        };
    }, [accessToken, conversationId]);

    const sendMessage = useCallback((content: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            // Optimistically add user message
            if (conversationId) {
                const newMessage: Message = {
                    id: crypto.randomUUID(),
                    role: "user", // literal type
                    content,
                    created_at: new Date().toISOString(),
                    conversation_id: conversationId,
                };
                setMessages((prev) => [...prev, newMessage]);
                setThoughts([]);
                setIsTyping(true);
            }

            wsRef.current.send(JSON.stringify({ content }));
        } else {
            console.error("WS not connected");
            setError("Not connected to chat server");
        }
    }, [conversationId]);

    return {
        messages,
        thoughts,
        isTyping,
        isConnected,
        error,
        sendMessage,
        setMessages, // exposed for resetting if needed
    };
}
