import { toast } from '../../../core/toast.js';
import { TEAMS, activePick } from '../../expert/store.js';
import { tkAddTask, tkCurrentUserId, tkPeopleInProject, tkProjectsForCurrentUser, tkUpdateTask } from '../data.js';
import { closeTaskModal } from './form-modal.js';
import { render } from './layout.js';
import { pageState } from './page-state.js';
import { els, state } from './state.js';
import { openDrawer } from './subtasks.js';
import { escapeHtml } from './utils.js';
/* 任务页 · Excel 模板下载与导入（拆分自 tasks-v2/index.js，逻辑未改） */
/* ---------- Excel 模板下载 ---------- */
export function downloadTaskTemplate() {
  var headers = ['标题（必填）', '描述', '阶段', '状态', '优先级', '处理人', '截止日期（YYYY-MM-DD）', '标签（逗号分隔）'];
  var examples = [
    ['示例任务 1', '这是任务描述', '需求梳理', '待处理', '中', '', '2026-10-31', '前端,设计'],
    ['示例任务 2', '', '开发实现', '执行中', '高', '', '2026-11-15', ''],
  ];
  var statusNote = ['', '', '自由填写，用于看板分组', '可选值：待处理 / 执行中 / 评审中 / 已完成 / 已阻塞', '可选值：低 / 中 / 高 / 紧急', '', '', ''];
  var rows = [headers, statusNote].concat(examples);
  var csv = rows.map(function (row) {
    return row.map(function (cell) {
      var s = String(cell);
      return s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }).join('\r\n');
  var bom = '\uFEFF';
  var blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = '任务导入模板.csv';
  a.click();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  toast('模板已下载', 'success');
}

/* ---------- Excel 导入弹窗 ---------- */
var importParsedRows = [];

export function openImportModal() {
  importParsedRows = [];
  els.tkImportDropZone.classList.remove('hidden');
  els.tkImportFileBar.classList.add('hidden');
  els.tkImportPreview.classList.add('hidden');
  els.tkImportError.classList.add('hidden');
  els.tkImportConfirm.disabled = true;
  els.tkImportConfirm.textContent = '开始导入';
  els.tkImportFileInput.value = '';
  var projects = tkProjectsForCurrentUser();
  var defaultProject = pageState.projectListProjectId || (projects[0]?.id || '');
  els.tkImportProject.innerHTML = projects.map(function (p) {
    var label = p.name + (p.id === defaultProject ? '（当前）' : '');
    return '<option value="' + escapeHtml(p.id) + '"' + (p.id === defaultProject ? ' selected' : '') + '>' + escapeHtml(label) + '</option>';
  }).join('');
  els.tkImportOverlay.classList.remove('hidden');
  requestAnimationFrame(function () { els.tkImportOverlay.classList.add('show'); });
}

function closeImportModal() {
  els.tkImportOverlay.classList.remove('show');
  setTimeout(function () { els.tkImportOverlay.classList.add('hidden'); }, 200);
}

function showImportError(msg) {
  els.tkImportErrorMsg.textContent = msg;
  els.tkImportError.classList.remove('hidden');
  els.tkImportPreview.classList.add('hidden');
  els.tkImportConfirm.disabled = true;
}

function parseCSV(text) {
  var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  var result = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (!line.trim()) continue;
    var row = [];
    var cur = '';
    var inQuote = false;
    for (var j = 0; j < line.length; j++) {
      var ch = line[j];
      if (inQuote) {
        if (ch === '"') {
          if (line[j + 1] === '"') { cur += '"'; j++; } else { inQuote = false; }
        } else { cur += ch; }
      } else {
        if (ch === '"') { inQuote = true; }
        else if (ch === ',') { row.push(cur); cur = ''; }
        else { cur += ch; }
      }
    }
    row.push(cur);
    result.push(row);
  }
  return result;
}

function handleImportFile(file) {
  els.tkImportError.classList.add('hidden');
  if (!file) return;
  var ext = file.name.split('.').pop().toLowerCase();
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    showImportError('不支持的文件格式，请上传 .xlsx、.xls 或 .csv 文件');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showImportError('文件超过 10 MB，请压缩后重新上传');
    return;
  }
  var sizeStr = file.size < 1024 ? file.size + ' B'
    : file.size < 1024 * 1024 ? (file.size / 1024).toFixed(1) + ' KB'
    : (file.size / 1024 / 1024).toFixed(1) + ' MB';
  els.tkImportFileName.textContent = file.name;
  els.tkImportFileSize.textContent = sizeStr;
  els.tkImportFileBar.classList.remove('hidden');
  els.tkImportDropZone.classList.add('hidden');

  if (ext !== 'csv') {
    importParsedRows = [
      ['标题（必填）', '描述', '状态', '优先级', '处理人', '截止日期', '标签'],
      ['（.xlsx 预览暂不支持，导入时将自动解析）', '', '', '', '', '', ''],
    ];
    renderImportPreview(importParsedRows, 0);
    els.tkImportPreviewHint.textContent = '检测到 Excel 文件，导入时将自动解析';
    els.tkImportConfirm.disabled = false;
    els.tkImportConfirm.textContent = '导入';
    return;
  }

  var reader = new FileReader();
  reader.onload = function (e) {
    var text = e.target.result;
    var rows = parseCSV(text);
    if (rows.length < 2) { showImportError('文件内容为空或格式不正确，至少需要表头和一行数据'); return; }
    var headers = rows[0];
    if (!headers[0] || headers[0].replace(/\uFEFF/g, '').indexOf('标题') < 0) {
      showImportError('未找到「标题」列，请确认使用了官方模板');
      return;
    }
    var dataRows = rows.slice(1).filter(function (r) { return r.some(function (c) { return c.trim(); }); });
    if (dataRows.length === 0) { showImportError('表格中没有数据行，请填写后重新上传'); return; }
    importParsedRows = [headers].concat(dataRows);
    renderImportPreview(importParsedRows, dataRows.length);
    els.tkImportConfirm.disabled = false;
    els.tkImportConfirm.textContent = '导入 ' + dataRows.length + ' 条任务';
  };
  reader.onerror = function () { showImportError('文件读取失败，请重试'); };
  reader.readAsText(file, 'utf-8');
}

function renderImportPreview(rows, dataCount) {
  var headers = rows[0];
  var dataRows = rows.slice(1);
  var previewRows = dataRows.slice(0, 5);
  els.tkImportTableHead.innerHTML = '<tr>' + headers.map(function (h) {
    return '<th>' + escapeHtml(h.replace(/（.*?）/g, '').trim() || h) + '</th>';
  }).join('') + '</tr>';
  els.tkImportTableBody.innerHTML = previewRows.map(function (row) {
    return '<tr>' + headers.map(function (_, i) {
      return '<td title="' + escapeHtml(row[i] || '') + '">' + escapeHtml(row[i] || '—') + '</td>';
    }).join('') + '</tr>';
  }).join('');
  els.tkImportPreviewLabel.textContent = '预览';
  if (dataCount > 0) {
    els.tkImportPreviewHint.textContent = '共 ' + dataCount + ' 条' + (dataCount > 5 ? '，仅展示前 5 条' : '');
  }
  els.tkImportPreview.classList.remove('hidden');
}

function doImport() {
  if (!importParsedRows.length) return;
  var headers = importParsedRows[0];
  var dataRows = importParsedRows.slice(1).filter(function (r) { return r.some(function (c) { return c.trim(); }); });
  var colIdx = {};
  headers.forEach(function (h, i) {
    var key = h.replace(/（.*?）/g, '').trim();
    colIdx[key] = i;
  });
  var STATUS_MAP = { '待处理': 'backlog', '执行中': 'in_progress', '评审中': 'in_review', '已完成': 'done', '已阻塞': 'blocked' };
  var PRIORITY_MAP = { '低': 'low', '中': 'medium', '高': 'high', '紧急': 'urgent' };
  var project = els.tkImportProject?.value || pageState.projectListProjectId || tkProjectsForCurrentUser()[0]?.id || '';
  var assigneeId = tkCurrentUserId();
  var imported = 0;
  dataRows.forEach(function (row) {
    var title = (row[colIdx['标题']] || '').trim();
    if (!title) return;
    var status = STATUS_MAP[((row[colIdx['状态']] || '')).trim()] || 'backlog';
    var priority = PRIORITY_MAP[((row[colIdx['优先级']] || '')).trim()] || 'medium';
    var dueDate = (row[colIdx['截止日期']] || '').trim();
    var labels = (row[colIdx['标签']] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var desc = (row[colIdx['描述']] || '').trim();
    var module = (row[colIdx['阶段']] || '').trim();
    tkAddTask({ title: title, desc: desc, status: status, priority: priority, assignee: assigneeId, project: project, dueDate: dueDate, labels: labels, module: module || undefined, createDate: '2026-09-29' });
    imported++;
  });
  closeImportModal();
  render();
  toast('成功导入 ' + imported + ' 条任务', 'success');
}

export function initImportEvents() {
  els.tkImportClose.addEventListener('click', closeImportModal);
  els.tkImportCancel.addEventListener('click', closeImportModal);
  els.tkImportOverlay.addEventListener('click', function (e) { if (e.target === this) closeImportModal(); });
  els.tkDownloadTplBtn.addEventListener('click', downloadTaskTemplate);
  els.tkImportDropZone.addEventListener('click', function () { els.tkImportFileInput.click(); });
  els.tkImportDropZone.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.tkImportFileInput.click(); } });
  els.tkImportFileInput.addEventListener('change', function () { if (this.files[0]) handleImportFile(this.files[0]); });
  els.tkImportFileRemove.addEventListener('click', function () {
    importParsedRows = [];
    els.tkImportFileInput.value = '';
    els.tkImportFileBar.classList.add('hidden');
    els.tkImportPreview.classList.add('hidden');
    els.tkImportError.classList.add('hidden');
    els.tkImportDropZone.classList.remove('hidden');
    els.tkImportConfirm.disabled = true;
    els.tkImportConfirm.textContent = '导入';
  });
  els.tkImportDropZone.addEventListener('dragover', function (e) { e.preventDefault(); this.classList.add('drag-over'); });
  els.tkImportDropZone.addEventListener('dragleave', function () { this.classList.remove('drag-over'); });
  els.tkImportDropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    var file = e.dataTransfer.files[0];
    if (file) handleImportFile(file);
  });
  els.tkImportConfirm.addEventListener('click', doImport);
}

export function saveTask() {
  var title = els.tkFormTitle.value.trim();
  if (!title) { els.tkFormTitle.focus(); return; }
  if (!els.tkFormProject.value) { toast('请选择所属项目', 'warning'); els.tkFormProject.focus(); return; }
  if (!tkProjectsForCurrentUser().some(function (project) { return project.id === els.tkFormProject.value; })) { toast('请选择可参与的项目', 'warning'); return; }
  var createdForOpenParent = !state.editingTaskId && state.editingParentId && state.drawerTaskId === state.editingParentId;
  var labels = pageState.modalLabelSelection.slice();
  if (!tkPeopleInProject(els.tkFormProject.value).some(function (person) { return person.id === els.tkFormAssignee.value; })) { toast('请选择该项目成员作为处理人', 'warning'); return; }
  if (!TEAMS.some(function (team) { return team.id === (activePick.kind==='team' ? activePick.id : ''); })) { toast('请选择智能体团队', 'warning'); return; }
  var data = {
    title: title, desc: els.tkFormDesc.value.trim(),
    status: els.tkFormStatus.value, priority: els.tkFormPriority.value,
    assignee: els.tkFormAssignee.value, teamId: activePick.kind==='team' ? activePick.id : '', project: els.tkFormProject.value,
    dueDate: els.tkFormDue.value, labels: labels,
  };
  if (state.editingTaskId) { tkUpdateTask(state.editingTaskId, data); }
  else {
    data.createDate = '2026-09-23';
    if (state.editingParentId) {
      data.parentId = state.editingParentId;
    }
    tkAddTask(data);
  }
  var keepOpen = els.tkMcContinue && els.tkMcContinue.checked && !state.editingTaskId;
  if (keepOpen) {
    els.tkFormTitle.value = '';
    els.tkFormDesc.value = '';
    els.tkFormTitle.focus();
    toast('任务已创建，可继续创建下一个', 'success');
  } else {
    closeTaskModal();
    toast(state.editingTaskId ? '保存成功' : '创建成功', 'success');
  }
  render();
  if (createdForOpenParent && !keepOpen) openDrawer(state.drawerTaskId);
}
