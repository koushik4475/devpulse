# Security Policy

Please report suspected vulnerabilities privately through GitHub's security advisory feature when available. Do not publish exploit details before a fix is available.

DevPulse does not request GitHub tokens or authenticate to GitHub. Never add secrets to frontend code, Vite environment variables, local storage, IndexedDB, source maps, or commits. Treat GitHub API responses and imported JSON as untrusted input. Validate imports and keep dependencies updated.
