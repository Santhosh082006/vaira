'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-red-600" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900">Something went wrong!</h2>
      <p className="text-sm text-slate-500 max-w-md text-center">
        We encountered an unexpected error while loading this data. Please try again.
      </p>
      <Button 
        onClick={() => reset()}
        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
      >
        Try again
      </Button>
    </div>
  );
}
