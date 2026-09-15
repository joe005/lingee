/* 技能开发页卡片数据，同 apps.js 的做法。 */
export const SKILLS_LIBRARY = [
  {
    id: 'skill-code-review',
    title: '代码审查助手',
    desc: '自动审查代码规范性、安全漏洞和性能问题，提供修改建议',
    tags: ['开发', '质量'],
    icon: {
      color: '#3a7bff',
      bg: '#eef3ff',
      paths: ['M12 3a9 9 0 0 0 0 18M3 12h18'],
      circles: [{ cx: 12, cy: 12, r: 9 }],
    },
  },
  {
    id: 'skill-data-converter',
    title: '数据转换器',
    desc: '支持 JSON ↔ CSV 互转、字段映射、数据清洗',
    tags: ['数据', '工具'],
    icon: {
      color: '#8b5cf6',
      bg: '#f3eefe',
      paths: ['M12 3a9 9 0 0 0 0 18M3 12h18'],
    },
  },
  {
    id: 'skill-doc-generator',
    title: '文档生成器',
    desc: '基于代码注释自动生成 API 文档和用户手册',
    tags: ['文档', '效率'],
    icon: {
      color: '#ff8d42',
      bg: '#fff1e8',
      paths: ['M12 3a9 9 0 0 0 0 18M3 12h18'],
      circles: [{ cx: 12, cy: 12, r: 9 }],
    },
  },
];
