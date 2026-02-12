'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import "./globals.css";

export default function RootLayout({ children }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <body className="antialiased">
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
