// Export actions shared by the ExportButtons UI and the keyboard shortcuts, so both paths
// behave identically. CSV is the recorder package's full-resolution export (from IndexedDB,
// §3.3); PNG snapshots the chart canvas, which is app-only (uPlot).
import { exportSessionCsv, downloadBlob, slug } from '@libreble/multimeter-recorder';

export const exportCsv = exportSessionCsv;

// Minimal handle so this stays in lib without importing a component type.
export interface PngSource {
  toPng: () => Promise<Blob | null>;
}

export async function exportPng(chart: PngSource | null, name: string): Promise<void> {
  const blob = await chart?.toPng();
  if (blob) downloadBlob(blob, `${slug(name)}.png`);
}

// Keep clipboard.write inside the user's click activation. ClipboardItem accepts a Promise<Blob>.
export async function copyPng(chart: PngSource | null): Promise<void> {
  if (!chart) throw new Error('Chart is not ready.');
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('PNG clipboard access requires Chrome/Edge over HTTPS or localhost.');
  }
  const png = chart.toPng().then(blob => {
    if (!blob) throw new Error('Failed to create chart PNG.');
    return blob;
  });
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}
