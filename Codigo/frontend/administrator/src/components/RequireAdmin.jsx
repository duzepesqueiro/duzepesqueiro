import React from 'react';
import AccessDenied from '../pages/AccessDenied';

const RequireAdmin = ({ children }) => {
  const role = typeof window !== 'undefined' ? localStorage.getItem('auth_role') : null;
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const normalizedRole = (role || '').trim().toUpperCase();
  const isAdmin = normalizedRole === 'ADMIN' || normalizedRole === 'MANAGER' || normalizedRole === 'EMPLOYEE';
  if (!token || !isAdmin) {
    return <AccessDenied />;
  }

  return children;
};

export default RequireAdmin;
