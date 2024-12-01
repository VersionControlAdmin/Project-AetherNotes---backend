"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const private_routes_1 = require("../router/private.routes");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
const saltRounds = 10;
// POST /auth/signup
router.post("/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: "Provide email and password" });
        return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
        res.status(400).json({ message: "Provide a valid email address." });
        return;
    }
    try {
        const existingUser = yield prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: "User already exists." });
            return;
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, saltRounds);
        const user = yield prisma.user.create({
            data: {
                email,
                hashedPassword,
            },
            select: {
                id: true,
                email: true,
                createdAt: true,
            },
        });
        res.status(201).json((0, private_routes_1.bigIntToString)(user));
    }
    catch (error) {
        res.status(500).json({ message: "Internal Server Error" + error });
    }
}));
// POST /auth/login
router.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: "Provide email and password." });
        return;
    }
    try {
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ message: "User not found." });
            return;
        }
        const isPasswordValid = yield bcryptjs_1.default.compare(password, user.hashedPassword);
        if (!isPasswordValid) {
            res.status(401).json({ message: "Unable to authenticate the user" });
            return;
        }
        const payload = { userId: user.id.toString(), email: user.email };
        const token = jsonwebtoken_1.default.sign(payload, process.env.TOKEN_SECRET, {
            algorithm: "HS256",
            expiresIn: "6h",
        });
        res.status(200).json({ token });
    }
    catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
}));
exports.default = router;
