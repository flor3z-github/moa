'use client';

interface SparklineProps {
  prices: number[];
  width?: number;
  height?: number;
  color?: string;
  symbol: string;
}

export default function Sparkline({
  prices,
  width = 120,
  height = 40,
  color = 'var(--accent)',
  symbol,
}: SparklineProps) {
  if (prices.length < 2) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const padding = 2;

  const points = prices.map((p, i) => {
    const x = padding + (i / (prices.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(' ');
  const lastPoint = points[points.length - 1].split(',');
  const gradientId = `sparkline-${symbol}`;

  // Area fill path
  const firstX = padding;
  const lastX = padding + ((prices.length - 1) / (prices.length - 1)) * (width - padding * 2);
  const areaPath = `M ${points[0]} ${points.slice(1).map(p => `L ${p}`).join(' ')} L ${lastX},${height} L ${firstX},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={lastPoint[0]}
        cy={lastPoint[1]}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}
