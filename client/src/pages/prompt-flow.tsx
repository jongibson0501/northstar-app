import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Edit } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { GoalWithMilestones } from "@shared/schema";

export default function PromptFlow() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/goals/:id/plan");
  const goalId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTimeline, setSelectedTimeline] = useState("3_months");
  const [milestones, setMilestones] = useState([
    { title: "", targetMonth: 1 },
    { title: "", targetMonth: 2 },
    { title: "", targetMonth: 3 },
  ]);

  const { data: goal, isLoading } = useQuery<GoalWithMilestones>({
    queryKey: ["/api/goals", goalId],
    enabled: !!goalId,
  });

  const updateGoalMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", `/api/goals/${goalId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals", goalId] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });

  const createMilestonesMutation = useMutation({
    mutationFn: async (milestonesData: any[]) => {
      const promises = milestonesData.map((milestone, index) =>
        apiRequest("POST", "/api/milestones", {
          goalId: goalId,
          title: milestone.title,
          description: "",
          orderIndex: index,
          targetMonth: milestone.targetMonth,
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals", goalId] });
      setLocation(`/goals/${goalId}`);
      toast({
        title: "Roadmap Created",
        description: "Your goal roadmap is ready!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create milestones. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (goal && selectedTimeline) {
      // Generate suggested milestones based on goal description and timeline
      const timelineMonths = selectedTimeline === "3_months" ? 3 : 
                           selectedTimeline === "6_months" ? 6 : 12;
      
      const suggestedMilestones = generateMilestones(goal.title, timelineMonths);
      setMilestones(suggestedMilestones);
    }
  }, [goal, selectedTimeline]);

  const generateMilestones = (description: string, months: number) => {
    // Simple milestone generation - in a real app, this would use AI
    const milestones = [];
    for (let i = 1; i <= Math.min(3, months); i++) {
      const targetMonth = Math.ceil((i / 3) * months);
      milestones.push({
        title: `Milestone ${i} for ${description.slice(0, 30)}...`,
        targetMonth,
      });
    }
    return milestones;
  };

  const handleTimelineSelect = (timeline: string) => {
    setSelectedTimeline(timeline);
    updateGoalMutation.mutate({ timeline });
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Create milestones and navigate to roadmap
      const validMilestones = milestones.filter(m => m.title.trim());
      if (validMilestones.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one milestone",
          variant: "destructive",
        });
        return;
      }
      createMilestonesMutation.mutate(validMilestones);
    }
  };

  const updateMilestone = (index: number, title: string) => {
    const newMilestones = [...milestones];
    newMilestones[index].title = title;
    setMilestones(newMilestones);
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

  return (
    <div className="min-h-screen bg-background text-secondary pb-20">
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
        <section className="p-4">
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/goals/${goalId}`)}
                className="text-primary mr-3 p-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-medium text-gray-800">Plan Your Journey</h2>
            </div>
            
            {/* Progress Indicator */}
            <div className="flex items-center space-x-2 mb-6">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 1 ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'
              }`}>1</div>
              <div className={`flex-1 h-1 rounded ${currentStep >= 2 ? 'bg-primary' : 'bg-gray-300'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 2 ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'
              }`}>2</div>
              <div className={`flex-1 h-1 rounded ${currentStep >= 3 ? 'bg-primary' : 'bg-gray-300'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 3 ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'
              }`}>3</div>
            </div>
          </div>

          {/* Step 1: Timeline Selection */}
          {currentStep === 1 && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">When do you want to achieve this?</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={selectedTimeline === "3_months" ? "default" : "outline"}
                    className={`p-4 h-auto text-center ${
                      selectedTimeline === "3_months" 
                        ? 'bg-primary text-white border-primary' 
                        : 'border-gray-200 hover:border-primary'
                    }`}
                    onClick={() => handleTimelineSelect("3_months")}
                  >
                    <div>
                      <div className="text-2xl mb-2">🏃</div>
                      <div className="font-medium">3 Months</div>
                      <div className="text-sm opacity-80">Quick sprint</div>
                    </div>
                  </Button>
                  <Button
                    variant={selectedTimeline === "6_months" ? "default" : "outline"}
                    className={`p-4 h-auto text-center ${
                      selectedTimeline === "6_months" 
                        ? 'bg-primary text-white border-primary' 
                        : 'border-gray-200 hover:border-primary'
                    }`}
                    onClick={() => handleTimelineSelect("6_months")}
                  >
                    <div>
                      <div className="text-2xl mb-2">🚶</div>
                      <div className="font-medium">6 Months</div>
                      <div className="text-sm opacity-80">Steady pace</div>
                    </div>
                  </Button>
                  <Button
                    variant={selectedTimeline === "1_year" ? "default" : "outline"}
                    className={`p-4 h-auto text-center ${
                      selectedTimeline === "1_year" 
                        ? 'bg-primary text-white border-primary' 
                        : 'border-gray-200 hover:border-primary'
                    }`}
                    onClick={() => handleTimelineSelect("1_year")}
                  >
                    <div>
                      <div className="text-2xl mb-2">🏔️</div>
                      <div className="font-medium">1 Year</div>
                      <div className="text-sm opacity-80">Long journey</div>
                    </div>
                  </Button>
                  <Button
                    variant={selectedTimeline === "custom" ? "default" : "outline"}
                    className={`p-4 h-auto text-center ${
                      selectedTimeline === "custom" 
                        ? 'bg-primary text-white border-primary' 
                        : 'border-gray-200 hover:border-primary'
                    }`}
                    onClick={() => handleTimelineSelect("custom")}
                  >
                    <div>
                      <div className="text-2xl mb-2">⚙️</div>
                      <div className="font-medium">Custom</div>
                      <div className="text-sm opacity-80">Set your own</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Milestone Planning */}
          {currentStep === 2 && (
            <Card className="mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Key Milestones</h3>
                <p className="text-sm text-gray-600 mb-4">Define the major steps toward your goal:</p>
                
                <div className="space-y-4">
                  {milestones.map((milestone, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-accent">
                          Milestone {index + 1} • Month {milestone.targetMonth}
                        </span>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600 p-1">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                      <Input
                        value={milestone.title}
                        onChange={(e) => updateMilestone(index, e.target.value)}
                        placeholder={`Enter milestone ${index + 1}...`}
                        className="w-full font-medium text-gray-800 bg-transparent border-none p-0 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button 
              onClick={handleNextStep}
              disabled={createMilestonesMutation.isPending}
              className="flex-1 bg-primary hover:bg-primary-dark text-white"
            >
              {currentStep < 3 
                ? "Next" 
                : createMilestonesMutation.isPending 
                  ? "Creating..." 
                  : "Create Roadmap"
              }
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
