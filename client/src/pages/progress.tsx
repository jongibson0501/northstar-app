import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Target, CheckCircle, Clock, Activity } from "lucide-react";
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

  const getTotalActionsCount = () => {
    if (!goals) return 0;
    return goals.reduce((total, goal) => 
      total + goal.milestones.reduce((milestoneTotal, milestone) => 
        milestoneTotal + milestone.actions.length, 0
      ), 0
    );
  };

  const getCompletedActionsCount = () => {
    if (!goals) return 0;
    return goals.reduce((total, goal) => 
      total + goal.milestones.reduce((milestoneTotal, milestone) => 
        milestoneTotal + milestone.actions.filter(a => a.isCompleted).length, 0
      ), 0
    );
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
  const totalActions = getTotalActionsCount();
  const completedActions = getCompletedActionsCount();

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
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Activity Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-800 mb-2">
                        {completedActions} / {totalActions}
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Activities Completed</p>
                      <Progress value={totalActions > 0 ? (completedActions / totalActions) * 100 : 0} className="h-3" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="space-y-1">
                        <div className="flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                          <span className="text-lg font-semibold">{completedActions}</span>
                        </div>
                        <p className="text-xs text-gray-600">Completed</p>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-center">
                          <Clock className="w-4 h-4 text-orange-500 mr-1" />
                          <span className="text-lg font-semibold">{totalActions - completedActions}</span>
                        </div>
                        <p className="text-xs text-gray-600">Remaining</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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