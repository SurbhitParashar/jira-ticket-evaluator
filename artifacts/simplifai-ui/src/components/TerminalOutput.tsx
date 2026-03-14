import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Terminal, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TerminalOutputProps {
  messages: string[];
  isDone: boolean;
  className?: string;
}

export function TerminalOutput({ messages, isDone, className }: TerminalOutputProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className={cn("rounded-xl border border-border bg-black/80 overflow-hidden shadow-2xl flex flex-col font-mono text-sm", className)}>
      <div className="flex items-center px-4 py-2 border-b border-white/10 bg-white/5 backdrop-blur gap-2 text-muted-foreground">
        <Terminal className="w-4 h-4" />
        <span className="text-xs uppercase tracking-wider font-semibold">Agent Execution Log</span>
        {!isDone && <Loader2 className="w-3 h-3 ml-auto animate-spin text-primary" />}
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-1 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="text-muted-foreground/50 italic flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" /> Waiting for agent logs...
          </div>
        ) : (
          messages.map((msg, i) => (
            <motion.div
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              key={i}
              className="text-gray-300 break-words leading-relaxed"
            >
              <span className="text-primary/50 mr-2">›</span>
              {msg.includes("[ERROR]") ? (
                <span className="text-destructive font-medium">{msg}</span>
              ) : (
                msg
              )}
            </motion.div>
          ))
        )}
        
        {isDone && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-4 text-success font-semibold flex items-center gap-2"
          >
            <span className="text-success mr-1">✔</span> Evaluation complete.
          </motion.div>
        )}
      </div>
    </div>
  )
}
