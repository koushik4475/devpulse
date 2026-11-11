import { describe, expect, it } from 'vitest';
import { excludePullRequests, workflowDisplayState, workflowDuration } from './github-data';
import type { Issue, WorkflowRun } from '../types';

const baseRun: WorkflowRun = {
  id: 1,
  name: 'CI',
  head_branch: 'main',
  event: 'push',
  status: 'completed',
  conclusion: 'success',
  created_at: '2026-11-11T10:00:00.000Z',
  run_started_at: '2026-11-11T10:00:03.000Z',
  updated_at: '2026-11-11T10:01:33.000Z',
  html_url: 'https://github.com/octocat/hello-world/actions/runs/1',
  run_number: 1,
};

describe('GitHub payload mapping helpers', () => {
  it('excludes pull requests from issue endpoints', () => {
    const items = [
      { id: 1, number: 1, pull_request: undefined },
      { id: 2, number: 2, pull_request: { url: 'https://api.github.com/pulls/2' } },
    ] as Issue[];
    expect(excludePullRequests(items).map((item) => item.number)).toEqual([1]);
  });

  it('uses workflow status and conclusion without inventing a result', () => {
    expect(workflowDisplayState({ status: 'completed', conclusion: 'success' })).toBe('success');
    expect(workflowDisplayState({ status: 'completed', conclusion: 'failure' })).toBe('failure');
    expect(workflowDisplayState({ status: 'completed', conclusion: 'cancelled' })).toBe('cancelled');
    expect(workflowDisplayState({ status: 'in_progress', conclusion: null })).toBe('running');
    expect(workflowDisplayState({ status: 'queued', conclusion: null })).toBe('queued');
    expect(workflowDisplayState({ status: 'completed', conclusion: null })).toBe('unknown');
  });

  it('calculates workflow run duration from actual start and finish times', () => {
    expect(workflowDuration(baseRun)).toBe(90_000);
    expect(workflowDuration({ ...baseRun, status: 'in_progress', updated_at: '2026-11-11T10:00:00.000Z' })).toBeGreaterThanOrEqual(0);
    expect(workflowDuration({ ...baseRun, run_started_at: 'invalid' })).toBeNull();
  });
});
