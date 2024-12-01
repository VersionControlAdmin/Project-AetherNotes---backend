import { Request, Response } from "express";
const express = require("express");
require("dotenv").config();
import cors from "cors";
import { isAuthenticated } from "./auth/auth.middleware";
import authRouter from "./auth/auth.routes";
import publicRouter from "./router/public.routes";
import privateRouter from "./router/private.routes";

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = [
  process.env.ORIGIN_URL,
  'http://localhost:5173', // Local frontend development
  'http://localhost:3000'  // Local backend development
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('Blocked by CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
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

app.listen(port, () => console.log(`App running on port ${port}!`));
