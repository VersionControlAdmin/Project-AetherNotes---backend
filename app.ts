import { Request, Response } from "express";
const express = require("express");
require("dotenv").config();
import cors from "cors";
import { isAuthenticated } from "./auth/auth.middleware";
import authRouter from "./auth/auth.routes";
import publicRouter from "./router/public.routes";
import privateRouter from "./router/private.routes";

const app = express();

app.use(
  cors({
    origin: process.env.ORIGIN_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());
app.use("/api", publicRouter);
app.use("/auth", authRouter);
app.use("/api-private", isAuthenticated, privateRouter);

app.get("/home", (request: Request, response: Response) => {
  console.log(request);
  response.send("<h1>Welcome Ironhacker. :)</h1>");
});

app.listen(3000, () => console.log("App running on port 3000! "));
