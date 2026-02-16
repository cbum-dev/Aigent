"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { user, isAuthenticated, fetchUser, _hasHydrated } = useAuthStore();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

    if (!_hasHydrated || !isAuthenticated) {
        return null;
    }

    return (
        <div className="h-screen w-full flex bg-background selection:bg-primary/20 overflow-hidden">
            {/* Sidebar */}
            <DashboardSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

            {/* Main content */}
            <main
                className={cn(
                    "flex-1 transition-all duration-300 flex flex-col h-full overflow-hidden relative",
                    sidebarCollapsed ? "lg:ml-20" : "lg:ml-72" // Matched width w-20 and w-72 from sidebar
                )}
            >
                {children}
            </main>
        </div>
    );
}
