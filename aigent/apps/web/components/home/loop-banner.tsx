"use client";

import CurvedLoop from "@/components/CurvedLoop";

export function LoopBanner() {
  return (
    <section className="py-12 overflow-hidden border-y border-border/20 relative z-10 bg-background/50 backdrop-blur-sm">
       <div className="-my-12 opacity-80">
        <CurvedLoop 
            marqueeText="Natural Language to SQL • Instant Insights • Secure & Read-Only • Multi-Database Support • AI Data Analyst • "
            speed={3}  
            curveAmount={100} 
            interactive={true}
            className="text-primary/20 hover:text-primary transition-colors duration-500"
        />
       </div>
    </section>
  );
}
