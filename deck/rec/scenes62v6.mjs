// 6.2 Build 让非专业开发人员都可构建自己的智能体（v6：商务主管林悦用大白话搭建销售履约智能体，无配音）
// 每段最短时长由工作目录里的静音占位 tts62v6_NN.mp3 决定（见 deck/rec/v6.sh）
import path from 'path';
import { fileURLToPath } from 'url';
const KB = process.env.V6_KB_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), 'kb62v6');
const REQ = '帮我做一个销售履约智能体，管住销售订单从接单到回款的全过程，同时把「接单制单」「履约执行」「收款催收」「销售月报」四个技能做出来，数据都从金蝶 ERP 里取。'
  + '规矩是：收到客户采购单先查信用，额度用超一半或有逾期就提醒我，没问题再建销售订单，先存草稿，问过我再提交审核；'
  + '履约按发货通知、运单、出库的顺序下推，运输商在赶得上要货日期的前提下选最便宜的；ERP 缺基础资料就停下来交给人补，别硬做；'
  + '催收只管逾期 30 天以上的，同一客户合并一封；每一步的结果都做成网页报告，套公司模板。';
export default { user: '林悦',
  prepare: async ({ page, wait, ensure }) => {
    await page.click('.seg-item[data-seg="dev"]').catch(() => {}); await wait(500);
    await page.locator('.sb-scroll .nav-item').filter({ hasText: '新会话' }).first().click(); await wait(800);
    await ensure();
  },
  cues: [
    /* 00 开发板块新会话，选「智能体开发」 */
    async ({ click, hover, wait }) => {
      await wait(600); await hover('#view-newtask .mode-item[data-val="智能体开发"]'); await wait(500);
      await click('#view-newtask .mode-item[data-val="智能体开发"]'); await wait(400);
      await hover('#composerInput');
    },
    /* 01 用大白话写需求和规矩 */
    async ({ type, hover }) => {
      await type('#composerInput', REQ, 38);
      await hover('#sendBtn');
    },
    /* 02 发送：skill-builder 生成四个技能，经 MCP 接金蝶 ERP，写角色、绑定技能、关联知识 */
    async ({ click }) => { await click('#sendBtn'); },
    /* 03 处理完成：交付摘要 + 智能体卡片 */
    async ({ page, hover, wait }) => {
      await page.waitForSelector('.ad-agent-card', { timeout: 30000 }); await wait(400);
      await hover(page.locator('.ad-summary p strong').filter({ hasText: '技能创建与绑定' }).first()); await wait(1400);
      await hover(page.locator('.ad-summary p strong').filter({ hasText: '金蝶 ERP 连接' }).first()); await wait(1400);
      await hover('.ad-agent-card');
    },
    /* 04 打开配置：规矩变成工作原则 */
    async ({ page, click, hover, wait }) => {
      await click('.ad-agent-card .ad-agent-copy'); await wait(900);
      await click('#agentConfigPanel .agent-config-tab[data-tab=role]'); await wait(300);
      await page.evaluate(() => { const t = document.getElementById('agentConfigRoleText'); t.scrollTo({ top: t.scrollHeight, behavior: 'smooth' }); });
      await hover('#agentConfigRoleText');
    },
    /* 05 技能页：四个技能；知识页：上传运价表、催收函模板、网页报告模板 */
    async ({ page, click, hover, wait, moveTo }) => {
      await click('#agentConfigPanel .agent-config-tab[data-tab=skills]'); await wait(2200);
      await click('#agentConfigPanel .agent-config-tab[data-tab=knowledge]'); await wait(1400);
      const up = page.locator('#agentKnowledgeUpload');
      await moveTo(up);
      const [chooser] = await Promise.all([page.waitForEvent('filechooser'), up.click()]);
      await chooser.setFiles(['承运商运价表.xlsx', '催收函模板（HR-6）.docx', '网页报告模板（订单·比价·履约·收款·月报）.docx'].map(f => path.join(KB, f)));
      await wait(1300);
      await hover(page.locator('.agent-config-kb-card').first());
    },
    /* 06 本地测试：附上客户采购单，先查信用，再出订单草稿和网页预览，停下来问是否提交 */
    async ({ page, click, type, wait, hover }) => {
      await click(page.locator('.ad-agent-card [data-ad-test]').first()); await wait(900);
      await click('[data-ad-attach]'); await wait(500);
      await type('#chatInput', '检查客户风险，形成销售订单，预览信息', 60);
      await wait(300); await click('#chatSendBtn');
      await page.waitForSelector('#view-chat [data-ad-order]', { timeout: 15000 }); await wait(500);
      await page.evaluate(() => { const t = document.querySelector('#view-chat .message.assistant:last-child .markdown-content'); t && t.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
      await wait(1800);
      await click('#view-chat [data-ad-order]'); await wait(2400);
      await hover(page.locator('#view-chat .message.assistant .markdown-content p').filter({ hasText: '下一步' }).last());
    },
    /* 07 返回 → 提交上架审核 → 企业审核通过，发布给销售团队 */
    async ({ page, click, hover, wait }) => {
      await click('.ad-back-btn'); await wait(1000);
      await click('#agentConfigSubmit'); await wait(500);
      await hover('#agentSubmitDesc'); await wait(1600);
      await click('#agentSubmitOk'); await wait(2400);
      await hover('#agentConfigStatus');
    },
    /* 08 收尾 */
    async ({ wait }) => { await wait(200); },
  ] };
