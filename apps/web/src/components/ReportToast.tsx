// A dismissible, non-blocking toast inviting a device report (see lib/report.ts). Two cases:
//   * a real meter is live on a driver not yet confirmed on hardware → "how is it working?". Dismissing
//     or reporting is remembered once per install, whatever the driver — a working meter shouldn't nag.
//   * the chooser was dismissed or any error (connect, reconnect, or one surfaced while live) →
//     "trouble with your meter?". Dismissing hides it until the next cancel/error.
// Both open a pre-filled GitHub issue form in a new tab; the user reviews and submits it there.

import { useEffect, useState } from 'react';
import type { Meters } from '@libreble/multimeter-react';
import { connectionProblemUrl, deviceReportUrl, verification } from '../lib/report';

const DONE_KEY = 'multimeter.reportDone';

function isDone(): boolean {
  try {
    // Older builds stored one key per driver (multimeter.reportDone.<driverId>) — honour those.
    return Object.keys(localStorage).some(k => k === DONE_KEY || k.startsWith(`${DONE_KEY}.`));
  } catch {
    return false;
  }
}

function markDone(): void {
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* storage unavailable — it may ask again next time */
  }
}

export function ReportToast({ meters }: { meters: Meters }) {
  const [doneNow, setDoneNow] = useState(false);
  const [problemDismissed, setProblemDismissed] = useState(false);

  const real = meters.meters.filter(c => !meters.meterSession(c.id)?.isDemo);
  const unconfirmed =
    !doneNow && !isDone()
      ? real.find(
          c =>
            c.state === 'live' && c.driverId !== null && verification(c.driverId) !== 'live-tested',
        )
      : undefined;
  const problem = real.find(c => c.cancelled || c.state === 'error' || c.error !== null);
  // Which problem is showing: re-arm once it clears, or when a different error replaces it.
  const problemKey = problem ? `${problem.id}\n${problem.error ?? 'cancelled'}` : null;

  useEffect(() => {
    setProblemDismissed(false);
  }, [problemKey]);

  if (unconfirmed) {
    const driverId = unconfirmed.driverId!;
    const finish = () => {
      markDone();
      setDoneNow(true);
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
        <p>How is your meter working for you?</p>
        <button type="button" onClick={() => void report()} className={ACTION}>
          Let us know
        </button>
      </Toast>
    );
  }

  if (problem && !problemDismissed) {
    return (
      <Toast onDismiss={() => setProblemDismissed(true)}>
        <p>Trouble with your meter?</p>
        <a
          href={connectionProblemUrl(problem.error)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setProblemDismissed(true)}
          className={ACTION}
        >
          Let us know
        </a>
      </Toast>
    );
  }

  return null;
}

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
