import { useQuery, useMutation, queryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Target, TrendingUp, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { GoalWithMilestones } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goalDescription, setGoalDescription] = useState("");
  const [showInput, setShowInput] = useState(false);

  const { data: goals, isLoading } = useQuery<GoalWithMilestones[]>({
    queryKey: ["/api/goals"],
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setGoalDescription("");
      setShowInput(false);
      toast({
        title: "Goal Created",
        description: "Your goal has been created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateGoal = () => {
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

  const calculateProgress = (goal: GoalWithMilestones) => {
    const totalMilestones = goal.milestones.length;
    if (totalMilestones === 0) return 0;
    const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;
    return Math.round((completedMilestones / totalMilestones) * 100);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-secondary pb-20">
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
        {/* Goal Input Section */}
        <section className="p-4">
          {!showInput ? (
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-medium text-gray-800 mb-2">What's your goal?</h2>
              <p className="text-gray-600 mb-6">Tell us what you want to achieve, and we'll help you build a roadmap</p>
              
              <Button 
                onClick={() => setShowInput(true)}
                className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-lg font-medium"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New Goal
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
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

              <div className="flex space-x-3">
                <Button 
                  onClick={handleCreateGoal}
                  disabled={createGoalMutation.isPending}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white py-4 rounded-lg font-medium"
                >
                  {createGoalMutation.isPending ? "Creating..." : "Start Planning"}
                </Button>
                <Button 
                  onClick={() => setShowInput(false)}
                  variant="outline"
                  className="px-6 py-4"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Goals List */}
          {goals && goals.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">Your Goals</h3>
              <div className="space-y-3">
                {goals.map((goal) => {
                  const progress = calculateProgress(goal);
                  const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;
                  
                  return (
                    <Link key={goal.id} href={`/goals/${goal.id}`}>
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-800 mb-1">
                                {goal.title}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {completedMilestones} of {goal.milestones.length} milestones completed
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                              <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-medium">
                                  {progress}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {goals && goals.length === 0 && !showInput && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600">No goals yet. Create your first goal to get started!</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
