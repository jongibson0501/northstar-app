import { Bell, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="bg-primary text-white p-4 shadow-md">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Northstar</h1>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" className="text-white opacity-80 hover:opacity-100 p-2">
            <Bell className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-2">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.href = "/api/logout"}
              className="text-white opacity-80 hover:opacity-100 p-2"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
