import billTemplate from '../../artifacts/purchase-order.html?raw';
import tokensCss from '../../styles/tokens.css?raw';

/* 产物预览与应用共用同一份设计令牌 */
export const billTemplateWithTokens = billTemplate.replace(
  '/* 令牌由 tokens.css 注入 */',
  tokensCss.replace(/\/\*[\s\S]*?\*\//g, '').trim()
);
