"use client";

import { useEffect, useState } from "react";
import {
    Database,
    Plus,
    Loader2,
    CheckCircle2,
    XCircle,
    Trash2,
    TestTube,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
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

    const [formData, setFormData] = useState<CreateConnectionData>({
        name: "",
        host: "",
        port: 5432,
        database: "",
        username: "",
        password: "",
        ssl_mode: "prefer",
    });

    useEffect(() => {
        if (accessToken) {
            loadConnections();
        }
    }, [accessToken]);

    const loadConnections = async () => {
        if (!accessToken) return;
        try {
            const data = await api.listConnections(accessToken);
            setConnections(data);
        } catch (err) {
            console.error("Failed to load connections:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTest = async () => {
        setTestResult(null);
        setError(null);

        if (!accessToken) return;

        try {
            const result = await api.testConnection(accessToken, {
                host: formData.host,
                port: formData.port,
                database: formData.database,
                username: formData.username,
                password: formData.password,
                ssl_mode: formData.ssl_mode,
            });
            setTestResult(result);
        } catch (err) {
            if (err instanceof ApiError) {
                setTestResult({ success: false, message: err.message });
            }
        }
    };

    const handleTestSaved = async (connectionId: string) => {
        if (!accessToken) return;

        setIsTesting(connectionId);
        try {
            await api.testSavedConnection(accessToken, connectionId);
            await loadConnections();
        } catch (err) {
            console.error("Test failed:", err);
        } finally {
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
            setFormData({
                name: "",
                host: "",
                port: 5432,
                database: "",
                username: "",
                password: "",
                ssl_mode: "prefer",
            });
            setTestResult(null);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (connectionId: string) => {
        if (!accessToken) return;

        try {
            await api.deleteConnection(accessToken, connectionId);
            await loadConnections();
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    return (
        <div className="p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">Database Connections</h1>
                        <p className="text-muted-foreground">
                            Connect your PostgreSQL databases to analyze your data
                        </p>
                    </div>
                    <Button onClick={() => setShowForm(!showForm)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Connection
                    </Button>
                </div>

                {/* Add connection form */}
                {showForm && (
                    <Card className="mb-6">
                        <form onSubmit={handleSave}>
                            <CardHeader>
                                <CardTitle>New Connection</CardTitle>
                                <CardDescription>
                                    Enter your PostgreSQL database credentials
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {error && (
                                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                                        {error}
                                    </div>
                                )}

                                {testResult && (
                                    <div
                                        className={`p-3 rounded-lg text-sm flex items-center gap-2 ${testResult.success
                                                ? "bg-green-500/10 border border-green-500/20 text-green-500"
                                                : "bg-destructive/10 border border-destructive/20 text-destructive"
                                            }`}
                                    >
                                        {testResult.success ? (
                                            <CheckCircle2 className="w-4 h-4" />
                                        ) : (
                                            <XCircle className="w-4 h-4" />
                                        )}
                                        {testResult.message}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <Label>Connection Name</Label>
                                        <Input
                                            placeholder="My Database"
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData({ ...formData, name: e.target.value })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Host</Label>
                                        <Input
                                            placeholder="localhost"
                                            value={formData.host}
                                            onChange={(e) =>
                                                setFormData({ ...formData, host: e.target.value })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Port</Label>
                                        <Input
                                            type="number"
                                            placeholder="5432"
                                            value={formData.port}
                                            onChange={(e) =>
                                                setFormData({ ...formData, port: parseInt(e.target.value) })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Database</Label>
                                        <Input
                                            placeholder="mydb"
                                            value={formData.database}
                                            onChange={(e) =>
                                                setFormData({ ...formData, database: e.target.value })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Username</Label>
                                        <Input
                                            placeholder="postgres"
                                            value={formData.username}
                                            onChange={(e) =>
                                                setFormData({ ...formData, username: e.target.value })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="col-span-2 space-y-2">
                                        <Label>Password</Label>
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={(e) =>
                                                setFormData({ ...formData, password: e.target.value })
                                            }
                                            required
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button type="button" variant="outline" onClick={handleTest}>
                                    <TestTube className="w-4 h-4 mr-2" />
                                    Test Connection
                                </Button>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setShowForm(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSaving}>
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : null}
                                        Save Connection
                                    </Button>
                                </div>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {/* Connections list */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : connections.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent>
                            <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No connections yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Add your first database connection to get started
                            </p>
                            <Button onClick={() => setShowForm(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Connection
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {connections.map((conn) => (
                            <Card key={conn.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-primary/10">
                                                <Database className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{conn.name}</CardTitle>
                                                <CardDescription>
                                                    {conn.host}:{conn.port} / {conn.database}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {conn.last_test_success !== null && (
                                                <div
                                                    className={`flex items-center gap-1 text-xs ${conn.last_test_success
                                                            ? "text-green-500"
                                                            : "text-destructive"
                                                        }`}
                                                >
                                                    {conn.last_test_success ? (
                                                        <CheckCircle2 className="w-3 h-3" />
                                                    ) : (
                                                        <XCircle className="w-3 h-3" />
                                                    )}
                                                    {conn.last_test_success ? "Connected" : "Failed"}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardFooter className="pt-2">
                                    <div className="flex justify-end gap-2 w-full">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleTestSaved(conn.id)}
                                            disabled={isTesting === conn.id}
                                        >
                                            {isTesting === conn.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <TestTube className="w-4 h-4" />
                                            )}
                                            <span className="ml-1">Test</span>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(conn.id)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
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
