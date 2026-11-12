import type { MotionPreference } from '../storage/saveData.ts';

/**
 * Resolves the reduced-motion preference into one boolean used everywhere:
 *   - 'reduce' / 'full' override the OS;
 *   - 'system' follows prefers-reduced-motion (and updates live).
 * It is mirrored to <html data-reduced-motion="true|false"> so CSS follows
 * the same decision as the Phaser renderer. Motion never affects rules.
 */
export class MotionSetting {
  private preference: MotionPreference = 'system';
  private readonly query = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor() {
    this.query.addEventListener('change', () => this.apply());
    this.apply();
  }

  get reduced(): boolean {
    return this.preference === 'reduce' || (this.preference === 'system' && this.query.matches);
  }

  /** True when the OS currently asks for reduced motion (for the settings hint). */
  get systemPrefersReduced(): boolean {
    return this.query.matches;
  }

  set(preference: MotionPreference): void {
    this.preference = preference;
    this.apply();
  }

  private apply(): void {
    document.documentElement.dataset.reducedMotion = String(this.reduced);
  }
}
