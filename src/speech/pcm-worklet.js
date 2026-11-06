class MonoPcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // shortcut: stop discards an unfinished (<100 ms) batch; revisit after hardware dictation trials.
    this.buffer = new ArrayBuffer(3200);
    this.view = new DataView(this.buffer);
    this.offset = 0;
  }
  process(inputs, outputs) {
    for (const output of outputs) for (const channel of output) channel.fill(0);
    const samples = inputs[0]?.[0];
    if (!samples) return true;
    for (const value of samples) {
      const sample = Math.max(-1, Math.min(1, value));
      this.view.setInt16(this.offset, Math.round(sample < 0 ? sample * 32768 : sample * 32767), true);
      this.offset += 2;
      if (this.offset === this.buffer.byteLength) {
        this.port.postMessage(this.buffer, [this.buffer]);
        this.buffer = new ArrayBuffer(3200);
        this.view = new DataView(this.buffer);
        this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('eva-mono-pcm', MonoPcmProcessor);
