import { create } from 'zustand';

export type WeatherState = '晴空' | '沙尘预警' | '沙尘暴';

export interface WorldState {
  minutes: number;
  speed: number;
  paused: boolean;
  weather: WeatherState;
  tick(delta: number): void;
  togglePause(): void;
  setSpeed(multiplier: number): void;
  setWeather(next: WeatherState): void;
}

const clampTime = (value: number) => {
  const max = 1440;
  const wrapped = value % max;
  return wrapped < 0 ? wrapped + max : wrapped;
};

export const useWorldStore = create<WorldState>((set, get) => ({
  minutes: 540,
  speed: 6,
  paused: false,
  weather: '晴空',
  tick(delta: number) {
    const { paused, speed } = get();
    if (paused) return;
    const minutes = get().minutes + delta * speed;
    set({ minutes: clampTime(minutes) });
  },
  togglePause() {
    set((state) => ({ paused: !state.paused }));
  },
  setSpeed(multiplier: number) {
    set({ speed: multiplier });
  },
  setWeather(next: WeatherState) {
    set({ weather: next });
  }
}));
