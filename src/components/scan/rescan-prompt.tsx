'use client';

import { AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { QualityWarning } from '@/lib/scan/types';

interface RescanPromptProps {
  reasons: QualityWarning[];
  onRescan: () => void;
}

export function RescanPrompt({ reasons, onRescan }: RescanPromptProps) {
  return (
    <Alert variant="destructive" className="mx-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>다시 촬영이 필요합니다</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-1">
          {reasons.map((reason, index) => (
            <li key={index} className="text-sm">
              {reason.message}
            </li>
          ))}
        </ul>
        <Button
          onClick={onRescan}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700"
        >
          다시 촬영하기
        </Button>
      </AlertDescription>
    </Alert>
  );
}
