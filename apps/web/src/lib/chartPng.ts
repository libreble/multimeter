// A diagnostic PNG including the complete uPlot canvas (axes, ticks, grid and traces)
// plus a caption and color-coded series information that otherwise lives in the DOM.
interface ChartPngOptions {
  chartCanvas: HTMLCanvasElement;
  chartWidthCss: number;
  dark: boolean;
  windowLabel: string;
  series: ReadonlyArray<{ label: string; unit: string; color: string }>;
  truncated?: boolean;
  startSeconds?: number;
  endSeconds?: number;
}

export function chartToPng(options: ChartPngOptions): Promise<Blob | null> {
  const { chartCanvas, chartWidthCss, dark, series, windowLabel, truncated } = options;
  const pixelRatio = Math.max(1, chartCanvas.width / Math.max(1, chartWidthCss));
  const px = (n: number) => Math.round(n * pixelRatio);
  const pad = px(16);
  const line = px(20);
  const legendLine = px(21);
  const legendCount = Math.max(1, series.length);
  const headerHeight = pad * 2 + px(29) + line * (truncated ? 4 : 3) + legendCount * legendLine;

  const out = document.createElement('canvas');
  out.width = chartCanvas.width;
  out.height = headerHeight + chartCanvas.height;
  const ctx = out.getContext('2d');
  if (!ctx) return Promise.resolve(null);

  const bg = dark ? '#09090b' : '#ffffff';
  const text = dark ? '#e4e4e7' : '#18181b';
  const muted = dark ? '#a1a1aa' : '#52525b';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.textBaseline = 'top';

  let y = pad;
  ctx.fillStyle = text;
  ctx.font = `bold ${px(16)}px sans-serif`;
  ctx.fillText('Multimeter chart', pad, y, out.width - 2 * pad);
  y += px(29);

  ctx.fillStyle = muted;
  ctx.font = `${px(12)}px sans-serif`;
  const range =
    Number.isFinite(options.startSeconds) && Number.isFinite(options.endSeconds)
      ? `${new Date(options.startSeconds! * 1000).toLocaleString()} 窶・${new Date(options.endSeconds! * 1000).toLocaleString()}`
      : 'Unavailable';
  for (const label of [
    `Captured: ${new Date().toLocaleString()}`,
    `Window: ${windowLabel}`,
    `Displayed time: ${range}`,
    ...(truncated ? ['Note: oldest live samples have been discarded'] : []),
  ]) {
    ctx.fillText(label, pad, y, out.width - 2 * pad);
    y += line;
  }

  if (series.length === 0) {
    ctx.fillText('No series', pad, y);
  } else {
    for (const item of series) {
      ctx.fillStyle = item.color;
      ctx.fillRect(pad, y + px(4), px(10), px(10));
      ctx.fillStyle = text;
      ctx.fillText(
        `${item.label}${item.unit ? ` (${item.unit})` : ''}`,
        pad + px(17),
        y,
        out.width - 2 * pad - px(17),
      );
      y += legendLine;
    }
  }

  ctx.drawImage(chartCanvas, 0, headerHeight);
  return new Promise(resolve => out.toBlob(blob => resolve(blob), 'image/png'));
}
