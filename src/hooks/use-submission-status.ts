import { useState, useEffect } from 'react';

/**
 * Hook to poll the status of a submission during background evaluation.
 */
export function useSubmissionStatus(submissionId: string | null) {
  const [status, setStatus] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submissionId || status === 'EVALUATED') return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/submissions/${submissionId}/status`);
        if (!res.ok) throw new Error("Failed to fetch status");
        
        const json = await res.json();
        setStatus(json.status);
        
        if (json.status === 'EVALUATED') {
          setData(json);
        }
      } catch (e: any) {
        console.error("[useSubmissionStatus]", e);
        setError(e.message);
      }
    };

    // Poll every 3 seconds
    const interval = setInterval(checkStatus, 3000);
    checkStatus();

    return () => clearInterval(interval);
  }, [submissionId, status]);

  return { 
    status, 
    data, 
    error,
    isGrading: !!status && status !== 'EVALUATED' && status !== 'FAILED' 
  };
}
