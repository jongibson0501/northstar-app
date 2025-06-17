import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Target, CheckCircle, Clock, Activity, ArrowLeft, ChevronRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GoalWithMilestones } from "@shared/schema";

export default function ProgressPage() {
  const { toast } = useToast();
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("goals");
  
  const { data: goals, isLoading } = useQuery<GoalWithMilestones[]>({
    queryKey: ["/api/goals"],
  });

  const selectedGoal = selectedGoalId ? goals?.find(g => g.id === selectedGoalId) : null;
  const completedGoals = goals?.filter(g => g.status === "completed") || [];
  const activeGoals = goals?.filter(g => g.status !== "completed") || [];

  const handleGoalSelect = (goalId: number) => {
    setSelectedGoalId(goalId);
    setActiveTab("milestones");
  };

  const handleBackToOverview = () => {
    setSelectedGoalId(null);
    setActiveTab("goals");
  };

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, isCompleted }: { milestoneId: number; isCompleted: boolean }) => {
      const response = await apiRequest("PUT", `/api/milestones/${milestoneId}`, {
        isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Progress Updated",
        description: "Milestone status updated successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update milestone. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: async ({ actionId, isCompleted, milestoneId }: { actionId: number; isCompleted: boolean; milestoneId?: number }) => {
      const response = await apiRequest("PUT", `/api/actions/${actionId}`, {
        isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : null,
      });
      return { action: response.json(), milestoneId, actionId, isCompleted };
    },
    onSuccess: async (result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      
      if (variables.isCompleted && variables.milestoneId) {
        setTimeout(async () => {
          const freshGoals = queryClient.getQueryData<GoalWithMilestones[]>(["/api/goals"]);
          if (freshGoals) {
            const goal = freshGoals.find(g => g.milestones.some(m => m.id === variables.milestoneId));
            if (goal) {
              const milestone = goal.milestones.find(m => m.id === variables.milestoneId);
              if (milestone && !milestone.isCompleted) {
                const allActionsCompleted = milestone.actions.every(action => action.isCompleted);
                
                if (allActionsCompleted) {
                  updateMilestoneMutation.mutate({
                    milestoneId: milestone.id,
                    isCompleted: true,
                  });
                  toast({
                    title: "Milestone Completed!",
                    description: `Great job! You've completed "${milestone.title}". Moving to the next milestone.`,
                  });
                  return;
                }
              }
            }
          }
        }, 500);
      }
      
      toast({
        title: "Progress Updated",
        description: "Activity status updated successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getGoalProgress = (goal: GoalWithMilestones) => {
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
        <section className="p-4">
          <div className="mb-6">
            <h2 className="text-2xl font-medium text-gray-800 mb-2">Your Progress</h2>
            <p className="text-gray-600">Track your goal achievements and milestones</p>
          </div>

          {selectedGoal ? (
            <div className="mb-4">
              <Button 
                variant="ghost" 
                onClick={handleBackToOverview}
                className="mb-2 p-0 h-auto text-blue-600 hover:text-blue-800"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Progress Overview
              </Button>
              <h3 className="text-lg font-medium text-gray-800">{selectedGoal.title}</h3>
            </div>
          ) : null}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="goals" className="text-xs">Goals</TabsTrigger>
              <TabsTrigger 
                value="milestones" 
                className="text-xs"
                disabled={!selectedGoal}
              >
                Milestones
              </TabsTrigger>
              <TabsTrigger 
                value="activities" 
                className="text-xs"
                disabled={!selectedGoal}
              >
                Activities
              </TabsTrigger>
            </TabsList>

            {/* Goals Overview Tab */}
            <TabsContent value="goals" className="space-y-4 mt-4">
              {/* Completed Goals Section */}
              {completedGoals.length > 0 && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg text-green-800">
                      <CheckCircle className="w-5 h-5" />
                      Completed Goals ({completedGoals.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {completedGoals.map((goal) => (
                        <div key={goal.id} className="flex items-center justify-between p-3 bg-green-100 rounded-lg">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-800">{goal.title}</span>
                          </div>
                          <span className="text-sm text-green-600 font-medium">100%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Active Goals Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="w-5 h-5 text-primary" />
                    Active Goals ({activeGoals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeGoals.length > 0 ? (
                    <div className="space-y-3">
                      {activeGoals.map((goal) => {
                        const progress = getGoalProgress(goal);
                        const completedCount = goal.milestones.filter(m => m.isCompleted).length;
                        
                        return (
                          <Card 
                            key={goal.id} 
                            className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                            onClick={() => handleGoalSelect(goal.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-gray-800 flex-1">{goal.title}</h4>
                                    <ChevronRight className="w-4 h-4 text-gray-400 ml-2" />
                                  </div>
                                  
                                  <Progress value={progress} className="h-2 mb-2" />
                                  
                                  <div className="flex justify-between text-sm text-gray-600">
                                    <span>{completedCount} of {goal.milestones.length} milestones</span>
                                    <span className="font-medium text-blue-600">{progress}%</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-800 mb-2">No Active Goals</h3>
                      <p className="text-gray-600">Create your first goal to start tracking progress!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Selected Goal Milestones Tab */}
            <TabsContent value="milestones" className="space-y-4 mt-4">
              {selectedGoal && (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        Milestones Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-gray-800 mb-2">
                            {selectedGoal.milestones.filter(m => m.isCompleted).length} / {selectedGoal.milestones.length}
                          </div>
                          <p className="text-sm text-gray-600 mb-4">Milestones Completed</p>
                          <Progress value={getGoalProgress(selectedGoal)} className="h-3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-800">Milestones</h3>
                    {selectedGoal.milestones.map((milestone) => (
                      <Card key={milestone.id}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={milestone.isCompleted || false}
                              onCheckedChange={(checked) => {
                                updateMilestoneMutation.mutate({
                                  milestoneId: milestone.id,
                                  isCompleted: checked === true,
                                });
                              }}
                              disabled={updateMilestoneMutation.isPending}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                                  {milestone.targetMonth}
                                </div>
                                <p className={`text-sm font-medium ${milestone.isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                  {milestone.title}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {milestone.actions.filter(a => a.isCompleted).length} of {milestone.actions.length} activities completed
                              </p>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs ${
                              milestone.isCompleted 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {milestone.isCompleted ? 'Complete' : 'In Progress'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Selected Goal Activities Tab */}
            <TabsContent value="activities" className="space-y-4 mt-4">
              {selectedGoal && (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="w-5 h-5 text-blue-500" />
                        Activities Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-gray-800 mb-2">
                            {selectedGoal.milestones.reduce((total, milestone) => total + milestone.actions.filter(a => a.isCompleted).length, 0)} / {selectedGoal.milestones.reduce((total, milestone) => total + milestone.actions.length, 0)}
                          </div>
                          <p className="text-sm text-gray-600 mb-4">Activities Completed</p>
                          <Progress 
                            value={(() => {
                              const totalActions = selectedGoal.milestones.reduce((total, milestone) => total + milestone.actions.length, 0);
                              const completedActions = selectedGoal.milestones.reduce((total, milestone) => total + milestone.actions.filter(a => a.isCompleted).length, 0);
                              return totalActions > 0 ? (completedActions / totalActions) * 100 : 0;
                            })()} 
                            className="h-3" 
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-800">Activities by Milestone</h3>
                    {selectedGoal.milestones.map((milestone) => (
                      <div key={milestone.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                            {milestone.targetMonth}
                          </div>
                          <h5 className="text-sm font-medium text-gray-600">{milestone.title}</h5>
                          <span className="text-xs text-gray-500">
                            ({milestone.actions.filter(a => a.isCompleted).length}/{milestone.actions.length} completed)
                          </span>
                        </div>
                        {milestone.actions.map((action) => (
                          <Card key={action.id} className="ml-8">
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={action.isCompleted || false}
                                  onCheckedChange={(checked) => {
                                    updateActionMutation.mutate({
                                      actionId: action.id,
                                      isCompleted: checked === true,
                                      milestoneId: milestone.id,
                                    });
                                  }}
                                  disabled={updateActionMutation.isPending}
                                />
                                <div className="flex-1">
                                  <p className={`text-sm ${action.isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                    {action.title}
                                  </p>
                                  {action.description && (
                                    <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}