// 6.1 Build 让每一名开发人员都拥有一支自己的智能体开发团队（v5：沿用原型的协作开发任务流程）
// 每个 cue 对应 narration.json 的一段配音；画面按 cue 推进，cue 时长取配音时长
const plan = page => page.locator('#tkDrawer .tk-feed-stage-row');
async function openTask(page, click, wait) {
  await click(page.getByText('故障报修与维修记录', { exact: true }).filter({ visible: true }).first()); await wait(900);
}
export default { user: '张工', rename: [['张工', '张伟'], ['王工', '张伟'], ['李工', '张伟']],
  prepare: async ({ page, wait, ensure }) => {
    await page.click('.seg-item[data-seg="dev"]').catch(() => {}); await wait(500);
    await page.locator('.sb-scroll .nav-item').filter({ hasText: '协作开发' }).first().click(); await wait(700);
    await page.click('.tab-nav-item:has-text("任务")').catch(() => {}); await wait(500); await ensure();
  },
  cues: [
    /* 00 已在 Manage 立项；开始工作的是一支苍穹应用开发智能体团队 */
    async ({ page, click, hover, wait }) => {
      await wait(300);
      await hover(page.getByText('故障报修与维修记录', { exact: true }).filter({ visible: true }).first()); await wait(1400);
      await openTask(page, click, wait);
      await hover('#tkDrawer .tk-exec-team-avatars');
    },
    /* 01 五个阶段分别由不同智能体完成，结果自动交给下一个 */
    async ({ page, hover, wait }) => {
      for (let i = 0; i < 5; i++) {
        const row = plan(page).nth(i);
        const ex = row.locator('.tk-feed-stage-expert-content');
        await hover((await ex.count()) ? ex.first() : row.locator('.tk-feed-stage-name').first());
        await wait(2300);
      }
    },
    /* 02 张伟只负责目标确认和关键节点审核 */
    async ({ page, hover, wait }) => {
      await hover(plan(page).nth(0).locator('.tk-feed-stage-assignee')); await wait(3200);
      await hover(plan(page).nth(3).locator('.tk-feed-stage-assignee')); await wait(2600);
      await hover(plan(page).nth(3).locator('[data-stage-review]').first());
    },
    /* 03 开发智能体基于苍穹元数据生成实体、表单、列表和逻辑 */
    async ({ page, click, hover, wait }) => {
      await click(page.locator('#tkDrawer .tk-feed-stage-expand').filter({ visible: true }).nth(2)); await wait(500);
      await click(page.locator('.tk-artifact').filter({ hasText: '元数据清单' }).first()); await wait(1600);
      const t = page.locator('table').filter({ hasText: 'eqp_repair_order' }).filter({ visible: true }).first();
      if (await t.count()) await hover(t);
    },
    /* 04 测试智能体 42 条通过 → 张伟确认 → 部署智能体发布上线 */
    async ({ page, click, wait, cut }) => {
      const pv = page.locator('#tkDocPreviewClose').filter({ visible: true });
      if (await pv.count()) { await click(pv.first()); await wait(200); }
      await click('#tkDrawerClose'); await wait(250);
      await click('.tk-list-action-btn[data-list-task-id="1503"]'); await wait(1800);
      await click(page.locator('.tk-list-review-approve, button:has-text("通过验收")').filter({ visible: true }).first()); await wait(250);
      if (await page.locator('#tkConfirmOk').isVisible().catch(() => false)) { await click('#tkConfirmOk'); await wait(500); }
      await click('.tk-list-action-btn[data-list-task-id="1503"]'); await wait(1600);
      await cut(async () => { await page.waitForSelector('#chatStageConfirmBtn:not([disabled])', { timeout: 60000 }); await wait(300); });
      await click('#chatStageConfirmBtn'); await wait(250);
      if (await page.locator('#tkConfirmOk').isVisible().catch(() => false)) { await click('#tkConfirmOk'); await wait(400); }
    },
    /* 05 一支智能体团队从需求协作到上线，人只负责目标、判断和关键决策：已完成列表里全部阶段已交付 */
    async ({ page, click, hover, wait }) => {
      await click(page.locator('.sb-scroll .nav-item').filter({ hasText: '协作开发' }).first()); await wait(500);
      await click(page.locator('#view-collab').getByText(/^已完成/).filter({ visible: true }).first()); await wait(900);
      await hover(page.getByText('故障报修与维修记录', { exact: true }).filter({ visible: true }).first()); await wait(2600);
      await hover(page.getByText('全部阶段已交付').filter({ visible: true }).first()); await wait(2600);
      await hover(page.getByText('设备台账与扫码巡检', { exact: true }).filter({ visible: true }).first());
    },
    /* 06 结构化 ERP 元数据：标准能力复用、Token 更省、权限继承金蝶 ERP */
    async ({ page, click, hover, wait }) => {
      await click(page.locator('.sb-scroll .nav-item').filter({ hasText: '应用开发' }).first()); await wait(500);
      await click(page.locator('#view-apps .card-title').filter({ hasText: /^设备巡检维修系统$/ }).first()); await wait(3000);
      await click(page.locator('.preview-tab[data-tab="entity"]')); await wait(800);
      const t = page.locator('#previewBodyEntity .entity-table').filter({ visible: true }).first();
      if (await t.count()) await hover(t);
      await wait(3200);
      await click(page.locator('.preview-tab[data-tab="plugin"]'));
    },
    /* 07 收尾 */
    async ({ wait }) => { await wait(200); },
  ] };
