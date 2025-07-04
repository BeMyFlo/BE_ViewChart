import { BollingerBands } from "technicalindicators";

export function calcBollingerBands(candles, period = 20, stdDev = 2) {
  const closes = candles.map((c) => c.close);

  const result = BollingerBands.calculate({
    period,
    stdDev,
    values: closes,
  });

  return result.map((b, i) => ({
    time: candles[i + period - 1].time,
    lower: b.lower,
    middle: b.middle,
    upper: b.upper,
  }));
}
