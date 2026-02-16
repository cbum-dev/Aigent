"use client";

import CardSwap, { Card } from "@/components/CardSwap";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";

export function UseCases() {
  return (
    <section className="py-24 bg-black relative overflow-hidden">
        <div className="container px-4 md:px-6 relative z-10 mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
             <div className="h-[450px] relative w-full flex items-center justify-center">
                <CardSwap 
                   width="100%" 
                   height="100%" 
                   cardDistance={40} 
                   verticalDistance={40}
                   skewAmount={0}
                >
                   {/* Card 1: The 'Before' Chaos */}
                   <Card customClass="w-[320px] h-[400px] bg-red-950/20 border-red-500/20 p-6 flex flex-col backdrop-blur-xl">
                      <div className="flex items-center gap-3 mb-4 text-red-400">
                         <XCircle className="w-6 h-6" />
                         <span className="font-bold">The Old Way</span>
                      </div>
                      <code className="text-xs text-red-200/70 font-mono bg-black/50 p-3 rounded-lg flex-1 overflow-hidden">
                         SELECT<br/>
                         &nbsp;&nbsp;DATE_TRUNC('month', created_at) AS month,<br/>
                         &nbsp;&nbsp;COUNT(DISTINCT user_id) as mau,<br/>
                         &nbsp;&nbsp;SUM(amount) as revenue<br/>
                         FROM orders<br/>
                         WHERE status = 'completed'<br/>
                         AND created_at &gt; NOW() - INTERVAL '1 year'<br/>
                         GROUP BY 1<br/>
                         ORDER BY 1 DESC;<br/>
                         -- Wait, did I join the users table?<br/>
                         -- Syntax Error: column "user_id" does not exist
                      </code>
                   </Card>

                   {/* Card 2: The 'After' Magic */}
                   <Card customClass="w-[320px] h-[400px] bg-green-950/20 border-green-500/20 p-6 flex flex-col backdrop-blur-xl">
                      <div className="flex items-center gap-3 mb-4 text-green-400">
                         <CheckCircle2 className="w-6 h-6" />
                         <span className="font-bold">The Aigent Way</span>
                      </div>
                      <div className="flex-1 flex flex-col justify-center space-y-6">
                         <div className="bg-black/50 p-4 rounded-xl border border-green-500/10">
                            <p className="text-sm text-green-100 italic">
                               "Show me MAU and revenue trends for the last year."
                            </p>
                         </div>
                         <div className="h-32 bg-green-900/10 rounded-lg flex items-end gap-1 px-2 pb-2">
                             {[30, 50, 45, 70, 60, 85, 80, 95].map((h, i) => (
                                <div key={i} className="flex-1 bg-green-500/40 rounded-t-sm" style={{height: `${h}%`}} />
                             ))}
                         </div>
                      </div>
                   </Card>

                   {/* Card 3: The Result */}
                   <Card customClass="w-[320px] h-[400px] bg-indigo-950/20 border-indigo-500/20 p-6 flex flex-col backdrop-blur-xl">
                      <div className="flex items-center gap-3 mb-4 text-indigo-400">
                         <Sparkles className="w-6 h-6" />
                         <span className="font-bold">Instant Insights</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center text-center">
                         <div>
                            <div className="text-5xl font-bold text-white mb-2">10x</div>
                            <div className="text-indigo-200">Faster Analysis</div>
                         </div>
                      </div>
                   </Card>
                </CardSwap>
             </div>
          </div>

          <div className="order-1 lg:order-2">
             <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-white">
                Stop Writing SQL.<br/>
                <span className="text-primary">Start Finding Answers.</span>
             </h2>
             <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Data analysts spend 80% of their time writing boilerplate queries and fixing syntax errors. Aigent frees you to focus on the <i>why</i>, not the <i>how</i>.
             </p>
             <ul className="space-y-4">
                {[
                   "Zero SQL knowledge required for basic insights",
                   "Automatic schema detection and optimized queries",
                   "Beautiful, shareable visualizations generated instantly"
                ].map((item, i) => (
                   <li key={i} className="flex items-center gap-3 text-muted-foreground">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                         <CheckCircle2 className="w-4 h-4 text-primary" />
                      </div>
                      {item}
                   </li>
                ))}
             </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
