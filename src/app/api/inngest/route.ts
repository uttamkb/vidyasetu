import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { inngestConfig } from "@/inngest/config";
import { monthlySeeder, seedCurriculumStructure, seedTopicContent } from "@/inngest/functions";
import { evaluateSubmissionJob } from "@/inngest/evaluation";
import { generateAssignmentJob } from "@/inngest/generation";

// Create an API that serves zero-downtime background jobs
export const { GET, POST, PUT } = serve({
  client: inngest,
  signingKey: inngestConfig.signingKey,
  functions: [
    monthlySeeder,
    seedCurriculumStructure,
    seedTopicContent,
    evaluateSubmissionJob,
    generateAssignmentJob,
  ],
});
