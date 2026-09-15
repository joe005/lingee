import { Search, Plus, ChevronDown, MoreHorizontal, X } from 'lucide-react';

/* 图标注册表 —— 见 docs/react-migration-plan.md §8.7。
   用 lucide-react 而不是 antd 自带的 @ant-design/icons：现有图标是仿 Lucide
   的细线条风格（stroke-width ~1.7），@ant-design/icons 是实心/描边的企业风格，
   视觉体系不同。antd 组件需要图标的地方（比如 Dropdown 的箭头）通过 icon prop
   传入这里的输出即可，antd 支持自定义图标节点。

   只登记 Phase 1 这几个卡片网格页实际用到的高频图标；新增图标在这里加一行，
   不要在别处再写内联 SVG 字符串。 */
const REGISTRY = {
  search: Search,
  plus: Plus,
  'chevron-down': ChevronDown,
  more: MoreHorizontal,
  close: X,
};

export default function Icon({ name, size = 16, strokeWidth = 1.7, className, ...rest }) {
  const Cmp = REGISTRY[name];
  if (!Cmp) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[Icon] 未注册的图标名: ${name}`);
    }
    return null;
  }
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} {...rest} />;
}
