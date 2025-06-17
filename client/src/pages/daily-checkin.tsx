import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sun, Moon, Target, CheckCircle, Flame } from "lucide-react";
import type { DailyCheckIn, Action } from "@shared/schema";
import { Celebration, MiniCelebration } from "@/components/celebration";

export default function DailyCheckIn() {
  const { toast } = useToast();
  const [morningIntention, setMorningIntention] = useState("");
  const [selectedActionId, setSelectedActionId] = useState<number | null>(null);
  const [eveningAccomplished, setEveningAccomplished] = useState<boolean | null>(null);
  const [eveningReflection, setEveningReflection] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStreak, setCelebrationStreak] = useState(0);

  const today = new Date().toISOString().split('T')[0];
  const currentHour = new Date().getHours();
  const isMorning = currentHour < 17; // Before 5 PM is considered "morning"

  // Fetch today's check-in
  const { data: todayCheckIn } = useQuery<DailyCheckIn | null>({
    queryKey: ['/api/daily-checkin/today'],
  });

  // Fetch incomplete actions for selection with milestone context
  const { data: incompleteActions = [] } = useQuery<(Action & { milestone: { title: string; targetMonth: number; goalTitle: string } })[]>({
    queryKey: ['/api/user/incomplete-actions'],
  });

  // Fetch user's current streak
  const { data: streakData } = useQuery<{ streak: number }>({
    queryKey: ['/api/user/streak'],
  });

  // Load existing data when check-in is fetched
  useEffect(() => {
    if (todayCheckIn) {
      setMorningIntention(todayCheckIn.morningIntention || "");
      setSelectedActionId(todayCheckIn.selectedActionId);
      setEveningAccomplished(todayCheckIn.eveningAccomplished);
      setEveningReflection(todayCheckIn.eveningReflection || "");
    }
  }, [todayCheckIn]);

  // Create morning check-in
  const createCheckInMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/daily-checkin", {
        morningIntention,
        selectedActionId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-checkin/today'] });
      toast({
        title: "Morning intention set!",
        description: "You're ready to tackle the day.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your morning intention.",
        variant: "destructive",
      });
    },
  });

  // Update evening check-in
  const updateCheckInMutation = useMutation({
    mutationFn: async () => {
      if (!todayCheckIn?.id) throw new Error("No check-in to update");
      const response = await apiRequest("PUT", `/api/daily-checkin/${todayCheckIn.id}`, {
        eveningAccomplished,
        eveningReflection,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-checkin/today'] });
      
      // Show celebration if user accomplished their intention
      if (data.celebrationData?.showCelebration) {
        setCelebrationStreak(data.celebrationData.streak);
        setShowCelebration(true);
      } else {
        toast({
          title: "Evening reflection saved!",
          description: "Thanks for reflecting on your progress.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your evening reflection.",
        variant: "destructive",
      });
    },
  });

  const handleMorningSubmit = () => {
    if (!morningIntention.trim()) {
      toast({
        title: "Missing intention",
        description: "Please write what you want to accomplish today.",
        variant: "destructive",
      });
      return;
    }
    createCheckInMutation.mutate();
  };

  const handleEveningSubmit = () => {
    if (eveningAccomplished === null) {
      toast({
        title: "Missing reflection",
        description: "Please indicate if you accomplished your intention.",
        variant: "destructive",
      });
      return;
    }
    updateCheckInMutation.mutate();
  };

  const hasMorningCheckIn = todayCheckIn && todayCheckIn.morningIntention;
  const hasEveningCheckIn = todayCheckIn && todayCheckIn.eveningAccomplished !== null;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 p-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Daily Check-in</h1>
          <p className="text-gray-600">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Morning Intention */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-blue-800">
              <Sun className="w-5 h-5 mr-2" />
              Morning Intention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasMorningCheckIn ? (
              <>
                <div>
                  <p className="text-sm text-blue-700 mb-3 font-medium">
                    What's the ONE thing today that would move you forward?
                  </p>
                  <Textarea
                    value={morningIntention}
                    onChange={(e) => setMorningIntention(e.target.value)}
                    placeholder="Write your intention for today..."
                    className="bg-white"
                  />
                </div>

                {incompleteActions.length > 0 && (
                  <div>
                    <p className="text-sm text-blue-700 mb-2">
                      Choose a specific action to focus on:
                    </p>
                    <Select value={selectedActionId?.toString()} onValueChange={(value) => setSelectedActionId(Number(value))}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select an action from your goals..." />
                      </SelectTrigger>
                      <SelectContent>
                        {incompleteActions.map((action) => {
                          const currentMonth = new Date().getMonth() + 1;
                          const milestone = action.milestone;
                          const isCurrentMonth = milestone?.targetMonth === currentMonth;
                          
                          return (
                            <SelectItem key={action.id} value={action.id.toString()}>
                              <div className="flex flex-col w-full">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{action.title}</span>
                                  {isCurrentMonth && (
                                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Current</span>
                                  )}
                                </div>
                                {milestone && (
                                  <span className="text-xs text-gray-500">
                                    {milestone.goalTitle} → Month {milestone.targetMonth}: {milestone.title}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button 
                  onClick={handleMorningSubmit}
                  disabled={createCheckInMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {createCheckInMutation.isPending ? "Setting intention..." : "Set My Intention"}
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Intention set for today!</span>
                </div>
                <div className="bg-white p-3 rounded-lg border">
                  <p className="text-gray-800">{todayCheckIn.morningIntention}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evening Reflection */}
        {hasMorningCheckIn && (
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-purple-800">
                <Moon className="w-5 h-5 mr-2" />
                Evening Reflection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!hasEveningCheckIn ? (
                <>
                  <div>
                    <p className="text-sm text-purple-700 mb-3 font-medium">
                      Did you accomplish your intention today?
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={eveningAccomplished === true}
                          onCheckedChange={() => setEveningAccomplished(true)}
                        />
                        <label className="text-sm text-gray-700">Yes, I accomplished it!</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={eveningAccomplished === false}
                          onCheckedChange={() => setEveningAccomplished(false)}
                        />
                        <label className="text-sm text-gray-700">No, but I made progress</label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-purple-700 mb-2">
                      Any reflections on your day? (optional)
                    </p>
                    <Textarea
                      value={eveningReflection}
                      onChange={(e) => setEveningReflection(e.target.value)}
                      placeholder="What did you learn? What will you do differently tomorrow?"
                      className="bg-white"
                    />
                  </div>

                  <Button 
                    onClick={handleEveningSubmit}
                    disabled={updateCheckInMutation.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {updateCheckInMutation.isPending ? "Saving reflection..." : "Complete Check-in"}
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span className="font-medium">Day complete!</span>
                    </div>
                    {todayCheckIn.eveningAccomplished && todayCheckIn.currentStreak && todayCheckIn.currentStreak > 0 && (
                      <MiniCelebration streak={todayCheckIn.currentStreak} />
                    )}
                  </div>
                  <div className="bg-white p-3 rounded-lg border space-y-2">
                    <p className="text-sm text-gray-600">
                      Accomplished: <span className="font-medium text-gray-800">
                        {todayCheckIn.eveningAccomplished ? "Yes" : "Made progress"}
                      </span>
                    </p>
                    {streakData && streakData.streak > 0 && !todayCheckIn.currentStreak && (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <Flame className="w-4 h-4" />
                        <span>Current streak: {streakData.streak} days</span>
                      </div>
                    )}
                    {todayCheckIn.eveningReflection && (
                      <p className="text-gray-800">{todayCheckIn.eveningReflection}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Encouragement */}
        {!hasMorningCheckIn && (
          <Card className="border-gray-200">
            <CardContent className="p-4 text-center">
              <Target className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">
                Start your day with intention. Focus on one meaningful action that moves you closer to your goals.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Celebration Animation */}
      <Celebration
        isVisible={showCelebration}
        onComplete={() => setShowCelebration(false)}
        streak={celebrationStreak}
        accomplishmentText={morningIntention}
      />
    </div>
  );
}