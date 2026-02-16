import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24 bg-linear-to-br from-primary/10 via-background to-accent/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container px-4 md:px-6 relative z-10 mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
          Ready to Stop Writing Boilerplate SQL?
        </h2>
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          Join data teams who are saving hours every week by chatting with their database.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="default" asChild className="text-md h-12 px-8 shadow-xl shadow-primary/20">
              <Link href="/register">
                Start Analyzing Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-md h-12 px-8 bg-background/50 backdrop-blur-sm">
              <Link href="/contact">
                Contact Sales
              </Link>
            </Button>
        </div>
      </div>
    </section>
  );
}
