import type { createPortalHost, Style } from '@soundor/react';
import { createContext } from 'react';

import type { Placement } from './placement';

export const PopupPlacementContext = createContext<{
  placement: Placement | null;
  surfaceStyle: Style;
  arrowHost: ReturnType<typeof createPortalHost>;
  registerArrow: (height: number) => () => void;
} | null>(null);
