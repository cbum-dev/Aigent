"use client";

import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ReportsPage() {
    return (
        <div className="p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">Saved Reports</h1>
                        <p className="text-muted-foreground">
                            View and manage your saved analyses and visualizations
                        </p>
                    </div>
                </div>

                {/* Empty state */}
                <Card className="text-center py-12">
                    <CardContent>
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No reports yet</h3>
                        <p className="text-muted-foreground mb-4">
                            Save reports from your chat conversations to view them here
                        </p>
                        <Button variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Start a conversation
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
