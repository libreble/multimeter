import { describe, it, expect } from 'vitest';
import { connectionProblemUrl, deviceReportUrl, verification } from './report';

const params = (url: string) => new URL(url).searchParams;

describe('device report URLs', () => {
  it('pre-fills the device-report form with identifiers and GATT layout only', () => {
    const url = deviceReportUrl('uni-t', {
      name: 'UT60BT_AB',
      service: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      characteristics: [{ uuid: '49535343-1e4d-4bd9-ba61-23c647249616', properties: ['notify'] }],
      deviceInfo: { firmware: '1.2' },
    });
    expect(url.startsWith('https://github.com/libreble/multimeter/issues/new?')).toBe(true);
    const p = params(url);
    expect(p.get('template')).toBe('device-report.yml');
    expect(p.get('title')).toBe('Device report: UT60BT_AB');
    const c = p.get('connection')!;
    expect(c).toContain('advertised name: UT60BT_AB');
    expect(c).toContain('driver: uni-t');
    expect(c).toContain('49535343-1e4d-4bd9-ba61-23c647249616 [notify]');
    expect(c).toContain('firmware: 1.2');
    // Short enough for GitHub's URL limit.
    expect(url.length).toBeLessThan(4000);
  });

  it('pre-fills the connection-problem form with the error, if any', () => {
    const p = params(connectionProblemUrl('NetworkError: GATT server disconnected'));
    expect(p.get('template')).toBe('connection-problem.yml');
    expect(p.get('environment')).toContain('error: NetworkError: GATT server disconnected');
    expect(params(connectionProblemUrl(null)).get('environment')).not.toContain('error:');
  });

  it('maps drivers to their verification tier', () => {
    expect(verification('uni-t')).toBe('live-tested');
    expect(verification('ut181a')).toBe('ported-unverified');
    expect(verification(null)).toBeNull();
  });
});
