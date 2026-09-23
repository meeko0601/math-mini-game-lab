let audioContext;

function getAudioContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  audioContext ??= new AudioContext();
  return audioContext;
}

function tone(frequency, start, duration, volume = 0.06) {
  const context = getAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

/** 音素材を増やさず、Web Audio APIだけで短い合図を鳴らします。 */
export function playSound(name, enabled = true) {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") context.resume();
  const now = context.currentTime;
  if (name === "success") {
    tone(523, now, 0.13);
    tone(659, now + 0.1, 0.13);
    tone(784, now + 0.2, 0.18);
  } else if (name === "move") {
    tone(440, now, 0.08, 0.035);
  } else {
    tone(294, now, 0.12, 0.035);
  }
}
