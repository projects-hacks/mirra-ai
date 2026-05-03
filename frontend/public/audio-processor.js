/**
 * AudioWorklet processor — captures PCM audio and sends to main thread.
 * Runs on a separate thread (no UI jank).
 *
 * Converts Float32 samples to Int16 PCM for Deepgram.
 */
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const samples = input[0];
    const pcm = new Int16Array(samples.length);

    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this.port.postMessage(pcm.buffer, [pcm.buffer]);
    return true;
  }
}

registerProcessor("audio-processor", AudioProcessor);
