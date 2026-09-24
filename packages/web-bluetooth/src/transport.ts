// Web Bluetooth transport. Owns the GATT connection and the notify/write characteristics;
// emits raw notification chunks (it does NOT frame — that's the driver's FrameParser) and
// writes command bytes. All BLE quirks live here so the session/UI never touch
// navigator.bluetooth.
//
// Driver-aware: requestDevice offers every registered driver's service UUID + name prefix,
// and after connecting we pick the first profile whose GATT service the device actually
// exposes. For the UT60BT
// the matched profile is uni-t (ISSC Transparent UART, docs/protocols/uni-t.md).

import { drivers, allNamePrefixes, type DriverGattProfile } from '@libreble/multimeter-protocol';

const DEVICE_INFO_SERVICE = 0x180a; // model/serial/firmware strings — nice-to-have

// Opt-in raw BLE tracing for bringing up an unverified driver against real hardware. Enable in the
// browser console with `localStorage.bleDebug = 1` (then reload), disable with `delete
// localStorage.bleDebug`. Off by default → zero output in normal use and in tests/node.
const bleDebugOn = (): boolean => {
  try {
    return typeof localStorage !== 'undefined' && !!localStorage.getItem('bleDebug');
  } catch {
    return false;
  }
};
const hex = (b: Uint8Array): string => [...b].map(x => x.toString(16).padStart(2, '0')).join(' ');
const dbg = (...a: unknown[]): void => {
  if (bleDebugOn()) console.log('[ble]', ...a);
};

export interface TransportProfile {
  id: string;
  gatt: DriverGattProfile;
}

/**
 * What a connected device exposes — identifiers and GATT layout, no measurement data. Feeds the
 * in-app device report, so a user can tell us how an unconfirmed meter behaves.
 */
export interface GattDescription {
  name: string | null;
  service: string | null; // the matched driver service
  characteristics: { uuid: string; properties: string[] }[];
  deviceInfo: Record<string, string>; // Device Information Service strings, when the meter has one
}

// Device Information Service (0x180a) strings worth reporting.
const DEVICE_INFO_STRINGS: Record<string, number> = {
  manufacturer: 0x2a29,
  model: 0x2a24,
  hardware: 0x2a27,
  firmware: 0x2a26,
  software: 0x2a28,
};

const CHAR_FLAGS = ['notify', 'indicate', 'read', 'write', 'writeWithoutResponse'] as const;
const charFlags = (c: BluetoothRemoteGATTCharacteristic): string[] =>
  CHAR_FLAGS.filter(k => c.properties[k]);

const registryProfiles = (): TransportProfile[] => drivers.map(d => ({ id: d.id, gatt: d.gatt }));

export class Transport {
  onChunk?: (bytes: Uint8Array) => void;
  onDisconnect?: () => void;

  private device?: BluetoothDevice;
  private server?: BluetoothRemoteGATTServer;
  private notifyChar: BluetoothRemoteGATTCharacteristic | undefined;
  private writeChar: BluetoothRemoteGATTCharacteristic | undefined;
  private profile?: DriverGattProfile; // the matched driver's GATT profile (for reconnect)
  private matchedId?: string;
  private chars: BluetoothRemoteGATTCharacteristic[] = [];

  static get supported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.bluetooth;
  }

  get deviceName(): string | undefined {
    return this.device?.name;
  }

  /** True once the user picked a device in the chooser (false if they dismissed it). */
  get chosen(): boolean {
    return !!this.device;
  }

  get connected(): boolean {
    return !!this.server?.connected;
  }

  /** The id of the driver whose GATT profile matched this device (set after connect). */
  get driverId(): string | undefined {
    return this.matchedId;
  }

  /**
   * Native chooser → GATT connect → match a driver profile → subscribe. User-gesture
   * required. Returns the matched driver id. Defaults offer the whole registry.
   */
  async requestAndConnect(
    profiles: TransportProfile[] = registryProfiles(),
    namePrefixes: string[] = allNamePrefixes(),
  ): Promise<string> {
    const services = [...new Set(profiles.map(p => p.gatt.service))];
    // Match by advertised name prefix OR by service UUID. The UT60BT advertises a name, but the
    // 0xFFF0 family (bdm/owon/voltcraft) advertises inconsistent or blank names — so a service
    // filter is what makes those discoverable. A device shows
    // in the chooser if it matches ANY filter.
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        ...namePrefixes.map(namePrefix => ({ namePrefix })),
        ...services.map(service => ({ services: [service] })),
      ],
      optionalServices: [...services, DEVICE_INFO_SERVICE],
    });
    this.device = device;
    device.addEventListener('gattserverdisconnected', this.handleDisconnect);
    await this.openGatt(profiles);
    return this.matchedId!;
  }

  /** Re-open GATT on the already-chosen device (after a drop). Caller re-runs the handshake. */
  async reconnect(): Promise<void> {
    if (!this.device?.gatt) throw new Error('no device to reconnect to');
    // Re-match only the previously chosen profile.
    await this.openGatt(
      this.profile && this.matchedId
        ? [{ id: this.matchedId, gatt: this.profile }]
        : registryProfiles(),
    );
  }

  // Accept a plain Uint8Array; Web Bluetooth's writeValue* wants a BufferSource backed by a
  // real ArrayBuffer, so copy only when the view isn't already ArrayBuffer-backed.
  async write(bytes: Uint8Array): Promise<void> {
    const c = this.writeChar;
    if (!c) throw new Error('no write characteristic');
    const buf: Uint8Array<ArrayBuffer> =
      bytes.buffer instanceof ArrayBuffer
        ? (bytes as Uint8Array<ArrayBuffer>)
        : new Uint8Array(bytes);
    if (c.properties.writeWithoutResponse) await c.writeValueWithoutResponse(buf);
    else await c.writeValueWithResponse(buf);
  }

  disconnect(): void {
    try {
      this.server?.disconnect();
    } catch {
      /* already gone */
    }
  }

  private async openGatt(profiles: TransportProfile[]): Promise<void> {
    const server = await this.device!.gatt!.connect();
    this.server = server;

    // Pick the first profile whose service the device exposes.
    let svc: BluetoothRemoteGATTService | undefined;
    let chosen: TransportProfile | undefined;
    for (const p of profiles) {
      try {
        svc = await server.getPrimaryService(p.gatt.service);
        chosen = p;
        break;
      } catch {
        /* not this profile — try the next */
      }
    }
    if (!svc || !chosen) throw new Error('no known multimeter GATT service on this device');
    this.profile = chosen.gatt;
    this.matchedId = chosen.id;

    const chars = await svc.getCharacteristics();
    this.chars = chars;
    dbg(`matched id=${chosen.id} service=${chosen.gatt.service}; characteristics:`);
    for (const c of chars) dbg(`  ${c.uuid}  [${charFlags(c).join(',')}]`);
    // Prefer the profile's UUIDs; fall back to characteristic properties so a firmware
    // reshuffle doesn't strand us.
    this.notifyChar =
      chars.find(c => c.uuid === chosen.gatt.notify) ?? chars.find(c => c.properties.notify);
    this.writeChar =
      chosen.gatt.write.map(u => chars.find(c => c.uuid === u)).find(Boolean) ??
      chars.find(c => c.properties.write || c.properties.writeWithoutResponse);

    if (!this.notifyChar || !this.writeChar) {
      throw new Error('notify/write characteristics not found on this device');
    }
    dbg(`subscribing notify=${this.notifyChar.uuid} write=${this.writeChar.uuid}`);

    await this.notifyChar.startNotifications();
    this.notifyChar.addEventListener('characteristicvaluechanged', this.handleValue);
  }

  /**
   * Identifiers + GATT layout of the chosen device, for the device report. The Device Information
   * reads are best-effort and on demand (only when the user opens a report), so they never sit in
   * the connect path.
   */
  async describe(): Promise<GattDescription> {
    const deviceInfo: Record<string, string> = {};
    if (this.server?.connected) {
      try {
        const dis = await this.server.getPrimaryService(DEVICE_INFO_SERVICE);
        // Sequential: Android rejects concurrent GATT operations.
        for (const [key, uuid] of Object.entries(DEVICE_INFO_STRINGS)) {
          try {
            const v = await (await dis.getCharacteristic(uuid)).readValue();
            const text = new TextDecoder().decode(v).replace(/\0+$/, '').trim();
            if (text) deviceInfo[key] = text;
          } catch {
            /* this string isn't exposed */
          }
        }
      } catch {
        /* no Device Information Service */
      }
    }
    return {
      name: this.device?.name ?? null,
      service: this.profile?.service ?? null,
      characteristics: this.chars.map(c => ({ uuid: c.uuid, properties: charFlags(c) })),
      deviceInfo,
    };
  }

  private handleValue = (e: Event): void => {
    const dv = (e.target as BluetoothRemoteGATTCharacteristic).value;
    if (!dv) return;
    const bytes = new Uint8Array(dv.buffer.slice(dv.byteOffset, dv.byteOffset + dv.byteLength));
    dbg(`notify ${bytes.length}B: ${hex(bytes)}`);
    this.onChunk?.(bytes);
  };

  private handleDisconnect = (): void => {
    this.onDisconnect?.();
  };
}
