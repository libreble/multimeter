// Export the measurement so it leaves with the user.
// CSV is full-resolution, read from IndexedDB — never the decimated chart series (§3.3) —
// so it requires an actual recording. PNG snapshots the chart canvas and is always
// available once there's something on screen. The actual work lives in lib/exporters so
// the keyboard shortcuts share it exactly.

import { useState, type RefObject } from 'react';
import type { MultiChartHandle } from './MultiChart';
import { copyPng, exportCsv, exportPng } from '../lib/exporters';

interface Props {
  chartRef: RefObject<MultiChartHandle | null>;
  // The recording to export to CSV (active or most-recent). null → nothing recorded yet.
  csvTarget: { id: string; name: string } | null;
}

const btn =
  'rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40';

export function ExportButtons({ chartRef, csvTarget }: Props) {
  const [copyMessage, setCopyMessage] = useState('');
  const [copyFailed, setCopyFailed] = useState(false);

  const onCopy = () => {
    setCopyMessage('Copying窶ｦ');
    setCopyFailed(false);
    void copyPng(chartRef.current)
      .then(() => setCopyMessage('PNG copied. Paste with Ctrl+V.'))
      .catch((error: unknown) => {
        setCopyFailed(true);
        setCopyMessage(error instanceof Error ? error.message : 'PNG copy failed.');
      });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => csvTarget && void exportCsv(csvTarget)}
        disabled={!csvTarget}
        title={csvTarget ? 'Download full-resolution CSV' : 'Record a session to enable CSV export'}
        className={btn}
      >
        Download CSV
      </button>
      <button
        onClick={() => void exportPng(chartRef.current, csvTarget?.name ?? 'ut60bt-chart')}
        className={btn}
      >
        Download PNG
      </button>
      <button
        type="button"
        onClick={onCopy}
        className={btn}
        title="Copy chart PNG with axes and labels"
      >
        Copy PNG
      </button>
      <span
        role="status"
        aria-live="polite"
        className={`text-xs ${copyFailed ? 'text-red-400' : 'text-zinc-400'}`}
      >
        {copyMessage}
      </span>
    </div>
  );
}
