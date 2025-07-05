// websocket.js
import { WebSocketServer } from "ws";
import fetch from "node-fetch";

const clients = new Map();

export default function initWebSocket(server) {
  const wss = new WebSocketServer({ server });

  setInterval(broadcastPricesToSubscribers, 3000);
  setInterval(broadcastChartCandles, 3000);

  wss.on("connection", (ws) => {
    clients.set(ws, { userId: null, symbols: [], chart: null });

    ws.on("message", (msg) => {
      try {
        const raw = msg.toString();
        const data = JSON.parse(raw);

        if (data.type === "auth") {
          clients.get(ws).userId = data.userId || null;
        }

        if (data.type === "subscribeCandle") {
          clients.get(ws).chart = {
            symbol: data.symbol,
            interval: data.interval,
          };
        }
      } catch (err) {
        console.error("❌ WS parse error:", err.message);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
    });
  });
}

async function broadcastPricesToSubscribers() {
  const allSymbols = null;
  try {
    const allPrices = await fetchPrices(allSymbols);

    for (const [ws] of clients.entries()) {
      if (ws.readyState !== ws.OPEN) continue;

      if (allPrices.length > 0) {
        ws.send(JSON.stringify({ type: "priceUpdate", data: allPrices }));
      }
    }
  } catch (err) {
    console.error("❌ Error broadcasting prices:", err.message);
  }
}

async function fetchPrices(symbols) {
  symbols = ["BTCUSDT", "ETHUSDT", "ADAUSDT", "BNBUSDT", "XRPUSDT", "SUIUSDT"];

  const requests = symbols.map((symbol) =>
    fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`).then(
      (r) => r.json()
    )
  );

  const results = await Promise.all(requests);

  return results.map((item) => ({
    symbol: item.symbol,
    price: parseFloat(item.lastPrice),
    change: parseFloat(item.priceChangePercent),
  }));
}

function groupClientsByChart() {
  const groups = {};
  for (const [ws, { chart }] of clients.entries()) {
    if (!chart) continue;
    const key = `${chart.symbol}|${chart.interval}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(ws);
  }
  return groups;
}

async function broadcastChartCandles() {
  const groups = groupClientsByChart();

  for (const key of Object.keys(groups)) {
    const [symbol, interval] = key.split("|");
    const data = await fetchLatestCandle(symbol, interval);

    if (!data) continue;

    const payload = JSON.stringify({
      type: "candleUpdate",
      data: {
        ...data.candle,
        symbol: data.symbol,
        interval: data.interval,
      },
    });

    // const subscribers = groups[key].filter((ws) => ws.readyState === ws.OPEN);
    // console.log(
    //   `📊 Gửi candle cho ${symbol} ${interval} → ${subscribers.length} clients`
    // );

    for (const ws of groups[key]) {
      if (ws.readyState === ws.OPEN) {
        ws.send(payload);
      }
    }
  }
}

async function fetchLatestCandle(symbol, interval) {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1`;
    const res = await fetch(url);
    const raw = await res.json();
    const [time, open, high, low, close, volume] = raw[0];
    return {
      symbol,
      interval,
      candle: {
        time: time / 1000,
        open: +open,
        high: +high,
        low: +low,
        close: +close,
        volume: +volume,
      },
    };
  } catch (e) {
    console.error("❌ Fetch candle error", e.message);
    return null;
  }
}
