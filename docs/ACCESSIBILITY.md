# Accessibility and responsive checks

This file separates what has been **verified** (with how) from what
**still needs checking**, mainly on real devices and with real assistive
technology.

## Built in

- **Language:** `<html lang="vi">`. All player text is Vietnamese.
- **Keyboard only:** every action has a key (see README). Menus use real
  `<button>`s, settings use real form controls, screens are modal
  `<dialog>`s (focus trap, Esc = back, focus restored), and the level
  picker supports arrow keys. Gameplay keys never fire while a dialog is
  open, and never while typing in form controls.
- **Screen readers:**
  - The canvas has `role="img"` and a label that updates with progress,
    e.g. "Bàn chơi màn 3: Góc nhỏ. 1 trên 2 thùng đã vào chỗ."
  - A polite live region announces level changes, resume, undo, restart,
    a crate landing on or leaving a goal, and wins.
  - Level cards have full labels (number, name, status, best).
  - Locked cards are labeled list items, not inert buttons.
- **Not color alone:** goals are diamonds with a center dot, and crates on
  goals get a check badge and a dark-edged gold ring. Locked and completed
  cards have icons and text.
- **Contrast:** `tests/contrast.test.ts` audits every text pair (at least
  4.5:1) and every meaningful shape (at least 3:1). The audit caught the
  crate-on-goal ring, which was 1.6:1 against the floor; it now has a dark
  edge at 4.8:1.
- **Motion:** a "Chuyển động" setting with three options: follow the
  device, reduce, or full. Reduced motion removes glides, bumps, pulses,
  the celebration and CSS animations, without changing the rules.
- **Touch:** every target is at least 44 px. The D-pad uses
  `touch-action: none`, nothing requires a gesture, and safe-area insets
  are respected.
- **Sound** is optional, off-able, never carries information on its own,
  and starts only after a user gesture.

## Verified (Milestone 3)

| Check | How | Result |
| ----- | --- | ------ |
| Contrast of palette pairs | `npm test` (contrast audit) | All pass after the ring fix |
| Keyboard-only path: Home → picker → arrows → Enter → play → Esc → Home → settings → Esc | Chrome, real key presses | Works. Focus lands on the primary action, and arrows skip locked cards |
| Gameplay keys paused while any dialog is open | Chrome | Yes |
| Reduced motion setting | Chrome: after a move the sprite is already at its target, with no tween running | Yes |
| Full motion: goal pulse, celebration, dialog only after it | Chrome, sampled sprite scale | Yes |
| Sound events fire in the right order (goal, push, win) and the AudioContext runs | Chrome, instrumented `play()` | Yes. Audio output itself was not listened to |
| Settings persist and apply immediately | Chrome + `localStorage` | Yes |
| Reset progress: cancel keeps data, confirm clears progress and keeps settings | Chrome | Yes |
| No horizontal scrolling at 320×568, 390×844, 680×320, 844×390, desktop | Chrome, same-origin iframes | Yes. Long screens scroll vertically inside their dialog |
| Touch targets at least 44 px on all screens | Measured in Chrome | Yes (the visually hidden switch input is 1 px; its label is the 44 px target) |

## Not yet verified (needs a person or a device)

- Real screen readers: NVDA or JAWS with Chrome/Firefox, VoiceOver on iOS
  and macOS, TalkBack on Android. In particular: how the live region and the
  canvas label sound in Vietnamese, and whether announcements are too
  chatty.
- Real phones: iOS Safari (safe areas, audio unlock, `100dvh`) and Android
  Chrome. All touch tests so far used simulated pointer events.
- Firefox and Safari on desktop.
- Listening to the sounds: volume balance, and whether "blocked" is
  pleasant.
- Browser zoom at 200% and OS large text.
- Windows High Contrast / forced colors (the canvas board will not adapt).
