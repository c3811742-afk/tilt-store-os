// Clean y-axis ticks for a chart: 0 up to at least `max`, in round steps (1, 2, 2.5 or 5 times a power of ten), so
// the gridlines read as 0 / 5 / 10 / 15 or 0 / 10K / 20K. The last tick is the top of the chart.
export const niceTicks = (max: number, count: number): number[] => {
  if (!(max > 0) || count < 1) return [0, 1];
  const rough = max / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const nice = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ?? 10 * power;
  const step = Number.isInteger(max) ? Math.max(nice, 1) : nice; // counts of pieces never get a half step
  const ticks = [0];
  while (ticks[ticks.length - 1] < max) ticks.push(Number((ticks.length * step).toPrecision(12)));
  return ticks;
};

// A y-axis tick label: in full under 10,000, short from there (10K, 1.5M). One style for the whole axis, decided by
// its top value.
export const formatAxisNumber = (value: number, top: number, locale: string) =>
  new Intl.NumberFormat(locale, top >= compactFrom ? { notation: 'compact', maximumFractionDigits: 1 } : { maximumFractionDigits: 1 }).format(value);

const compactFrom = 10000;
