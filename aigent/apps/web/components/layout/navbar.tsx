import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4 md:px-6">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <div className="h-6 w-6 bg-primary rounded-md flex items-center justify-center">
             <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold sm:inline-block">
            Aigent
          </span>
        </Link>
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link href="#features" className="transition-colors hover:text-foreground/80 text-foreground/60">
            Features
          </Link>
          <Link href="#pricing" className="transition-colors hover:text-foreground/80 text-foreground/60">
            Pricing
          </Link>
          <Link href="/docs" className="transition-colors hover:text-foreground/80 text-foreground/60">
            Docs
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
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
          </nav>
        </div>
      </div>
    </header>
  );
}
