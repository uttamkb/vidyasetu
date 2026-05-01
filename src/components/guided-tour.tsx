"use client";

import { useEffect, useState } from "react";
import { Step, STATUS } from "react-joyride";
import * as ReactJoyride from "react-joyride";
import { useSearchParams, useRouter } from "next/navigation";

// Extract the component securely regardless of CJS/ESM interop issues
const JoyrideComponent = ReactJoyride.default || ReactJoyride;

export function GuidedTour() {
  const [run, setRun] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Only run the tour if the URL has ?onboarded=true
    const onboarded = searchParams.get("onboarded") === "true";
    if (onboarded) {
      // Use requestAnimationFrame to avoid synchronous setState in effect
      const frame = requestAnimationFrame(() => setRun(true));
      return () => cancelAnimationFrame(frame);
    }
  }, [searchParams]);

  const steps: Step[] = [
    {
      target: "body",
      content: "Welcome to your personalized VidyaSetu dashboard! Let's take a quick tour.",
      placement: "center",
    },
    {
      target: "#tour-weekly-overview",
      content: "Here you can track your assignments, submissions, and your daily study streak.",
      placement: "bottom",
    },
    {
      target: "#tour-quick-stats",
      content: "Your average score and completion rates are updated in real-time as you practice.",
      placement: "bottom",
    },
    {
      target: "#tour-subject-progress",
      content: "Notice how the subjects you find hardest are pinned to the top. Focus on these to improve fast!",
      placement: "top",
    },
    {
      target: "#tour-recent-activity",
      content: "Your recent assignment results will appear here. Ready to start your first diagnostic test?",
      placement: "top",
    }
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      // Remove the onboarded query param so it doesn't run again
      router.replace("/dashboard");
    }
  };

  if (!run) return null;

  return (
    <JoyrideComponent
      steps={steps}
      run={run}
      continuous={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "#3b82f6", // tailwind blue-500
          zIndex: 1000,
        },
      }}
    />
  );
}
