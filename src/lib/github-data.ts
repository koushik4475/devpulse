import type { Issue, WorkflowRun } from '../types';

export function excludePullRequests<T extends Issue>(issues: T[]): T[] {
  return issues.filter((issue) => !issue.pull_request);
}

export type WorkflowDisplayState = 'success' | 'failure' | 'cancelled' | 'running' | 'queued' | 'unknown';

export function workflowDisplayState(run: Pick<WorkflowRun, 'status' | 'conclusion'>): WorkflowDisplayState {
  if (run.status === 'queued' || run.status === 'requested' || run.status === 'waiting' || run.status === 'pending') return 'queued';
  if (run.status !== 'completed') return run.status === 'in_progress' ? 'running' : 'unknown';
  switch (run.conclusion) {
    case 'success': return 'success';
    case 'failure': return 'failure';
    case 'cancelled':
    case 'timed_out':
    case 'action_required': return 'cancelled';
    default: return 'unknown';
  }
}

export function workflowDuration(run: Pick<WorkflowRun, 'created_at' | 'run_started_at' | 'updated_at' | 'status'>): number | null {
  const start = Date.parse(run.run_started_at || run.created_at);
  const end = run.status === 'completed' ? Date.parse(run.updated_at) : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return end - start;
}
