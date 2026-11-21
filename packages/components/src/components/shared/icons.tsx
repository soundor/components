import { Path, Svg } from '@soundor/react/svg';

/** A tick, for the chosen option of a list and a checked menu item. */
export function CheckIcon({
  color,
  size = 10,
}: {
  color: string;
  size?: number;
}) {
  return (
    <Svg
      accessible={false}
      width={size}
      height={size}
      viewBox={[0, 0, 10, 10]}
      style={{ pointerEvents: 'none' }}
    >
      <Path
        d="M 1.5 5.4 L 4 7.8 L 8.6 2.4"
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Up-and-down chevrons: a field that opens a list of options. */
export function ChevronIcon({
  color,
  size = 10,
}: {
  color: string;
  size?: number;
}) {
  return (
    <Svg
      accessible={false}
      width={size}
      height={size}
      viewBox={[0, 0, 10, 10]}
      style={{ pointerEvents: 'none' }}
    >
      <Path
        d="M 2.8 3.8 L 5 1.6 L 7.2 3.8 M 2.8 6.2 L 5 8.4 L 7.2 6.2"
        fill="none"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
