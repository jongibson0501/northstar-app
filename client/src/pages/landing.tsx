import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NorthstarBrand } from "@/components/NorthstarLogo";
import { Target, Map, TrendingUp, Crown } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen northstar-gradient">
      <div className="max-w-md mx-auto min-h-screen relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-white/20 blur-xl"></div>
          <div className="absolute bottom-32 right-10 w-40 h-40 rounded-full bg-white/10 blur-xl"></div>
        </div>
        
        {/* Header */}
        <header className="relative text-center p-8 pt-16">
          <NorthstarBrand size="large" animated={true} />
        </header>

        {/* Main Content */}
        <main className="relative p-6 space-y-8">
          {/* Features */}
          <div className="space-y-4">
            <Card className="bg-sky-400/30 border-sky-300/40 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Goal Capture</h3>
                  <p className="text-sm text-white/70">Start with any vague idea</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sky-400/30 border-sky-300/40 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Map className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Smart Planning</h3>
                  <p className="text-sm text-white/70">AI-guided milestone creation</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-sky-400/30 border-sky-300/40 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Visual Progress</h3>
                  <p className="text-sm text-white/70">Timeline roadmap tracking</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA */}
          <div className="space-y-4">
            <Button 
              className="w-full bg-white/20 hover:bg-white/30 text-white py-4 rounded-xl font-medium border border-white/30 backdrop-blur-sm transition-all duration-300 hover:transform hover:scale-105"
              onClick={() => window.location.href = "/api/login"}
            >
              What's your goal?
            </Button>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 text-sm text-white/60">
                <Crown className="w-4 h-4 text-white/70" />
                <span>Premium plans starting at $4/month</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
