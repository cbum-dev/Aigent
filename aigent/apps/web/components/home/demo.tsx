"use client";

export function Demo() {
  return (
    <section className="py-24 bg-muted/50 relative overflow-hidden transition-colors duration-300" id="demo">
      <div className="container px-4 md:px-6 relative z-10 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
            See Aigent in Action
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Watch how easily you can connect your database and start asking questions in seconds.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl border border-border bg-card/40 dark:bg-white/5 backdrop-blur-sm p-2 shadow-2xl">
            {/* Browser chrome simulation */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50 dark:bg-black/40 rounded-t-xl">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 mx-4">
                <div className="h-6 bg-background/50 dark:bg-white/10 rounded-md flex items-center px-3 text-xs text-muted-foreground max-w-md mx-auto border border-border/50">
                  app.aigent.com/dashboard
                </div>
              </div>
            </div>

            {/* Video Player */}
            <div className="relative aspect-video bg-black/80 rounded-b-xl overflow-hidden shadow-inner">
              <video 
                src="/recording.mp4" 
                controls 
                className="w-full h-full object-cover"
                poster="/hero.png" // Fallback to hero image if video doesn't load immediately
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
