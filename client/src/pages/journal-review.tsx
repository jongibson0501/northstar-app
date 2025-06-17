import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Calendar, TrendingUp, Target, BookOpen, Filter, Flame } from "lucide-react";
import type { JournalEntry, GoalWithMilestones } from "@shared/schema";

export default function JournalReview() {
  const [selectedGoalId, setSelectedGoalId] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("30");

  // Fetch user's goals for filtering
  const { data: goals = [] } = useQuery<GoalWithMilestones[]>({
    queryKey: ['/api/goals'],
  });

  // Fetch journal entries based on filters
  const { data: journalEntries = [] } = useQuery<JournalEntry[]>({
    queryKey: ['/api/journal/entries', selectedGoalId, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        days: timeRange,
        ...(selectedGoalId !== "all" && { goalId: selectedGoalId })
      });
      const response = await fetch(`/api/journal/entries?${params}`);
      return response.json();
    },
  });

  // Calculate progress metrics
  const completedDays = journalEntries.filter(entry => entry.isCompleted).length;
  const totalDays = journalEntries.length;
  const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  const averageMood = journalEntries.length > 0 
    ? journalEntries.reduce((sum, entry) => sum + (entry.accomplishmentLevel || 3), 0) / journalEntries.length 
    : 0;

  const getMoodColor = (level: number | null) => {
    if (!level) return "bg-gray-100 text-gray-600";
    if (level >= 4) return "bg-green-100 text-green-700";
    if (level >= 3) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const getMoodText = (level: number | null) => {
    if (!level) return "Not rated";
    if (level >= 4) return "Great";
    if (level >= 3) return "Good";
    return "Challenging";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="max-w-4xl mx-auto min-h-screen bg-gray-50 p-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-600" />
            Daily Journal Review
          </h1>
          <p className="text-gray-600">
            Track your progress and reflect on your goal achievement journey
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5" />
              Filter Journal Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Goal</label>
                <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Goals</SelectItem>
                    {goals.map(goal => (
                      <SelectItem key={goal.id} value={goal.id.toString()}>
                        {goal.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{completedDays}</p>
                  <p className="text-sm text-gray-600">Days Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
                  <p className="text-sm text-gray-600">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{averageMood.toFixed(1)}/5</p>
                  <p className="text-sm text-gray-600">Avg. Performance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Journal Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Journal Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {journalEntries.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No journal entries found for the selected criteria.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Start completing daily check-ins to build your journal!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {journalEntries.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          {formatDate(entry.date)}
                          {entry.isCompleted && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              Completed
                            </Badge>
                          )}
                          {entry.streakCount && entry.streakCount > 0 && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 flex items-center gap-1">
                              <Flame className="w-3 h-3" />
                              {entry.streakCount} day streak
                            </Badge>
                          )}
                        </h3>
                        {entry.accomplishmentLevel && (
                          <Badge className={getMoodColor(entry.accomplishmentLevel)}>
                            {getMoodText(entry.accomplishmentLevel)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {entry.morningIntention && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Morning Intention</p>
                        <p className="text-gray-800 bg-blue-50 p-2 rounded text-sm">
                          {entry.morningIntention}
                        </p>
                      </div>
                    )}

                    {entry.eveningReflection && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Evening Reflection</p>
                        <p className="text-gray-800 bg-purple-50 p-2 rounded text-sm">
                          {entry.eveningReflection}
                        </p>
                      </div>
                    )}

                    {entry.keyLearnings && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Key Learnings</p>
                        <p className="text-gray-800 bg-yellow-50 p-2 rounded text-sm">
                          {entry.keyLearnings}
                        </p>
                      </div>
                    )}

                    {entry.challengesFaced && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Challenges Faced</p>
                        <p className="text-gray-800 bg-red-50 p-2 rounded text-sm">
                          {entry.challengesFaced}
                        </p>
                      </div>
                    )}

                    {entry.tomorrowFocus && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Tomorrow's Focus</p>
                        <p className="text-gray-800 bg-green-50 p-2 rounded text-sm">
                          {entry.tomorrowFocus}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}