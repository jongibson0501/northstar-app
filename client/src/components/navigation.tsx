import { Home, TrendingUp, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { DailyCheckIn } from "@shared/schema";

export default function Navigation() {
  const [location, setLocation] = useLocation();

  // Check if user has completed today's check-in
  const { data: todayCheckIn } = useQuery<DailyCheckIn | null>({
    queryKey: ['/api/daily-checkin/today'],
  });

  const hasCompletedMorning = todayCheckIn && todayCheckIn.morningIntention;
  const hasCompletedEvening = todayCheckIn && todayCheckIn.eveningAccomplished !== null;
  const needsAttention = !hasCompletedMorning || (hasCompletedMorning && !hasCompletedEvening);

  const navItems = [
    { icon: Home, label: "Goals", path: "/" },
    { icon: TrendingUp, label: "Progress", path: "/progress" },
    { 
      icon: Sun, 
      label: "Daily", 
      path: "/daily-checkin",
      needsAttention 
    },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          const showDot = item.needsAttention && !isActive;
          
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => setLocation(item.path)}
              className={`relative flex flex-col items-center space-y-1 py-2 px-3 ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {showDot && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
