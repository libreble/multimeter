# @libreble/multimeter-vue

> Vue composables for BLE multimeters: live readout, recording, and session management with almost no glue.

[![npm](https://img.shields.io/npm/v/@libreble/multimeter-vue)](https://www.npmjs.com/package/@libreble/multimeter-vue)
[![license](https://img.shields.io/npm/l/@libreble/multimeter-vue)](./LICENSE)

Thin Vue composables over the framework-agnostic engines in `@libreble/multimeter-web-bluetooth`
and `@libreble/multimeter-recorder`, returning reactive `computed` refs. The same four hooks as
[`@libreble/multimeter-react`](https://www.npmjs.com/package/@libreble/multimeter-react), over the same
engines.

## Install

```sh
npm install @libreble/multimeter-vue
```

Peer dependency: **Vue ≥ 3.4**. Connecting to real hardware needs Web Bluetooth — a
Chromium-based browser in a secure context (HTTPS or `localhost`).

## Quick start

```vue
<script setup lang="ts">
import { useMeter, useRecorder } from '@libreble/multimeter-vue';

const meter = useMeter();
const recorder = useRecorder(meter.reading); // pass the reactive reading ref
</script>

<template>
  <button @click="meter.connect()">Connect</button>
  <p>{{ meter.state }} — {{ meter.reading?.displayText }} {{ meter.reading?.displayUnit }}</p>
  <button @click="recorder.recState.value === 'recording' ? recorder.stop() : recorder.record('session')">
    {{ recorder.recState.value === 'recording' ? 'Stop' : 'Record' }}
  </button>
</template>
```

Append `?demo` to the page URL to auto-connect a synthetic stream (no hardware, any browser).

## API

- `useMeter()` — connection + live reading. Returns reactive refs `{ state, reading,
  deviceName, error }` plus controls `{ connect, reconnect, disconnect, toggleBacklight }`
  (`MeterState`).
- `useRecorder(reading)` — recording engine bound to a reading ref. Exposes snapshot refs
  (`recState`, `stats`, `samples`, `segment`, `recCount`, `csvTarget`, …) plus controls
  `record(name)` / `pause` / `resume` / `stop` / `resetStats`.
- `useSessions()` — browse/reopen/export saved sessions (`OpenedSession`).
- `usePinSession()` — pin/capture individual readings hands-free.

Each composable creates its own engine instance and disposes it on scope teardown
(`onScopeDispose`). Fully typed.

## Compatibility

- Vue ≥ 3.4.
- Real connections: Chromium-based browser, secure context, user gesture (see
  `@libreble/multimeter-web-bluetooth`). Demo mode works everywhere.
- Devices: UNI-T UT60BT (via `@libreble/multimeter-protocol`).

## Related packages

- [`@libreble/multimeter-protocol`](https://www.npmjs.com/package/@libreble/multimeter-protocol) — pure decode/model core.
- [`@libreble/multimeter-web-bluetooth`](https://www.npmjs.com/package/@libreble/multimeter-web-bluetooth) — transport + `MeterSession`.
- [`@libreble/multimeter-recorder`](https://www.npmjs.com/package/@libreble/multimeter-recorder) — recording engine + IndexedDB store.
- [`@libreble/multimeter-react`](https://www.npmjs.com/package/@libreble/multimeter-react) — the same four hooks as React hooks.

Monorepo: <https://github.com/libreble/multimeter>

## License

MIT © mannes
