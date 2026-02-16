"use client";

import CurvedLoop from "@/components/CurvedLoop";

export function LoopBanner() {
  return (
    <section className="py-12 bg-black overflow-hidden border-y border-white/5">
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
