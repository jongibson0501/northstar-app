import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const [goalDescription, setGoalDescription] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

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
          <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
            <TabsTrigger value="active" className="flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Active ({activeGoals.length})</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center space-x-2">
              <Trophy className="w-4 h-4" />
              <span>Completed ({completedGoals.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Active Goals Tab */}
          <TabsContent value="active" className="p-4 space-y-4">
            {/* Goal Input Section */}
            <section>
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

              {/* Active Goals List */}
              {activeGoals.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Active Goals</h3>
                  <div className="space-y-3">
                    {activeGoals.map((goal) => {
                      const progress = calculateProgress(goal);
                      const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;
                      
                      return (
                        <Card key={goal.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <Link href={`/goals/${goal.id}`} className="flex-1 cursor-pointer">
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
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteGoalMutation.mutate(goal.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeGoals.length === 0 && !showInput && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600">No active goals yet. Create your first goal to get started!</p>
                </div>
              )}
            </section>
          </TabsContent>

          {/* Completed Goals Tab */}
          <TabsContent value="completed" className="p-4 space-y-4">
            {completedGoals.length > 0 ? (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Completed Goals</h3>
                <div className="space-y-3">
                  {completedGoals.map((goal) => (
                    <Card key={goal.id} className="hover:shadow-md transition-shadow border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <Link href={`/goals/${goal.id}`} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-800 mb-1">
                                  {goal.title}
                                </h4>
                                <p className="text-sm text-green-600">
                                  Completed on {goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : 'Unknown'}
                                </p>
                              </div>
                              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                                <Trophy className="w-6 h-6 text-green-500" />
                              </div>
                            </div>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="text-center pt-6">
                  <Button 
                    onClick={() => setLocation("/goal-input")}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Goal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">No completed goals yet</h3>
                <p className="text-gray-600 mb-6">Complete your first goal to see it here!</p>
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