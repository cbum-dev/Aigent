import { Sparkles } from "lucide-react";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex">
            {/* Left side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/20 via-background to-accent/10 relative overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/30 to-transparent rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm border border-primary/30">
                            <Sparkles className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-4xl font-bold gradient-text">Aigent</h1>
                    </div>

                    <h2 className="text-3xl font-semibold text-center mb-4">
                        AI-Powered Business Analytics
                    </h2>

                    <p className="text-lg text-muted-foreground text-center max-w-md mb-8">
                        Ask questions in natural language and get instant insights from your data.
                        No SQL knowledge required.
                    </p>

                    <div className="grid grid-cols-2 gap-4 max-w-md">
                        <div className="glass rounded-lg p-4">
                            <h3 className="font-medium mb-1">Natural Language</h3>
                            <p className="text-sm text-muted-foreground">Ask questions in plain English</p>
                        </div>
                        <div className="glass rounded-lg p-4">
                            <h3 className="font-medium mb-1">Multi-Agent AI</h3>
                            <p className="text-sm text-muted-foreground">Specialized agents work together</p>
                        </div>
                        <div className="glass rounded-lg p-4">
                            <h3 className="font-medium mb-1">Auto Visualization</h3>
                            <p className="text-sm text-muted-foreground">Charts generated automatically</p>
                        </div>
                        <div className="glass rounded-lg p-4">
                            <h3 className="font-medium mb-1">Secure</h3>
                            <p className="text-sm text-muted-foreground">Your data stays private</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side - Auth form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>
        </div>
    );
}
