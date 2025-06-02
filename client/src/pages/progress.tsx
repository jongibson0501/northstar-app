import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, CheckCircle, Clock } from "lucide-react";
import type { GoalWithMilestones } from "@shared/schema";

export default function ProgressPage() {
  const { data: goals, isLoading } = useQuery<GoalWithMilestones[]>({
    queryKey: ["/api/goals"],
  });

  const calculateOverallProgress = () => {
    if (!goals || goals.length === 0) return 0;
    
    let totalMilestones = 0;
    let completedMilestones = 0;
    
    goals.forEach(goal => {
      totalMilestones += goal.milestones.length;
      completedMilestones += goal.milestones.filter(m => m.isCompleted).length;
    });
    
    return totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;
  };

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

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const overallProgress = calculateOverallProgress();
  const completedGoals = getCompletedGoalsCount();
  const totalMilestones = getTotalMilestonesCount();
  const completedMilestones = getCompletedMilestonesCount();

  return (
    <div className="min-h-screen bg-background text-secondary pb-20">
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
        <section className="p-4">
          <div className="mb-6">
            <h2 className="text-2xl font-medium text-gray-800 mb-2">Your Progress</h2>
            <p className="text-gray-600">Track your goal achievements and milestones</p>
          </div>

          {/* Overall Progress Card */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
                Overall Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Completion Rate</span>
                    <span className="text-sm font-medium">{overallProgress}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-3" />
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center">
                      <Target className="w-4 h-4 text-blue-500 mr-1" />
                      <span className="text-lg font-semibold">{goals?.length || 0}</span>
                    </div>
                    <p className="text-xs text-gray-600">Total Goals</p>
                  </div>
                  
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

          {/* Milestones Overview */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Milestones Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-gray-800">
                  {completedMilestones} / {totalMilestones}
                </div>
                <p className="text-sm text-gray-600">Milestones Completed</p>
                {totalMilestones > 0 && (
                  <Progress value={(completedMilestones / totalMilestones) * 100} className="h-2" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Individual Goal Progress */}
          {goals && goals.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800">Goal Breakdown</h3>
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

          {(!goals || goals.length === 0) && (
            <Card>
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