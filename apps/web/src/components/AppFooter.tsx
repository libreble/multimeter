// One centered line: libreble · GitHub · Report an issue · build version. Colours come from the
// zinc ramp, which index.css mirrors per theme; the libreble accent opts in via `dark:`.

const REPO = 'https://github.com/libreble/multimeter';
/** A clean tag build ("v1.2.0") links to its release; anything else is shown as plain text. */
const RELEASE = /^v\d+\.\d+\.\d+$/.test(__APP_VERSION__)
  ? `${REPO}/releases/tag/${__APP_VERSION__}`
  : null;

const LINK = 'inline-flex items-center gap-1.5 hover:text-zinc-300';

export function AppFooter() {
  return (
    <footer className="border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500">
      <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <a href="https://libreble.github.io/" className={LINK}>
          <LibrebleMark />
          <span>
            Part of{' '}
            <span className="font-medium">
              libre<span className="text-[#c2410c] dark:text-[#ffa259]">ble</span>
            </span>
          </span>
        </a>
        <a href={REPO} target="_blank" rel="noopener noreferrer" className={LINK}>
          <GitHubMark />
          GitHub
        </a>
        <a
          href={`${REPO}/issues/new/choose`}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK}
        >
          Report an issue
        </a>
        {RELEASE ? (
          <a
            href={RELEASE}
            target="_blank"
            rel="noopener noreferrer"
            className={`${LINK} font-mono`}
          >
            {__APP_VERSION__}
          </a>
        ) : (
          <span className="font-mono">{__APP_VERSION__}</span>
        )}
      </p>
    </footer>
  );
}

/** The libreble "open beacon": an LED inside two rings opening to the top right. */
function LibrebleMark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-4 w-4">
      <g
        transform="translate(32 32) rotate(-45) translate(-32 -32)"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      >
        <path d="M44.36 40.50A15 15 0 1 1 44.36 23.50" />
        <path d="M54.69 42.50A25 25 0 1 1 54.69 21.50" />
      </g>
      <circle cx="32" cy="32" r="6.5" className="fill-[#f26b1d] dark:fill-[#ff8a3d]" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
