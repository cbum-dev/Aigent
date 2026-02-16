"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    MessageSquare,
    Database,
    Settings,
    LogOut,
    Sparkles,
    ChevronLeft,
    Menu,
    LayoutDashboard,
    FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Chat", href: "/dashboard", icon: MessageSquare },
    { name: "Connections", href: "/dashboard/connections", icon: Database },
    { name: "Reports", href: "/dashboard/reports", icon: FileText },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, logout, fetchUser, _hasHydrated } = useAuthStore();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!_hasHydrated) return;

        if (!isAuthenticated) {
            router.push("/login");
            return;
        }

        if (!user) {
            fetchUser();
        }
    }, [isAuthenticated, user, router, fetchUser, _hasHydrated]);

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    if (!_hasHydrated || !isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen flex bg-background">
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
                    sidebarCollapsed ? "w-16" : "w-64",
                    mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-sidebar-primary/20">
                            <Sparkles className="w-5 h-5 text-sidebar-primary" />
                        </div>
                        {!sidebarCollapsed && (
                            <span className="font-bold text-lg gradient-text">Aigent</span>
                        )}
                    </Link>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden lg:flex"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    >
                        <ChevronLeft
                            className={cn(
                                "w-4 h-4 transition-transform",
                                sidebarCollapsed && "rotate-180"
                            )}
                        />
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                                )}
                            >
                                <item.icon className="w-5 h-5 shrink-0" />
                                {!sidebarCollapsed && <span>{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div className="p-2 border-t border-sidebar-border">
                    <div
                        className={cn(
                            "flex items-center gap-3 p-2 rounded-lg",
                            sidebarCollapsed ? "justify-center" : ""
                        )}
                    >
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                                {user ? getInitials(user.full_name) : "?"}
                            </AvatarFallback>
                        </Avatar>
                        {!sidebarCollapsed && user && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.full_name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {user.company_name || user.email}
                                </p>
                            </div>
                        )}
                    </div>

                    <Separator className="my-2" />

                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground",
                            sidebarCollapsed && "justify-center"
                        )}
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4" />
                        {!sidebarCollapsed && "Logout"}
                    </Button>
                </div>
            </aside>

            {/* Mobile menu button */}
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    <Menu className="w-5 h-5" />
                </Button>
            </div>

            {/* Mobile overlay */}
            {mobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Main content */}
            <main
                className={cn(
                    "flex-1 transition-all duration-300",
                    sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
                )}
            >
                {children}
            </main>
        </div>
    );
}
