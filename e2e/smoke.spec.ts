import { expect, test } from '@playwright/test';

const repository = 'octocat/hello-world';

async function mockGitHub(page: import('@playwright/test').Page) {
  await page.route('https://api.github.com/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const headers = {
      'content-type': 'application/json',
      'x-ratelimit-limit': '60',
      'x-ratelimit-remaining': '48',
      'x-ratelimit-reset': '1900000000',
    };
    if (path === `/repos/${repository}`) {
      await route.fulfill({ headers, json: {
        id: 42, name: 'hello-world', full_name: repository, html_url: `https://github.com/${repository}`,
        description: 'A test repository for DevPulse.', default_branch: 'main', stargazers_count: 1250,
        forks_count: 120, open_issues_count: 3, language: 'TypeScript', license: { spdx_id: 'MIT' },
        pushed_at: '2026-11-11T08:00:00Z', archived: false,
      } });
      return;
    }
    if (path === `/repos/${repository}/pulls`) {
      await route.fulfill({ headers, json: [
        { id: 101, number: 12, title: 'Add parser improvements', html_url: `https://github.com/${repository}/pull/12`, draft: false, state: 'open', created_at: '2026-11-10T08:00:00Z', updated_at: '2026-11-11T08:00:00Z', user: { login: 'octocat' }, labels: [{ name: 'enhancement', color: '8b9cff' }], base: { ref: 'main' } },
        { id: 102, number: 13, title: 'WIP: parser tests', html_url: `https://github.com/${repository}/pull/13`, draft: true, state: 'open', created_at: '2026-11-09T08:00:00Z', updated_at: '2026-11-11T07:00:00Z', user: { login: 'hubot' }, labels: [], base: { ref: 'main' } },
      ] });
      return;
    }
    if (path === `/repos/${repository}/issues`) {
      await route.fulfill({ headers, json: [
        { id: 201, number: 20, title: 'Parser crashes on empty input', html_url: `https://github.com/${repository}/issues/20`, state: 'open', created_at: '2026-11-10T08:00:00Z', updated_at: '2026-11-11T07:30:00Z', user: { login: 'octocat' }, labels: [{ name: 'bug', color: 'ff7185' }] },
        { id: 202, number: 13, title: 'WIP: parser tests', html_url: `https://github.com/${repository}/pull/13`, state: 'open', created_at: '2026-11-09T08:00:00Z', updated_at: '2026-11-11T07:00:00Z', user: { login: 'hubot' }, labels: [], pull_request: { url: 'https://api.github.com/repos/octocat/hello-world/pulls/13' } },
      ] });
      return;
    }
    if (path === `/repos/${repository}/actions/runs`) {
      await route.fulfill({ headers, json: { total_count: 2, workflow_runs: [
        { id: 301, name: 'CI', head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success', created_at: '2026-11-11T09:00:00Z', run_started_at: '2026-11-11T09:00:05Z', updated_at: '2026-11-11T09:01:35Z', html_url: `https://github.com/${repository}/actions/runs/301`, run_number: 15 },
        { id: 302, name: 'Preview', head_branch: 'feature/parser', event: 'pull_request', status: 'in_progress', conclusion: null, created_at: '2026-11-11T08:55:00Z', run_started_at: '2026-11-11T08:55:03Z', updated_at: '2026-11-11T08:56:00Z', html_url: `https://github.com/${repository}/actions/runs/302`, run_number: 16 },
      ] } });
      return;
    }
    if (path === `/repos/${repository}/releases`) {
      await route.fulfill({ headers, json: [
        { id: 401, tag_name: 'v2.0.0', name: 'Version 2.0', html_url: `https://github.com/${repository}/releases/tag/v2.0.0`, published_at: '2026-11-10T10:00:00Z', draft: false, prerelease: false },
        { id: 402, tag_name: 'v2.1.0-rc.1', name: 'Version 2.1 RC', html_url: `https://github.com/${repository}/releases/tag/v2.1.0-rc.1`, published_at: '2026-11-11T08:00:00Z', draft: false, prerelease: true },
      ] });
      return;
    }
    await route.fulfill({ status: 404, headers, json: { message: 'Not Found' } });
  });
}

test('dashboard presents the empty state and navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Good to see you')).toBeVisible();
  await expect(page.getByText('Your watchlist is waiting')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Repositories' })).toBeVisible();
});

test('adds a public repository and displays API-mapped sections', async ({ page }) => {
  await mockGitHub(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Add repository' }).first().click();
  await page.getByPlaceholder('owner/repository').fill(repository);
  await page.getByPlaceholder('Personal label (optional)').fill('Work');
  await page.getByRole('button', { name: 'Verify & add' }).click();

  await expect(page.getByText('A test repository for DevPulse.')).toBeVisible();
  await expect(page.getByText('1,250')).toBeVisible();

  await page.getByRole('button', { name: 'Pull requests' }).click();
  await expect(page.getByText('Add parser improvements')).toBeVisible();
  await expect(page.getByText('WIP: parser tests')).toBeVisible();

  await page.getByRole('button', { name: 'Issues' }).click();
  await expect(page.getByText('Parser crashes on empty input')).toBeVisible();
  await expect(page.getByText('WIP: parser tests')).toHaveCount(0);

  await page.getByRole('button', { name: 'Actions' }).click();
  await expect(page.getByText('CI')).toBeVisible();
  await expect(page.getByText('Preview')).toBeVisible();

  await page.getByRole('button', { name: 'Releases' }).click();
  await expect(page.getByText('Version 2.0')).toBeVisible();
  await expect(page.getByText('Version 2.1 RC')).toBeVisible();
});

test('settings and versioned backup export are available', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText('Auto refresh')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('devpulse-backup-');
});
