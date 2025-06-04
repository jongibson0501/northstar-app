import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NorthstarLogo } from "@/components/NorthstarLogo";
import { useState } from "react";
import { Target, TrendingUp, Plus, Trash2, Trophy, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GoalWithMilestones } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("active");

  const { data: goals, isLoading } = useQuery<GoalWithMilestones[]>({
    queryKey: ["/api/goals"],
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: number) => {
      const response = await apiRequest("DELETE", `/api/goals/${goalId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Goal Deleted",
        description: "Goal has been deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete goal. Please try again.",
        variant: "destructive",
      });
    },
  });

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

  const activeGoals = goals?.filter(goal => goal.status === "active") || [];
  const completedGoals = goals?.filter(goal => goal.status === "completed") || [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-md mx-auto bg-card shadow-xl min-h-screen">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <NorthstarLogo size={32} className="text-primary-foreground" />
              <div>
                <h1 className="text-lg font-semibold">Your Goals</h1>
                <p className="text-sm text-primary-foreground/80">Welcome back!</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/api/logout'}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active" className="flex items-center justify-center space-x-2">
                <Target className="w-4 h-4" />
                <span>Active ({activeGoals.length})</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center justify-center space-x-2">
                <Trophy className="w-4 h-4" />
                <span>Completed ({completedGoals.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Active Goals Tab */}
          <TabsContent value="active" className="p-4 space-y-4">
            {/* Add Goal Button */}
            {activeGoals.length === 0 && (
              <div className="text-center mb-6 p-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-medium text-card-foreground mb-2">Ready to start?</h2>
                <p className="text-muted-foreground mb-6">Create your first goal and build a roadmap to success</p>
                
                <Button 
                  onClick={() => setLocation('/new-goal')}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-xl font-medium transition-all duration-300 hover:transform hover:scale-105"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add New Goal
                </Button>
              </div>
            )}

            {/* Active Goals List */}
            {activeGoals.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-card-foreground">Active Goals</h3>
                  <Button 
                    onClick={() => setLocation('/new-goal')}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <div className="space-y-3">
                  {activeGoals.map((goal) => {
                    const progress = calculateProgress(goal);
                    return (
                      <Card key={goal.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <Link href={`/goals/${goal.id}`} className="block cursor-pointer">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-card-foreground flex-1 pr-4">
                                {goal.title}
                              </h4>
                              <Button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this goal?')) {
                                    deleteGoalMutation.mutate(goal.id);
                                  }
                                }}
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-primary rounded-full"></div>
                                <span className="text-sm text-muted-foreground">
                                  {goal.milestones.length} milestones
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="text-sm font-medium text-primary">
                                  {progress}%
                                </div>
                                <TrendingUp className="w-4 h-4 text-primary" />
                              </div>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2 mt-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </Link>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Completed Goals Tab */}
          <TabsContent value="completed" className="p-4 space-y-4">
            {completedGoals.length > 0 ? (
              <div>
                <h3 className="text-lg font-medium text-card-foreground mb-4">Completed Goals</h3>
                <div className="space-y-3">
                  {completedGoals.map((goal) => (
                    <Card key={goal.id} className="hover:shadow-md transition-shadow border-success/20 bg-success/5">
                      <CardContent className="p-4">
                        <Link href={`/goals/${goal.id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-card-foreground mb-1">
                                {goal.title}
                              </h4>
                              <p className="text-sm text-success">
                                Completed on {goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : 'Unknown'}
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                              <Trophy className="w-6 h-6 text-success" />
                            </div>
                          </div>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="text-center pt-6">
                  <Button 
                    onClick={() => setLocation('/new-goal')}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Goal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-card-foreground mb-2">No completed goals yet</h3>
                <p className="text-muted-foreground mb-6">Complete your first goal to see it here!</p>
                <Button 
                  onClick={() => setActiveTab("active")}
                  variant="outline"
                >
                  View Active Goals
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}