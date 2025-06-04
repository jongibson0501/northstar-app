import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NorthstarLogo } from "@/components/NorthstarLogo";
import { Target, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function GoalInput() {
  const [, setLocation] = useLocation();
  const [goalDescription, setGoalDescription] = useState("");
  const { toast } = useToast();

  const createGoalMutation = useMutation({
    mutationFn: async (description: string) => {
      const response = await apiRequest("POST", "/api/goals", {
        title: description.slice(0, 100),
        description,
        timeline: "3_months",
        status: "active",
      });
      return response.json();
    },
    onSuccess: (goal) => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setLocation(`/goals/${goal.id}/plan`);
      toast({
        title: "Goal Created",
        description: "Let's plan your journey!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartPlanning = () => {
    if (!goalDescription.trim()) {
      toast({
        title: "Error",
        description: "Please describe your goal",
        variant: "destructive",
      });
      return;
    }
    createGoalMutation.mutate(goalDescription);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-md mx-auto bg-card shadow-xl min-h-screen">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-6">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <NorthstarLogo size={32} className="text-primary-foreground" />
            <div>
              <h1 className="text-lg font-semibold">New Goal</h1>
              <p className="text-sm text-primary-foreground/80">Let's plan your journey</p>
            </div>
          </div>
        </div>

        <section className="p-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-3">What's your goal?</h2>
            <p className="text-muted-foreground leading-relaxed">Tell us what you want to achieve, and we'll help you build a roadmap</p>
          </div>

          <div className="space-y-6">
            <div>
              <Label className="block text-sm font-medium text-foreground mb-3">
                Describe your goal
              </Label>
              <Textarea
                placeholder="e.g., Get in shape, Start a side hustle, Learn a new language..."
                className="w-full p-4 border-2 border-border rounded-xl focus:border-primary focus:outline-none resize-none h-32 text-foreground bg-background"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleStartPlanning}
              disabled={createGoalMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-xl font-medium transition-all duration-300 hover:transform hover:scale-105"
            >
              {createGoalMutation.isPending ? "Creating..." : "Start Planning"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
