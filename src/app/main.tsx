import React from 'react';
import ReactDOM from 'react-dom/client';

import { Toaster } from '@/components/ui/sonner';
import App from './App';
import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';
import './styles/globals.css';

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
      <ThemedToaster />
    </ThemeProvider>
  </React.StrictMode>,
);
