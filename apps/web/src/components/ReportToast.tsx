// A dismissible, non-blocking toast inviting a device report (see lib/report.ts). Two cases:
//   * a real meter is live on a driver not yet confirmed on hardware → "does it work?". Dismissing
//     or reporting is remembered per driver, so it asks once.
//   * the chooser was dismissed or connecting failed → "not in the list, or won't connect?".
//     Dismissing hides it until the next cancel/failure.
// Both open a pre-filled GitHub issue form in a new tab; the user reviews and submits it there.

import { useEffect, useState } from 'react';
import type { MeterChannel, Meters } from '@libreble/multimeter-react';
import { connectionProblemUrl, deviceReportUrl, verification } from '../lib/report';

const DONE_KEY = (driverId: string) => `multimeter.reportDone.${driverId}`;

function isDone(driverId: string): boolean {
  try {
    return localStorage.getItem(DONE_KEY(driverId)) !== null;
  } catch {
    return false;
  }
}

function markDone(driverId: string): void {
  try {
    localStorage.setItem(DONE_KEY(driverId), '1');
  } catch {
    /* storage unavailable — it may ask again next time */
  }
}

export function ReportToast({ meters }: { meters: Meters }) {
  const [done, setDone] = useState<Set<string>>(() => new Set());
  const [problemDismissed, setProblemDismissed] = useState(false);

  const real = meters.meters.filter(c => !meters.meterSession(c.id)?.isDemo);
  const unconfirmed = real.find(
    c =>
      c.state === 'live' &&
      c.driverId !== null &&
      verification(c.driverId)?.tier !== 'live-tested' &&
      !done.has(c.driverId) &&
      !isDone(c.driverId),
  );
  const problem = real.find(c => c.cancelled || c.state === 'error');

  // A new cancel/failure after a successful attempt shows the toast again.
  useEffect(() => {
    if (!problem) setProblemDismissed(false);
  }, [problem]);

  if (unconfirmed) {
    const driverId = unconfirmed.driverId!;
    const finish = () => {
      markDone(driverId);
      setDone(d => new Set(d).add(driverId));
    };
    // Read the GATT description only on click: a few best-effort Device Information reads that
    // shouldn't sit in the connect path. Transient user activation outlives them, so the new tab
    // isn't popup-blocked.
    const report = async () => {
      const g = (await meters.meterSession(unconfirmed.id)?.describe()) ?? null;
      window.open(deviceReportUrl(driverId, g), '_blank', 'noopener,noreferrer');
      finish();
    };
    return (
      <Toast onDismiss={finish}>
        <p>
          <strong className="font-semibold text-zinc-100">{name(unconfirmed)}</strong> is{' '}
          {verification(driverId)?.text}. Does it read right?
        </p>
        <button type="button" onClick={() => void report()} className={ACTION}>
          Report it
        </button>
      </Toast>
    );
  }

  if (problem && !problemDismissed) {
    return (
      <Toast onDismiss={() => setProblemDismissed(true)}>
        <p>Meter not in the list, or won't connect?</p>
        <a
          href={connectionProblemUrl(problem.error)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setProblemDismissed(true)}
          className={ACTION}
        >
          Tell us which one
        </a>
      </Toast>
    );
  }

  return null;
}

const name = (c: MeterChannel) => c.deviceName ?? 'This meter';

const ACTION =
  'mt-2 inline-block rounded-md bg-emerald-500 px-3 py-1 text-sm font-semibold text-emerald-950 hover:bg-emerald-400';

function Toast({ children, onDismiss }: { children: React.ReactNode; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-40 ml-auto max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 p-3 pr-9 text-sm text-zinc-300 shadow-xl"
    >
      {children}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        title="Dismiss"
        className="absolute right-1.5 top-1.5 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}
