import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, CheckCircle, Clock, Activity } from "lucide-react";
import type { GoalWithMilestones } from "@shared/schema";

export default function ProgressPage() {
  const { data: goals, isLoading } = useQuery<GoalWithMilestones[]>({
    queryKey: ["/api/goals"],
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
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                              action.isCompleted 
                                ? 'bg-green-500 border-green-500' 
                                : 'border-gray-300'
                            }`}>
                              {action.isCompleted && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
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