// jackonika.js (standalone Jackonika)
(function () {
    let currentInput = null;
    let midiAccess = null;

    /**
     * Jackonika.init(options)
     * options: {
     *   selectorId?: string,           // default: "midiDeviceSelector"
     *   onNoteOn?: (note, vel) => void,
     *   onNoteOff?: (note) => void
     * }
     */
    async function init(options = {}) {
        const {
            selectorId = "midiDeviceSelector",
            onNoteOn,
            onNoteOff,
        } = options;

        if (!navigator.requestMIDIAccess) {
            console.warn("Web MIDI API not supported in this browser.");
            return;
        }

        try {
            midiAccess = await navigator.requestMIDIAccess({ sysex: false });
        } catch (err) {
            console.warn("Failed to get MIDI access:", err);
            return;
        }

        midiAccess.onstatechange = refreshDevices;

        // Ensure a selector exists
        let selector = document.getElementById(selectorId);
        if (!selector) {
            selector = document.createElement("select");
            selector.id = selectorId;
            document.body.insertBefore(selector, document.body.firstChild);
        }
        selector.addEventListener("change", () => setCurrentInput(selector.value, { onNoteOn, onNoteOff }));

        refreshDevices({ onNoteOn, onNoteOff });
    }

    function refreshDevices(ctx = {}) {
        const selector = document.getElementById("midiDeviceSelector");
        if (!selector || !midiAccess) return;

        selector.innerHTML = ""; // clear old options

        const inputs = Array.from(midiAccess.inputs.values());
        inputs.forEach((input, i) => {
            const opt = document.createElement("option");
            opt.value = input.id;
            opt.textContent = `${input.name} (${input.manufacturer || "Unknown"})`;
            selector.appendChild(opt);
            if (i === 0) setCurrentInput(input.id, ctx); // default: first device
        });
    }

    function setCurrentInput(inputId, { onNoteOn, onNoteOff }) {
        if (currentInput) currentInput.onmidimessage = null;

        currentInput = midiAccess.inputs.get(inputId);
        if (currentInput) {
            console.log(`🎹 Connected to: ${currentInput.name}`);
            currentInput.onmidimessage = (evt) => handleMIDIMessage(evt, { onNoteOn, onNoteOff });
        }
    }

    function handleMIDIMessage({ data }, { onNoteOn, onNoteOff }) {
        const [status, note, vel] = data;
        const type = status & 0xf0;

        if (type === 0x90 && vel > 0) {
            console.log(`NOTE ON  -> ${note} vel=${vel}`);
            onNoteOn?.(note, vel);
        } else if (type === 0x80) {
            console.log(`NOTE OFF -> ${note} (real Note Off)`);
            onNoteOff?.(note);
        } else if (type === 0x90 && vel === 0) {
            console.log(`NOTE OFF -> ${note} (Note On with vel=0 convention)`);
            onNoteOff?.(note);
        }
    }

    // Expose globally
    window.Jackonika = { init };
})();