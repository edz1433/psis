"use client";

import React from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import '../css/app.css';

// ── Theme support ───────────────────────────────────────────────────────────────
import { ThemeProvider } from 'next-themes';

// ── Sonner toast (global toaster) ──────────────────────────────────────────────
import { Toaster } from "@/components/ui/sonner";

// ── Optional: StrictMode only in development ───────────────────────────────────
const StrictModeWrapper = import.meta.env.DEV
  ? React.StrictMode
  : React.Fragment;

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="psis-theme"
    >
      {children}

      {/* 
        Global toast container – appears on top of everything 
        and persists across page changes (important for Inertia)
      */}
      <Toaster
        position="bottom-right"          // or "bottom-right", "top-center", etc.
        richColors                    // nicer success/error/info colors
        closeButton                   // shows × on toasts
        duration={4500}               // default auto-hide time
        toastOptions={{
          // You can override global styles/behavior here if needed
          className: 'border shadow-lg',
          style: {
            borderRadius: '8px',
          },
        }}
      />
    </ThemeProvider>
  );
}

const appName = import.meta.env.VITE_APP_NAME || 'PSIS Admin';

createInertiaApp({
  // Dynamic page title
  title: (title) => (title ? `${title} - ${appName}` : appName),

  // Page resolution (supports nested folders: Admin/Users/Index.tsx → "Admin/Users/Index")
  resolve: (name) =>
    resolvePageComponent(
      `./pages/${name}.tsx`,
      import.meta.glob('./pages/**/*.tsx')
    ),

  // Root render
  setup({ el, App, props }) {
    createRoot(el).render(
      <StrictModeWrapper>
        <Providers>
          <App {...props} />
        </Providers>
      </StrictModeWrapper>
    );
  },

  // Nice loading progress bar
  progress: {
    color: '#4B5563',   // gray-600
    delay: 250,
  },
});