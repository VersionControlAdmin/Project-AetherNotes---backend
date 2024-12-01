"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
require("dotenv").config();
const cors_1 = __importDefault(require("cors"));
const auth_middleware_1 = require("./auth/auth.middleware");
const auth_routes_1 = __importDefault(require("./auth/auth.routes"));
const public_routes_1 = __importDefault(require("./router/public.routes"));
const private_routes_1 = __importDefault(require("./router/private.routes"));
const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = [
    process.env.ORIGIN_URL,
    'http://localhost:5173', // Local frontend development
    'http://localhost:3000' // Local backend development
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.log('Blocked by CORS:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
}));
app.use(express.json());
app.use("/api", public_routes_1.default);
app.use("/auth", auth_routes_1.default);
app.use("/api-private", auth_middleware_1.isAuthenticated, private_routes_1.default);
app.get("/home", (request, response) => {
    console.log(request);
    response.send("<h1>Welcome Ironhacker. :)</h1>");
});
app.listen(port, () => console.log(`App running on port ${port}!`));
