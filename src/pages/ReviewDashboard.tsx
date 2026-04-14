import { useMemo, useState } from 'react';
import {
  Card, CardBody, Button, Chip,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
} from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import reviewCsv from '../../review-logs/reviews.csv?raw';

// Load all detail files from review-logs/details/
const detailFiles = import.meta.glob('../../review-logs/details/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewEntry {
  id: number;
  timestamp: string;
  username: string;
  email: string;
  branch: string;
  files: string;
  status: string;
  detailFile: string;
}

interface ParsedIssue {
  section: 'critical' | 'improvement' | 'suggestion' | 'good';
  text: string;
  files: string[];
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

// ── Parsers ───────────────────────────────────────────────────────────────────

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
    if (!line.startsWith('"')) return;
    const f = parseCSVLine(line);
    if (f.length < 6) return;
    entries.push({
      id: idx,
      timestamp: f[0], username: f[1], email: f[2],
      branch: f[3], files: f[4], status: f[5],
      detailFile: f[6] ?? '',
    });
  });
  return entries.reverse();
}

// Extract file references like (Login.tsx:12) or Login.tsx from a text line
function extractFilesFromLine(text: string): string[] {
  const matches = text.match(/[\w./\\-]+\.\w{2,4}(?::\d+(?:-\d+)?)?/g) ?? [];
  return [...new Set(matches)];
}

// Parse review markdown into structured sections
function parseReviewDetail(content: string): ParsedIssue[] {
  const issues: ParsedIssue[] = [];
  let currentSection: ParsedIssue['section'] = 'good';

  const lines = content.split('\n');
  // Skip the header block (lines before the first blank line after "────")
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('────')) { bodyStart = i + 2; break; }
  }

  for (let i = bodyStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('❌')) { currentSection = 'critical'; continue; }
    if (line.startsWith('⚠️') || line.startsWith('⚠')) { currentSection = 'improvement'; continue; }
    if (line.startsWith('💡')) { currentSection = 'suggestion'; continue; }
    if (line.startsWith('✅')) { currentSection = 'good'; continue; }

    // Numbered items and bullet points are the actual issues
    if (/^(\d+\.|[-*])/.test(line)) {
      const clean = line.replace(/\*\*/g, '').replace(/`([^`]*)`/g, '$1');
      issues.push({
        section: currentSection,
        text: clean,
        files: extractFilesFromLine(clean),
      });
    }
  }
  return issues;
}

function getDetailContent(detailFile: string): string | null {
  if (!detailFile) return null;
  const key = Object.keys(detailFiles).find(k => k.endsWith(detailFile));
  return key ? detailFiles[key] : null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? { color: 'default' as ChipColor, label: status };
  return <Chip color={cfg.color} size="sm" variant="flat">{cfg.label}</Chip>;
};

const StatCard = ({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) => (
  <Card shadow="sm" className="flex-1 min-w-[110px]">
    <CardBody className="text-center py-5 px-3">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm font-medium text-gray-600 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </CardBody>
  </Card>
);

const SECTION_STYLE: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  critical:    { bg: 'bg-red-50',    border: 'border-red-200',    icon: '❌', label: 'Critical' },
  improvement: { bg: 'bg-amber-50',  border: 'border-amber-200',  icon: '⚠️', label: 'Improvement' },
  suggestion:  { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: '💡', label: 'Suggestion' },
  good:        { bg: 'bg-green-50',  border: 'border-green-200',  icon: '✅', label: 'Good' },
};

const ReviewDetail = ({ detailFile }: { detailFile: string }) => {
  const raw = getDetailContent(detailFile);

  if (!raw) {
    return (
      <div className="px-4 py-3 text-sm text-gray-400 italic">
        No review detail file found for this entry.
      </div>
    );
  }

  const issues = parseReviewDetail(raw);

  if (issues.length === 0) {
    return (
      <pre className="px-4 py-3 text-xs text-gray-500 whitespace-pre-wrap font-mono bg-gray-50 rounded">
        {raw}
      </pre>
    );
  }

  // Group by section
  const grouped = issues.reduce<Record<string, ParsedIssue[]>>((acc, issue) => {
    (acc[issue.section] ??= []).push(issue);
    return acc;
  }, {});

  const sectionOrder: ParsedIssue['section'][] = ['critical', 'improvement', 'suggestion', 'good'];

  return (
    <div className="px-4 py-4 space-y-3">
      {sectionOrder.map(section => {
        const items = grouped[section];
        if (!items?.length) return null;
        const style = SECTION_STYLE[section];
        return (
          <div key={section} className={`rounded-lg border ${style.border} ${style.bg} p-3`}>
            <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
              {style.icon} {style.label} ({items.length})
            </p>
            <ul className="space-y-2">
              {items.map((issue, i) => (
                <li key={i} className="text-sm text-gray-700">
                  <span>{issue.text}</span>
                  {issue.files.length > 0 && (
                    <span className="ml-2 flex flex-wrap gap-1 mt-0.5">
                      {issue.files.map(f => (
                        <span key={f} className="font-mono text-xs bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-500">
                          {f}
                        </span>
                      ))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const ReviewDashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const entries = useMemo(() => parseCSV(reviewCsv), []);

  // Stats
  const total        = entries.length;
  const pushed       = entries.filter(e => GOOD_STATUSES.includes(e.status)).length;
  const aborted      = entries.filter(e => ABORT_STATUSES.includes(e.status)).length;
  const failed       = entries.filter(e => FAIL_STATUSES.includes(e.status)).length;
  const notInstalled = entries.filter(e => e.status === 'CLAUDE_NOT_INSTALLED').length;
  const uniqueDevs   = new Set(entries.map(e => e.username)).size;

  // Developer compliance
  const devStats = useMemo<DevStat[]>(() => {
    const map = new Map<string, DevStat>();
    [...entries].reverse().forEach(e => {
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
      if (GOOD_STATUSES.includes(e.status))    d.pushed++;
      if (ABORT_STATUSES.includes(e.status))   d.aborted++;
      if (FAIL_STATUSES.includes(e.status))    d.failed++;
      if (e.status === 'CLAUDE_NOT_INSTALLED') d.notInstalled++;
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

  const toggleRow = (id: number) => setExpandedRow(prev => prev === id ? null : id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">🤖 Code Review Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">Claude AI review compliance — team overview</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="flat" onPress={() => window.location.reload()}>↻ Refresh</Button>
          <Button size="sm" variant="flat" onPress={() => navigate('/dashboard')}>← Back</Button>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="flex gap-3 flex-wrap">
          <StatCard label="Total Events"  value={total}        color="text-gray-800" />
          <StatCard label="Pushed"        value={pushed}       color="text-green-600"  sub="reviewed & pushed" />
          <StatCard label="Aborted"       value={aborted}      color="text-amber-500"  sub="held back" />
          <StatCard label="Failed"        value={failed}       color="text-red-500"    sub="review error" />
          <StatCard label="Not Installed" value={notInstalled} color="text-gray-400"   sub="claude CLI missing" />
          <StatCard label="Developers"    value={uniqueDevs}   color="text-blue-600" />
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
                    <TableCell><span className="font-medium">{d.username}</span></TableCell>
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

            {/* Custom table with expandable rows */}
            <div className="rounded-xl overflow-hidden border border-gray-100">
              {/* Header */}
              <div className="grid grid-cols-[180px_140px_100px_1fr_120px_40px] bg-gray-50 border-b border-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <span>Timestamp</span>
                <span>Developer</span>
                <span>Branch</span>
                <span>Files Changed</span>
                <span>Status</span>
                <span></span>
              </div>

              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No entries match your filter.</div>
              )}

              {filtered.map(entry => (
                <div key={entry.id} className="border-b border-gray-100 last:border-b-0">
                  {/* Row */}
                  <div className={`grid grid-cols-[180px_140px_100px_1fr_120px_40px] px-4 py-3 items-center hover:bg-gray-50 transition-colors ${expandedRow === entry.id ? 'bg-blue-50' : ''}`}>
                    <span className="text-xs text-gray-400">{entry.timestamp}</span>
                    <span className="font-medium text-sm text-gray-800">{entry.username}</span>
                    <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 w-fit">{entry.branch || '—'}</span>
                    <span className="text-xs text-gray-500 truncate pr-2" title={entry.files}>{entry.files || '—'}</span>
                    <span><StatusBadge status={entry.status} /></span>
                    <button
                      onClick={() => entry.detailFile ? toggleRow(entry.id) : undefined}
                      className={`text-sm rounded w-7 h-7 flex items-center justify-center transition-colors ${
                        entry.detailFile
                          ? 'text-blue-500 hover:bg-blue-100 cursor-pointer'
                          : 'text-gray-200 cursor-default'
                      }`}
                      title={entry.detailFile ? 'View review details' : 'No review details available'}
                    >
                      {expandedRow === entry.id ? '▲' : '▼'}
                    </button>
                  </div>

                  {/* Expanded detail */}
                  {expandedRow === entry.id && (
                    <div className="bg-white border-t border-blue-100">
                      <ReviewDetail detailFile={entry.detailFile} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-3 text-right">
              Showing {filtered.length} of {total} entries · Click ▼ on a row to see issues &amp; fixes
            </p>
          </CardBody>
        </Card>

      </div>
    </div>
  );
};

export default ReviewDashboard;
