import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { ProviderPage } from './pages/ProviderPage';
import { Onboarding } from './pages/Onboarding';
import { ResetPassword } from './pages/ResetPassword';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardHome } from './pages/DashboardHome';
import { DashboardSettings } from './pages/DashboardSettings';
import { DashboardCalendar } from './pages/DashboardCalendar';
import { NotFound } from './pages/NotFound';
import { TermsPage } from './pages/TermsPage';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
import { Toaster, toast } from 'sonner';

// Global fetch interceptor for Rate Limiting (429 Too Many Requests)
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args);
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    let message = 'Você fez muitas requisições recentemente. Por favor, aguarde um momento antes de tentar novamente.';
    
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        if (seconds < 60) {
           message = `Muitas requisições. Tente novamente em ${seconds} segundos.`;
        } else {
           message = `Muitas requisições. Tente novamente em ${Math.ceil(seconds / 60)} minuto(s).`;
        }
      }
    }
    
    // Show toast for rate limit
    toast.error('Acesso Limitado Temporariamente', {
      description: message,
      duration: 5000,
    });
  }
  return response;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/onboarding",
    element: <Onboarding />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/termos",
    element: <TermsPage />,
  },
  {
    path: "/p/:slug",
    element: <ProviderPage />,
  },
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <DashboardHome />,
      },
      {
        path: "calendar",
        element: <DashboardCalendar />,
      },
      {
        path: "settings",
        element: <DashboardSettings />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  </StrictMode>,
);
