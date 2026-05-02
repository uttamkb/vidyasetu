"use client";

import React, { useState } from "react";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

interface DrawingCanvasProps {
  onDrawEnd: (base64DataUrl: string) => void;
  initialDataUrl?: string;
}

export function DrawingCanvas({ onDrawEnd, initialDataUrl }: DrawingCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null);

  // When Tldraw mounts, we could theoretically load an image.
  // For simplicity and to match the previous behavior's intention, 
  // we leave the canvas blank for new drawings.

  const handleSave = async () => {
    if (!editor) return;

    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (shapeIds.length === 0) {
      onDrawEnd(""); 
      return;
    }

    try {
      const { blob } = await editor.toImage(shapeIds, {
        format: 'png',
        background: true,
        padding: 16,
      });

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        onDrawEnd(base64data);
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error("Failed to export drawing", e);
      alert("Failed to save drawing. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Use the grid and tools below to draw your answer.
        </p>
        <Button onClick={handleSave} size="sm" type="button" className="bg-primary hover:bg-primary/90">
          <Save className="h-4 w-4 mr-2" />
          Confirm Drawing
        </Button>
      </div>
      <div className="h-[500px] w-full border border-neutral-200/60 dark:border-neutral-800/60 rounded-2xl overflow-hidden relative shadow-sm">
        <Tldraw
          onMount={(editor) => setEditor(editor)}
          inferDarkMode={true}
          className="z-0"
        />
      </div>
    </div>
  );
}
