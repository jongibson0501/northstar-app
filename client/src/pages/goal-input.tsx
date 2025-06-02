import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Target } from "lucide-react";
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
    <div className="min-h-screen bg-background text-secondary pb-20">
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
        <section className="p-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-medium text-gray-800 mb-2">What's your goal?</h2>
            <p className="text-gray-600">Tell us what you want to achieve, and we'll help you build a roadmap</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                Describe your goal
              </Label>
              <Textarea
                placeholder="e.g., Get in shape, Start a side hustle, Learn a new language..."
                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none resize-none h-32 text-gray-800"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleStartPlanning}
              disabled={createGoalMutation.isPending}
              className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-lg font-medium"
            >
              {createGoalMutation.isPending ? "Creating..." : "Start Planning"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
