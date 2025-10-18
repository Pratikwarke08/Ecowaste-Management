import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '@/components/auth/LoginForm';

const Index = () => {
  const navigate = useNavigate();

  const handleLogin = (userType: 'collector' | 'employee') => {
    // Store user type in localStorage for demo purposes
    localStorage.setItem('userType', userType);
    navigate('/dashboard');
  };

  return <LoginForm onLogin={handleLogin} />;
};

export default Index;
