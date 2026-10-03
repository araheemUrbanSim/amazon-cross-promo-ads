import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => { cleanup(); try { sessionStorage.clear(); } catch { /* ignore */ } });

// jsdom lacks these browser APIs used by MUI / charts.
if (!window.matchMedia) {
  window.matchMedia = ((q: string) => ({ matches: q.includes('min-width'), media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
}
class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver ??= RO;
