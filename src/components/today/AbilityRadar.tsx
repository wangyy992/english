import { ABILITY_DIMS, DIM_LABEL, type AbilityDim } from '../../lib/ability';

const SIZE = 140;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 48;

function point(index: number, ratio: number): [number, number] {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / ABILITY_DIMS.length;
  return [CX + R * ratio * Math.cos(angle), CY + R * ratio * Math.sin(angle)];
}

function polygon(ratios: number[]): string {
  return ratios.map((r, i) => point(i, r).join(',')).join(' ');
}

export default function AbilityRadar({ scores }: { scores: Record<AbilityDim, number> }) {
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-label="五维能力雷达图">
      {[0.33, 0.66, 1].map((r) => (
        <polygon key={r} points={polygon(ABILITY_DIMS.map(() => r))} fill="none" stroke="#E7E2D9" strokeWidth="1" />
      ))}
      {ABILITY_DIMS.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#E7E2D9" strokeWidth="1" />;
      })}
      <polygon
        points={polygon(ABILITY_DIMS.map((d) => Math.max(0.05, scores[d] / 100)))}
        fill="rgb(180 79 43 / 0.16)"
        stroke="#B44F2B"
        strokeWidth="1.5"
      />
      {ABILITY_DIMS.map((d, i) => {
        const [x, y] = point(i, 1.28);
        return (
          <text key={d} x={x} y={y + 3} textAnchor="middle" className="fill-gray-400" fontSize="10">
            {DIM_LABEL[d]} {scores[d]}
          </text>
        );
      })}
    </svg>
  );
}
