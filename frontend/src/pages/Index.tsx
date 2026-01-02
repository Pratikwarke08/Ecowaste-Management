import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';
import { bootstrapThemeFromStorage, applyTheme } from '@/lib/theme';

const Index = () => {
  const navigate = useNavigate();

  // Force light theme on auth page so user themes don't interfere
  useEffect(() => {
    applyTheme('light');
    return () => {
      // Restore user's saved preference when leaving the page
      bootstrapThemeFromStorage();
    };
  }, []);

  const handleLogin = (userType: 'collector' | 'employee', _userData: { name?: string; email: string }) => {
    // Store user type in localStorage for demo purposes
    localStorage.setItem('userType', userType);
    navigate('/dashboard');
  };

  return <LoginForm onLogin={handleLogin} />;
};

export default Index;
