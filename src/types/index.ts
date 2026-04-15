// Shared types used across Dashboard and ReviewDashboard

export interface User {
  name: string;
  email: string;
}

/** Shape of a user record as it is persisted in localStorage. */
export interface StoredUser extends User {
  password: string; // "<saltHex>:<pbkdf2HashHex>" produced by hashPassword()
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

export interface ActivityLogProps {
  filtered: ReviewEntry[];
  total: number;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  allStatuses: string[];
  expandedRow: number | null;
  toggleRow: (id: number) => void;
}
