"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import Thread from "@/components/Threads";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden bg-black pt-20 lg:pt-0">
      {/* Threads Background */}
      <div className="absolute inset-0 top-0 w-full h-full opacity-50 pointer-events-none">
         <Thread 
            color={[0.4, 0.2, 0.8]} 
            amplitude={1.5} 
            distance={0} 
            enableMouseInteraction={true}
         />
      </div>

      <div className="container relative z-10 px-4 md:px-6 mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div className="flex flex-col space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary backdrop-blur-xl w-fit mx-auto">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              <span>AI Data Analyst V1.0</span>
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-white">
              Turn Questions into <span className="text-primary block mt-2">Instant Insights</span>
            </h1>
            
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl leading-relaxed">
              Connect your database, ask questions in plain English, and get secure, visualized answers in seconds. No SQL required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20 transition-transform hover:scale-105" asChild>
                <Link href="/register">
                  Start Analyzing <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base backdrop-blur-sm bg-white/5 hover:bg-white/10 border-white/10" asChild>
                <Link href="/demo">
                  Watch Demo
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[600px] lg:max-w-none perspective-1000">
             {/* 3D Tilted Card Container */}
             <div className="relative group transform transition-transform duration-500 hover:scale-[1.02] hover:rotate-y-2 hover:rotate-x-2 perspective-[2000px] rotate-y-[-5deg] rotate-x-[5deg]">
                <div className="relative z-10 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl overflow-hidden aspect-16/10">
                   {/* Product Image */}
                   <img 
                      src="/hero.png" 
                      alt="Aigent Dashboard Interface" 
                      className="w-full h-full object-cover opacity-90"
                   />
                   
                   {/* Overlay Gradient */}
                   <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Decorative Elements */}
                <div className="absolute -inset-1 rounded-xl bg-linear-to-r from-primary/50 to-accent/50 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity -z-10" />
             </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 w-full h-24 bg-linear-to-t from-black to-transparent pointer-events-none" />
    </section>
  );
}
