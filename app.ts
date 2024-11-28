import { Request, Response } from "express";
const express = require("express");
require("dotenv").config();
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.ORIGIN_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());
const index = require("./router/index.routes");
app.use("/api", index);

app.get("/home", (request: Request, response: Response) => {
  console.log(request);
  response.send("<h1>Welcome Ironhacker. :)</h1>");
});

app.listen(3000, () => console.log("App running on port 3000! "));
