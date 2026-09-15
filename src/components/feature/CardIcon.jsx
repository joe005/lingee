/* 卡片左上角的彩色图标徽标。每个应用/技能/智能体用的是各自专属的图腾图案，
   不是从 lucide 这类通用图标库里能挑到的现成图标（这点和 Icon.jsx 里登记的
   UI 图标不是一回事）。用 JSX 画 <path>，而不是把一整段 <svg>...</svg>
   拼成字符串塞进数据里——见 docs/react-migration-plan.md §8.7。 */
export default function CardIcon({ icon }) {
  if (!icon) return null;
  const { viewBox = '0 0 24 24', paths = [], color, bg } = icon;
  return (
    <span className="card-icon" style={{ color, background: bg }}>
      <svg
        className="ic"
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={icon.strokeWidth ?? 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
        {(icon.circles || []).map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />
        ))}
        {(icon.rects || []).map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.width} height={r.height} rx={r.rx} />
        ))}
      </svg>
    </span>
  );
}
