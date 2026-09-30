import type { RepoAnalysis } from '@ghostrepo/core';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function toHtmlReport(a: RepoAnalysis): string {
  const rows = a.score.categories
    .map(
      (c) =>
        `<tr><td>${esc(c.label)}</td><td>${c.earned}/${c.max}</td><td>${esc(c.detail)}</td></tr>`,
    )
    .join('\n');
  const deps = a.dependencies.items
    .map(
      (d) =>
        `<tr><td>${esc(d.name)}</td><td>${esc(d.current)}</td><td>${esc(d.latest ?? 'unknown')}</td><td>${esc(d.status)}</td></tr>`,
    )
    .join('\n');
  const plan = a.revivalPlan
    .map(
      (p) =>
        `<div class="action"><h3>${esc(p.priority)} — ${esc(p.title)}</h3><p><strong>Why:</strong> ${esc(p.why)}</p><p><strong>Change:</strong> ${esc(p.change)}</p><p><strong>Risk:</strong> ${esc(p.risk)} · <strong>Effort:</strong> ${esc(p.effort)}</p></div>`,
    )
    .join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GhostRepo Report — ${esc(a.repo)}</title>
<style>
body{font-family:ui-sans-serif,system-ui,sans-serif;background:#0b0e14;color:#e6e9f0;margin:0;padding:32px}
.card{background:#131926;border:1px solid #232c3d;border-radius:12px;padding:20px;margin-bottom:20px;max-width:900px}
h1{font-size:28px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #232c3d;padding:8px;text-align:left;font-size:14px}
.badge{display:inline-block;padding:4px 10px;border-radius:999px;background:#1d2740;border:1px solid #33415e;font-size:13px}
.action{border-left:3px solid #6ee7b7;padding-left:12px;margin:12px 0}
.muted{color:#8b94a7}
</style></head><body>
<h1>GhostRepo — ${esc(a.repo)}</h1>
${a.metadata.description ? `<p>${esc(a.metadata.description)}</p>` : ''}
<p class="muted">Generated ${esc(a.fetchedAt)}</p>
<div class="card"><span class="badge">Health ${a.score.total}/${a.score.max}</span>
<span class="badge">${esc(a.maintenance.label)}</span>
<p>${a.maintenance.evidence.map(esc).join('<br/>')}</p></div>
<div class="card"><h2>Score breakdown</h2><table><tr><th>Category</th><th>Score</th><th>Detail</th></tr>${rows}</table></div>
<div class="card"><h2>Dependencies (${a.dependencies.total} total, ${a.dependencies.outdated} outdated)</h2><table><tr><th>package</th><th>current</th><th>latest</th><th>status</th></tr>${deps || '<tr><td colspan="4">No parsed dependencies</td></tr>'}</table></div>
<div class="card"><h2>Revival plan</h2>${plan}</div>
</body></html>\n`;
}
