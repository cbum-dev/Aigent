"use client";

import { useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const HEALTH_CHECK_URL = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/health` 
  : "https://aigent-1.onrender.com/health";

export function BackendWarmingBanner() {
  const [isWarmingUp, setIsWarmingUp] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkHealth = async () => {
      try {
        const response = await fetch(HEALTH_CHECK_URL, {
          mode: 'cors',
          cache: 'no-store'
        });
        if (response.ok) {
          setIsWarmingUp(false);
          setTimeout(() => setIsVisible(false), 3000);
          clearInterval(intervalId);
        }
      } catch (error) {
        console.log("Backend warming up...");
      }
    };

    checkHealth();

    intervalId = setInterval(checkHealth, 3000);

    return () => clearInterval(intervalId);
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed bottom-8 left-1/2 -translate-x-1/2 z-100 transition-all duration-700 ease-in-out",
        isWarmingUp ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <div className="relative group">
        <div className="absolute -inset-1 bg-linear-to-r from-primary/50 via-purple-500/50 to-blue-500/50 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" />
        
        <div className="relative flex items-center gap-4 px-6 py-3 bg-background/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground tracking-tight">
                Backend Warming Up
              </span>
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            </div>
            <p className="text-[11px] text-muted-foreground font-medium leading-none mt-1">
              Render instance is starting. Please wait...
            </p>
          </div>

          <div className="h-8 w-px bg-white/10 ml-2" />
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
             <Zap className="h-3.5 w-3.5 text-primary animate-pulse" />
             <span className="text-[10px] font-bold uppercase tracking-wider text-primary/80">
               Live Check
             </span>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
