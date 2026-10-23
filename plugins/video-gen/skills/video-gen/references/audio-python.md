# Audio: Python only (MIDI + synthesizer)

All sound is made in Python. Output: one `./video/audio/track.wav`, 48 kHz, stereo, 16-bit.
Length must match the video length in seconds.

## Install

```bash
uv run --with numpy --with soundfile --with mido python make_audio.py
```

No venv setup needed. For SoundFont playback also install FluidSynth:
`brew install fluid-synth` (macOS, no sudo) or `sudo dnf install fluidsynth` (Fedora: hand to human).
A General MIDI SoundFont (`.sf2`) is needed; ask the human for a path if none is in the project.

## Path 1: synthesizer in numpy (default, no extra deps)

```python
import numpy as np
import soundfile as sf

SR = 48_000
BPM = 120
BEAT = 60 / BPM


def note_hz(midi: int) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def adsr(n: int, a=0.01, d=0.1, s=0.6, r=0.2) -> np.ndarray:
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    sus = max(n - a - d - r, 0)
    return np.concatenate([
        np.linspace(0, 1, a, endpoint=False),
        np.linspace(1, s, d, endpoint=False),
        np.full(sus, s),
        np.linspace(s, 0, r),
    ])[:n]


def voice(midi: int, secs: float, wave="saw") -> np.ndarray:
    t = np.arange(int(secs * SR)) / SR
    ph = (t * note_hz(midi)) % 1.0
    osc = {"sine": np.sin(2 * np.pi * ph), "saw": 2 * ph - 1, "square": np.sign(ph - 0.5)}[wave]
    return osc * adsr(len(t))


def kick(secs=0.4) -> np.ndarray:
    t = np.arange(int(secs * SR)) / SR
    f = 50 + 100 * np.exp(-t * 30)  # pitch drop
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8)


def place(buf: np.ndarray, sig: np.ndarray, at_s: float, gain=0.5) -> None:
    i = int(at_s * SR)
    j = min(i + len(sig), len(buf))
    buf[i:j] += gain * sig[: j - i]


LENGTH = 10.0  # seconds, = video length
mix = np.zeros(int(LENGTH * SR))
for b in range(int(LENGTH / BEAT)):
    place(mix, kick(), b * BEAT, 0.8)
for k, n in enumerate([57, 60, 64, 67] * 5):
    place(mix, voice(n, BEAT * 0.9), k * BEAT / 2, 0.2)

mix /= max(1.0, np.abs(mix).max())  # prevent clipping, no loudness analysis
sf.write("video/audio/track.wav", np.column_stack([mix, mix]), SR, subtype="PCM_16")
```

## Path 2: MIDI file + FluidSynth

Write the MIDI with `mido`:

```python
import mido

mid = mido.MidiFile(ticks_per_beat=480)
tr = mido.MidiTrack()
mid.tracks.append(tr)
tr.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(120)))
for n in [60, 64, 67, 72]:
    tr.append(mido.Message("note_on", note=n, velocity=90, time=0))
    tr.append(mido.Message("note_off", note=n, velocity=0, time=480))
mid.save("video/audio/song.mid")
```

Render it:

```bash
fluidsynth -ni -F video/audio/track.wav -r 48000 /path/to/soundfont.sf2 video/audio/song.mid
```

## Rules

- No randomness without a fixed seed (`np.random.default_rng(42)`).
- Do not play, analyze, or describe the audio (HARD RULE). Report the file path and length.
