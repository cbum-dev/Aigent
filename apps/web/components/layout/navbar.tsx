"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Menu, LayoutDashboard, LogOut } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeCustomizer } from "@/components/layout/theme-customizer";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuthStore } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 items-center px-4 md:px-6 mx-auto justify-between">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <div className="h-8 w-8 relative flex items-center justify-center">
             <img src="/logo.png" alt="Aigent Logo" className="h-full w-full object-contain" />
          </div>
          <span className="font-bold sm:inline-block text-xl tracking-tight bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70">
            Aigent
          </span>
        </Link>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link href="#features" className="transition-colors hover:text-foreground/80 text-foreground/60">
            Features
          </Link>
          <Link href="#pricing" className="transition-colors hover:text-foreground/80 text-foreground/60">
            Pricing
          </Link>
          <Link href="http://localhost:3001" className="transition-colors hover:text-foreground/80 text-foreground/60">
            Docs
          </Link>
        </nav>
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2">
            <ThemeCustomizer />
            <ModeToggle />
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </Button>
              </>
            ) : (
              <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/login">
                      Login
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/register">
                      Get Started
                    </Link>
                  </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeCustomizer />
            <ModeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col gap-6 mt-6">
                  <Link href="/" className="flex items-center space-x-2">
                    <div className="h-8 w-8 relative flex items-center justify-center">
                      <img src="/logo.png" alt="Aigent Logo" className="h-full w-full object-contain" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">Aigent</span>
                  </Link>
                  <nav className="flex flex-col gap-4">
                    <Link href="#features" className="text-foreground/60 hover:text-foreground transition-colors">
                      Features
                    </Link>
                    <Link href="#pricing" className="text-foreground/60 hover:text-foreground transition-colors">
                      Pricing
                    </Link>
                    <Link href="http://localhost:3001" className="text-foreground/60 hover:text-foreground transition-colors">
                      Docs
                    </Link>
                  </nav>
                  <div className="flex flex-col gap-2 mt-4">
                    {isAuthenticated ? (
                      <>
                        <Button className="w-full" asChild>
                          <Link href="/dashboard">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Dashboard
                          </Link>
                        </Button>
                        <Button variant="outline" className="w-full" onClick={handleLogout}>
                          <LogOut className="w-4 h-4 mr-2" />
                          Log out
                        </Button>
                      </>
                    ) : (
                      <>
                          <Button variant="outline" className="w-full" asChild>
                            <Link href="/login">Login</Link>
                          </Button>
                          <Button className="w-full" asChild>
                            <Link href="/register">Get Started</Link>
                          </Button>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
