import { cn } from "@/lib/utils";

interface VidyaSetuLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function VidyaSetuLogo({ className, ...props }: VidyaSetuLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={cn("w-8 h-8", className)}
      fill="none"
      {...props}
    >
      <defs>
        <linearGradient id="ai-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" /> {/* Indigo 400 */}
          <stop offset="100%" stopColor="#c084fc" /> {/* Purple 400 */}
        </linearGradient>
      </defs>
      
      {/* The Bridge (Setu) - Sleek geometric arch */}
      <path
        d="M 15 85 Q 50 25 85 85"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        className="text-primary dark:text-primary-foreground opacity-90"
      />
      <path
        d="M 32 85 L 32 60 M 68 85 L 68 60"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        className="text-primary dark:text-primary-foreground opacity-50"
      />

      {/* The Spark of Knowledge (Vidya/AI) */}
      <circle cx="50" cy="35" r="12" fill="url(#ai-gradient)" className="animate-pulse" />
      
      {/* Sparkles / Connectivity - Orbits around the core */}
      <circle 
        cx="50" 
        cy="35" 
        r="18" 
        stroke="url(#ai-gradient)" 
        strokeWidth="2" 
        strokeDasharray="4 6" 
        className="origin-[50px_35px] animate-[spin_8s_linear_infinite]" 
      />
    </svg>
  );
}
