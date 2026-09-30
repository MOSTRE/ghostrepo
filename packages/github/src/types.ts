export interface RepoRef {
  owner: string;
  repo: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export class GitHubApiError extends Error {
  status: number;
  rateLimited: boolean;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
    this.rateLimited = status === 403 || status === 429;
  }
}

export interface RepoMetadata {
  fullName: string;
  owner: string;
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  archived: boolean;
  disabled: boolean;
  private: boolean;
  license: string | null;
  topics: string[];
  language: string | null;
  homepage: string | null;
}

export interface CommitInfo {
  sha: string;
  date: string;
  author: string;
}

export interface IssuePrCounts {
  openIssues: number;
  openPrs: number;
  recentIssues: number;
  recentPrs: number;
  unavailable: boolean;
  reason?: string;
}

export interface FilePresence {
  path: string;
  exists: boolean;
}
