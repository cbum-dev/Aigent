"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Building2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/hooks/use-auth";
import { api, type Company, ApiError } from "@/lib/api";

export default function SettingsPage() {
    const { user, accessToken, fetchUser } = useAuthStore();
    const [company, setCompany] = useState<Company | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [profileData, setProfileData] = useState({
        full_name: "",
        gemini_api_key: "",
    });

    useEffect(() => {
        if (user) {
            setProfileData({ 
                full_name: user.full_name,
                gemini_api_key: "", // Don't pre-fill the actual key from the object for security
            });
        }
    }, [user]);

    useEffect(() => {
        if (accessToken) {
            loadCompany();
        }
    }, [accessToken]);

    const loadCompany = async () => {
        if (!accessToken) return;
        try {
            const data = await api.getCompany(accessToken);
            setCompany(data);
        } catch (err) {
            console.error("Failed to load company:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;

        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            await api.updateProfile(accessToken, profileData);
            await fetchUser();
            setSuccess("Profile updated successfully");
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-8">Settings</h1>

                {/* Profile section */}
                <Card className="mb-6">
                    <form onSubmit={handleSaveProfile}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Profile
                            </CardTitle>
                            <CardDescription>
                                Update your personal information
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm">
                                    {success}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input
                                    value={profileData.full_name}
                                    onChange={(e) =>
                                        setProfileData({ ...profileData, full_name: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={user?.email || ""} disabled />
                                <p className="text-xs text-muted-foreground">
                                    Email cannot be changed
                                </p>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    Gemini API Key (Optional)
                                    {user?.has_gemini_api_key && (
                                        <span className="text-[10px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded border border-green-500/20">
                                            Currently Set
                                        </span>
                                    )}
                                </Label>
                                <Input
                                    type="password"
                                    autoComplete="off"
                                    placeholder={user?.has_gemini_api_key ? "••••••••••••••••" : "Paste your API key here"}
                                    value={profileData.gemini_api_key}
                                    onChange={(e) =>
                                        setProfileData({ ...profileData, gemini_api_key: e.target.value })
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    If provided, this key will be used for AI insights when the system quota is reached.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Input value={user?.role || ""} disabled />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Save Changes
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                {/* Company section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Company
                        </CardTitle>
                        <CardDescription>
                            Your organization information
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Company Name</Label>
                            <Input value={company?.name || ""} disabled />
                        </div>

                        <div className="space-y-2">
                            <Label>Slug</Label>
                            <Input value={company?.slug || ""} disabled />
                        </div>

                        <Separator className="my-4" />

                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-4 rounded-lg bg-muted/50">
                                <p className="text-2xl font-bold">{company?.user_count || 0}</p>
                                <p className="text-sm text-muted-foreground">Users</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50">
                                <p className="text-2xl font-bold">
                                    {company?.connection_count || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">Connections</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50">
                                <p className="text-2xl font-bold">
                                    {company?.conversation_count || 0}
                                </p>
                                <p className="text-sm text-muted-foreground">Conversations</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
