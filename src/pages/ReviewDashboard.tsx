import { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import moment from 'moment';
import reviewCsv from '../../review-logs/reviews.csv?raw';
import type { ReviewEntry, ParsedIssue, DevStat, ChipColor, ActivityLogProps } from '../types';

const fmtDate = (raw: string) => moment(raw, 'YYYY-MM-DD HH:mm:ss').format('MMM D, YYYY · h:mm A');

// Lazy-loaded detail files — NOT bundled eagerly (fix #4: no bundle bloat)
// NOTE: This path is relative to the location of this file (src/pages/ReviewDashboard.tsx).
// If this component is ever moved, update the path accordingly, or introduce a
// Vite resolve.alias (e.g. @review-logs → <root>/review-logs) to decouple them.
const detailFiles = import.meta.glob('../../review-logs/details/*.txt', {
  query: '?raw',
  import: 'default',
});

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: ChipColor; label: string }> = {
  PUSHED:               { color: 'success',  label: 'Pushed' },
  REVIEWED:             { color: 'success',  label: 'Reviewed' },
  COMMITTED:            { color: 'success',  label: 'Committed' },
  AUTO_FIXED:           { color: 'primary',  label: 'Auto Fixed' },
  FIX_REQUESTED:        { color: 'primary',  label: 'Fix Requested' },
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

const SECTION_STYLE: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  critical:    { bg: 'bg-red-50',   border: 'border-red-200',   icon: '❌', label: 'Critical' },
  improvement: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚠️', label: 'Improvement' },
  suggestion:  { bg: 'bg-blue-50',  border: 'border-blue-200',  icon: '💡', label: 'Suggestion' },
  good:        { bg: 'bg-green-50', border: 'border-green-200', icon: '✅', label: 'Good' },
};

// Shared filter control class (fix #14)
const filterInputCls = 'border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200';

// ── Pure helpers ──────────────────────────────────────────────────────────────

// NOTE: RFC 4180 allows a literal " inside a quoted field to be escaped as "".
// This parser does not handle that case — it toggles inQuotes on every " character,
// so a field like "say ""hello""" would be parsed incorrectly. Acceptable for the
// current data set (no fields contain embedded quotes), but worth fixing if the
// CSV source ever changes.
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
  return raw.trim().split('\n').filter(Boolean).reduce<ReviewEntry[]>((acc, line, idx) => {
    if (!line.startsWith('"')) return acc;
    const f = parseCSVLine(line);
    if (f.length < 6) return acc;
    acc.push({ id: idx, timestamp: f[0], username: f[1], email: f[2], branch: f[3], files: f[4], status: f[5], detailFile: f[6] ?? '' });
    return acc;
  }, []).reverse();
}

const KNOWN_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'css', 'scss', 'html', 'json', 'md', 'txt',
  'svg', 'png', 'jpg', 'jpeg', 'gif', 'ico',
  'sh', 'bash', 'env', 'yml', 'yaml', 'toml', 'lock',
]);

function extractFilesFromLine(text: string): string[] {
  const matches = text.match(/[\w./\\-]+\.\w{2,4}(?::\d+(?:-\d+)?)?/g) ?? [];
  return [...new Set(matches.filter(m => {
    const ext = m.replace(/:\d.*$/, '').split('.').pop() ?? '';
    return KNOWN_EXTENSIONS.has(ext);
  }))];
}

function parseReviewDetail(content: string): ParsedIssue[] {
  const issues: ParsedIssue[] = [];
  let section: ParsedIssue['section'] = 'good';
  const lines = content.split('\n');
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('────')) { bodyStart = i + 2; break; }
  }
  for (let i = bodyStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('❌'))          { section = 'critical';    continue; }
    if (line.startsWith('⚠️') || line.startsWith('⚠')) { section = 'improvement'; continue; }
    if (line.startsWith('💡'))          { section = 'suggestion';  continue; }
    if (line.startsWith('✅'))          { section = 'good';        continue; }
    if (/^(\d+\.|[-*])/.test(line)) {
      const clean = line.replace(/\*\*/g, '').replace(/`([^`]*)`/g, '$1');
      issues.push({ section, text: clean, files: extractFilesFromLine(clean) });
    }
  }
  return issues;
}

// Moved outside component — pure function, not recreated on every render (fix #8)
function devBadge(d: DevStat) {
  if (d.notInstalled === d.total)
    return <Chip color="default" size="sm" variant="flat">Not Installed</Chip>;
  if (d.pushed > 0)
    return <Chip color="success" size="sm" variant="flat">✓ Active</Chip>;
  return <Chip color="warning" size="sm" variant="flat">No Pushes</Chip>;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] ?? { color: 'default' as ChipColor, label: status };
  return <Chip color={cfg.color} size="sm" variant="flat">{cfg.label}</Chip>;
};

const StatCard = ({ label, value, sub, icon, accent, textColor }: {
  label: string; value: number; sub?: string; icon: string; accent: string; textColor: string;
}) => (
  <div className="flex-1 min-w-[150px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className={`h-1 w-full ${accent}`} />
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-3xl font-extrabold tracking-tight ${textColor}`}>{value}</span>
      </div>
      <p className="text-sm font-semibold text-gray-700 leading-tight">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// Lazy-loading detail panel (fix #4)
const ReviewDetail = ({ detailFile }: { detailFile: string }) => {
  const [raw, setRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Local flag avoids the Strict Mode double-invoke race where mounted.current
    // could be reset between the first cleanup and the second invocation.
    let active = true;
    setLoading(true);
    setRaw(null);
    if (!detailFile) { setLoading(false); return; }
    const key = Object.keys(detailFiles).find(k => k.endsWith(detailFile));
    if (!key) { setLoading(false); return; }
    (detailFiles[key] as () => Promise<string>)()
      .then(content => { if (active) { setRaw(content); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [detailFile]);

  if (loading) return <div className="px-4 py-3 text-sm text-gray-400 animate-pulse">Loading review...</div>;
  if (!raw)    return <div className="px-4 py-3 text-sm text-gray-400 italic">No review detail file found.</div>;

  const issues = parseReviewDetail(raw);
  if (issues.length === 0) return (
    <pre className="px-4 py-3 text-xs text-gray-500 whitespace-pre-wrap font-mono bg-gray-50 rounded">{raw}</pre>
  );

  const grouped = issues.reduce<Record<string, ParsedIssue[]>>((acc, issue) => {
    (acc[issue.section] ??= []).push(issue);
    return acc;
  }, {});

  return (
    <div className="px-4 py-4 space-y-3">
      {(['critical', 'improvement', 'suggestion', 'good'] as ParsedIssue['section'][]).map(section => {
        const items = grouped[section];
        if (!items?.length) return null;
        const s = SECTION_STYLE[section];
        return (
          <div key={section} className={`rounded-lg border ${s.border} ${s.bg} p-3`}>
            <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
              {s.icon} {s.label} ({items.length})
            </p>
            <ul className="space-y-2">
              {items.map((issue, i) => (
                <li key={`${section}-${i}`} className="text-sm text-gray-700"> {/* fix #13 */}
                  {issue.text}
                  {issue.files.length > 0 && (
                    <span className="ml-2 inline-flex flex-wrap gap-1 mt-0.5">
                      {issue.files.map(f => (
                        <span key={f} className="font-mono text-xs bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-500">{f}</span>
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

// Extracted sub-component (fix #15)
const StatsBar = ({ total, pushed, aborted, failed, notInstalled, uniqueDevs }: {
  total: number; pushed: number; aborted: number; failed: number; notInstalled: number; uniqueDevs: number;
}) => (
  <div className="flex gap-4 flex-wrap">
    <StatCard label="Total Events"  value={total}        icon="📊" accent="bg-gray-400"   textColor="text-gray-800" />
    <StatCard label="Pushed"        value={pushed}       icon="✅" accent="bg-green-500"  textColor="text-green-600"  sub="reviewed & pushed" />
    <StatCard label="Aborted"       value={aborted}      icon="⏸️" accent="bg-amber-400"  textColor="text-amber-500"  sub="held back" />
    <StatCard label="Failed"        value={failed}       icon="❌" accent="bg-red-500"    textColor="text-red-500"    sub="review error" />
    <StatCard label="Not Installed" value={notInstalled} icon="⚙️" accent="bg-gray-300"   textColor="text-gray-400"   sub="claude CLI missing" />
    <StatCard label="Developers"    value={uniqueDevs}   icon="👥" accent="bg-blue-500"   textColor="text-blue-600" />
  </div>
);

// Extracted sub-component (fix #15)
const DevComplianceTable = ({ devStats }: { devStats: DevStat[] }) => (
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
              <TableCell><span className="text-xs text-gray-400">{fmtDate(d.lastActivity)}</span></TableCell>
              <TableCell>{devBadge(d)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardBody>
  </Card>
);

// Extracted sub-component (fix #15)
const ActivityLog = ({ filtered, total, search, onSearchChange, statusFilter, onStatusChange, allStatuses, expandedRow, toggleRow }: ActivityLogProps) => (
  <Card shadow="sm">
    <CardBody>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-base font-semibold text-gray-700">📋 Activity Log</h2>
        <div className="flex gap-2">
          {/* fix #14 — shared filterInputCls */}
          <input
            type="text"
            placeholder="Search developer, branch, files..."
            value={search}
            onChange={e => { onSearchChange(e.target.value); }}
            className={`${filterInputCls} w-60`}
          />
          <select
            value={statusFilter}
            onChange={e => { onStatusChange(e.target.value); }}
            className={filterInputCls}
          >
            <option value="ALL">All Statuses</option>
            {allStatuses.map(s => (
              <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-100">
        <div className="grid grid-cols-[180px_140px_100px_1fr_120px_40px] bg-gray-50 border-b border-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Timestamp</span><span>Developer</span><span>Branch</span>
          <span>Files Changed</span><span>Status</span><span></span>
        </div>

        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-400">No entries match your filter.</div>
        )}

        {filtered.map(entry => (
          <div key={entry.id} className="border-b border-gray-100 last:border-b-0">
            <div className={`grid grid-cols-[180px_140px_100px_1fr_120px_40px] px-4 py-3 items-center hover:bg-gray-50 transition-colors ${expandedRow === entry.id ? 'bg-blue-50' : ''}`}>
              <span className="text-xs text-gray-400">{fmtDate(entry.timestamp)}</span>
              <span className="font-medium text-sm text-gray-800">{entry.username}</span>
              <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 w-fit">{entry.branch || '—'}</span>
              <span className="text-xs text-gray-500 truncate pr-2" title={entry.files}>{entry.files || '—'}</span>
              <span><StatusBadge status={entry.status} /></span>
              {/* fix #12 — show — instead of dimmed ▼ when no detail file */}
              {entry.detailFile ? (
                <button
                  onClick={() => toggleRow(entry.id)}
                  className="text-sm rounded w-7 h-7 flex items-center justify-center text-blue-500 hover:bg-blue-100 cursor-pointer transition-colors"
                  title="View review details"
                >
                  {expandedRow === entry.id ? '▲' : '▼'}
                </button>
              ) : (
                <span className="text-gray-300 text-sm w-7 h-7 flex items-center justify-center">—</span>
              )}
            </div>
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
);

// ── Main component ────────────────────────────────────────────────────────────

const ReviewDashboard = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const entries = useMemo(() => parseCSV(reviewCsv), []);

  // fix #7 — all stats memoized together
  const stats = useMemo(() => ({
    total:        entries.length,
    pushed:       entries.filter(e => GOOD_STATUSES.includes(e.status)).length,
    aborted:      entries.filter(e => ABORT_STATUSES.includes(e.status)).length,
    failed:       entries.filter(e => FAIL_STATUSES.includes(e.status)).length,
    notInstalled: entries.filter(e => e.status === 'CLAUDE_NOT_INSTALLED').length,
    uniqueDevs:   new Set(entries.map(e => e.username)).size,
  }), [entries]);

  const devStats = useMemo<DevStat[]>(() => {
    const map = new Map<string, DevStat>();
    // entries is newest-first (reversed in parseCSV); reverse again to oldest-first
    // so each loop iteration overwrites lastActivity with progressively newer timestamps,
    // leaving the most recent timestamp as the final value.
    [...entries].reverse().forEach(e => {
      if (!map.has(e.username)) {
        map.set(e.username, { username: e.username, email: e.email, total: 0, pushed: 0, aborted: 0, failed: 0, notInstalled: 0, lastActivity: e.timestamp });
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

  const allStatuses = useMemo(() => [...new Set(entries.map(e => e.status))], [entries]);

  const filtered = useMemo(() => entries.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.username.toLowerCase().includes(q) || e.branch.toLowerCase().includes(q) || e.files.toLowerCase().includes(q);
    return matchSearch && (statusFilter === 'ALL' || e.status === statusFilter);
  }), [entries, search, statusFilter]);

  // fix #9 — reset expanded row when filters change
  const handleSearchChange = (v: string) => { setSearch(v); setExpandedRow(null); };
  const handleStatusChange = (v: string) => { setStatusFilter(v); setExpandedRow(null); };

  const toggleRow = (id: number) => setExpandedRow(prev => prev === id ? null : id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">🤖 Code Review Dashboard</h1>
          <p className="text-xs text-gray-400 mt-0.5">Claude AI review compliance — team overview</p>
        </div>
        <span className="text-xs text-gray-400">Data refreshes on rebuild</span>
      </div>

      <div className="p-6 space-y-6">
        <StatsBar {...stats} />
        <DevComplianceTable devStats={devStats} />
        <ActivityLog
          filtered={filtered}
          total={stats.total}
          search={search}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          allStatuses={allStatuses}
          expandedRow={expandedRow}
          toggleRow={toggleRow}
        />
      </div>
    </div>
  );
};

export default ReviewDashboard;
