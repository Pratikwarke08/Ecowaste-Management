// import { useState } from 'react';
// import { NavLink, useLocation } from 'react-router-dom';
// import { cn } from '@/lib/utils';
// import { Button } from '@/components/ui/button';
// import {
//   Home,
//   Camera,
//   MapPin,
//   Award,
//   Users,
//   Settings,
//   Menu,
//   X,
//   Recycle,
//   Shield,
//   MessageSquare,
//   AlertTriangle,
//   HeartHandshake,
//   Leaf,
//   Map,
//   LogOut
// } from 'lucide-react';

// interface NavigationProps {
//   userRole: 'collector' | 'employee';
// }

// const Navigation = ({ userRole }: NavigationProps) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const location = useLocation();

//   const handleLogout = () => {
//     localStorage.clear();
//     window.location.href = '/';
//   };

//   const collectorNavItems = [
//     { href: '/dashboard', label: 'Dashboard', icon: Home },
//     { href: '/capture', label: 'Capture Waste', icon: Camera },
//     { href: '/capture-incident', label: 'Capture Incidents', icon: AlertTriangle },
//     { href: '/rewards', label: 'My Rewards', icon: Award },
//     { href: '/keep-alive', label: 'Keep Me Alive', icon: HeartHandshake },
//     { href: '/complaints', label: 'Complaints', icon: MessageSquare },
//     { href: '/community', label: 'Community', icon: Users },
//     { href: '/settings', label: 'Settings', icon: Settings },
//     { href: '/smog-tower', label: 'Smog Tower', icon: Leaf },
//     { href: 'logout', label: 'Logout', icon: LogOut },
//   ];

//   const employeeNavItems = [
//     { href: '/dashboard', label: 'Dashboard', icon: Home },
//     { href: '/map', label: 'Map View', icon: Map },
//     { href: '/dustbins', label: 'Manage Dustbins', icon: MapPin },
//     { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
//     { href: '/verify', label: 'Verify Reports', icon: Shield },
//     { href: '/complaints', label: 'Complaints', icon: MessageSquare },
//     { href: '/progress', label: 'Progress Tracking', icon: Users },
//     { href: '/settings', label: 'Settings', icon: Settings },
//     { href: 'logout', label: 'Logout', icon: LogOut },
//   ];

//   const navItems = userRole === 'collector' ? collectorNavItems : employeeNavItems;

//   const isActive = (path: string) => location.pathname === path;

//   return (
//     <>
//       {/* Mobile Navigation Toggle */}
//       <div className="lg:hidden fixed top-4 right-4 z-50">
//         <Button
//           variant="eco"
//           size="sm"
//           onClick={() => setIsOpen(!isOpen)}
//           className="shadow-elevation"
//         >
//           {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
//         </Button>
//       </div>

//       {/* Mobile Navigation Overlay */}
//       {isOpen && (
//         <div className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40">
//           <div className="fixed right-0 top-0 h-full w-64 bg-card border-l shadow-elevation p-6">
//             <div className="flex items-center gap-2 mb-8 mt-16">
//               <Recycle className="h-6 w-6 text-eco-forest-primary" />
//               <span className="font-bold text-lg">EcoWaste</span>
//             </div>
//             <div className="flex flex-col h-full">
//               <nav className="space-y-2">
//                 {navItems.map((item) => {
//                   if (item.href === 'logout') {
//                     const Icon = item.icon;
//                     return (
//                       <button
//                         key="logout"
//                         onClick={handleLogout}
//                         className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
//                       >
//                         <Icon className="h-5 w-5" />
//                         <span className="font-medium">Logout</span>
//                       </button>
//                     );
//                   }

//                   const Icon = item.icon;
//                   return (
//                     <NavLink
//                       key={item.href}
//                       to={item.href}
//                       onClick={() => setIsOpen(false)}
//                       className={cn(
//                         "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
//                         isActive(item.href)
//                           ? "bg-primary text-primary-foreground shadow-md"
//                           : "hover:bg-muted"
//                       )}
//                     >
//                       <Icon className="h-5 w-5" />
//                       <span className="font-medium">{item.label}</span>
//                     </NavLink>
//                   );
//                 })}
//               </nav>

//               <div className="mt-auto pt-6">
//                 <button
//                   onClick={handleLogout}
//                   className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
//                 >
//                   <LogOut className="h-5 w-5" />
//                   <span className="font-medium">Logout</span>
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Desktop Navigation */}
//       <nav className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-card border-r shadow-elevation z-30">
//         <div className="p-6">
//           {/* Logo */}
//           <div className="flex items-center gap-2 mb-8">
//             <Recycle className="h-8 w-8 text-eco-forest-primary" />
//             <span className="font-bold text-xl">EcoWaste</span>
//           </div>

//           {/* Navigation Items */}
//           <div className="flex flex-col h-[calc(100vh-120px)]">
//             <div className="space-y-2">
//               {navItems.map((item) => {
//                 if (item.href === 'logout') {
//                   const Icon = item.icon;
//                   return (
//                     <button
//                       key="logout"
//                       onClick={handleLogout}
//                       className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
//                     >
//                       <Icon className="h-5 w-5" />
//                       <span className="font-medium">Logout</span>
//                     </button>
//                   );
//                 }

//                 const Icon = item.icon;
//                 return (
//                   <NavLink
//                     key={item.href}
//                     to={item.href}
//                     className={cn(
//                       "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
//                       isActive(item.href)
//                         ? "bg-primary text-primary-foreground shadow-md"
//                         : "hover:bg-muted"
//                     )}
//                   >
//                     <Icon className="h-5 w-5" />
//                     <span className="font-medium">{item.label}</span>
//                   </NavLink>
//                 );
//               })}
//             </div>

//             <div className="mt-auto pt-6">
//               <button
//                 onClick={handleLogout}
//                 className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
//               >
//                 <LogOut className="h-5 w-5" />
//                 <span className="font-medium">Logout</span>
//               </button>
//             </div>
//           </div>
//         </div>
//       </nav>
//     </>
//   );
// };

// export default Navigation;
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
  Shield,
  MessageSquare,
  AlertTriangle,
  HeartHandshake,
  Leaf,
  Map
} from 'lucide-react'

interface NavigationProps {
  userRole: 'collector' | 'employee'
}

const Navigation = ({ userRole }: NavigationProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  const collectorNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/capture', label: 'Capture Waste', icon: Camera },
    { href: '/capture-incident', label: 'Capture Incidents', icon: AlertTriangle },
    { href: '/rewards', label: 'My Rewards', icon: Award },
    { href: '/keep-alive', label: 'Keep Me Alive', icon: HeartHandshake },
    { href: '/complaints', label: 'Complaints', icon: MessageSquare },
    { href: '/community', label: 'Community', icon: Users },
    { href: '/smog-tower', label: 'Smog Tower', icon: Leaf },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  const employeeNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/map', label: 'Map View', icon: Map },
    { href: '/dustbins', label: 'Manage Dustbins', icon: MapPin },
    { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
    { href: '/verify', label: 'Verify Reports', icon: Shield },
    { href: '/complaints', label: 'Complaints', icon: MessageSquare },
    { href: '/progress', label: 'Progress Tracking', icon: Users },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  const navItems = userRole === 'collector'
    ? collectorNavItems
    : employeeNavItems

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      {/* ================= HEADER (ALL PAGES) ================= */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-card border-b shadow-sm lg:ml-64">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-2 rounded-lg">
              <Recycle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">EcoCollect</h1>
              <p className="text-xs text-muted-foreground">
                Smart Waste Management
              </p>
            </div>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="eco"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* ================= MOBILE DRAWER ================= */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur">
          <div className="fixed left-0 top-0 h-full w-64 bg-card shadow-xl p-6">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4"
              onClick={() => setIsOpen(false)}
            >
              <X />
            </Button>

            <div className="flex items-center gap-2 mb-8 mt-6">
              <Recycle className="h-6 w-6 text-green-600" />
              <span className="font-bold text-lg">EcoWaste</span>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg",
                      isActive(item.href)
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </NavLink>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="hidden lg:block fixed left-0 top-0 h-full w-64 bg-card border-r shadow z-30 pt-20">
        <nav className="px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>

      {/* ================= GLOBAL PAGE OFFSET ================= */}
      <div className="pt-16 lg:pl-64" />
    </>
  )
}

export default Navigation