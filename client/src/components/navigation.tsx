import { Home, TrendingUp, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Navigation() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { icon: Home, label: "Goals", path: "/" },
    { icon: TrendingUp, label: "Progress", path: "/progress" },
    { icon: Crown, label: "Premium", path: "/subscription" },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center space-y-1 py-2 px-3 ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
