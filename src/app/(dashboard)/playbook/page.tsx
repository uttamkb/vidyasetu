import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BookOpen, 
  Target, 
  Sparkles, 
  Clock, 
  Trophy, 
  Scan, 
  FileText, 
  ChevronRight,
  Brain
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PlaybookPage() {
  const steps = [
    {
      title: "1. Smart Diagnosis",
      description: "When you first join, we take a 15-minute diagnostic test to find your strengths and weaknesses across all subjects.",
      icon: Target,
      color: "text-rose-500",
      bg: "bg-rose-50"
    },
    {
      title: "2. Daily Cognitive Loop",
      description: "Every day, you get a personalized 12-minute review queue designed to keep your memory sharp using spaced repetition.",
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    {
      title: "3. Socratic AI Tutoring",
      description: "Get stuck? Use our AI Tutor. It doesn't just give answers—it gives hints and scaffolds your thinking like a real coach.",
      icon: Brain,
      color: "text-purple-500",
      bg: "bg-purple-50"
    },
    {
      title: "4. Digital & Offline Harmony",
      description: "Practice online or print worksheets. Scan your handwritten work with our AI scanner for instant evaluation and feedback.",
      icon: Scan,
      color: "text-emerald-500",
      bg: "bg-emerald-50"
    }
  ];

  const features = [
    {
      name: "Mastery Map",
      description: "A real-time grid of 750+ subtopics. See exactly what you've mastered (green) and what needs work (red).",
      icon: FileText
    },
    {
      name: "Leaderboard",
      description: "Compete with students in your School, District, or State. Opt-in anytime to see where you stand.",
      icon: Trophy
    },
    {
      name: "Smart Notes",
      description: "AI-curated study material, video explainers, and key concepts for every topic in your curriculum.",
      icon: Sparkles
    }
  ];

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-20">
      <div className="text-center space-y-4">
        <Badge variant="outline" className="px-4 py-1 text-primary font-bold border-primary/20 bg-primary/5">
          Student Playbook
        </Badge>
        <h1 className="text-5xl font-heading font-black tracking-tight text-slate-900">
          How to Win with <span className="text-primary">VidyaSetu</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your journey from learning to mastery, simplified into four powerful steps.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {steps.map((step, i) => (
          <Card key={i} className="border-none shadow-premium hover:shadow-2xl transition-all duration-500 group">
            <CardHeader>
              <div className={`w-12 h-12 ${step.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500`}>
                <step.icon className={`h-6 w-6 ${step.color}`} />
              </div>
              <CardTitle className="text-2xl font-heading font-bold">{step.title}</CardTitle>
              <CardDescription className="text-base leading-relaxed pt-2">
                {step.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-heading font-black">Key Modules</h2>
          <div className="h-px bg-slate-200 flex-1" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature, i) => (
            <Card key={i} className="bg-slate-50/50 border-slate-100 shadow-sm">
              <CardHeader className="p-6">
                <feature.icon className="h-5 w-5 text-primary mb-3" />
                <CardTitle className="text-lg font-bold">{feature.name}</CardTitle>
                <CardDescription className="text-sm pt-1">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <Card className="bg-primary text-primary-foreground border-none shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32 blur-3xl" />
        <CardContent className="p-10 text-center space-y-6 relative z-10">
          <h2 className="text-3xl font-heading font-black">Ready to Start?</h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto">
            The best way to learn is by doing. Head over to your dashboard and start your first practice session today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <a href="/dashboard" className="bg-white text-primary px-8 py-3 rounded-full font-bold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
              Go to Dashboard <ChevronRight className="h-4 w-4" />
            </a>
            <a href="/assignments" className="bg-primary-foreground/10 text-white border border-white/20 px-8 py-3 rounded-full font-bold hover:bg-primary-foreground/20 transition-colors flex items-center justify-center">
              View Assignments
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
