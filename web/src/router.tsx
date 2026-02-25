import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { PublicRoute } from './components/common/PublicRoute';
import { LoginPage } from './modules/auth/pages/LoginPage';
import { RegisterPage } from './modules/auth/pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { FamilyPage } from './modules/auth/pages/FamilyPage';

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/home', element: <HomePage /> },
          { path: '/family', element: <FamilyPage /> },
          { index: true, element: <Navigate to="/home" replace /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/home" replace /> },
]);
