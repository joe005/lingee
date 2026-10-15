/* 协作开发首屏加载：不依赖业务数据，保证初始化前可以先绘制占位。 */
var pending = null, requestedTab = 'tasks', ready = false, retry = null;
var root, panel, message, retryButton;
var loading = false, failed = false, finishEntry, controller;

export function yieldCollabPaint(signal) {
  return new Promise(function(resolve,reject){
    setTimeout(function(){
      if(signal?.aborted) reject(new DOMException('已重新加载','AbortError'));
      else resolve();
    },0);
  });
}
function updateLoadingTab() {
  document.querySelectorAll('#cvTabNav [data-cvview]').forEach(function(tab){
    tab.classList.toggle('tab-nav-item--active',tab.dataset.cvview === (requestedTab === 'market'?'experts':requestedTab));
  });
}
export function deferCollabTab(tab) {
  if(!loading && !failed) return false;
  requestedTab = tab;
  updateLoadingTab();
  return true;
}
export function initCollabLoading() {
  root = document.getElementById('view-collab');
  panel = document.getElementById('cvEntryLoad');
  message = document.getElementById('cvEntryLoadMessage');
  retryButton = document.getElementById('cvEntryLoadRetry');
  retryButton.addEventListener('click',function(){
    if(!retry) return;
    if(pending){
      retryButton.classList.add('hidden');
      controller.abort();
      pending.then(function(){ retry(); });
    }else retry();
  });
}
export function loadCollabEntry(tab, prepare, complete) {
  requestedTab = root.dataset.entryTab || tab;
  delete root.dataset.entryTab;
  finishEntry = complete;
  if(pending){ updateLoadingTab(); return pending; }
  if(ready){ complete(tab); return Promise.resolve(); }
  retry = function(){ return loadCollabEntry(requestedTab,prepare,finishEntry); };
  loading = true; failed = false;
  controller = new AbortController();
  var signal = controller.signal;
  root.classList.add('cv-entry-pending');
  root.classList.remove('cv-entry-failed');
  panel.classList.remove('hidden');
  panel.setAttribute('aria-busy','true');
  retryButton.classList.add('hidden');
  message.textContent = '加载中…';
  updateLoadingTab();
  var long = setTimeout(function(){ message.textContent = '加载较慢…'; retryButton.classList.remove('hidden'); },10000);
  /* 两帧之间让浏览器先绘制框架；无需人为添加最短等待时长。 */
  pending = new Promise(function(resolve){ requestAnimationFrame(function(){ setTimeout(resolve,0); }); })
    .then(function(){ return prepare(signal); })
    .then(function(){
      loading = false;
      if(!root.classList.contains('hidden')) finishEntry(requestedTab);
      ready = true;
      root.setAttribute('data-entry-ready','');
      root.classList.remove('cv-entry-pending');
      panel.classList.add('hidden');
    })
    .catch(function(error){
      if(error.name === 'AbortError') return;
      loading = false; failed = true;
      root.classList.add('cv-entry-failed');
      message.textContent = '加载失败';
      retryButton.classList.remove('hidden');
      console.error('协作开发初始化失败',error);
    })
    .finally(function(){
      clearTimeout(long);
      panel.setAttribute('aria-busy','false');
      pending = null;
    });
  return pending;
}
