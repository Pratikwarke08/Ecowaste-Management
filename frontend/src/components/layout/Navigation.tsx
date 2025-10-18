import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Camera, 
  MapPin, 
  Award, 
  Users, 
  Settings, 
  Menu,
  X,
  Recycle,
  Shield
} from 'lucide-react';

interface NavigationProps {
  userRole: 'collector' | 'employee';
}

const Navigation = ({ userRole }: NavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const collectorNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/capture', label: 'Capture Waste', icon: Camera },
    { href: '/rewards', label: 'My Rewards', icon: Award },
    { href: '/community', label: 'Community', icon: Users },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const employeeNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/dustbins', label: 'Manage Dustbins', icon: MapPin },
    { href: '/verify', label: 'Verify Reports', icon: Shield },
    { href: '/progress', label: 'Progress Tracking', icon: Users },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const navItems = userRole === 'collector' ? collectorNavItems : employeeNavItems;

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Navigation Toggle */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button
          variant="eco"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="shadow-elevation"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Navigation Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40">
          <div className="fixed right-0 top-0 h-full w-64 bg-card border-l shadow-elevation p-6">
            <div className="flex items-center gap-2 mb-8 mt-16">
              <Recycle className="h-6 w-6 text-eco-forest-primary" />
              <span className="font-bold text-lg">EcoWaste</span>
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200",
                      isActive(item.href)
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Navigation */}
      <nav className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-card border-r shadow-elevation z-30">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <Recycle className="h-8 w-8 text-eco-forest-primary" />
            <span className="font-bold text-xl">EcoWaste</span>
          </div>

          {/* Navigation Items */}
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;