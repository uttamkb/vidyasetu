"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, X, Send, Loader2, BrainCircuit } from "lucide-react";
import { MathRenderer } from "@/components/math-renderer";

interface AITutorDialogProps {
  questionId: string;
  questionText: string;
}

export function AITutorDialog({ questionId, questionText }: AITutorDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || loading) return;

    const userMsg = message;
    setMessage("");
    setLoading(true);
    
    // Optimistic update
    setHistory(prev => [...prev, { role: "user", parts: [{ text: userMsg }] }]);

    try {
      const res = await fetch("/api/assignments/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, message: userMsg, history }),
      });

      const data = await res.json();
      if (data.text) {
        setHistory(prev => [...prev, { role: "model", parts: [{ text: data.text }] }]);
      } else if (data.error) {
        setHistory(prev => [...prev, { role: "model", parts: [{ text: `⚠️ ${data.error}` }] }]);
      }
    } catch (err) {
      setHistory(prev => [...prev, { role: "model", parts: [{ text: "⚠️ Failed to connect to AI Tutor." }] }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 shadow-sm font-bold h-8">
          <BrainCircuit className="h-4 w-4" />
          AI Tutor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] h-[550px] flex flex-col p-0 overflow-hidden border-amber-200">
        <DialogHeader className="p-4 bg-amber-500 text-white border-b border-amber-600">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <DialogTitle className="text-white font-black uppercase tracking-tight">Socratic AI Tutor</DialogTitle>
          </div>
          <p className="text-[10px] font-bold text-amber-100 uppercase tracking-widest mt-1">
            Guiding you to the solution, step-by-step
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <div className="bg-white border border-amber-100 p-4 rounded-2xl rounded-tl-none shadow-sm text-sm leading-relaxed text-slate-700">
                <p className="font-bold text-amber-600 mb-1 flex items-center gap-1.5">
                  <BrainCircuit className="h-3.5 w-3.5" />
                  Hi! I'm your Socratic Tutor.
                </p>
                I won't give you the answer directly, but I can help you logic it out. What part of this question is tricky for you?
              </div>

              {history.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-medium shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-amber-500 text-white rounded-tr-none' 
                      : 'bg-white border border-amber-100 text-slate-700 rounded-tl-none'
                  }`}>
                    <MathRenderer content={msg.parts[0].text} />
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-amber-100 rounded-2xl rounded-tl-none p-3 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex gap-2">
              <Input 
                placeholder="Ask for a hint or explain your logic..." 
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                className="h-10 text-sm border-2 focus-visible:ring-amber-500"
              />
              <Button size="icon" className="h-10 w-10 shrink-0 bg-amber-500 hover:bg-amber-600" onClick={handleSend} disabled={loading || !message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[9px] text-center text-muted-foreground mt-3 font-bold uppercase tracking-widest">
              Socratic Mode Active • No Direct Answers Provided
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
