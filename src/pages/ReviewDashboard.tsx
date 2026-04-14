import React, { useMemo, useState } from 'react';
import {
  Card, CardBody, Button, Chip,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
} from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import reviewCsv from '../../review-logs/reviews.csv?raw';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewEntry {
  id: number;
  timestamp: string;
  username: string;
  email: string;
  branch: string;
  files: string;
  status: string;
}

interface DevStat {
  username: string;
  email: string;
  total: number;
  pushed: number;
  aborted: number;
  failed: number;
  notInstalled: number;
  lastActivity: string;
}

type ChipColor = 'success' | 'warning' | 'danger' | 'default' | 'primary';

const STATUS_CONFIG: Record<string, { color: ChipColor; label: string }> = {
  PUSHED:               { color: 'success',  label: 'Pushed' },
  REVIEWED:             { color: 'success',  label: 'Reviewed' },
  COMMITTED:            { color: 'success',  label: 'Committed' },
  AUTO_FIXED:           { color: 'primary',  label: 'Auto Fixed' },
  PUSH_ABORTED:         { color: 'warning',  label: 'Aborted' },
  COMMIT_ABORTED:       { color: 'warning',  label: 'Aborted' },
  REVIEW_TIMEOUT:       { color: 'warning',  label: 'Timeout' },
  REVIEW_FAILED:        { color: 'danger',   label: 'Failed' },
  FIX_FAILED:           { color: 'danger',   label: 'Fix Failed' },
  CLAUDE_NOT_INSTALLED: { color: 'default',  label: 'Not Installed' },
};

const GOOD_STATUSES  = ['PUSHED', 'REVIEWED', 'COMMITTED', 'AUTO_FIXED'];
const ABORT_STATUSES = ['PUSH_ABORTED', 'COMMIT_ABORTED'];
const FAIL_STATUSES  = ['REVIEW_FAILED', 'FIX_FAILED', 'REVIEW_TIMEOUT'];

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { fields.push(current.trim()); current = ''; }
    else { current += char; }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(raw: string): ReviewEntry[] {
  const lines = raw.trim().split('\n').filter(Boolean);
  const entries: ReviewEntry[] = [];
  lines.forEach((line, idx) => {
    if (!line.startsWith('"')) return; // skip header rows
    const f = parseCSVLine(line);
    if (f.length < 6) return;
    entries.push({ id: idx, timestamp: f[0], username: f[1], email: f[2], branch: f[3], files: f[4], status: f[5] });
  });
  return entries.reverse(); // newest first
}

// ── Sub-components ────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? { color: 'default' as ChipColor, label: status };
  return <Chip color={cfg.color} size="sm" variant="flat">{cfg.label}</Chip>;
};

const StatCard = ({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) => (
  <Card shadow="sm" className="flex-1 min-w-[120px]">
    <CardBody className="text-center py-5 px-3">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </CardBody>
  </Card>
);

// ── Main component ────────────────────────────────────────────────────────────

const ReviewDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const entries = useMemo(() => parseCSV(reviewCsv), []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const total        = entries.length;
  const pushed       = entries.filter(e => GOOD_STATUSES.includes(e.status)).length;
  const aborted      = entries.filter(e => ABORT_STATUSES.includes(e.status)).length;
  const failed       = entries.filter(e => FAIL_STATUSES.includes(e.status)).length;
  const notInstalled = entries.filter(e => e.status === 'CLAUDE_NOT_INSTALLED').length;
  const uniqueDevs   = new Set(entries.map(e => e.username)).size;

  // ── Developer compliance ──────────────────────────────────────────────────
  const devStats = useMemo<DevStat[]>(() => {
    const map = new Map<string, DevStat>();
    [...entries].reverse().forEach(e => {  // oldest-first so lastActivity ends up as newest
      if (!map.has(e.username)) {
        map.set(e.username, {
          username: e.username, email: e.email,
          total: 0, pushed: 0, aborted: 0, failed: 0, notInstalled: 0,
          lastActivity: e.timestamp,
        });
      }
      const d = map.get(e.username)!;
      d.total++;
      d.lastActivity = e.timestamp;
      if (GOOD_STATUSES.includes(e.status))         d.pushed++;
      if (ABORT_STATUSES.includes(e.status))        d.aborted++;
      if (FAIL_STATUSES.includes(e.status))         d.failed++;
      if (e.status === 'CLAUDE_NOT_INSTALLED')      d.notInstalled++;
    });
    return [...map.values()];
  }, [entries]);

  const devBadge = (d: DevStat) => {
    if (d.notInstalled === d.total)
      return <Chip color="default" size="sm" variant="flat">Not Installed</Chip>;
    if (d.pushed > 0)
      return <Chip color="success" size="sm" variant="flat">✓ Active</Chip>;
    return <Chip color="warning" size="sm" variant="flat">No Pushes</Chip>;
  };

  // ── Filtered log ─────────────────────────────────────────────────────────
  const allStatuses = useMemo(() => [...new Set(entries.map(e => e.status))], [entries]);

  const filtered = useMemo(() => entries.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      e.username.toLowerCase().includes(q) ||
      e.branch.toLowerCase().includes(q) ||
      e.files.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchSearch && matchStatus;
  }), [entries, search, statusFilter]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">🤖 Code Review Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">Claude AI review compliance — team overview</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="flat" color="default" onPress={() => window.location.reload()}>
            ↻ Refresh
          </Button>
          <Button size="sm" variant="flat" color="default" onPress={() => navigate('/dashboard')}>
            ← Back
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Stat cards */}
        <div className="flex gap-3 flex-wrap">
          <StatCard label="Total Events"    value={total}        color="text-gray-800" />
          <StatCard label="Pushed"          value={pushed}       color="text-green-600"  sub="reviewed & pushed" />
          <StatCard label="Aborted"         value={aborted}      color="text-amber-500"  sub="review seen, push held" />
          <StatCard label="Failed"          value={failed}       color="text-red-500"    sub="review error" />
          <StatCard label="Not Installed"   value={notInstalled} color="text-gray-400"   sub="claude CLI missing" />
          <StatCard label="Developers"      value={uniqueDevs}   color="text-blue-600" />
        </div>

        {/* Developer compliance */}
        <Card shadow="sm">
          <CardBody>
            <h2 className="text-base font-semibold text-gray-700 mb-4">👥 Developer Compliance</h2>
            <Table aria-label="Developer compliance" removeWrapper>
              <TableHeader>
                <TableColumn>Developer</TableColumn>
                <TableColumn>Email</TableColumn>
                <TableColumn>Total</TableColumn>
                <TableColumn>Pushed</TableColumn>
                <TableColumn>Aborted</TableColumn>
                <TableColumn>Failed</TableColumn>
                <TableColumn>Last Activity</TableColumn>
                <TableColumn>Status</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No activity recorded yet.">
                {devStats.map(d => (
                  <TableRow key={d.username}>
                    <TableCell><span className="font-medium text-gray-800">{d.username}</span></TableCell>
                    <TableCell><span className="text-xs text-gray-400">{d.email}</span></TableCell>
                    <TableCell>{d.total}</TableCell>
                    <TableCell><span className="font-semibold text-green-600">{d.pushed}</span></TableCell>
                    <TableCell><span className="text-amber-500">{d.aborted}</span></TableCell>
                    <TableCell><span className="text-red-500">{d.failed}</span></TableCell>
                    <TableCell><span className="text-xs text-gray-400">{d.lastActivity}</span></TableCell>
                    <TableCell>{devBadge(d)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        {/* Activity log */}
        <Card shadow="sm">
          <CardBody>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h2 className="text-base font-semibold text-gray-700">📋 Activity Log</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search developer, branch, files..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-60 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="ALL">All Statuses</option>
                  {allStatuses.map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
                  ))}
                </select>
              </div>
            </div>

            <Table aria-label="Activity log" removeWrapper>
              <TableHeader>
                <TableColumn>Timestamp</TableColumn>
                <TableColumn>Developer</TableColumn>
                <TableColumn>Branch</TableColumn>
                <TableColumn>Files Changed</TableColumn>
                <TableColumn>Status</TableColumn>
              </TableHeader>
              <TableBody emptyContent="No entries match your filter.">
                {filtered.map(e => (
                  <TableRow key={e.id}>
                    <TableCell><span className="text-xs text-gray-400 whitespace-nowrap">{e.timestamp}</span></TableCell>
                    <TableCell><span className="font-medium text-sm">{e.username}</span></TableCell>
                    <TableCell><span className="text-sm font-mono bg-gray-100 px-1.5 py-0.5 rounded">{e.branch || '—'}</span></TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-500 max-w-xs block truncate" title={e.files}>
                        {e.files || '—'}
                      </span>
                    </TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <p className="text-xs text-gray-400 mt-3 text-right">
              Showing {filtered.length} of {total} entries
            </p>
          </CardBody>
        </Card>

      </div>
    </div>
  );
};

export default ReviewDashboard;
