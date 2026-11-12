import type { TileName } from '../scenes/BoardView.ts';
import type { MotionPreference, Settings } from '../storage/saveData.ts';
import { byId } from './hud.ts';
import { TEXT } from './strings.ts';

/**
 * Full-screen menus built on modal <dialog>s. Opening one on top of another
 * forms a natural back stack: "Quay lại" or Esc closes the top one and
 * reveals the screen below (or the game). Focus returns automatically to
 * the button that opened it.
 */
class ScreenDialog {
  protected readonly dialog: HTMLDialogElement;

  constructor(id: string, onClose: () => void) {
    this.dialog = byId<HTMLDialogElement>(id);
    this.dialog.querySelector('[data-action="back"]')?.addEventListener('click', () => this.close());
    this.dialog.addEventListener('close', onClose);
  }

  get isOpen(): boolean {
    return this.dialog.open;
  }

  protected show(): void {
    if (!this.dialog.open) this.dialog.showModal();
  }

  close(): void {
    if (this.dialog.open) this.dialog.close();
  }
}

// ---------------------------------------------------------------------------

export interface HomeHandlers {
  onContinue(): void;
  onLevels(): void;
  onHowTo(): void;
  onSettings(): void;
  onClose(): void;
}

export class HomeScreen extends ScreenDialog {
  constructor(handlers: HomeHandlers) {
    super('home', () => handlers.onClose());
    const on = (name: string, action: () => void) =>
      this.dialog.querySelector(`[data-home="${name}"]`)?.addEventListener('click', action);
    on('continue', () => handlers.onContinue());
    on('levels', () => handlers.onLevels());
    on('howto', () => handlers.onHowTo());
    on('settings', () => handlers.onSettings());
  }

  /** Refresh the texts (also while hidden under another screen). */
  update(continueTo: { number: number; name: string }, done: number, total: number): void {
    byId('home-continue-detail').textContent = TEXT.homeContinueDetail(continueTo.number, continueTo.name);
    byId('home-progress').textContent = TEXT.homeProgress(done, total);
  }

  open(continueTo: { number: number; name: string }, done: number, total: number): void {
    this.update(continueTo, done, total);
    this.show();
    this.dialog.querySelector<HTMLButtonElement>('[data-home="continue"]')?.focus();
  }
}

// ---------------------------------------------------------------------------

export class HowToScreen extends ScreenDialog {
  private imagesLoaded = false;

  constructor(onClose: () => void) {
    super('howto', onClose);
  }

  /** `tileImage` comes from the renderer, so the legend shows the real tiles. */
  open(tileImage: (tile: TileName) => string): void {
    if (!this.imagesLoaded) {
      for (const img of this.dialog.querySelectorAll<HTMLImageElement>('img[data-tile]')) {
        img.src = tileImage(img.dataset.tile as TileName);
      }
      this.imagesLoaded = true;
    }
    this.show();
    this.dialog.scrollTop = 0;
    this.dialog.querySelector<HTMLButtonElement>('[data-action="back"]')?.focus();
  }
}

// ---------------------------------------------------------------------------

export interface SettingsHandlers {
  onSound(enabled: boolean): void;
  onMotion(preference: MotionPreference): void;
  onResetProgress(): void;
  onClose(): void;
}

export class SettingsScreen extends ScreenDialog {
  private readonly sound = byId<HTMLInputElement>('setting-sound');
  private readonly confirm = byId<HTMLDialogElement>('confirm-reset');

  constructor(handlers: SettingsHandlers) {
    super('settings', () => handlers.onClose());
    this.sound.addEventListener('change', () => handlers.onSound(this.sound.checked));
    for (const radio of this.motionRadios()) {
      radio.addEventListener('change', () => {
        if (radio.checked) handlers.onMotion(radio.value as MotionPreference);
      });
    }

    // Reset needs an explicit confirmation; Esc or "Hủy" cancel it.
    byId('reset-progress').addEventListener('click', () => {
      this.confirm.showModal();
      this.confirm.querySelector<HTMLButtonElement>('[data-confirm="cancel"]')?.focus();
    });
    this.confirm.querySelector('[data-confirm="cancel"]')?.addEventListener('click', () => this.confirm.close());
    this.confirm.querySelector('[data-confirm="ok"]')?.addEventListener('click', () => {
      this.confirm.close();
      handlers.onResetProgress();
    });
    this.confirm.addEventListener('close', () => handlers.onClose());
  }

  /** Visible confirmation inside the settings screen (also announced). */
  showStatus(message: string): void {
    byId('settings-status').textContent = message;
  }

  open(settings: Settings, systemPrefersReduced: boolean): void {
    byId('settings-status').textContent = '';
    this.sound.checked = settings.sound;
    for (const radio of this.motionRadios()) radio.checked = radio.value === settings.motion;
    byId('motion-system-hint').textContent = systemPrefersReduced ? TEXT.motionSystemReduced : TEXT.motionSystemFull;
    this.show();
    this.dialog.querySelector<HTMLButtonElement>('[data-action="back"]')?.focus();
  }

  private motionRadios(): HTMLInputElement[] {
    return [...this.dialog.querySelectorAll<HTMLInputElement>('input[name="motion"]')];
  }
}
