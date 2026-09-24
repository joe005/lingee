/* 任务与项目列表共用的页签标记；各页面保留自己的视图状态和事件。 */
function escapeTabText(value){
  return String(value).replace(/[&<>"']/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];});
}

export function renderListPageTabs(items,activeId,attribute){
  return items.map(function(item){
    var active=item.id===activeId;
    return '<div class="list-page-tab'+(active?' active':'')+'" role="tab" tabindex="0" aria-selected="'+active+'" '+attribute+'="'+escapeTabText(item.id)+'">'
      +'<span class="list-page-tab-name">'+escapeTabText(item.name)+'</span>'
      +(item.removable?'<span class="list-page-tab-remove" data-del-view="'+escapeTabText(item.id)+'" role="button" tabindex="0" aria-label="删除视图" data-tooltip="删除视图"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>':'')
      +'</div>';
  }).join('');
}
