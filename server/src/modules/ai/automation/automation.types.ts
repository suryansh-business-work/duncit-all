import type { AutomationMessage, AutomationNode, AutomationStepStatus, IAutomationRun } from './automation.model';

/** What a step executor is handed. */
export interface StepContext {
  run: IAutomationRun;
  node: AutomationNode;
  /** The run's variables at this point — the executor returns a new object rather than mutating. */
  vars: Record<string, unknown>;
  /** Whether sends and webhooks act for real: every live run, and a test with delivery on. */
  live: boolean;
  /** A test run: pauses collapse instead of waiting. */
  test: boolean;
}

/** A pause the engine parks the run on. */
export type StepWait = { kind: 'REPLY'; until: Date } | { kind: 'DELAY'; until: Date };

/** What a step executor returns. */
export interface StepResult {
  /** The exit taken — an edge's `source_handle`. */
  handle: string;
  status: AutomationStepStatus;
  detail: string;
  /** The variables after this step, when it changed them. */
  vars?: Record<string, unknown>;
  /** A line for the transcript — what went out, or a note. */
  message?: Omit<AutomationMessage, 'id' | 'at'>;
  wait?: StepWait;
}
