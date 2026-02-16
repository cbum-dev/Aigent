import { ArrowRight, Database, MessageSquare, LineChart } from "lucide-react";

const steps = [
  {
    title: "Connect",
    description: "Securely connect your PostgreSQL database. We use read-only permissions and encrypt credentials at rest.",
    icon: Database,
  },
  {
    title: "Ask",
    description: "Type your questions in plain English. Our AI understands business logic and writes the SQL for you.",
    icon: MessageSquare,
  },
  {
    title: "Analyze",
    description: "Get instant answers with interactive charts. Export reports or drill down deeper with follow-up questions.",
    icon: LineChart,
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 relative overflow-hidden">
        {/* Background blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container px-4 md:px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Go from raw data to insights in three simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-linear-to-r from-transparent via-border to-transparent" />

          {steps.map((step, index) => (
            <div key={index} className="relative flex flex-col items-center text-center group">
              <div className="w-24 h-24 rounded-2xl bg-card border border-border shadow-lg flex items-center justify-center mb-6 relative z-10 group-hover:scale-105 transition-transform duration-300">
                <step.icon className="h-10 w-10 text-primary" />
                <div className="absolute -inset-2 bg-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed max-w-sm">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
