import "dotenv/config";
import express from "express";
const app = express();
import * as paypal from "./paypal-api.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { vretify_jwt } from "./theusers/theusersRouter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use("/images", express.static(path.join(__dirname, "images")));
app.use(express.json());
app.use(
  cors({ origin: "https://shaherfunds.onrender.com", credentials: true })
);
app.use(cookieParser());
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    app.listen(4000);
  })
  .catch((err) => {
    console.log(err);
  });

////////////////////////////////////// paypal //////////////////////////////////

app.get("/", vretify_jwt, async (req, res) => {
  const clientId = process.env.CLIENT_ID,
    merchantId = process.env.MERCHANT_ID;
  console.log("here");
  try {
    const clientToken = await paypal.generateClientToken();
    res.render("checkout", { clientId, clientToken, merchantId });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// create order
app.post("/api/orders", vretify_jwt, async (req, res) => {
  try {
    const projectid = req.body.id;
    const amount = req.body.amount;
    const order = await paypal.createOrder(amount, projectid);
    res.json(order);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// capture payment
app.post(
  "/api/orders/:orderID/capture/:projectid/:amount",
  vretify_jwt,
  async (req, res) => {
    const email = req.email;
    const { orderID, projectid, amount } = req.params;
    try {
      const captureData = await paypal.capturePayment(
        orderID,
        projectid,
        amount,
        email
      );
      res.json(captureData);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
);

// health check
app.get("/check", vretify_jwt, (req, res) => {
  res.json({
    message: "ok",
    env: process.env.NODE_ENV,
    clientId: process.env.CLIENT_ID,
    appSecret: process.env.APP_SECRET || "Couldn't load App Secret",
    clientSecret: process.env.CLIENT_SECRET,
    merchantId: process.env.MERCHANT_ID,
  });
});

//////////////////////////////// paypal ////////////////////////////////////////////////////
import { router as userRouter } from "./theusers/theusersRouter.js";
import { router as projectsRouter } from "./projects/projectsRouter.js";

app.use("/users", userRouter);
app.use("/projects", projectsRouter);
