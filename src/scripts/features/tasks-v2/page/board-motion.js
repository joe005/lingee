/* 看板拖拽后的卡片位置过渡；不改变排序或任务状态。 */
export function captureBoardPositions(board) {
  var positions = new Map();
  if (!board || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return positions;
  board.querySelectorAll('.tk-card[data-task-id]').forEach(function (card) {
    positions.set(card.dataset.taskId, card.getBoundingClientRect());
  });
  return positions;
}

export function animateBoardMove(board, positions, taskId, dropPoint) {
  if (!board || !positions.size || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  board.querySelectorAll('.tk-card[data-task-id]').forEach(function (card) {
    var before = positions.get(card.dataset.taskId);
    if (!before || typeof card.animate !== 'function') return;
    var after = card.getBoundingClientRect();
    if (!after.width || !after.height) return;
    var moved = card.dataset.taskId === String(taskId);
    var x = moved && dropPoint ? dropPoint.x : before.left;
    var y = moved && dropPoint ? dropPoint.y : before.top;
    var dx = x - after.left, dy = y - after.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    card.animate([
      { transform:'translate(' + dx + 'px,' + dy + 'px)' },
      { transform:'translate(0,0)' },
    ], { duration:240, easing:'cubic-bezier(.2,.8,.2,1)' });
  });
}
