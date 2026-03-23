"use client";

import { useEffect, useRef, useState } from "react";
import {
    Database, Plus, Loader2, CheckCircle2, XCircle,
    Trash2, TestTube, Pencil, Check, X, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/hooks/use-auth";
import { api, type DatabaseConnection, type CreateConnectionData, ApiError } from "@/lib/api";

export default function ConnectionsPage() {
    const { accessToken } = useAuthStore();
    const [connections, setConnections] = useState<DatabaseConnection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const renameRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<CreateConnectionData>({
        name: "", host: "", port: 5432, database: "", username: "", password: "", ssl_mode: "prefer",
    });

    useEffect(() => { if (accessToken) loadConnections(); }, [accessToken]);

    useEffect(() => {
        if (renamingId) renameRef.current?.focus();
    }, [renamingId]);

    const loadConnections = async () => {
        if (!accessToken) return;
        try {
            const data = await api.listConnections(accessToken);
            setConnections(data);
        } catch { } finally {
            setIsLoading(false);
        }
    };

    const handleTest = async () => {
        setTestResult(null);
        setError(null);
        if (!accessToken) return;
        try {
            const result = await api.testConnection(accessToken, {
                host: formData.host, port: formData.port, database: formData.database,
                username: formData.username, password: formData.password, ssl_mode: formData.ssl_mode,
            });
            setTestResult(result);
        } catch (err) {
            if (err instanceof ApiError) setTestResult({ success: false, message: err.message });
        }
    };

    const handleTestSaved = async (connectionId: string) => {
        if (!accessToken) return;
        setIsTesting(connectionId);
        try {
            await api.testSavedConnection(accessToken, connectionId);
            await loadConnections();
        } catch { } finally {
            setIsTesting(null);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;
        setIsSaving(true);
        setError(null);
        try {
            await api.createConnection(accessToken, formData);
            await loadConnections();
            setShowForm(false);
            setFormData({ name: "", host: "", port: 5432, database: "", username: "", password: "", ssl_mode: "prefer" });
            setTestResult(null);
        } catch (err) {
            if (err instanceof ApiError) setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (connectionId: string) => {
        if (!accessToken) return;
        setDeletingId(connectionId);
        try {
            await api.deleteConnection(accessToken, connectionId);
            setConnections(prev => prev.filter(c => c.id !== connectionId));
        } catch { } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    const handleStartRename = (conn: DatabaseConnection) => {
        setRenamingId(conn.id);
        setRenameValue(conn.name);
    };

    const handleConfirmRename = async (id: string) => {
        if (!accessToken || !renameValue.trim()) { setRenamingId(null); return; }
        try {
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "https://aigent-1.onrender.com"}/connections/${id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
                    body: JSON.stringify({ name: renameValue.trim() }),
                }
            );
            setConnections(prev => prev.map(c => c.id === id ? { ...c, name: renameValue.trim() } : c));
        } catch { } finally {
            setRenamingId(null);
        }
    };

    return (
        <div className="p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">Database Connections</h1>
                        <p className="text-muted-foreground">Connect your PostgreSQL databases to analyze your data</p>
                    </div>
                    <Button onClick={() => setShowForm(!showForm)}>
                        <Plus className="w-4 h-4 mr-2" /> Add Connection
                    </Button>
                </div>

                {showForm && (
                    <Card className="mb-6">
                        <form onSubmit={handleSave}>
                            <CardHeader>
                                <CardTitle>New Connection</CardTitle>
                                <CardDescription>Enter your PostgreSQL database credentials</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {error && (
                                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">{error}</div>
                                )}
                                {testResult && (
                                    <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${testResult.success ? "bg-green-500/10 border border-green-500/20 text-green-500" : "bg-destructive/10 border border-destructive/20 text-destructive"}`}>
                                        {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                        {testResult.message}
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <Label>Connection Name</Label>
                                        <Input placeholder="My Database" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Host</Label>
                                        <Input placeholder="localhost" value={formData.host} onChange={e => setFormData({ ...formData, host: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Port</Label>
                                        <Input type="number" placeholder="5432" value={formData.port} onChange={e => setFormData({ ...formData, port: parseInt(e.target.value) })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Database</Label>
                                        <Input placeholder="mydb" value={formData.database} onChange={e => setFormData({ ...formData, database: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Username</Label>
                                        <Input placeholder="postgres" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label>Password</Label>
                                        <Input type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button type="button" variant="outline" onClick={handleTest}>
                                    <TestTube className="w-4 h-4 mr-2" /> Test Connection
                                </Button>
                                <div className="flex gap-2">
                                    <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                        Save Connection
                                    </Button>
                                </div>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : connections.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent>
                            <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No connections yet</h3>
                                <p className="text-muted-foreground mb-4">Add your first database connection to get started</p>
                                <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Add Connection</Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {connections.map((conn) => (
                            <Card key={conn.id} className="border-border/50">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                                                <Database className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {renamingId === conn.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            ref={renameRef}
                                                            value={renameValue}
                                                            onChange={e => setRenameValue(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === "Enter") handleConfirmRename(conn.id);
                                                                if (e.key === "Escape") setRenamingId(null);
                                                            }}
                                                            className="text-lg font-semibold bg-transparent border-b border-primary outline-none w-full"
                                                        />
                                                        <button onClick={() => handleConfirmRename(conn.id)} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded">
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setRenamingId(null)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        {conn.name}
                                                        <button
                                                            onClick={() => handleStartRename(conn)}
                                                            className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                                        </button>
                                                    </CardTitle>
                                                )}
                                                <CardDescription className="mt-0.5">
                                                    {conn.host}:{conn.port} / <span className="font-mono">{conn.database}</span>
                                                </CardDescription>
                                            </div>
                                        </div>
                                        {conn.last_test_success !== null && (
                                            <div className={`flex items-center gap-1 text-xs shrink-0 ml-2 ${conn.last_test_success ? "text-green-500" : "text-destructive"}`}>
                                                {conn.last_test_success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                {conn.last_test_success ? "Connected" : "Failed"}
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>

                                {confirmDeleteId === conn.id && (
                                    <CardContent className="pt-0">
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                                            <p className="text-sm text-destructive flex-1">Delete <strong>{conn.name}</strong>? This cannot be undone.</p>
                                            <Button size="sm" variant="destructive" onClick={() => handleDelete(conn.id)} disabled={deletingId === conn.id}>
                                                {deletingId === conn.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                                                Delete
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                                        </div>
                                    </CardContent>
                                )}

                                <CardFooter className="pt-2">
                                    <div className="flex justify-between items-center w-full">
                                        <Button variant="ghost" size="sm" onClick={() => handleStartRename(conn)}>
                                            <Pencil className="w-3.5 h-3.5 mr-1.5" /> Rename
                                        </Button>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleTestSaved(conn.id)} disabled={isTesting === conn.id}>
                                                {isTesting === conn.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
                                                <span className="ml-1">Test</span>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setConfirmDeleteId(confirmDeleteId === conn.id ? null : conn.id)}
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
