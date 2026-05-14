import { prisma } from "@/lib/db";
import { LogLevel, LogCategory } from "@prisma/client";

/**
 * System Logger for VidyaSetu
 * 
 * Provides human-readable logging that is stored in the database for UI visibility
 * while also outputting to the standard console for infrastructure monitoring.
 */
class Logger {
  /**
   * Core logging method - handles both console and database ingestion
   */
  private async log(params: {
    level: LogLevel;
    category: LogCategory;
    message: string;
    metadata?: any;
    userId?: string;
  }) {
    const { level, category, message, metadata, userId } = params;
    const timestamp = new Date().toISOString();

    // 1. Console Output (Infrastructure Logs)
    const consoleMethod = level === "ERROR" ? "error" : level === "WARN" ? "warn" : "log";
    console[consoleMethod](`[${timestamp}] [${category}] [${level}] ${message}`, metadata || "");

    // 2. Database Ingestion (UI Observability)
    // We do NOT await this in the main methods to prevent blocking the request
    try {
      await prisma.systemLog.create({
        data: {
          level,
          category,
          message,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
          userId,
        },
      });
    } catch (dbError) {
      // Fail silently for DB logging issues to avoid impacting the application flow
      console.error("[logger] Failed to write to SystemLog table:", dbError);
    }
  }

  info(message: string, context: { category: LogCategory; metadata?: any; userId?: string }) {
    this.log({ level: "INFO", ...context, message });
  }

  warn(message: string, context: { category: LogCategory; metadata?: any; userId?: string }) {
    this.log({ level: "WARN", ...context, message });
  }

  error(message: string, context: { category: LogCategory; metadata?: any; userId?: string }) {
    this.log({ level: "ERROR", ...context, message });
  }

  success(message: string, context: { category: LogCategory; metadata?: any; userId?: string }) {
    this.log({ level: "SUCCESS", ...context, message });
  }
}

export const logger = new Logger();
