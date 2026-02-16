import { MessageSquare, BarChart, Shield, Zap, Sparkles, Database } from "lucide-react";
import SpotlightCard from "@/components/SpotlightCard";

const features = [
  {
    title: "Natural Language Queries",
    description: "Ask complex questions like \"Show me monthly revenue growth\" without writing a single line of SQL.",
    icon: MessageSquare,
  },
  {
    title: "Smart SQL Agent",
    description: "Our agent understands your schema, writes safe read-only SQL, and automatically fixes its own errors.",
    icon: Sparkles,
  },
  {
    title: "Instant Visualizations",
    description: "Automatically generates interactive charts and graphs to visualize your data trends and anomalies.",
    icon: BarChart,
  },
  {
    title: "Secure by Design",
    description: "Your database credentials are encrypted at rest. We execute queries in read-only mode for safety.",
    icon: Shield,
  },
  {
    title: "Multi-Database Support",
    description: "Connect to PostgreSQL, MySQL, or any other standard SQL database with just a connection string.",
    icon: Database,
  },
  {
    title: "Real-time Insights",
    description: "Get answers in seconds, not hours. Empower your team to make data-driven decisions instantly.",
    icon: Zap,
  },
];

export function Features() {
  return (
    <section className="py-24 bg-black relative overflow-hidden" id="features">
      <div className="container px-4 md:px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">
            Powerful Features for Data Teams
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to turn raw data into meaningful business insights without the technical overhead.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <SpotlightCard 
              key={index} 
              className="border-white/10 bg-white/5 backdrop-blur-sm"
              spotlightColor="rgba(124, 58, 237, 0.2)" /* Purple spotlight */
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-6">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}
