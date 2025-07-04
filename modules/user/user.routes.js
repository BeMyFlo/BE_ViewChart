import { Router } from "express";
import * as User from "./user.controller.js";
import checkLogin from "../../middlewares/checkLogin.js";
import checkAdmin from "../../middlewares/checkAdmin.js";
const router = new Router();

//Get all users
router.route("/").getcheckLogin, User.getListUsers;

//Register
router.route("/register").post(User.createUser);

//Đăng nhập
router.route("/login").post(User.login);

//Xóa user
router.route("/").delete(checkAdmin, User.deleteUser);

//Đổi mật khẩu
router.route("/:id/update-password").put(checkLogin, User.updatePassword);

router.route("/data").post(async (req, res) => {
  const { symbol, interval } = req.body;

  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.route("/prices").get(async (req, res) => {
  const symbols = ["BTCUSDT", "ETHUSDT", "ADAUSDT", "BNBUSDT", "XRPUSDT"];

  try {
    const promises = symbols.map((sym) =>
      fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${sym}`).then(
        (response) => response.json()
      )
    );

    const prices = await Promise.all(promises);

    const result = prices.map((r) => ({
      symbol: r.symbol,
      price: parseFloat(r.lastPrice).toFixed(4),
      change: parseFloat(r.priceChangePercent).toFixed(2),
    }));

    res.json(result);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Error fetching market data" });
  }
});

router.route("/symbols").get(async (req, res) => {
  try {
    const response = await fetch("https://api.binance.com/api/v3/exchangeInfo");
    const data = await response.json();

    const symbols = data.symbols
      .filter((s) => s.symbol.endsWith("USDT") && s.status === "TRADING")
      .map((s) => s.symbol)
      .sort();

    res.json(symbols);
  } catch (err) {
    console.error("Lỗi khi lấy danh sách symbols:", err.message);
    res
      .status(500)
      .json({ error: "Không thể lấy danh sách symbol từ Binance" });
  }
});
export default router;
