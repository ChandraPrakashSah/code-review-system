// Shared types used across Dashboard and ReviewDashboard

export interface User {
  name: string;
  email: string;
}

export interface ReviewEntry {
  id: number;
  timestamp: string;
  username: string;
  email: string;
  branch: string;
  files: string;
  status: string;
  detailFile: string;
}

export interface ParsedIssue {
  section: 'critical' | 'improvement' | 'suggestion' | 'good';
  text: string;
  files: string[];
}

export interface DevStat {
  username: string;
  email: string;
  total: number;
  pushed: number;
  aborted: number;
  failed: number;
  notInstalled: number;
  lastActivity: string;
}

export type ChipColor = 'success' | 'warning' | 'danger' | 'default' | 'primary';
