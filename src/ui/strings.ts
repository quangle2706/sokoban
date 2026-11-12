/** All player-facing text that is produced from code (Vietnamese). */
export const TEXT = {
  levelNumber: (n: number) => `Màn ${n}`,
  boardLabel: (n: number, name: string) => `Bàn chơi màn ${n}: ${name}`,
  solvedStatus: 'Đã hoàn thành. Hoàn tác hoặc chơi lại để tiếp tục.',
  announceSolved: (moves: number, pushes: number) => `Hoàn thành! ${moves} bước, ${pushes} lần đẩy.`,
  announceUndo: 'Đã hoàn tác.',
  announceRestart: 'Đã chơi lại từ đầu.',
  announceLevel: (n: number, name: string) => `Màn ${n}: ${name}`,
  announceResumed: (n: number, moves: number) => `Tiếp tục màn ${n} từ bước ${moves}.`,

  // Completion dialog
  completeMessage: 'Mọi thùng hàng đã về đúng chỗ.',
  completeAllMessage: 'Bạn đã hoàn thành tất cả các màn. Cảm ơn bạn đã chơi!',
  newBest: 'Kỷ lục mới!',
  bestRun: (moves: number, pushes: number) => `Kỷ lục của bạn: ${pushes} lần đẩy, ${moves} bước`,
  unlockedNext: (n: number) => `Đã mở khóa màn ${n}.`,

  // Level select
  progressSummary: (done: number, total: number) => `Đã hoàn thành ${done}/${total} màn`,
  cardCompleted: 'Đã hoàn thành',
  cardBest: (moves: number, pushes: number) => `Kỷ lục: ${pushes} đẩy · ${moves} bước`,
  cardInProgress: (moves: number) => `Đang chơi dở · ${moves} bước`,
  cardAvailable: 'Chưa chơi',
  cardLocked: (previous: number) => `Hoàn thành màn ${previous} để mở khóa`,
  cardCurrent: 'Đang chọn',
  cardLabel: (n: number, name: string, detail: string) => `Màn ${n}, ${name}. ${detail}`,
  lockedLabel: (n: number, previous: number) => `Màn ${n}, đang khóa. Hoàn thành màn ${previous} để mở khóa.`,

  // Notices
  saveReset: 'Không đọc được dữ liệu đã lưu nên tiến trình được bắt đầu lại.',
  saveRepaired: 'Một phần dữ liệu đã lưu bị lỗi và đã được bỏ qua.',
  saveUnavailable: 'Trình duyệt này không cho phép lưu tiến trình. Bạn vẫn có thể chơi bình thường.',
} as const;
