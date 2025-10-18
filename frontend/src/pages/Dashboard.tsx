import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/layout/Navigation';
import CollectorDashboard from '@/components/dashboard/CollectorDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';

const Dashboard = () => {
  const [userType, setUserType] = useState<'collector' | 'employee' | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUserType = localStorage.getItem('userType') as 'collector' | 'employee' | null;
    if (!storedUserType) {
      navigate('/');
      return;
    }
    setUserType(storedUserType);
  }, [navigate]);

  if (!userType) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
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