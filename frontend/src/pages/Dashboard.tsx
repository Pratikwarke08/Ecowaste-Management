import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/layout/Navigation';
import CollectorDashboard from '@/components/dashboard/CollectorDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';
import { apiFetch } from '@/lib/api';

const Dashboard = () => {
  const [userType, setUserType] = useState<'collector' | 'employee' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await apiFetch('/users/me');
        const data = await res.json();
        const role = data.user?.role as 'collector' | 'employee' | undefined;
        if (!role) {
          throw new Error('Role missing');
        }
        setUserType(role);
        localStorage.setItem('userType', role);
        localStorage.setItem('user', JSON.stringify(data.user));
      } catch (err) {
        const error = err as Error & { status?: number; message?: string };
        console.error(error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userType');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [navigate]);

  if (loading || !userType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userType} />
      <main className="lg:ml-64 p-6">
        {userType === 'collector' ? <CollectorDashboard /> : <EmployeeDashboard />}
      </main>
    </div>
  );
};

export default Dashboard;