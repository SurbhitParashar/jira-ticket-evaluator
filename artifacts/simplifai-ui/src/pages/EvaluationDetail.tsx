import { useRoute } from "wouter"
import { motion } from "framer-motion"
import { 
  GitPullRequest, 
  Ticket, 
  ArrowLeft,
  FileCode2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  AlertTriangle
} from "lucide-react"

import { useGetEvaluation } from "@workspace/api-client-react"
import { useEvaluationStream } from "@/hooks/use-sse"
import { TerminalOutput } from "@/components/TerminalOutput"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn, formatVerdictColor } from "@/lib/utils"

export default function EvaluationDetail() {
  const [, params] = useRoute("/evaluations/:id");
  const id = params?.id;

  const { data: evaluation, isLoading, error } = useGetEvaluation(id!, {
    query: {
      enabled: !!id,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return (status === 'pending' || status === 'running') ? 2000 : false;
      }
    }
  });

  const isRunning = evaluation?.status === 'pending' || evaluation?.status === 'running';
  const { messages, isDone } = useEvaluationStream(id, isRunning);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold">Failed to load evaluation</h2>
        <Button variant="link" onClick={() => window.history.back()}>Go back</Button>
      </div>
    );
  }

  const getVerdictIcon = (verdict?: string) => {
    switch(verdict) {
      case 'pass': return <CheckCircle2 className="w-5 h-5 mr-2" />;
      case 'partial': return <AlertCircle className="w-5 h-5 mr-2" />;
      case 'fail': return <XCircle className="w-5 h-5 mr-2" />;
      case 'running': return <Loader2 className="w-5 h-5 mr-2 animate-spin" />;
      default: return <Clock className="w-5 h-5 mr-2" />;
    }
  };

  return (
    <div className="min-h-screen pb-20 relative">
      {/* Decorative top gradient */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 relative z-10">
        
        <Button 
          variant="ghost" 
          onClick={() => window.location.href = '/'}
          className="mb-8 pl-0 hover:bg-transparent hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="font-mono text-sm bg-white/5">
                <Ticket className="w-3 h-3 mr-2" />
                {evaluation.jiraTicketKey || 'JIRA-XXX'}
              </Badge>
              <Badge variant="outline" className="text-sm bg-white/5 text-muted-foreground border-dashed">
                <GitPullRequest className="w-3 h-3 mr-2" />
                PR Analysis
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
              {evaluation.jiraTicketSummary || 'Evaluating Requirements...'}
            </h1>
            <a 
              href={evaluation.githubPrUrl} 
              target="_blank" 
              rel="noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors flex items-center font-mono text-sm"
            >
              <GitPullRequest className="w-4 h-4 mr-2" />
              {evaluation.prTitle || evaluation.githubPrUrl}
            </a>
          </div>

          <div className={cn(
            "flex items-center px-6 py-4 rounded-xl border shadow-lg backdrop-blur-md whitespace-nowrap",
            formatVerdictColor(evaluation.overallVerdict)
          )}>
            {getVerdictIcon(evaluation.overallVerdict)}
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest opacity-80 font-bold">Overall Verdict</span>
              <span className="text-xl font-bold capitalize">{evaluation.overallVerdict}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Requirements */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-semibold font-display flex items-center border-b border-border pb-4">
              Requirement Breakdown
              <Badge className="ml-3 bg-secondary text-secondary-foreground">
                {evaluation.requirementResults?.length || 0}
              </Badge>
            </h3>

            {isRunning && evaluation.requirementResults?.length === 0 && (
              <Card className="border-dashed bg-transparent shadow-none">
                <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary/50" />
                  <p>Agents are analyzing the PR and extracting requirements...</p>
                </CardContent>
              </Card>
            )}

            {evaluation.requirementResults?.map((req, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={req.id}
              >
                <Card className="overflow-hidden border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                  <CardHeader className="pb-3 border-b border-white/5 bg-black/20">
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle className="text-lg leading-tight font-medium">
                        {req.requirement}
                      </CardTitle>
                      <Badge className={cn("shrink-0 uppercase text-[10px] tracking-wider font-bold", formatVerdictColor(req.verdict))}>
                        {req.verdict}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Agent Reasoning</h4>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {req.reasoning}
                      </p>
                    </div>

                    {req.evidence && req.evidence.length > 0 && (
                      <div>
                        <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center">
                          <FileCode2 className="w-3 h-3 mr-1.5" /> Code Evidence
                        </h4>
                        <div className="space-y-2">
                          {req.evidence.map((ev, i) => (
                            <div key={i} className="bg-black/50 p-3 rounded-md border border-white/10 font-mono text-xs text-blue-300 overflow-x-auto whitespace-pre-wrap">
                              {ev}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs mb-1.5 text-muted-foreground font-medium">
                        <span>Confidence Score</span>
                        <span>{Math.round(req.confidenceScore * 100)}%</span>
                      </div>
                      <Progress 
                        value={req.confidenceScore * 100} 
                        className="h-1.5 bg-black/40" 
                        indicatorClassName={req.confidenceScore > 0.8 ? "bg-success" : req.confidenceScore > 0.5 ? "bg-warning" : "bg-destructive"}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Right Column: Live Logs */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <TerminalOutput 
                messages={messages} 
                isDone={!isRunning || isDone} 
                className="h-[600px]"
              />
              
              {evaluation.errorMessage && (
                <Card className="mt-4 border-destructive/50 bg-destructive/10">
                  <CardContent className="p-4 flex gap-3 text-destructive">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <div className="text-sm">
                      <strong>Evaluation Failed</strong>
                      <p className="mt-1 opacity-80">{evaluation.errorMessage}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
