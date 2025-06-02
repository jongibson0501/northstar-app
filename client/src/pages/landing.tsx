import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Map, TrendingUp, Crown } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-secondary">
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
        {/* Header */}
        <header className="bg-primary text-white p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-medium mb-2">Northstar</h1>
          <p className="text-white/90">Goal Visualization & Roadmap Builder</p>
        </header>

        {/* Main Content */}
        <main className="p-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-medium text-gray-800 mb-4">
              Transform Your Dreams Into Reality
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Turn vague goals into structured roadmaps with milestones and actionable steps. 
              Get the clarity you need to achieve what matters most.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-8">
            <Card>
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Goal Capture</h3>
                  <p className="text-sm text-gray-600">Start with any vague idea</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                  <Map className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Smart Planning</h3>
                  <p className="text-sm text-gray-600">AI-guided milestone creation</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Visual Progress</h3>
                  <p className="text-sm text-gray-600">Timeline roadmap tracking</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="space-y-4">
            <Button 
              className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-lg font-medium"
              onClick={() => window.location.href = "/api/login"}
            >
              Get Started for Free
            </Button>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Crown className="w-4 h-4 text-accent" />
                <span>Premium plans starting at $4/month</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
