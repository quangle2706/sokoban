# Demo recording

A short (about 45–60 s) recording that shows the whole game loop. Record at
1280×800 or larger, from a production build (`npm run build && npm run
preview`) with a fresh profile or cleared site data.

## Shot list

| # | What to show | How |
| - | ------------ | --- |
| 1 | Home screen | Load the page; pause 2 s on Home |
| 2 | Start level 1 | "Chơi tiếp" |
| 3 | Walk, push, a crate landing on a goal | Arrow keys `L`, `d`, `r`, `d` (the goal pulse plays) |
| 4 | Undo | `Z` once (the crate glides back), then redo the push |
| 5 | Win | Final `L`: celebration, then the completion dialog with best run and "Đã mở khóa màn 2" |
| 6 | Next level | "Màn tiếp theo", then make a couple of moves on "Hai bên" |
| 7 | Level picker | Menu → "Chọn màn": completed, in-progress and locked cards |
| 8 | Settings | Menu → "Cài đặt": toggle sound, choose "Giảm chuyển động", then make a move to show it is instant |
| 9 | Mobile layout (optional) | DevTools device mode at 390×844: D-pad and Undo/Restart |

Level 1 solution for the recording: `LdrdL` (5 moves, 2 pushes).

## Notes

- Sound is not captured in a GIF. For a video with audio, use the OS screen
  recorder (Windows: Win + Alt + R with Xbox Game Bar; macOS: Cmd + Shift + 5).
- Keep the recording free of personal data (bookmarks bar, other tabs).
- Save the file as `docs/media/demo.gif` (or `.mp4`) and link it from the
  README.
