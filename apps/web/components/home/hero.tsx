"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import Thread from "@/components/Threads";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/hooks/use-auth";

export function Hero() {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine actual theme (handling system preference)
  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDark = currentTheme === 'dark';

  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden bg-background pt-24 lg:pt-0 transition-colors duration-300">
      {/* Threads Background - Dynamic Color */}
      <div className="absolute inset-0 top-0 w-full h-full opacity-50 pointer-events-none">
        {mounted && (
          <Thread 
            color={isDark ? [0.4, 0.2, 0.8] : [0.2, 0.4, 0.9]}
            amplitude={1.5}
            distance={0}
            enableMouseInteraction={true}
          />
        )}
      </div>

      <div className="container relative z-10 px-4 md:px-6 mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="flex flex-col space-y-6 text-center lg:text-left pt-8 md:pt-0">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary backdrop-blur-xl w-fit mx-auto lg:mx-0">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              <span>AI Data Analyst V1.0</span>
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-foreground">
              Turn Questions into <span className="text-primary block mt-2">Instant Insights</span>
            </h1>
            
            <p className="mx-auto lg:mx-0 max-w-[700px] text-muted-foreground text-lg md:text-xl leading-relaxed">
              Connect your database, ask questions in plain English, and get secure, visualized answers in seconds. No SQL required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20 transition-transform hover:scale-105" asChild>
                <Link href={isAuthenticated ? "/dashboard" : "/register"}>
                  {isAuthenticated ? "Go to Dashboard" : "Start Analyzing"} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base backdrop-blur-sm bg-background/50 hover:bg-accent/10 border-foreground/10" asChild>
                <Link href="#demo">
                  Watch Demo
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[600px] lg:max-w-none perspective-1000">
             {/* 3D Tilted Card Container */}
             <div className="relative group transform transition-transform duration-500 hover:scale-[1.02] hover:rotate-y-2 hover:rotate-x-2 perspective-[2000px] rotate-y-[-5deg] rotate-x-[5deg]">
              <div className="relative z-10 rounded-xl border border-border bg-card/40 backdrop-blur-md shadow-2xl overflow-hidden aspect-16/10">
                {/* Product Image - Swaps based on theme */}
                   <img 
                  src="/hero-dark.png" 
                  alt="Aigent Dashboard Dark"
                  className="w-full h-full object-fill opacity-90 hidden dark:block"
                />
                <img
                  src="/hero-light.png"
                  alt="Aigent Dashboard Light"
                  className="w-full h-full object-fill opacity-90 block dark:hidden"
                   />
                   
                   {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-linear-to-t from-background/80 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Decorative Elements */}
                <div className="absolute -inset-1 rounded-xl bg-linear-to-r from-primary/50 to-accent/50 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity -z-10" />
             </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-linear-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
}
