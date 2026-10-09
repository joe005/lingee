// 6.2 Build 让企业全员都能构建自己的智能体（v5：新会话里说经验并要两个技能，Build 创建助手的同时生成技能并自动绑定）
export default { user: '周建国', rename: [['周建国', '周师傅']],
  prepare: async ({ page, wait, ensure }) => {
    await page.click('.seg-item[data-seg="dev"]').catch(() => {}); await wait(500);
    await page.locator('.sb-scroll .nav-item').filter({ hasText: '新会话' }).first().click(); await wait(800);
    await ensure();
  },
  cues: [
    /* 00 周师傅最有价值的是排障经验；像平时说话一样告诉 Build（边说边输入） */
    async ({ click, type, hover, wait }) => {
      await wait(500); await click('#view-newtask .mode-item[data-val="智能体开发"]'); await wait(500);
      await type('#composerInput', '帮我做一个设备故障诊断助手，同时创建「查询设备档案」「查询维修记录」两个技能并绑定，数据从设备巡检维修系统里查。设备温度异常，先看最近有没有换过零件，再查热电偶和加热圈；遇到高压电，一定先断电挂牌。', 80);
      await hover('#sendBtn');
    },
    /* 01 发送：agent-builder 调用 skill-builder，随助手一起生成并校验两个技能 */
    async ({ click }) => { await click('#sendBtn'); },
    /* 02 写入角色、初始化并自动绑定技能 → 关联知识、严格校验 → 处理完成 + 交付摘要 + 智能体卡片 */
    async ({ page, hover, wait }) => {
      await page.waitForSelector('.ad-agent-card', { timeout: 20000 }); await wait(400);
      await hover(page.locator('.ad-summary p strong').filter({ hasText: '技能创建与绑定' }).first()); await wait(1600);
      await hover('.ad-agent-card');
    },
    /* 03 点开卡片：工作原则、技能、知识 */
    async ({ page, click, hover, wait }) => {
      await click('.ad-agent-card .ad-agent-copy'); await wait(1000);
      await click('#agentConfigPanel .agent-config-tab[data-tab=role]'); await wait(200);
      await page.evaluate(() => { const t = document.getElementById('agentConfigRoleText'); t.scrollTop = t.scrollHeight; });
      await hover('#agentConfigRoleText'); await wait(1900);
      await click('#agentConfigPanel .agent-config-tab[data-tab=skills]'); await wait(1600);
      await click('#agentConfigPanel .agent-config-tab[data-tab=knowledge]'); await wait(300);
      await hover(page.locator('.agent-config-kb-card').first());
    },
    /* 04 本地测试：输入设备编号和故障现象，助手查记录、按经验给建议 */
    async ({ page, click, type, wait, hover }) => {
      await click(page.locator('.ad-agent-card [data-ad-test]').first()); await wait(900);
      await type('#chatInput', '3 号注塑机温度忽高忽低，怎么排查？', 60);
      await wait(300); await click('#chatSendBtn'); await wait(4600);
      await hover(page.locator('#view-chat .message.assistant .markdown-content ol').last());
    },
    /* 05 返回 → 提交 → 企业审核通过，发布给维修人员 */
    async ({ page, click, hover, wait }) => {
      await click('.ad-back-btn'); await wait(1000);
      await click('#agentConfigSubmit'); await wait(500);
      await hover('#agentSubmitDesc'); await wait(2000);
      await click('#agentSubmitOk'); await wait(2400);
      await hover('#agentConfigStatus');
    },
    /* 06 收尾 */
    async ({ wait }) => { await wait(200); },
  ] };
