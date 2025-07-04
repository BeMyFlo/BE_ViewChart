import Express from "express";
import bodyParser from "body-parser";
import useDatabase from "./services/database.js";
import * as dotenv from "dotenv";
import useRoutes from "./routers/index.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import initWebSocket from "./websocket.js";
import http from "http";
dotenv.config();

useDatabase();

const app = new Express();
app.use(cookieParser());
app.use(
  cors({
    origin: "*",
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

useRoutes(app);

const server = http.createServer(app);
initWebSocket(server);

server.listen(process.env.PORT || 8000, () => {
  console.log(`> 🔥 Server & WebSocket running on port ${process.env.PORT}`);
});
