/**
 * Kiểm tra xem 2 khoảng thời gian của cùng một xe có bị chồng chéo hay không.
 * Quy tắc: Không có đệm thời gian. Chồng chéo xảy ra khi khoảng [startA, endA] giao nhau với [startB, endB].
 * Biểu thức: startA < endB && endA > startB
 */
export function isScheduleOverlapping(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  const tStartA = startA.getTime();
  const tEndA = endA.getTime();
  const tStartB = startB.getTime();
  const tEndB = endB.getTime();

  if (tStartA >= tEndA || tStartB >= tEndB) {
    throw new Error('Thời gian kết thúc phải lớn hơn thời gian bắt đầu');
  }

  return tStartA < tEndB && tEndA > tStartB;
}
