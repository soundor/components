export const trueMinus = (text: string | number) =>
  String(text).replace(/^-/, '−');

export const formatters = {
  percent: (value: number) => `${trueMinus(Math.round(value * 100))}%`,
  frequency: (value: number) =>
    Math.abs(value) >= 1000
      ? `${trueMinus((value / 1000).toFixed(Math.abs(value) >= 10000 ? 1 : 2))} kHz`
      : `${trueMinus(Math.round(value))} Hz`,
  decibels: (value: number) => `${trueMinus(value.toFixed(1))} dB`,
  time: (milliseconds: number) =>
    Math.abs(milliseconds) >= 1000
      ? `${trueMinus((milliseconds / 1000).toFixed(2))} s`
      : `${trueMinus(Math.round(milliseconds))} ms`,
  pan: (value: number) => {
    const amount = Math.round(Math.abs(value) * 100);
    return amount === 0 ? 'C' : `${value < 0 ? 'L' : 'R'} ${amount}`;
  },
};

export const parsers = {
  pan: (text: string) => {
    const match =
      /^\s*([LR])?\s*([+\-−]?(?:\d+(?:[.,]\d*)?|[.,]\d+))\s*%?\s*$/i.exec(text);
    if (/^\s*C\s*$/i.test(text)) return 0;
    if (!match?.[2]) return null;
    const value = Number(match[2].replace(',', '.').replace('−', '-'));
    const magnitude = Math.min(1, Math.abs(value) / 100);
    return match[1]?.toUpperCase() === 'L' || (!match[1] && value < 0)
      ? -magnitude
      : magnitude;
  },
  number: (text: string) => {
    const match =
      /^\s*([+\-−]?(?:\d+(?:[.,]\d*)?|[.,]\d+))\s*(khz|k|hz|ms|s|db|%)?\s*$/i.exec(
        text,
      );
    if (!match?.[1]) return null;
    const value = Number(match[1].replace(',', '.').replace('−', '-'));
    const unit = match[2]?.toLowerCase();
    if (unit === 'k' || unit === 'khz' || unit === 's') return value * 1000;
    return unit === '%' ? value / 100 : value;
  },
};
