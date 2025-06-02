import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Target, CheckCircle, Clock, Activity } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GoalWithMilestones } from "@shared/schema";

export default function ProgressPage() {
  const { toast } = useToast();
  const { data: goals, isLoading } = useQuery<GoalWithMilestones[]>({
    queryKey: ["/api/goals"],
  });

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
      // Refresh the goals data and wait for it to complete
      await queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      
      // If we just completed an action, check milestone completion after a brief delay
      if (variables.isCompleted && variables.milestoneId) {
        setTimeout(async () => {
          // Get fresh data to check milestone completion
          const freshGoals = queryClient.getQueryData<GoalWithMilestones[]>(["/api/goals"]);
          if (freshGoals) {
            const goal = freshGoals.find(g => g.milestones.some(m => m.id === variables.milestoneId));
            if (goal) {
              const milestone = goal.milestones.find(m => m.id === variables.milestoneId);
              if (milestone && !milestone.isCompleted) {
                // Check if all actions in this milestone are now completed
                const allActionsCompleted = milestone.actions.every(action => action.isCompleted);
                
                if (allActionsCompleted) {
                  // Auto-complete the milestone
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
        }, 500); // Small delay to ensure data is refreshed
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

  const getCompletedGoalsCount = () => {
    if (!goals) return 0;
    return goals.filter(goal => getGoalProgress(goal) === 100).length;
  };

  const getTotalMilestonesCount = () => {
    if (!goals) return 0;
    return goals.reduce((total, goal) => total + goal.milestones.length, 0);
  };

  const getCompletedMilestonesCount = () => {
    if (!goals) return 0;
    return goals.reduce((total, goal) => 
      total + goal.milestones.filter(m => m.isCompleted).length, 0
    );
  };

  const getCurrentMilestone = () => {
    if (!goals || goals.length === 0) return null;
    
    // Find the first incomplete milestone from the most recently updated goal
    const sortedGoals = [...goals].sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });
    
    for (const goal of sortedGoals) {
      const incompleteMilestone = goal.milestones.find(m => !m.isCompleted);
      if (incompleteMilestone) {
        return { milestone: incompleteMilestone, goalTitle: goal.title };
      }
    }
    
    // If all milestones are complete, return the last milestone from the most recent goal
    if (sortedGoals[0]?.milestones.length > 0) {
      const lastMilestone = sortedGoals[0].milestones[sortedGoals[0].milestones.length - 1];
      return { milestone: lastMilestone, goalTitle: sortedGoals[0].title };
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const completedGoals = getCompletedGoalsCount();
  const totalMilestones = getTotalMilestonesCount();
  const completedMilestones = getCompletedMilestonesCount();
  const currentMilestoneData = getCurrentMilestone();

  return (
    <div className="min-h-screen bg-background text-secondary pb-20">
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
        <section className="p-4">
          <div className="mb-6">
            <h2 className="text-2xl font-medium text-gray-800 mb-2">Your Progress</h2>
            <p className="text-gray-600">Track your goal achievements and milestones</p>
          </div>

          <Tabs defaultValue="goals" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="goals" className="text-xs">Goals</TabsTrigger>
              <TabsTrigger value="milestones" className="text-xs">Milestones</TabsTrigger>
              <TabsTrigger value="activities" className="text-xs">Activities</TabsTrigger>
            </TabsList>

            {/* Goals Tab */}
            <TabsContent value="goals" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="w-5 h-5 text-primary" />
                    Goal Completion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-800 mb-2">
                        {completedGoals} / {goals?.length || 0}
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Goals Completed</p>
                      <Progress value={goals?.length ? (completedGoals / goals.length) * 100 : 0} className="h-3" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="space-y-1">
                        <div className="flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                          <span className="text-lg font-semibold">{completedGoals}</span>
                        </div>
                        <p className="text-xs text-gray-600">Completed</p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-center">
                          <Clock className="w-4 h-4 text-orange-500 mr-1" />
                          <span className="text-lg font-semibold">{(goals?.length || 0) - completedGoals}</span>
                        </div>
                        <p className="text-xs text-gray-600">In Progress</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Individual Goal Progress */}
              {goals && goals.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800">Individual Goals</h3>
                  {goals.map((goal) => {
                    const progress = getGoalProgress(goal);
                    const completedCount = goal.milestones.filter(m => m.isCompleted).length;
                    
                    return (
                      <Card key={goal.id}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-gray-800 flex-1">{goal.title}</h4>
                              <span className="text-sm font-medium text-gray-600">{progress}%</span>
                            </div>
                            
                            <Progress value={progress} className="h-2" />
                            
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>{completedCount} of {goal.milestones.length} milestones</span>
                              <span className={`font-medium ${progress === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                                {progress === 100 ? 'Completed' : 'In Progress'}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Milestones Tab */}
            <TabsContent value="milestones" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Milestone Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-800 mb-2">
                        {completedMilestones} / {totalMilestones}
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Milestones Completed</p>
                      <Progress value={totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0} className="h-3" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="space-y-1">
                        <div className="flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                          <span className="text-lg font-semibold">{completedMilestones}</span>
                        </div>
                        <p className="text-xs text-gray-600">Completed</p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-center">
                          <Clock className="w-4 h-4 text-orange-500 mr-1" />
                          <span className="text-lg font-semibold">{totalMilestones - completedMilestones}</span>
                        </div>
                        <p className="text-xs text-gray-600">Remaining</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* All Milestones List */}
              {goals && goals.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800">All Milestones</h3>
                  {goals.map((goal) => (
                    <div key={goal.id} className="space-y-3">
                      <h4 className="text-md font-medium text-gray-700">{goal.title}</h4>
                      {goal.milestones.map((milestone) => (
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
                                <p className={`text-sm font-medium ${milestone.isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                  {milestone.title}
                                </p>
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
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Activities Tab */}
            <TabsContent value="activities" className="space-y-4 mt-4">
              {currentMilestoneData ? (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="w-5 h-5 text-blue-500" />
                        Current Milestone Activities
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {currentMilestoneData.goalTitle} - {currentMilestoneData.milestone.title}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-gray-800 mb-2">
                            {currentMilestoneData.milestone.actions.filter(a => a.isCompleted).length} / {currentMilestoneData.milestone.actions.length}
                          </div>
                          <p className="text-sm text-gray-600 mb-4">Activities Completed</p>
                          <Progress 
                            value={currentMilestoneData.milestone.actions.length > 0 ? 
                              (currentMilestoneData.milestone.actions.filter(a => a.isCompleted).length / currentMilestoneData.milestone.actions.length) * 100 : 0} 
                            className="h-3" 
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="space-y-1">
                            <div className="flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                              <span className="text-lg font-semibold">{currentMilestoneData.milestone.actions.filter(a => a.isCompleted).length}</span>
                            </div>
                            <p className="text-xs text-gray-600">Completed</p>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-center">
                              <Clock className="w-4 h-4 text-orange-500 mr-1" />
                              <span className="text-lg font-semibold">{currentMilestoneData.milestone.actions.length - currentMilestoneData.milestone.actions.filter(a => a.isCompleted).length}</span>
                            </div>
                            <p className="text-xs text-gray-600">Remaining</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Individual Activities List */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-800">Activities</h3>
                    {currentMilestoneData.milestone.actions.map((action, index) => (
                      <Card key={action.id}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={action.isCompleted || false}
                              onCheckedChange={(checked) => {
                                updateActionMutation.mutate({
                                  actionId: action.id,
                                  isCompleted: checked === true,
                                  milestoneId: currentMilestoneData.milestone.id,
                                });
                              }}
                              disabled={updateActionMutation.isPending}
                            />
                            <div className="flex-1">
                              <p className={`text-sm ${action.isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                {action.title}
                              </p>
                            </div>
                            <span className="text-xs text-gray-500">{index + 1}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No Current Milestone</h3>
                    <p className="text-gray-600">Create a goal and start planning to see activities here!</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {(!goals || goals.length === 0) && (
            <Card className="mt-6">
              <CardContent className="p-8 text-center">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">No Goals Yet</h3>
                <p className="text-gray-600">Create your first goal to start tracking progress!</p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}