import { Inngest } from "inngest";
import { inngestConfig } from "./config";

/**
 * Initialize the Inngest client
 * Uses the validated, production-safe configuration from ./config.ts
 */
export const inngest = new Inngest({ 
  id: "vidyasetu",
  eventKey: inngestConfig.eventKey,
  signingKey: inngestConfig.signingKey,
  isDev: inngestConfig.isDev
});
