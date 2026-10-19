/* 当前协作看板的指针拖拽：卡片跟随指针，复用已有状态流转接口。 */
export function initBoardPointerDrag(board, handlers) {
  var session = null;
  var suppressClick = false;
  function targetColumn(x, y) {
    var col = document.elementFromPoint(x, y)?.closest('.tk-board-col-body');
    return col && board.contains(col) ? col : null;
  }
  function finish(cancelled) {
    if (!session) return;
    var drag = session;
    session = null;
    if (board.hasPointerCapture(drag.pointerId)) board.releasePointerCapture(drag.pointerId);
    drag.card.draggable = drag.wasDraggable;
    if (!drag.ghost) return;
    suppressClick = true;
    var col = cancelled ? null : targetColumn(drag.x, drag.y);
    var moved = col && col !== drag.source && handlers.drop({
      target:col, clientX:drag.x, clientY:drag.y, preventDefault:function () {},
    });
    handlers.end({ target:drag.card });
    drag.columnHeights.forEach(function(item){ item.node.style.height = item.height; });
    if (moved || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      drag.layer.remove();
      return;
    }
    var animation = drag.ghost.animate([
      { transform:'translate(' + (drag.x - drag.startX) + 'px,' + (drag.y - drag.startY) + 'px)' },
      { transform:'translate(0,0)' },
    ], { duration:200, easing:'cubic-bezier(.2,0,0,1)' });
    animation.finished.catch(function () {}).finally(function () { drag.layer.remove(); });
  }
  board.addEventListener('pointerdown', function (event) {
    suppressClick = false;
    if (event.button !== 0 || !event.isPrimary || event.target.closest('button,input,select,a,[role="button"]')) return;
    var card = event.target.closest('.tk-card--figma');
    if (!card) return;
    var rect = card.getBoundingClientRect();
    session = { card:card, source:card.closest('.tk-board-col-body'), pointerId:event.pointerId,
      startX:event.clientX, startY:event.clientY, x:event.clientX, y:event.clientY, rect:rect, wasDraggable:card.draggable };
    card.draggable = false;
  });
  document.addEventListener('pointermove', function (event) {
    if (!session || event.pointerId !== session.pointerId) return;
    var drag = session;
    drag.x = event.clientX; drag.y = event.clientY;
    if (!drag.ghost && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6) return;
    event.preventDefault();
    if (!drag.ghost) {
      /* 仅拖动超过阈值后捕获；普通点击仍以卡片为目标。 */
      drag.columnHeights = Array.from(board.querySelectorAll('.tk-board-col')).map(function(node){
        var item = { node:node, height:node.style.height };
        node.style.height = node.getBoundingClientRect().height + 'px';
        return item;
      });
      board.setPointerCapture(drag.pointerId);
      drag.layer = document.createElement('div');
      drag.layer.className = 'tk-board-drag-layer';
      drag.layer.setAttribute('aria-hidden', 'true');
      drag.ghost = drag.card.cloneNode(true);
      drag.ghost.removeAttribute('data-task-id');
      drag.ghost.removeAttribute('draggable');
      drag.ghost.querySelectorAll('[id]').forEach(function (node) { node.removeAttribute('id'); });
      drag.ghost.classList.add('tk-board-drag-ghost');
      Object.assign(drag.ghost.style, { left:drag.rect.left + 'px', top:drag.rect.top + 'px', width:drag.rect.width + 'px', height:drag.rect.height + 'px' });
      drag.layer.appendChild(drag.ghost);
      board.closest('#cv-tasks-current').appendChild(drag.layer);
      handlers.start({ target:drag.card, clientX:drag.startX, clientY:drag.startY, dataTransfer:{} });
    }
    drag.ghost.style.transform = 'translate(' + (drag.x - drag.startX) + 'px,' + (drag.y - drag.startY) + 'px)';
    var col = targetColumn(drag.x, drag.y);
    board.querySelectorAll('.drag-over').forEach(function (node) { if (node !== col) node.classList.remove('drag-over'); });
    if (col) handlers.over({ target:col, preventDefault:function () {} });
    var bounds = board.getBoundingClientRect();
    if (drag.x < bounds.left + 36) board.scrollLeft -= 12;
    else if (drag.x > bounds.right - 36) board.scrollLeft += 12;
    if (col) {
      var colBounds = col.getBoundingClientRect();
      if (drag.y < colBounds.top + 36) col.scrollTop -= 12;
      else if (drag.y > colBounds.bottom - 36) col.scrollTop += 12;
    }
  });
  document.addEventListener('pointerup', function (event) { if (session?.pointerId === event.pointerId) finish(false); });
  document.addEventListener('pointercancel', function (event) { if (session?.pointerId === event.pointerId) finish(true); });
  board.addEventListener('dragstart', function (event) {
    if (event.target.closest('.tk-card--figma')) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  board.addEventListener('lostpointercapture', function () { if (session) finish(true); });
  document.addEventListener('keydown', function (event) {
    if (session && event.key === 'Escape') { event.preventDefault(); finish(true); }
  });
  board.addEventListener('click', function (event) {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault(); event.stopImmediatePropagation();
  }, true);
}
