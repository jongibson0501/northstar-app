import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Check, Trophy, Sparkles, ExternalLink } from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GoalWithMilestones } from "@shared/schema";

export default function Roadmap() {
  const [, params] = useRoute("/goals/:id");
  const [, setLocation] = useLocation();
  const goalId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const [showCelebration, setShowCelebration] = useState(false);
  
  const { data: goal, isLoading } = useQuery<GoalWithMilestones>({
    queryKey: [`/api/goals/${goalId}`],
    enabled: !!goalId,
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, updates }: { milestoneId: number; updates: any }) => {
      const response = await apiRequest("PUT", `/api/milestones/${milestoneId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: async ({ actionId, updates }: { actionId: number; updates: any }) => {
      const response = await apiRequest("PUT", `/api/actions/${actionId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}`] });
    },
  });

  const clearPlanMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/goals/${goalId}/plan`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Plan Cleared",
        description: "Your plan has been cleared. Creating a new one...",
      });
      // Redirect to planning flow
      setLocation(`/goals/${goalId}/plan`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to clear plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const clearAndRegeneratePlan = () => {
    clearPlanMutation.mutate();
  };

  const completeGoalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", `/api/goals/${goalId}`, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/goals/${goalId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setShowCelebration(true);
    },
  });

  const calculateProgress = () => {
    if (!goal?.milestones || goal.milestones.length === 0) return 0;
    const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;
    return Math.round((completedMilestones / goal.milestones.length) * 100);
  };

  // Check if goal is complete when milestones update
  useEffect(() => {
    if (goal && goal.milestones && goal.status !== "completed") {
      const allMilestonesCompleted = goal.milestones.length > 0 && 
        goal.milestones.every(milestone => milestone.isCompleted);
      
      if (allMilestonesCompleted) {
        completeGoalMutation.mutate();
      }
    }
  }, [goal?.milestones]);

  const toggleMilestone = (milestoneId: number, isCompleted: boolean) => {
    updateMilestoneMutation.mutate({
      milestoneId,
      updates: { 
        isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : null,
      },
    });
  };

  const toggleAction = (actionId: number, isCompleted: boolean) => {
    updateActionMutation.mutate({
      actionId,
      updates: { 
        isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : null,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Goal not found</p>
      </div>
    );
  }

  const progress = calculateProgress();
  const completedMilestones = goal.milestones ? goal.milestones.filter(m => m.isCompleted).length : 0;

  // Celebration Screen
  if (showCelebration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white shadow-xl rounded-2xl p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <div className="flex justify-center space-x-2 mb-4">
              {[...Array(3)].map((_, i) => (
                <Sparkles 
                  key={i} 
                  className="w-6 h-6 text-yellow-400 animate-pulse" 
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Congratulations!
          </h1>
          <p className="text-gray-600 mb-6">
            You've successfully completed "{goal?.title}"! 
            Your dedication and hard work have paid off.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => setLocation("/goal-input")}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3"
            >
              Create New Goal
            </Button>
            <Button 
              onClick={() => setLocation("/")}
              variant="outline"
              className="w-full"
            >
              View Completed Goals
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-secondary pb-20">
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
        <section className="p-4">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-gray-800">Your Roadmap</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary text-sm font-medium"
                onClick={() => clearAndRegeneratePlan()}
              >
                <Edit className="w-4 h-4 mr-1" />
                Regenerate Plan
              </Button>
            </div>
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4">
                <h3 className="font-medium text-gray-800">{goal.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Target: {goal.timeline === "1_month" ? "1 month" :
                          goal.timeline === "3_months" ? "3 months" : 
                          goal.timeline === "6_months" ? "6 months" :
                          goal.timeline === "1_year" ? "1 year" :
                          goal.timeline || "Custom timeline"} • {" "}
                  {goal.milestones ? goal.milestones.length : 0} milestones
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Timeline Visualization */}
          <div className="relative mb-8">
            {goal.milestones && goal.milestones.length > 0 ? (
              <>
                {/* Timeline Line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                
                {goal.milestones.map((milestone, index) => (
                  <div key={milestone.id} className="relative mb-8 last:mb-0">
                {/* Timeline Dot */}
                <div className={`absolute left-6 w-4 h-4 rounded-full border-4 border-white shadow-sm ${
                  milestone.isCompleted ? 'bg-accent' : 'bg-gray-300'
                }`}></div>
                
                {/* Milestone Card */}
                <div className="ml-16 bg-surface border border-gray-200 rounded-lg shadow-sm">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-black">
                        {goal.timeline === "1_month" ? `Week ${milestone.targetMonth}` : `Month ${milestone.targetMonth}`}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMilestone(milestone.id, !milestone.isCompleted)}
                          className={`w-6 h-6 rounded-full p-0 ${
                            milestone.isCompleted 
                              ? 'bg-success text-white hover:bg-success/80' 
                              : 'border-2 border-gray-300 hover:border-success'
                          }`}
                        >
                          {milestone.isCompleted && <Check className="w-3 h-3" />}
                        </Button>
                      </div>
                    </div>
                    <h4 className="font-medium text-gray-800 mt-1">{milestone.title}</h4>
                  </div>
                  
                  {/* Action Items */}
                  <div className="p-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">Action Steps</h5>
                    <div className="space-y-2">
                      {milestone.actions.map((action) => (
                        <div key={action.id} className="py-2 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={action.isCompleted || false}
                              onCheckedChange={(checked) => 
                                toggleAction(action.id, !!checked)
                              }
                              className="w-4 h-4"
                            />
                            <span 
                              className={`text-sm flex-1 ${
                                action.isCompleted 
                                  ? 'text-gray-500 line-through' 
                                  : 'text-gray-700'
                              }`}
                            >
                              {action.title}
                            </span>
                          </div>
                          {action.resources && action.resources.length > 0 && (
                            <div className="mt-2 ml-7 flex flex-wrap gap-2">
                              {action.resources.map((resource, idx) => (
                                <a
                                  key={idx}
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full hover:bg-primary/20 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>{resource.name}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {milestone.actions.length === 0 && (
                        <p className="text-sm text-gray-500 italic">No actions defined yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No milestones planned yet</p>
                <Button
                  onClick={() => setLocation(`/goals/${goalId}/plan`)}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  Plan Milestones
                </Button>
              </div>
            )}
          </div>

          {/* Progress Summary */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-800">Overall Progress</h3>
                <span className="text-2xl font-bold text-primary">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>{completedMilestones} of {goal.milestones ? goal.milestones.length : 0} milestones completed</span>
                <span>
                  {goal.timeline === "3_months" ? "3 months" : 
                   goal.timeline === "6_months" ? "6 months" : "12 months"} total
                </span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
