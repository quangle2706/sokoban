/** All player-facing text that is produced from code (Vietnamese). */
export const TEXT = {
  levelNumber: (n: number) => `Màn ${n}`,
  boardLabel: (name: string) => `Bàn chơi màn ${name}`,
  solvedStatus: 'Đã hoàn thành. Hoàn tác hoặc chơi lại để tiếp tục.',
  announceSolved: (moves: number, pushes: number) =>
    `Hoàn thành! ${moves} bước, ${pushes} lần đẩy.`,
  announceUndo: 'Đã hoàn tác.',
  announceRestart: 'Đã chơi lại từ đầu.',
} as const;
