import { escapeHtml } from './ui-utils.js';
import { toast } from '../../core/toast.js';

async function attachmentRequest(mode, operation) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('lingee-task-attachments', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('files');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('files', mode);
      const request = operation(transaction.objectStore('files'));
      transaction.oncomplete = () => resolve(request?.result);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function saveTaskAttachments(attachments) {
  const added = attachments.filter(item => item.file);
  if (added.length) {
    await attachmentRequest('readwrite', store => {
      added.forEach(({id, file}) => store.put(file, id));
    });
  }
  return attachments.map(({id, name, size}) => ({id, name, size}));
}

export async function downloadTaskAttachment(attachment) {
  try {
    const file = attachment.file || await attachmentRequest('readonly', store => store.get(attachment.id));
    if (!file) { toast('当前浏览器中没有此附件', 'warning'); return; }
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.name;
    document.body.appendChild(link);
    try {
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch (_) {
    toast('附件下载失败，请重试', 'warning');
  }
}

export function taskAttachmentRows(attachments, allowRemove = false) {
  return attachments.map(({id, name, size}) => {
    const filename = escapeHtml(name);
    const sizeLabel = size < 1024 ? size + ' B' : size < 1048576 ? (size / 1024).toFixed(1) + ' KB' : (size / 1048576).toFixed(1) + ' MB';
    const key = escapeHtml(id);
    return '<div class="tk-attach-item"><span class="tk-attach-item-name" title="' + filename + '">' + filename + '</span>'
      + '<span class="tk-attach-item-size">' + sizeLabel + '</span>'
      + '<button type="button" class="tk-attach-item-btn" data-task-attachment-download="' + key + '" aria-label="下载 ' + filename + '">下载</button>'
      + (allowRemove ? '<button type="button" class="tk-attach-item-btn" data-task-attachment-remove="' + key + '" aria-label="移除 ' + filename + '">移除</button>' : '')
      + '</div>';
  }).join('');
}
