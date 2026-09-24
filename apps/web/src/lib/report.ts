// Device reports: pre-filled GitHub issue forms (.github/ISSUE_TEMPLATE/) the user reviews and
// submits themselves. Nothing is sent from the app — it only opens a URL. The summary carries
// identifiers and GATT layout, never readings or raw frames (we ask for a capture in the thread
// if we need one).

import { driverById } from '@libreble/multimeter-protocol';
import type { GattDescription } from '@libreble/multimeter-react';

const ISSUES = 'https://github.com/libreble/multimeter/issues/new';

const VERIFICATION_TEXT = {
  'live-tested': 'confirmed on real hardware',
  'app-verified': 'checked against the vendor app, not yet on a real meter',
  'ported-unverified': 'not yet confirmed on real hardware',
} as const;

function browser(): string {
  return typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent;
}

function issueUrl(template: string, title: string, fields: Record<string, string>): string {
  const q = new URLSearchParams({ template, title, ...fields });
  return `${ISSUES}?${q}`;
}

/** A driver's verification tier plus a plain-language phrase for the report prompt. */
export function verification(driverId: string | null) {
  const d = driverId ? driverById(driverId) : undefined;
  return d ? { tier: d.verification, text: VERIFICATION_TEXT[d.verification] } : null;
}

export function connectedSummary(driverId: string | null, g: GattDescription | null): string {
  const d = driverId ? driverById(driverId) : undefined;
  const lines = [
    `app: Multimeter`,
    `browser: ${browser()}`,
    `advertised name: ${g?.name ?? 'unknown'}`,
    `driver: ${d ? `${d.id} (${d.label}) · ${d.verification}` : 'none matched'}`,
    `service: ${g?.service ?? 'unknown'}`,
  ];
  if (g?.characteristics.length) {
    lines.push('characteristics:');
    for (const c of g.characteristics) lines.push(`  ${c.uuid} [${c.properties.join(',')}]`);
  }
  const info = Object.entries(g?.deviceInfo ?? {});
  if (info.length) {
    lines.push('device information:');
    for (const [k, v] of info) lines.push(`  ${k}: ${v}`);
  }
  return lines.join('\n');
}

/** Issue form for a meter that connected: does it read right? */
export function deviceReportUrl(driverId: string | null, g: GattDescription | null): string {
  return issueUrl('device-report.yml', `Device report: ${g?.name ?? 'my meter'}`, {
    connection: connectedSummary(driverId, g),
  });
}

/** Issue form for a meter that isn't listed in the chooser or won't connect. */
export function connectionProblemUrl(error: string | null): string {
  const lines = [`app: Multimeter`, `browser: ${browser()}`];
  if (error) lines.push(`error: ${error}`);
  return issueUrl('connection-problem.yml', 'Connection problem: ', {
    environment: lines.join('\n'),
  });
}
