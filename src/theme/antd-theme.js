/* antd 5 主题 token，对照 src/styles/tokens.css 搬一版。
   见 docs/react-migration-plan.md §3.2 / §7——颜色、圆角、间距这类基础维度
   可以对齐，但密度、阴影语言、动效曲线这些细节还是要针对具体组件做样式覆盖，
   不能理解成「配完这份 token 就等于长得一样」。

   两边都从这一份对象派生，任何一边改配色都只改这里。 */
export const antdThemeToken = {
  colorPrimary: '#495dff',
  colorPrimaryHover: '#3a5eff',
  colorPrimaryActive: '#1a5cff',
  colorPrimaryBg: '#eef3ff',
  colorInfo: '#495dff',

  colorText: '#2d2d2d',
  colorTextSecondary: '#767676',
  colorTextTertiary: '#b8b8b8',

  colorBgBase: '#ffffff',
  colorBgContainer: '#ffffff',
  colorBgLayout: '#fbfbfb',

  colorBorder: '#e0e0e0',
  colorBorderSecondary: '#efefef',

  colorSuccess: '#08a040',
  colorSuccessBg: '#e8faef',
  colorWarning: '#c06010',
  colorWarningBg: '#fff1e8',
  colorError: '#e04a3a',
  colorErrorBg: '#fff1f0',

  borderRadius: 8,
  borderRadiusLG: 16,
  borderRadiusSM: 6,

  fontFamily:
    '-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI","Microsoft YaHei",sans-serif',
  fontSize: 14,

  boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
  boxShadowSecondary: '0 8px 28px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
};

export const antdComponentTokens = {
  Button: {
    colorPrimary: '#495dff',
    algorithm: true,
  },
  Input: {
    borderRadius: 8,
    activeBorderColor: '#495dff',
    hoverBorderColor: '#c7d2fe',
  },
  Card: {
    borderRadiusLG: 16,
  },
  Tag: {
    borderRadiusSM: 6,
  },
  Dropdown: {
    borderRadiusLG: 10,
  },
};
