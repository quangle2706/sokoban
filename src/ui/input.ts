import type { Direction } from '../engine/index.ts';

/**
 * Translates keyboard and on-screen button input into discrete commands.
 * It knows nothing about the game rules.
 *
 * HELD-INPUT REPEAT (keys and buttons behave the same):
 *   - Press: one command fires immediately.
 *   - Hold: after REPEAT_DELAY_MS, the command repeats every
 *     REPEAT_INTERVAL_MS until released. Repeats carry `repeat: true`.
 *   - The browser's own key auto-repeat is ignored (its rate varies by OS).
 *   - Only one held input repeats at a time; the newest press wins.
 *   - Restart and menu never repeat.
 */
export type Command =
  | { readonly type: 'move'; readonly direction: Direction; readonly repeat: boolean }
  | { readonly type: 'undo'; readonly repeat: boolean }
  | { readonly type: 'restart'; readonly repeat: false }
  | { readonly type: 'menu'; readonly repeat: false };

type CommandSpec =
  | { readonly type: 'move'; readonly direction: Direction }
  | { readonly type: 'undo' }
  | { readonly type: 'restart' }
  | { readonly type: 'menu' };

export const REPEAT_DELAY_MS = 260;
export const REPEAT_INTERVAL_MS = 140;

const KEY_MAP: Readonly<Record<string, CommandSpec>> = {
  ArrowUp: { type: 'move', direction: 'up' },
  ArrowDown: { type: 'move', direction: 'down' },
  ArrowLeft: { type: 'move', direction: 'left' },
  ArrowRight: { type: 'move', direction: 'right' },
  // WASD by physical key position (event.code), so it works on any layout.
  KeyW: { type: 'move', direction: 'up' },
  KeyS: { type: 'move', direction: 'down' },
  KeyA: { type: 'move', direction: 'left' },
  KeyD: { type: 'move', direction: 'right' },
  KeyZ: { type: 'undo' },
  KeyU: { type: 'undo' },
  Backspace: { type: 'undo' },
  KeyR: { type: 'restart' },
  // Esc opens the menu during play. While a dialog is open, input is paused
  // and the browser's own Esc handling closes the dialog instead.
  Escape: { type: 'menu' },
};

export class InputController {
  private enabled = true;
  private held: { id: string; spec: CommandSpec } | null = null;
  private delayTimer: number | undefined;
  private repeatTimer: number | undefined;
  private readonly onCommand: (command: Command) => void;

  constructor(onCommand: (command: Command) => void, controlsRoot: HTMLElement) {
    this.onCommand = onCommand;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', () => this.stopRepeat());
    document.addEventListener('visibilitychange', () => this.stopRepeat());
    this.bindButtons(controlsRoot);
  }

  /** Disable while a dialog is open; also cancels any held repeat. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stopRepeat();
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    if (isEditableTarget(event.target)) return;
    // Arrow keys on a focused button would otherwise just move focus; that is
    // fine because no menus exist on this screen. Inside a dialog, never steal keys.
    if (event.target instanceof Element && event.target.closest('dialog')) return;

    // While paused (another screen is open) keys keep their normal behavior.
    if (!this.enabled) return;
    const spec = KEY_MAP[event.code] ?? KEY_MAP[event.key];
    if (!spec) return;
    event.preventDefault(); // stop page scrolling / browser back on Backspace
    if (event.repeat) return;
    this.press(`key:${event.code}`, spec);
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.release(`key:${event.code}`);
  };

  private bindButtons(root: HTMLElement): void {
    for (const button of root.querySelectorAll<HTMLButtonElement>('button[data-command]')) {
      const spec = specFromButton(button);
      if (!spec) continue;
      const id = `button:${button.dataset.command}:${button.dataset.direction ?? ''}`;

      button.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        event.preventDefault(); // keep focus where it is; avoid text selection
        if (!this.enabled) return;
        this.press(id, spec);
        try {
          // Keep receiving pointerup even if the finger slides off the button.
          button.setPointerCapture(event.pointerId);
        } catch {
          // Capture is best-effort; the press has already been handled.
        }
      });
      const end = () => this.release(id);
      button.addEventListener('pointerup', end);
      button.addEventListener('pointercancel', end);
      button.addEventListener('lostpointercapture', end);
      button.addEventListener('contextmenu', (event) => event.preventDefault());

      // Keyboard activation (Enter/Space on a focused button) produces a click
      // with detail === 0. Pointer clicks are already handled by pointerdown.
      button.addEventListener('click', (event) => {
        if (event.detail !== 0 || !this.enabled) return;
        this.emit(spec, false);
      });
    }
  }

  private press(id: string, spec: CommandSpec): void {
    this.stopRepeat();
    this.emit(spec, false);
    if (spec.type === 'restart' || spec.type === 'menu') return;
    this.held = { id, spec };
    const tick = () => {
      if (this.held && this.enabled) this.emit(this.held.spec, true);
    };
    // First repeat at REPEAT_DELAY_MS, then every REPEAT_INTERVAL_MS.
    this.delayTimer = window.setTimeout(() => {
      tick();
      this.repeatTimer = window.setInterval(tick, REPEAT_INTERVAL_MS);
    }, REPEAT_DELAY_MS);
  }

  private release(id: string): void {
    if (this.held?.id === id) this.stopRepeat();
  }

  private stopRepeat(): void {
    window.clearTimeout(this.delayTimer);
    window.clearInterval(this.repeatTimer);
    this.delayTimer = undefined;
    this.repeatTimer = undefined;
    this.held = null;
  }

  private emit(spec: CommandSpec, repeat: boolean): void {
    if (spec.type === 'restart' || spec.type === 'menu') this.onCommand({ type: spec.type, repeat: false });
    else if (spec.type === 'undo') this.onCommand({ type: 'undo', repeat });
    else this.onCommand({ type: 'move', direction: spec.direction, repeat });
  }
}

function specFromButton(button: HTMLButtonElement): CommandSpec | null {
  const { command, direction } = button.dataset;
  if (command === 'undo' || command === 'restart') return { type: command };
  if (command === 'move' && isDirection(direction)) return { type: 'move', direction };
  return null;
}

function isDirection(value: string | undefined): value is Direction {
  return value === 'up' || value === 'down' || value === 'left' || value === 'right';
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}
