/* Vitest 测试环境配置。
   - 导入 @testing-library/jest-dom 提供 toBeInTheDocument 等 matchers
   - mock window.__lingeeBridge，让组件能在测试环境下读到 bridge 方法 */

import '@testing-library/jest-dom';

/* antd 的 Row/Col 用 useBreakpoint → window.matchMedia，jsdom 没实现。
   给一个空实现让组件不崩。 */
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

/* jsdom 没实现 getComputedStyle 的伪元素支持，antd 的部分组件会触发。
   给一个最小化 mock 避免报错。 */
if (!window.getComputedStyle) {
  window.getComputedStyle = (_elt) => ({
    getPropertyValue: () => '',
    getPropertyPriority: () => '',
  });
}

// 创建一个最小化的 bridge mock，测试用例可以覆盖特定字段
function makeMockBridge(overrides = {}) {
  return {
    subscribe: () => () => {},
    getOpenModal: () => null,
    getVersion: () => 0,
    close: () => {},
    ...overrides,
  };
}

window.__lingeeBridge = {
  toast: () => {},
  showView: () => {},
  setNavActive: () => {},
  expert: makeMockBridge({
    getExpertId: () => 'test-expert',
    getExpert: () => ({
      id: 'test-expert', k: 'eng', name: '测试专家', role: '测试角色', by: '测试',
      desc: '这是一个测试专家', tags: ['测试'], modes: ['分析', '设计'],
      comp: [{ id: 'test', name: '测试能力', lv: 'advanced', level: '精通' }],
      cmds: [['测试触发词', '描述']], skills: ['test-skill'], mine: true, ro: false,
    }),
    getAvatar: () => 'data:image/svg+xml,test',
    callExpert: () => {},
    editExpert: () => {},
    deleteExpert: () => {},
    viewExpert: () => {},
  }),
  expertEdit: makeMockBridge({
    getEditingId: () => null,
    getInitialData: () => ({
      k: 'eng', name: '', role: '', desc: '', visibility: 'workspace',
      tags: [], modes: ['分析', '设计', '实现'], comp: [], cmds: [['', '']],
    }),
    getAvatars: () => ['lead', 'pm', 'arch', 'eng'],
    getWorkModes: () => ['分析', '设计', '实现', '集成', '评审', '验证', '恢复'],
    getAvatar: () => 'data:image/svg+xml,test',
    save: () => {},
    delete: () => {},
    startByChat: () => {},
  }),
  team: makeMockBridge({
    getEditingId: () => null,
    getInitialData: () => ({ name: '', desc: '', visibility: 'workspace', preset: false }),
    getDraft: () => ({
      name: '测试团', desc: '测试描述', visibility: 'workspace',
      leadId: 'eng', members: ['eng'], preset: false,
      domains: [], gates: [], cmds: [['', '']],
    }),
    getFlow: () => [{ id: 'implement', k: 'implement', title: '实现编码任务', who: 'eng' }],
    getCoverage: () => [{ id: 'test', name: '测试能力', lv: 'advanced', level: '精通' }],
    getWarnings: () => [],
    getActiveGates: () => [],
    hasGate: () => false,
    toggleGate: () => {},
    save: () => {},
    delete: () => {},
    callTeam: () => {},
    callTeamWithCmd: () => {},
    getExpert: () => ({
      id: 'eng', k: 'eng', name: '软件工程师', role: '工程师', by: '内置',
      desc: '测试', tags: [], modes: ['分析', '设计', '实现'], comp: [],
      cmds: [], mine: false, ro: false,
    }),
    getAvatar: () => 'data:image/svg+xml,test',
    openMemberPicker: () => {},
    setLead: () => {},
    removeMember: () => {},
    addCmd: () => {},
    removeCmd: () => {},
    updateCmd: () => {},
  }),
  member: makeMockBridge({
    getMembers: () => [
      { id: 'eng', k: 'eng', name: '软件工程师', desc: '测试', ro: false, modes: ['分析'], isMember: false },
      { id: 'qa', k: 'qa', name: '测试工程师', desc: '测试', ro: false, modes: ['验证'], isMember: true },
    ],
    toggleMember: () => {},
    getAvatar: () => 'data:image/svg+xml,test',
  }),
};
