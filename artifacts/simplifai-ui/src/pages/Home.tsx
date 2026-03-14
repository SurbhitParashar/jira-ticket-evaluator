import { useState } from "react"
import { useLocation } from "wouter"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { 
  GitPullRequest, 
  Ticket, 
  ArrowRight, 
  KeyRound, 
  Mail, 
  Cpu,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2
} from "lucide-react"

import { useCreateEvaluation, useListEvaluations } from "@workspace/api-client-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatVerdictColor } from "@/lib/utils"

const formSchema = z.object({
  jiraTicketUrl: z.string().url({ message: "Must be a valid URL" }),
  githubPrUrl: z.string().url({ message: "Must be a valid URL" }),
  jiraEmail: z.string().email({ message: "Must be a valid email" }),
  jiraApiToken: z.string().min(1, { message: "Jira API Token is required" }),
  githubToken: z.string().min(1, { message: "GitHub Token is required" }),
})

type FormValues = z.infer<typeof formSchema>;

export default function Home() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { mutateAsync: createEval } = useCreateEvaluation();
  const { data: evaluations, isLoading: isLoadingEvals } = useListEvaluations();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jiraTicketUrl: "",
      githubPrUrl: "",
      jiraEmail: "",
      jiraApiToken: "",
      githubToken: "",
    }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      const result = await createEval({ data });
      setLocation(`/evaluations/${result.id}`);
    } catch (error) {
      console.error("Failed to create evaluation", error);
      // Let standard error boundary/toast handle it usually, but keeping simple here
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVerdictIcon = (verdict?: string) => {
    switch(verdict) {
      case 'pass': return <CheckCircle2 className="w-4 h-4" />;
      case 'partial': return <AlertCircle className="w-4 h-4" />;
      case 'fail': return <XCircle className="w-4 h-4" />;
      case 'running': return <Loader2 className="w-4 h-4 animate-spin" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative min-h-screen pb-20">
      {/* Background Hero Mesh */}
      <div className="absolute inset-0 z-0 h-[60vh] opacity-40 pointer-events-none select-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background z-10" />
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-mesh.png`} 
          alt="" 
          className="w-full h-full object-cover mix-blend-screen"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="outline" className="mb-4 bg-white/5 backdrop-blur-md border-white/10 text-primary-foreground py-1 px-4 text-sm">
              <Cpu className="w-4 h-4 mr-2 text-primary" /> Multi-Agent AI Evaluator
            </Badge>
            <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight mb-6 leading-tight">
              Automate Pull Request <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Compliance Verification
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Ensure every line of code traces back to a requirement. Input your Jira ticket and PR, and our multi-agent system will evaluate implementation completeness instantly.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Form */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-7"
          >
            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="text-2xl">New Evaluation</CardTitle>
                <CardDescription>Provide credentials and URLs to start the agent orchestration.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Target URLs</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="relative">
                          <Ticket className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="https://org.atlassian.net/browse/PROJ-123" 
                            className="pl-9"
                            {...form.register("jiraTicketUrl")} 
                          />
                        </div>
                        {form.formState.errors.jiraTicketUrl && <p className="text-xs text-destructive mt-1">{form.formState.errors.jiraTicketUrl.message}</p>}
                      </div>
                      
                      <div>
                        <div className="relative">
                          <GitPullRequest className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="https://github.com/org/repo/pull/42" 
                            className="pl-9"
                            {...form.register("githubPrUrl")} 
                          />
                        </div>
                        {form.formState.errors.githubPrUrl && <p className="text-xs text-destructive mt-1">{form.formState.errors.githubPrUrl.message}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Credentials</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Jira Email" 
                            className="pl-9"
                            {...form.register("jiraEmail")} 
                          />
                        </div>
                        {form.formState.errors.jiraEmail && <p className="text-xs text-destructive mt-1">{form.formState.errors.jiraEmail.message}</p>}
                      </div>
                      
                      <div>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="password"
                            placeholder="Jira API Token" 
                            className="pl-9"
                            {...form.register("jiraApiToken")} 
                          />
                        </div>
                        {form.formState.errors.jiraApiToken && <p className="text-xs text-destructive mt-1">{form.formState.errors.jiraApiToken.message}</p>}
                      </div>
                    </div>
                    
                    <div>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="password"
                          placeholder="GitHub Personal Access Token" 
                          className="pl-9"
                          {...form.register("githubToken")} 
                        />
                      </div>
                      {form.formState.errors.githubToken && <p className="text-xs text-destructive mt-1">{form.formState.errors.githubToken.message}</p>}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-semibold mt-4" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Initializing Agents...
                      </>
                    ) : (
                      <>
                        Run Evaluation <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Evaluations */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-5 space-y-4"
          >
            <h3 className="text-xl font-display font-semibold flex items-center">
              <Clock className="w-5 h-5 mr-2 text-primary" /> Recent Evaluations
            </h3>
            
            <div className="space-y-3">
              {isLoadingEvals ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse bg-white/5 border-white/5">
                    <CardContent className="p-4 h-24" />
                  </Card>
                ))
              ) : evaluations?.length === 0 ? (
                <Card className="bg-white/5 border-dashed border-white/10 text-center py-12">
                  <CardContent className="flex flex-col items-center justify-center text-muted-foreground">
                    <Cpu className="w-12 h-12 mb-4 opacity-20" />
                    <p>No evaluations yet.</p>
                  </CardContent>
                </Card>
              ) : (
                evaluations?.slice(0, 5).map((ev) => (
                  <Card 
                    key={ev.id} 
                    className="group cursor-pointer hover:bg-white/5 transition-colors border-white/5 bg-background/40 backdrop-blur-sm"
                    onClick={() => setLocation(`/evaluations/${ev.id}`)}
                  >
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className={cn("p-2 rounded-full mt-1", formatVerdictColor(ev.overallVerdict))}>
                        {getVerdictIcon(ev.overallVerdict)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm text-primary group-hover:underline">
                            {ev.jiraTicketKey || 'JIRA-XXX'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(ev.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium truncate mb-1" title={ev.prTitle || ev.githubPrUrl}>
                          {ev.prTitle || "Unknown PR Title"}
                        </h4>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Ticket className="w-3 h-3" /> Ticket
                          </span>
                          <span className="flex items-center gap-1">
                            <GitPullRequest className="w-3 h-3" /> PR
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
