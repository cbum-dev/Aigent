"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/hooks/use-auth";
import { ThemeCustomizer } from "@/components/layout/theme-customizer";
import { ModeToggle } from "@/components/mode-toggle";
import {
  MessageSquare,
  Database,
  Settings,
  LogOut,
  Sparkles,
  ChevronLeft,
  LayoutDashboard,
  FileText,
  Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";

const navigation = [
  { name: "Chat", href: "/dashboard", icon: MessageSquare },
  { name: "Connections", href: "/dashboard/connections", icon: Database },
  { name: "Reports", href: "/dashboard/reports", icon: FileText },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface DashboardSidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export function DashboardSidebar({ collapsed, setCollapsed }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  // Mobile sheet state
  const [open, setOpen] = useState(false);

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

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("h-16 flex items-center px-4 border-b border-border/40", collapsed ? "justify-center" : "justify-between")}>
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 rounded-lg bg-primary/20 shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70">
              Aigent
            </span>
          )}
        </Link>
        {!collapsed && (
             <Button
               variant="ghost"
               size="icon"
               className="hidden lg:flex h-8 w-8 text-muted-foreground hover:text-foreground"
               onClick={() => setCollapsed(!collapsed)}
             >
               <ChevronLeft className="w-4 h-4" />
             </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              {isActive && (
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
              )}
              <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-primary" : "group-hover:text-foreground")} />
              {!collapsed && <span>{item.name}</span>}
              
              {/* Tooltip for collapsed state (could use standard tooltip component, but simple title works for now) */}
              {collapsed && !isActive && <span className="sr-only">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User & Settings */}
      <div className="p-3 border-t border-border/40 space-y-2">
        {!collapsed && (
            <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-xs font-medium text-muted-foreground">Theme</span>
                <div className="flex gap-1">
                    <ThemeCustomizer />
                    <ModeToggle />
                </div>
            </div>
        )}
        
        {collapsed && (
             <div className="flex flex-col gap-2 items-center mb-2">
                  <ThemeCustomizer />
                  <ModeToggle />
             </div>
        )}

        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-xl bg-muted/30 border border-border/20",
            collapsed ? "justify-center" : ""
          )}
        >
          <Avatar className="h-9 w-9 border border-border/50">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {user ? getInitials(user.full_name) : "?"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && user && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-none">{user.full_name}</p>
              <p className="text-xs text-muted-foreground truncate mt-1">
                {user.company_name || "Workspace"}
              </p>
            </div>
          )}
           {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors ml-auto"
                onClick={handleLogout}
              >
                  <LogOut className="w-4 h-4" />
              </Button>
           )}
        </div>
        {collapsed && (
             <Button
               variant="ghost"
               size="icon"
               className="w-full h-8 text-muted-foreground hover:text-destructive transition-colors"
               onClick={handleLogout}
             >
                 <LogOut className="w-4 h-4" />
             </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex-col border-r border-border/40 bg-background/60 backdrop-blur-xl transition-all duration-300 hidden lg:flex",
          collapsed ? "w-20" : "w-72"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-3 left-4 z-50 rounded-full bg-background/50 backdrop-blur-md border border-border/40 shadow-xs"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-background/95 backdrop-blur-xl border-r border-border/40">
           {/* Force uncollapsed for mobile */}
           <DashboardSidebar collapsed={false} setCollapsed={() => {}} />
           {/* 
              Note: We reuse the component logic but since we are inside the component itself, 
              this recursion is tricky. 
              Instead, let's extract the content to a separate helper or just copy the structure since we are in the same file.
              Actually, the SidebarContent handles `collapsed` prop from the parent scope.
              Let's accept specific props for the content or just duplicate the content render for mobile with forced false.
           */}
           <div className="flex flex-col h-full">
              <div className="h-16 flex items-center px-4 border-b border-border/40">
                  <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setOpen(false)}>
                    <div className="p-1.5 rounded-lg bg-primary/20 shrink-0">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-bold text-lg">Aigent</span>
                  </Link>
              </div>
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5 shrink-0", isActive && "text-primary")} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
               <div className="p-3 border-t border-border/40 space-y-4">
                 <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-medium">Theme</span>
                    <div className="flex gap-2">
                        <ThemeCustomizer />
                        <ModeToggle />
                    </div>
                 </div>
                 <div className="flex items-center gap-3 p-2 rounded-xl bg-muted/30 border border-border/20">
                   <Avatar className="h-9 w-9">
                     <AvatarFallback>{user ? getInitials(user.full_name) : "?"}</AvatarFallback>
                   </Avatar>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-medium truncate">{user?.full_name}</p>
                     <p className="text-xs text-muted-foreground truncate">{user?.company_name}</p>
                   </div>
                   <Button variant="ghost" size="icon" onClick={handleLogout}>
                      <LogOut className="w-4 h-4" />
                   </Button>
                 </div>
               </div>
           </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
