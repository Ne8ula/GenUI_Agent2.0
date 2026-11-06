import type { SpeechResources } from './speech.ts';

type Environment = {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createAudioContext?: (options: AudioContextOptions) => AudioContext;
  createWorkletNode?: (context: AudioContext, name: string, options: AudioWorkletNodeOptions) => AudioWorkletNode;
  createAudio?: (url: string) => HTMLAudioElement;
  createObjectURL?: (blob: Blob) => string;
  revokeObjectURL?: (url: string) => void;
};

export function createBrowserSpeechResources(environment: Environment = {}): SpeechResources {
  return {
    startCapture(signal, onChunk, onEnded) {
      return new Promise<{ stop(): void }>((resolve, reject) => {
        let stopped = false;
        let stream: MediaStream | undefined;
        let context: AudioContext | undefined;
        let source: MediaStreamAudioSourceNode | undefined;
        let node: AudioWorkletNode | undefined;
        const stop = () => {
          if (stopped) return;
          stopped = true;
          signal.removeEventListener('abort', abort);
          let failure = false;
          const release = (action: () => void) => { try { action(); } catch { failure = true; } };
          if (node) { node.port.onmessage = null; node.onprocessorerror = null; }
          for (const track of stream?.getTracks() ?? []) {
            track.removeEventListener('ended', lost);
            release(() => track.stop());
          }
          release(() => source?.disconnect());
          release(() => node?.disconnect());
          release(() => node?.port.close());
          release(() => { void context?.close().catch(() => {}); });
          if (failure) throw new Error('Microphone cleanup failed.');
        };
        const abort = () => {
          try { stop(); } catch { /* Cancellation must still settle if cleanup fails. */ }
          reject(signal.reason);
        };
        const lost = () => {
          if (stopped) return;
          try { stop(); } catch { /* Report the device failure without device details. */ }
          reject(new Error('Microphone ended.'));
          onEnded();
        };
        if (signal.aborted) { reject(signal.reason); return; }
        signal.addEventListener('abort', abort, { once: true });
        void (async () => {
          const acquired = await (environment.getUserMedia ?? (constraints => navigator.mediaDevices.getUserMedia(constraints)))({
            audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false,
          });
          if (stopped) { for (const track of acquired.getTracks()) track.stop(); return; }
          stream = acquired;
          for (const track of stream.getTracks()) track.addEventListener('ended', lost);
          context = environment.createAudioContext ? environment.createAudioContext({ sampleRate: 16000 }) : new AudioContext({ sampleRate: 16000 });
          if (context.sampleRate !== 16000 || !context.audioWorklet) throw new Error('Mono 16 kHz AudioWorklet is unavailable.');
          await context.audioWorklet.addModule(new URL('./pcm-worklet.js', import.meta.url).href);
          if (stopped) return;
          const options: AudioWorkletNodeOptions = { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 1, channelCountMode: 'explicit' };
          node = environment.createWorkletNode ? environment.createWorkletNode(context, 'eva-mono-pcm', options) : new AudioWorkletNode(context, 'eva-mono-pcm', options);
          node.onprocessorerror = lost;
          node.port.onmessage = event => {
            if (stopped) return;
            if (!(event.data instanceof ArrayBuffer) || !event.data.byteLength || event.data.byteLength > 32000 || event.data.byteLength % 2) { lost(); return; }
            onChunk(new Uint8Array(event.data));
          };
          source = context.createMediaStreamSource(stream);
          source.connect(node);
          node.connect(context.destination);
          await context.resume();
          if (stopped) return;
          if (stream.getTracks().some(track => track.readyState === 'ended')) throw new Error('Microphone ended.');
          resolve({ stop });
        })().catch(error => {
          try { stop(); } catch { /* Cleanup attempts every acquired resource. */ }
          reject(error);
        });
      });
    },
    openSocket: url => new WebSocket(url),
    createPlayback(blob, onEnded, onError) {
      const url = (environment.createObjectURL ?? (value => URL.createObjectURL(value)))(blob);
      const revoke = () => (environment.revokeObjectURL ?? (value => URL.revokeObjectURL(value)))(url);
      let audio: HTMLAudioElement;
      try { audio = environment.createAudio ? environment.createAudio(url) : new Audio(url); }
      catch (error) { revoke(); throw error; }
      let stopped = false;
      const ended = () => { if (!stopped) onEnded(); };
      const error = () => { if (!stopped) onError(); };
      audio.addEventListener('ended', ended);
      audio.addEventListener('error', error);
      return {
        play: () => audio.play(),
        stop() {
          if (stopped) return;
          stopped = true;
          audio.removeEventListener('ended', ended);
          audio.removeEventListener('error', error);
          try { audio.pause(); }
          finally { try { audio.removeAttribute('src'); audio.load(); } finally { revoke(); } }
        },
      };
    },
  };
}
