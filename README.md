# Jackonika

A tiny bridge module that connects Web MIDI input devices (keyboards, controllers, virtual ports) to any JavaScript app that understands noteOn / noteOff.

Jackonika doesn’t try to be clever. It has one job:  
listen to MIDI NOTE ON / OFF events, and forward them through simple callbacks.

Think of it as the MIDI IN jack for your browser-based instruments like Clavonika.

## Features
- Lightweight (one file, no dependencies)
- Enumerates all available MIDI input devices
- Simple _select_ dropdown for choosing input
- Handles both real Note Off (0x80) and Note On with velocity=0 (common convention)
- Provides clean callbacks: onNoteOn(note, velocity) and onNoteOff(note)

## Installation

Copy jackonika.js into your project and include it:

```
<script src="js/jackonika.js"></script>
```

## Usage

Minimal example

```  
<!DOCTYPE html>
<html>
  <body>
    <label for="midiDeviceSelector">MIDI Input:</label>
    <select id="midiDeviceSelector"></select>

    <script src="js/jackonika.js"></script>
    <script>
      Jackonika.init({
        onNoteOn:  (note, vel) => console.log("NOTE ON ", note, "vel=", vel),
        onNoteOff: (note)      => console.log("NOTE OFF", note)
      });
    </script>
  </body>
</html>
```  



## Connecting to Clavonika

```
const piano = Clavonika.init('piano-container');  
  
Jackonika.init({  
onNoteOn:  (note, vel) => piano.noteOn?.(note),  
onNoteOff: (note)      => piano.noteOff?.(note),  
});
```

Now, playing your real MIDI keyboard highlights the virtual keys in Clavonika.

## API

Jackonika.init(options)

Initialize Jackonika and populate the device selector.

## Parameters:
- options.selectorId (string, default "midiDeviceSelector")  
  ID of the _select_ element where devices are listed.
- options.onNoteOn(note, velocity) (function, optional)  
  Called when a MIDI Note On is received with velocity > 0.
- options.onNoteOff(note) (function, optional)  
  Called when a MIDI Note Off is received (0x80) or Note On with velocity=0.

## Requirements
- Browser: Chrome, Edge, or any browser supporting Web MIDI API.  
  (Safari and Firefox do not support it yet.)
- Context: Must be served from https:// or http://localhost/ (Web MIDI requires a secure context).
- Device: Any MIDI keyboard, controller, or virtual loopback port (e.g., macOS IAC Driver, loopMIDI on Windows).

### License  MIT © 2025 AAParky  