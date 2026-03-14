import { useState, useEffect, useRef } from "react";
import { getStreamEvaluationUrl } from "@workspace/api-client-react";

export interface StreamEvent {
  type: "step" | "done" | "error";
  message?: string;
  evaluationId?: string;
  error?: string;
}

export function useEvaluationStream(evaluationId?: string, isRunning?: boolean) {
  const [messages, setMessages] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!evaluationId || !isRunning) {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      return;
    }

    // Only connect if not already connected
    if (!esRef.current) {
      const url = getStreamEvaluationUrl(evaluationId);
      const es = new EventSource(url);
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as StreamEvent;
          
          if (data.type === "step" && data.message) {
            setMessages((prev) => [...prev, data.message!]);
          } else if (data.type === "done") {
            setIsDone(true);
            es.close();
            esRef.current = null;
          } else if (data.type === "error") {
            setMessages((prev) => [...prev, `[ERROR] ${data.message ?? data.error}`]);
            es.close();
            esRef.current = null;
          }
        } catch (e) {
          console.error("Failed to parse SSE message", e);
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
      };
    }

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [evaluationId, isRunning]);

  return { messages, isDone };
}
