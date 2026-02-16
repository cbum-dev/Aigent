"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, TrendingUp, Users, PieChart as PieChartIcon } from "lucide-react";

const trendData = [
  { month: "Jan", revenue: 4000, users: 2400 },
  { month: "Feb", revenue: 3000, users: 1398 },
  { month: "Mar", revenue: 2000, users: 9800 },
  { month: "Apr", revenue: 2780, users: 3908 },
  { month: "May", revenue: 1890, users: 4800 },
  { month: "Jun", revenue: 2390, users: 3800 },
  { month: "Jul", revenue: 3490, users: 4300 },
];

const sourceData = [
  { name: "Organic", value: 400 },
  { name: "Social", value: 300 },
  { name: "Direct", value: 300 },
  { name: "Referral", value: 200 },
];

const deviceData = [
  { name: "Desktop", value: 65 },
  { name: "Mobile", value: 25 },
  { name: "Tablet", value: 10 },
];

const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#f97316"];

export function ChartsShowcase() {
  return (
    <section className="py-24 bg-background relative overflow-hidden transition-colors duration-300">
      <div className="container px-4 md:px-6 relative z-10 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
            Beautiful Visualizations, <span className="text-primary">Instantly</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Aigent automatically chooses the best way to represent your data. No configuration needed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(180px,auto)]">
          {/* Main Trend Chart - Spans 2 cols */}
          <Card className="col-span-1 md:col-span-2 lg:col-span-2 p-6 border-border bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Revenue Growth
                </h3>
                <p className="text-sm text-muted-foreground">Monthly revenue vs active users</p>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                +12.5% vs last month
              </Badge>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `$${value}`} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                    itemStyle={{ color: 'var(--foreground)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Traffic Source - Pie Chart */}
          <Card className="col-span-1 p-6 border-border bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  Traffic Sources
                </h3>
              </div>
            </div>
            <div className="h-[200px] w-full relative">
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
                     itemStyle={{ color: 'var(--foreground)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="text-center">
                    <div className="text-2xl font-bold text-foreground">1.2k</div>
                    <div className="text-xs text-muted-foreground">Total Visits</div>
                 </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
               {sourceData.map((entry, index) => (
                 <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {entry.name}
                 </div>
               ))}
            </div>
          </Card>

          {/* User Demographics - Bar Chart */}
          <Card className="col-span-1 md:col-span-2 lg:col-span-3 p-6 border-border bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-center gap-8">
             <div className="flex-1 space-y-4">
                <h3 className="font-semibold text-xl flex items-center gap-2">
                   <Users className="w-5 h-5 text-primary" />
                   User Demographics
                </h3>
                <p className="text-muted-foreground">
                   Understand your user base with automatic segmentation. Aigent detects categorical data and suggests the best breakdown.
                </p>
                <div className="flex gap-4">
                   <div className="flex flex-col">
                      <span className="text-3xl font-bold text-foreground">85%</span>
                      <span className="text-sm text-muted-foreground">Desktop Users</span>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-3xl font-bold text-foreground">12m</span>
                      <span className="text-sm text-muted-foreground">Avg. Session</span>
                   </div>
                </div>
             </div>
             <div className="flex-2 w-full h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={deviceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        cursor={{ fill: 'hsl(var(--primary))', opacity: 0.1 }}
                      />
                      <Bar dataKey="value" fill="currentColor" className="fill-primary" radius={[0, 4, 4, 0]} barSize={20} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
