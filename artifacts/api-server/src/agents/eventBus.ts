import { EventEmitter } from "events";
import type { EvaluationEvent } from "./orchestrator.js";

const emitters = new Map<string, EventEmitter>();
const history = new Map<string, EvaluationEvent[]>();

export function getOrCreateEmitter(evaluationId: string): EventEmitter {
  if (!emitters.has(evaluationId)) {
    emitters.set(evaluationId, new EventEmitter());
    history.set(evaluationId, []);
  }
  return emitters.get(evaluationId)!;
}

export function emitEvent(evaluationId: string, event: EvaluationEvent): void {
  const emitter = getOrCreateEmitter(evaluationId);
  history.get(evaluationId)!.push(event);
  emitter.emit("event", event);
  if (event.type === "done" || event.type === "error") {
    setTimeout(() => {
      emitters.delete(evaluationId);
      history.delete(evaluationId);
    }, 60_000);
  }
}

export function getHistory(evaluationId: string): EvaluationEvent[] {
  return history.get(evaluationId) ?? [];
}

export function subscribeToEvaluation(
  evaluationId: string,
  onEvent: (event: EvaluationEvent) => void
): () => void {
  const past = getHistory(evaluationId);
  for (const event of past) {
    onEvent(event);
  }

  const emitter = getOrCreateEmitter(evaluationId);
  emitter.on("event", onEvent);

  return () => emitter.off("event", onEvent);
}
