# Jackonika

MIDI‑In stompbox adapter for the Tonika rack.
Pick a MIDI input device (Web MIDI), blink an LED on activity, and emit normalized goblin‑events (noteon, noteoff, cc) that you can route to any module (e.g., Clavonika to highlight keys).

## Features

- Web MIDI input (device picker, channel filter: Omni/1–16)
- Activity LED (blinks on events)
- “Panic” button (All Notes Off, CC 123 across 16 channels)
- Tiny, embeddable UI (stompbox vibe)
- Outputs normalized events via a simple port API

## Requirements

- A Chromium‑based browser with Web MIDI support (Chrome, Edge, Brave).
- If you use macOS + MIDI hardware, ensure the device is visible in Audio MIDI Setup.
- Local dev server (e.g., http-server).

## Install / Build / Run

```bash
npm install
npm run build
npm run dev

visit http://127.0.0.1:8080/demo/
```

## Quick Usage (standalone)

```html
<link rel="stylesheet" href="./dist/jackonika_style.css" />
<div id="jack"></div>

<script src="./dist/jackonika.iife.js"></script>
<script>
  const jack = Jackonika.create("#jack", { channel: "omni" });
  jack.output.on((e) => console.log(e)); // {type:'noteon'|'noteoff'|'cc', ...}
</script>
```

## Patching into Clavonika (example)

```html
<link rel="stylesheet" href="../clavonika/dist/clavonika_style.css" />
<div id="kb"></div>

<script src="../clavonika/dist/clavonika.iife.js"></script>
<script src="./dist/jackonika.iife.js"></script>
<script src="./rack/backplanika.iife.js"></script>
<script>
  const jack = Jackonika.create("#jack", { channel: "omni" });
  const kb = Clavonika.create("#kb", { start: "C2", end: "C7", labels: true });

  // Adapt Clavonika to a sink “port”
  const clavSink = {
    emit(e) {
      if (e.type === "noteon") kb.highlight(e.note);
      if (e.type === "noteoff") kb.unhighlight(e.note);
    },
  };

  // One‑liner patch:
  const unplug = Backplanika.connect(jack.output, clavSink);
</script>
```

## Backplanika — tiny router (event backplane)

**What it is:** a microscopic helper to connect module ports. One per rack, reused everywhere.

**Why:** avoids rewriting src.output.on(e => dst.emit(e)) in every demo.

### Block diagram

```
[Jackonika output] ──► [Backplanika.connect] ──► [Clavonika sink]
(events)                 (pass)                 (highlight keys)
```

### Port shape

Every module exposes “ports”:

```ts
type Port = {
  on(fn: (e: any) => void): () => void; // subscribe; returns unsubscribe
  emit(e: any): void; // for sinks/adapters/internal
};
```

### File layout (ready to extract later)

```
rack/
  backplanika.js        # ESM version (importable)
  backplanika.iife.js   # browser global version (window.Backplanika)
```

### Event format (from Jackonika)

```ts
type GoblinEvent =
  | { type: "noteon"; ch: number; note: number; vel: number; ts?: number }
  | { type: "noteoff"; ch: number; note: number; ts?: number }
  | { type: "cc"; ch: number; cc: number; value: number; ts?: number };
```

## License

MIT
