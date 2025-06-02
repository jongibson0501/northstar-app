import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
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
  const [selectedTimeline, setSelectedTimeline] = useState("");
  const [customTimeline, setCustomTimeline] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [milestones, setMilestones] = useState<any[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isGeneratingMilestones, setIsGeneratingMilestones] = useState(false);

  const { data: goal, isLoading } = useQuery<GoalWithMilestones>({
    queryKey: ["/api/goals", goalId],
    enabled: !!goalId,
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      if (!goal?.title) {
        throw new Error('Goal not loaded yet');
      }
      const timelineToSend = selectedTimeline === "custom" ? customTimeline : selectedTimeline;
      console.log('Generating plan for:', goal.title);
      const response = await apiRequest("POST", "/api/generate-plan", {
        goalId: goalId,
        goalTitle: goal.title,
        timeline: timelineToSend
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Plan Created!",
        description: "Your personalized roadmap has been generated.",
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate plan. Please try again.",
        variant: "destructive",
      });
      setIsGeneratingQuestions(false);
    },
  });

  const generateMilestonesMutation = useMutation({
    mutationFn: async () => {
      if (!goal?.title) {
        throw new Error('Goal not loaded yet');
      }
      const timelineToSend = selectedTimeline === "custom" ? customTimeline : selectedTimeline;
      console.log('Sending milestone goal title:', goal.title);
      const response = await apiRequest("POST", "/api/generate-milestones", {
        goalId,
        goalTitle: goal.title, 
        timeline: timelineToSend,
        questionsAndAnswers: questions.map((q, i) => ({ question: q, answer: answers[i] }))
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setMilestones(data.milestones);
      setCurrentStep(4);
      setIsGeneratingMilestones(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate milestones. Please try again.",
        variant: "destructive",
      });
      setIsGeneratingMilestones(false);
    },
  });

  const saveMilestonesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/save-milestones", {
        goalId,
        milestones,
        timeline: selectedTimeline
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals", goalId] });
      toast({
        title: "Success",
        description: "Your roadmap has been created!",
      });
      setLocation(`/goals/${goalId}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save milestones. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTimelineSelection = () => {
    if (!selectedTimeline) return;
    if (selectedTimeline === "custom") {
      setCurrentStep(2);
    } else {
      setIsGeneratingQuestions(true);
      generatePlanMutation.mutate();
    }
  };

  const handleAnswerChange = (value: string) => {
    setCurrentAnswer(value);
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = value;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer(answers[currentQuestionIndex + 1] || "");
    } else {
      // All questions answered, generate milestones
      setIsGeneratingMilestones(true);
      generateMilestonesMutation.mutate();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setCurrentAnswer(answers[currentQuestionIndex - 1] || "");
    }
  };

  const handleMilestoneChange = (index: number, field: string, value: string) => {
    const newMilestones = [...milestones];
    newMilestones[index] = { ...newMilestones[index], [field]: value };
    setMilestones(newMilestones);
  };

  const handleActionChange = (milestoneIndex: number, actionIndex: number, value: string) => {
    const newMilestones = [...milestones];
    newMilestones[milestoneIndex].actions[actionIndex] = { ...newMilestones[milestoneIndex].actions[actionIndex], title: value };
    setMilestones(newMilestones);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Goal not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-secondary pb-20">
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => currentStep === 1 ? setLocation(`/goals/${goalId}`) : setCurrentStep(currentStep - 1)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-medium text-gray-800">Plan Your Goal</h1>
          <div className="w-8" />
        </div>

        {/* Progress Indicator */}
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? "bg-primary text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            {currentStep === 1 && "Choose your timeline"}
            {currentStep === 2 && "Generating personalized questions..."}
            {currentStep === 3 && `Question ${currentQuestionIndex + 1} of ${questions.length}`}
            {currentStep === 4 && "Review and customize your roadmap"}
          </p>
        </div>

        {/* Step 1: Timeline Selection */}
        {currentStep === 1 && (
          <div className="p-4 space-y-6">
            <div>
              <h2 className="text-xl font-medium text-gray-800 mb-2">
                How long do you want to work on {goal.title ? goal.title.toLowerCase() : 'your goal'}?
              </h2>
            </div>

            <div className="space-y-3">
              {[
                { value: "1_month", label: "1 Month" },
                { value: "3_months", label: "3 Months" },
                { value: "6_months", label: "6 Months" },
                { value: "1_year", label: "1 Year" },
                { value: "custom", label: "Custom" },
              ].map((option) => (
                <Card
                  key={option.value}
                  className={`cursor-pointer transition-all ${
                    selectedTimeline === option.value
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedTimeline(option.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 ${
                          selectedTimeline === option.value
                            ? "border-primary bg-primary"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedTimeline === option.value && (
                          <div className="w-full h-full rounded-full bg-white scale-50" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-800">{option.label}</h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              onClick={handleTimelineSelection}
              disabled={!selectedTimeline || isGeneratingQuestions}
              className="w-full bg-primary hover:bg-primary/90 text-white py-4"
            >
              {isGeneratingQuestions ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Your Plan...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Custom Timeline Input */}
        {currentStep === 2 && (
          <div className="p-4 space-y-6">
            <div>
              <h2 className="text-xl font-medium text-gray-800 mb-2">
                What's your custom timeline?
              </h2>
            </div>

            <div>
              <input
                type="text"
                value={customTimeline}
                onChange={(e) => setCustomTimeline(e.target.value)}
                placeholder="e.g., 2 weeks, 8 months, 2 years..."
                className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                autoFocus
              />
              <p className="text-sm text-gray-600 mt-2">Current input: "{customTimeline}"</p>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => setCurrentStep(1)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  if (customTimeline.trim()) {
                    setIsGeneratingQuestions(true);
                    generatePlanMutation.mutate();
                  }
                }}
                disabled={!customTimeline.trim() || isGeneratingQuestions}
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
              >
                {isGeneratingQuestions ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Your Plan...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Questions */}
        {currentStep === 3 && questions.length > 0 && (
          <div className="p-4 space-y-6">
            <div>
              <h2 className="text-xl font-medium text-gray-800 mb-2">
                Question {currentQuestionIndex + 1} of {questions.length}
              </h2>
              <p className="text-gray-600 mb-6">
                Help us understand your situation better to create a personalized roadmap.
              </p>
            </div>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium text-gray-800 mb-4">
                  {questions[currentQuestionIndex]}
                </h3>
                <Textarea
                  value={currentAnswer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="min-h-[120px] resize-none"
                />
              </CardContent>
            </Card>

            <div className="flex space-x-3">
              {currentQuestionIndex > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePreviousQuestion}
                  className="flex-1"
                >
                  Previous
                </Button>
              )}
              <Button
                onClick={handleNextQuestion}
                disabled={!currentAnswer.trim()}
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
              >
                {currentQuestionIndex === questions.length - 1 ? (
                  isGeneratingMilestones ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Roadmap...
                    </>
                  ) : (
                    "Create Roadmap"
                  )
                ) : (
                  "Next"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review Milestones */}
        {currentStep === 4 && milestones.length > 0 && (
          <div className="p-4 space-y-6">
            <div>
              <h2 className="text-xl font-medium text-gray-800 mb-2">
                Your Personalized Roadmap
              </h2>
              <p className="text-gray-600 mb-6">
                Review and customize your milestones and action steps.
              </p>
            </div>

            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Milestone {index + 1} ({milestone.timeframe || `Month ${milestone.targetMonth}`})
                      </label>
                      <Input
                        value={milestone.title}
                        onChange={(e) => handleMilestoneChange(index, "title", e.target.value)}
                        className="font-medium"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Action Steps
                      </label>
                      <div className="space-y-2">
                        {milestone.actions?.map((action: any, actionIndex: number) => (
                          <Input
                            key={actionIndex}
                            value={action.title}
                            onChange={(e) => handleActionChange(index, actionIndex, e.target.value)}
                            placeholder={`Action step ${actionIndex + 1}`}
                            className="text-sm"
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              onClick={() => saveMilestonesMutation.mutate()}
              disabled={saveMilestonesMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90 text-white py-4"
            >
              {saveMilestonesMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving Roadmap...
                </>
              ) : (
                "Save My Roadmap"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}