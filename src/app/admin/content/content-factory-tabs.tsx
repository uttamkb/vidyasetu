"use client";

import { useState } from "react";
import { IngestDocumentWizard } from "./ingest-document-wizard";
import { UploadContentForm } from "./upload-content-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, Sparkles, FileText, Settings, BookOpen } from "lucide-react";

export function ContentFactoryTabs() {
  const [activeTab, setActiveTab] = useState<"ingest" | "manual">("ingest");

  return (
    <div className="space-y-6">
      {/* Tabs Controller */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("ingest")}
          className={`pb-3 font-semibold text-sm transition-all relative flex items-center gap-2 focus:outline-none ${
            activeTab === "ingest" 
              ? "text-blue-600 font-bold" 
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sparkles className={`h-4 w-4 ${activeTab === "ingest" ? "text-blue-600 animate-pulse" : "text-slate-400"}`} />
          AI Ingestion Pipeline
          {activeTab === "ingest" && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-600 rounded-t" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("manual")}
          className={`pb-3 font-semibold text-sm transition-all relative flex items-center gap-2 focus:outline-none ${
            activeTab === "manual" 
              ? "text-blue-600 font-bold" 
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Upload className={`h-4 w-4 ${activeTab === "manual" ? "text-blue-600" : "text-slate-400"}`} />
          Manual Curriculum Seeding
          {activeTab === "manual" && (
            <span className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-600 rounded-t" />
          )}
        </button>
      </div>

      {/* Tab Panel Render */}
      <div>
        {activeTab === "ingest" ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-1 max-w-2xl mx-auto text-center py-2">
              <h2 className="text-xl font-bold font-heading text-slate-800">
                Cognitive Document Ingestor
              </h2>
              <p className="text-xs text-muted-foreground">
                Drag and drop unit tests, homework worksheets, or midterm papers collected from schools to dynamically extract, align, and populate custom master question banks.
              </p>
            </div>
            <IngestDocumentWizard />
          </div>
        ) : (
          <Card className="border-slate-200 shadow-sm max-w-2xl mx-auto">
            <CardHeader className="bg-slate-50/50 border-b">
              <CardTitle className="text-lg font-heading font-bold text-slate-800 flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-600" />
                Curriculum Seeding Tool
              </CardTitle>
              <CardDescription>
                Manually register YouTube lectures, custom notes, or seed question banks by topic.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <UploadContentForm />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
