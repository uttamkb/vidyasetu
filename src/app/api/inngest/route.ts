import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { inngestConfig } from "@/inngest/config";
import {
  monthlySeeder,
  seedCurriculumStructure,
  seedTopicContent,
  cleanStaleGeneratingAssignments,
  autoPromoteAIQuestionsJob,
  retryFailedEvaluationsJob,
  archiveOldAIValidationsJob,
} from "@/inngest/functions";
import { evaluateSubmissionJob } from "@/inngest/evaluation";
import { generateAssignmentJob } from "@/inngest/generation";
import { processAIFeedback } from "@/inngest/self-learning";
import { curationEngine } from "@/inngest/functions";
import { processTranscriptionJob } from "@/inngest/transcription";

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
    processAIFeedback,
    curationEngine,
    cleanStaleGeneratingAssignments,
    processTranscriptionJob,
    autoPromoteAIQuestionsJob,
    retryFailedEvaluationsJob,
    archiveOldAIValidationsJob,
  ],
});
