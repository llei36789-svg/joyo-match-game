import { AudioClip, AudioSource, Node, resources } from "cc";

type WebAudioGlobal = typeof globalThis & {
  AudioContext?: new () => WebAudioContext;
  webkitAudioContext?: new () => WebAudioContext;
};

interface WebAudioContext {
  currentTime: number;
  destination: unknown;
  createOscillator(): WebOscillator;
  createGain(): WebGain;
}

interface WebOscillator {
  type: string;
  frequency: {
    setValueAtTime(value: number, startTime: number): void;
    exponentialRampToValueAtTime(value: number, endTime: number): void;
  };
  connect(target: unknown): void;
  start(startTime?: number): void;
  stop(endTime?: number): void;
}

interface WebGain {
  gain: {
    setValueAtTime(value: number, startTime: number): void;
    exponentialRampToValueAtTime(value: number, endTime: number): void;
  };
  connect(target: unknown): void;
}

export class SoundManager {
  private readonly audioSource: AudioSource;
  private clearClip: AudioClip | null = null;
  private webAudioContext: WebAudioContext | null = null;
  private lastClearAtMs = 0;

  constructor(rootNode: Node) {
    this.audioSource = rootNode.addComponent(AudioSource);
    this.audioSource.volume = 0.72;
    this.loadClearClip();
  }

  playClear(chainStep: number): void {
    const now = Date.now();
    if (now - this.lastClearAtMs < 55) {
      return;
    }
    this.lastClearAtMs = now;

    const volume = Math.min(0.84, 0.58 + chainStep * 0.05);
    if (this.clearClip) {
      this.audioSource.playOneShot(this.clearClip, volume);
      return;
    }

    this.playFallbackClear(volume, chainStep);
  }

  private loadClearClip(): void {
    resources.load("audio/match-clear", AudioClip, (error, clip) => {
      if (error || !clip) {
        return;
      }
      this.clearClip = clip;
    });
  }

  private playFallbackClear(volume: number, chainStep: number): void {
    const AudioContextCtor = (globalThis as WebAudioGlobal).AudioContext ?? (globalThis as WebAudioGlobal).webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    try {
      this.webAudioContext = this.webAudioContext ?? new AudioContextCtor();
      const context = this.webAudioContext;
      const start = context.currentTime;
      const gain = context.createGain();
      const first = context.createOscillator();
      const second = context.createOscillator();
      const pitchOffset = Math.min(chainStep, 5) * 35;

      first.type = "sine";
      first.frequency.setValueAtTime(880 + pitchOffset, start);
      first.frequency.exponentialRampToValueAtTime(1320 + pitchOffset, start + 0.09);
      second.type = "triangle";
      second.frequency.setValueAtTime(1560 + pitchOffset, start);
      second.frequency.exponentialRampToValueAtTime(1040 + pitchOffset, start + 0.16);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.01, volume * 0.2), start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);

      first.connect(gain);
      second.connect(gain);
      gain.connect(context.destination);
      first.start(start);
      second.start(start + 0.018);
      first.stop(start + 0.25);
      second.stop(start + 0.25);
    } catch {
      // 音频上下文可能被平台策略拦截，失败时不影响游戏主流程。
    }
  }
}
