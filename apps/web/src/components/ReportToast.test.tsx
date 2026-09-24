import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { MeterChannel, Meters } from '@libreble/multimeter-react';
import { ReportToast } from './ReportToast';

function channel(over: Partial<MeterChannel> = {}): MeterChannel {
  return {
    id: 'm-1',
    kind: 'meter',
    label: 'Meter',
    role: 'Meter',
    state: 'idle',
    reading: null,
    deviceName: null,
    error: null,
    controls: [],
    driverId: null,
    cancelled: false,
    ...over,
  };
}

function meters(
  list: MeterChannel[],
  opts: { isDemo?: boolean; describe?: ReturnType<typeof vi.fn> } = {},
): Meters {
  const describe = opts.describe ?? vi.fn().mockResolvedValue(null);
  return {
    meters: list,
    meterSession: () => ({ isDemo: opts.isDemo ?? false, describe }),
  } as unknown as Meters;
}

beforeEach(() => localStorage.clear());

describe('ReportToast', () => {
  it('stays hidden for an idle meter and for confirmed drivers', () => {
    const { container, rerender } = render(<ReportToast meters={meters([channel()])} />);
    expect(container.firstChild).toBeNull();
    rerender(<ReportToast meters={meters([channel({ state: 'live', driverId: 'uni-t' })])} />);
    expect(container.firstChild).toBeNull();
  });

  it('offers a connection-problem report after the chooser is dismissed, until dismissed', () => {
    const { container } = render(<ReportToast meters={meters([channel({ cancelled: true })])} />);
    const link = screen.getByRole('link', { name: /let us know/i });
    expect(link.getAttribute('href')).toContain('template=connection-problem.yml');
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(container.firstChild).toBeNull();
  });

  it('asks once about an unconfirmed driver and opens a pre-filled device report', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const describe = vi.fn().mockResolvedValue({
      name: 'UT181A',
      service: 's',
      characteristics: [],
      deviceInfo: {},
    });
    const live = [channel({ state: 'live', driverId: 'ut181a', deviceName: 'UT181A' })];
    const { container, unmount } = render(<ReportToast meters={meters(live, { describe })} />);
    expect(screen.getByText(/how is your meter working for you/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /let us know/i }));
    await waitFor(() => expect(open).toHaveBeenCalled());
    expect(open.mock.calls[0]![0]).toContain('template=device-report.yml');
    await waitFor(() => expect(container.firstChild).toBeNull());
    open.mockRestore();
    unmount();

    // Remembered per driver: a later session doesn't ask again.
    const again = render(<ReportToast meters={meters(live, { describe })} />);
    expect(again.container.firstChild).toBeNull();
  });

  it('never asks about demo meters', () => {
    const { container } = render(
      <ReportToast
        meters={meters([channel({ state: 'live', driverId: 'ut181a' })], { isDemo: true })}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
