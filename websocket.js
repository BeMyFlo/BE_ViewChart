// websocket.js
import { WebSocketServer } from "ws";
import fetch from "node-fetch";

const clients = new Map();

export default function initWebSocket(server) {
  const wss = new WebSocketServer({ server });

  setInterval(broadcastPricesToSubscribers, 3000);

  wss.on("connection", (ws) => {
    clients.set(ws, { userId: null, symbols: [] });

    ws.on("message", (msg) => {
      try {
        const raw = msg.toString();
        const data = JSON.parse(raw);

        if (data.type === "auth") {
          clients.get(ws).userId = data.userId || null;
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
  //   const allSymbols = collectAllSymbols();
  //   if (allSymbols.length === 0) return;
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
