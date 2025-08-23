/* Jackonika — MIDI In stompbox adapter (global IIFE: `Jackonika`)
   Responsibilities:
   - Request Web MIDI access
   - Let user pick an input device
   - Convert MIDI to rack events ({type:'noteon'|'noteoff'|'cc'...})
   - Emit via an output port
   - Blink LED on activity; show status

   Public API:
	 const box = Jackonika.create('#el', { channel: 'omni'|1..16 });
	 box.output.on(e => { ... });       // subscribe to events
	 box.dispose();

   Port shape:
	 { on(fn): unsubscribeFn, emit(e) } // emit is internal for adapters
*/

function createPort() {
  const subs = new Set();
  return {
    on(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    emit(e) {
      subs.forEach((fn) => fn(e));
    },
  };
}

function h(tag, cls, attrs = {}) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  for (const [k, v] of Object.entries(attrs))
    if (v != null) n.setAttribute(k, v);
  return n;
}

function midiStatusText(supported, granted) {
  if (!supported) return "Web MIDI not supported";
  if (!granted) return "Permission required";
  return "OK";
}

function withinChan(filter, ch) {
  if (filter === "omni") return true;
  return (ch | 0) === (filter | 0);
}

function create(selectorOrEl, opts = {}) {
  const root =
    typeof selectorOrEl === "string"
      ? document.querySelector(selectorOrEl)
      : selectorOrEl;
  if (!root) throw new Error("Jackonika: target element not found");

  const options = {
    channel: opts.channel ?? "omni", // 1..16 or 'omni'
    velocityMode: opts.velocityMode ?? "raw", // future: curves
  };

  const output = createPort();

  // UI: stompbox
  const wrap = h("div", "jackonika");
  const head = h("div", "jacko__head");
  const title = h("div", "jacko__title", {
    role: "heading",
    "aria-level": "2",
  });
  title.textContent = "Jackonika — MIDI In";
  const led = h("div", "jacko__led", { "aria-hidden": "true" });
  head.append(title, led);

  const row1 = h("div", "jacko__row");
  const devSel = h("select", "jacko__select", {
    "aria-label": "MIDI Input Device",
  });
  const chSel = h("select", "jacko__select", {
    "aria-label": "Channel Filter",
  });
  chSel.innerHTML = `<option value="omni">Omni</option>${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}">Ch ${i + 1}</option>`).join("")}`;
  if (options.channel !== "omni") chSel.value = String(options.channel);
  row1.append(devSel, chSel);

  const status = h("div", "jacko__status");
  status.textContent = "Initializing…";

  const foot = h("div", "jacko__foot");
  const panicBtn = h("button", "jacko__button", { type: "button" });
  panicBtn.textContent = "Panic (All Notes Off)";
  foot.append(panicBtn);

  wrap.append(head, row1, status, foot);
  root.innerHTML = "";
  root.appendChild(wrap);

  // MIDI plumbing
  let access = null;
  let input = null;
  let supported = !!navigator.requestMIDIAccess;

  function setStatus(msg) {
    status.textContent = msg;
  }

  function blink() {
    led.classList.add("is-on");
    clearTimeout(blink._t);
    blink._t = setTimeout(() => led.classList.remove("is-on"), 120);
  }

  function populateDevices() {
    const inputs = access ? Array.from(access.inputs.values()) : [];
    devSel.innerHTML =
      inputs
        .map((i) => `<option value="${i.id}">${i.name}</option>`)
        .join("") || "<option>No inputs</option>";
    return inputs;
  }

  function bindToSelected() {
    if (!access) return;
    if (input) input.onmidimessage = null;
    const id = devSel.value;
    input = Array.from(access.inputs.values()).find((i) => i.id === id) || null;
    if (!input) return;
    input.onmidimessage = onMIDIMessage;
  }

  function onStateChange() {
    populateDevices();
    bindToSelected();
  }

  function onMIDIMessage(msg) {
    const [s, d1, d2] = msg.data;
    const ts = msg.timeStamp;
    const typeHi = s & 0xf0;
    const ch = (s & 0x0f) + 1;

    // channel filter
    if (!withinChan(options.channel, ch) && typeHi >= 0x80 && typeHi <= 0xe0)
      return;

    if (typeHi === 0x90 && d2 > 0) {
      blink();
      output.emit({ type: "noteon", ch, note: d1, vel: d2 / 127, ts });
    } else if (typeHi === 0x80 || (typeHi === 0x90 && d2 === 0)) {
      blink();
      output.emit({ type: "noteoff", ch, note: d1, ts });
    } else if (typeHi === 0xb0) {
      blink();
      output.emit({ type: "cc", ch, cc: d1, value: d2, ts });
    } else if (typeHi === 0xf0) {
      // ignore system for now
    }
  }

  async function init() {
    if (!supported) {
      setStatus(midiStatusText(false, false));
      return;
    }
    try {
      access = await navigator.requestMIDIAccess({ sysex: false });
      setStatus("MIDI ready");
      populateDevices();
      bindToSelected();
      access.onstatechange = onStateChange;
    } catch (e) {
      setStatus("Permission denied");
    }
  }

  // UI handlers
  devSel.addEventListener("change", bindToSelected);
  chSel.addEventListener("change", () => {
    options.channel =
      chSel.value === "omni" ? "omni" : parseInt(chSel.value, 10);
  });
  panicBtn.addEventListener("click", () => {
    // emit all-notes-off across 16 channels for safety (rack utilities may listen)
    for (let ch = 1; ch <= 16; ch++)
      output.emit({ type: "cc", ch, cc: 123, value: 0 }); // All Notes Off
  });

  init();

  // public
  return {
    root,
    output,
    dispose() {
      if (input) input.onmidimessage = null;
      if (access) access.onstatechange = null;
      root.removeChild(wrap);
    },
  };
}

const Jackonika = { create };
export { create };
export default Jackonika;
