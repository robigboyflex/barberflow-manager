import { useCallback, useRef } from 'react';

type SoundType = 'tap' | 'success' | 'error' | 'pop' | 'swoosh';

// Web Audio API based sound effects - no external files needed
const createOscillator = (
  audioContext: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

const soundConfigs: Record<SoundType, (ctx: AudioContext) => void> = {
  tap: (ctx) => {
    createOscillator(ctx, 600, 0.08, 'sine', 0.2);
  },
  success: (ctx) => {
    createOscillator(ctx, 523, 0.1, 'sine', 0.25);
    setTimeout(() => createOscillator(ctx, 659, 0.1, 'sine', 0.25), 100);
    setTimeout(() => createOscillator(ctx, 784, 0.15, 'sine', 0.25), 200);
  },
  error: (ctx) => {
    createOscillator(ctx, 200, 0.15, 'square', 0.15);
    setTimeout(() => createOscillator(ctx, 150, 0.2, 'square', 0.15), 150);
  },
  pop: (ctx) => {
    createOscillator(ctx, 800, 0.05, 'sine', 0.3);
  },
  swoosh: (ctx) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  },
};

export function useSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback((type: SoundType) => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      soundConfigs[type](ctx);
    } catch (e) {
      // Silently fail if audio is not available
      console.log('Audio not available');
    }
  }, [getAudioContext]);

  return { playSound };
}

export default useSound;
