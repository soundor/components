import { Path, Svg } from '@soundor/react/svg';

const responses = {
  lowpass: 'M2 4 H8 Q12 4 13 8 L18 15',
  highpass: 'M2 15 L7 8 Q8 4 12 4 H18',
  bandpass: 'M2 15 L7 5 Q10 1 13 5 L18 15',
  notch: 'M2 4 H6 C8 4 8 14 10 14 S12 4 14 4 H18',
  peak: 'M2 13 H5 C7 13 7 4 10 4 S13 13 15 13 H18',
  low: 'M2 4 H7 C10 4 10 13 13 13 H18',
  high: 'M2 13 H7 C10 13 10 4 13 4 H18',
};

export function FilterIcon({
  shape,
  color,
}: {
  shape: keyof typeof responses;
  color: string;
}) {
  return (
    <Svg width={20} height={18} viewBox={[0, 0, 20, 18]}>
      <Path
        d={responses[shape]}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}
