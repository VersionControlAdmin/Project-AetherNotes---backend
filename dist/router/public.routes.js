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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const openAi_services_1 = require("../services/openAi.services");
const private_routes_1 = require("./private.routes");
const router = (0, express_1.Router)();
router.get("/notes", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const notes = yield prisma.note.findMany({
        where: {
            userId: null,
        },
        include: {
            tags: true,
        },
    });
    console.log("notes", notes);
    res.json((0, private_routes_1.bigIntToString)(notes));
}));
router.get("/notes/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const note = yield prisma.note.findFirst({
            where: {
                id: BigInt(id),
                userId: null,
            },
            include: {
                tags: true,
            },
        });
        if (!note) {
            res.status(404).json({ error: "Note not found" });
            return;
        }
        res.json((0, private_routes_1.bigIntToString)(note));
    }
    catch (error) {
        res.status(500).json({ error: "Failed to retrieve note" });
    }
}));
router.post("/notes", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notes = Array.isArray(req.body) ? req.body : [req.body];
        const createdNotes = yield Promise.all(notes.map(({ title, content, tags = [] }) => prisma.note.create({
            data: {
                title,
                content,
                userId: null,
                tags: {
                    connect: tags.map((tag) => ({ id: BigInt(tag.id) })),
                },
            },
            include: {
                tags: true,
            },
        })));
        res.json((0, private_routes_1.bigIntToString)(createdNotes));
    }
    catch (error) {
        console.error("Error creating notes:", error);
        res.status(500).json({ error: "Failed to create notes" });
    }
}));
router.put("/notes/:id", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { title, content, tags } = req.body;
    try {
        const noteExists = yield prisma.note.findFirst({
            where: {
                id: BigInt(id),
                userId: null,
            },
        });
        if (!noteExists) {
            res.status(404).json({ error: "Note not found or unauthorized" });
            return;
        }
        const updatedNote = yield prisma.note.update({
            where: { id: BigInt(id) },
            data: Object.assign(Object.assign(Object.assign({}, (title && { title })), (content && { content })), { tags: tags
                    ? {
                        set: [],
                        connect: tags.map((tag) => ({
                            id: BigInt(tag.id),
                        })),
                    }
                    : undefined }),
            include: { tags: true },
        });
        res.json((0, private_routes_1.bigIntToString)(updatedNote));
    }
    catch (error) {
        console.error("Error updating note:", error);
        res.status(500).json({ error: "Failed to update note" });
    }
}));
router.delete("/notes/:id", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const result = yield prisma.note.deleteMany({
            where: {
                id: BigInt(id),
                userId: null,
            },
        });
        if (result.count === 0) {
            res.status(404).json({ error: "Note not found" });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        res.status(404).json({ error: "Note not found" });
    }
}));
router.post("/notes/:id/summarize", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const note = yield prisma.note.findUnique({
            where: { id: BigInt(id) },
        });
        if (!note) {
            return;
        }
        const summary = yield (0, openAi_services_1.summarizeNote)(note.title, note.content);
        const updatedNote = yield prisma.note.update({
            where: { id: BigInt(id) },
            data: { summary },
        });
        res.json((0, private_routes_1.bigIntToString)(updatedNote));
    }
    catch (error) {
        console.error("Error summarizing note:", error);
        res.status(500).json({ error: "Failed to summarize note" });
    }
}));
// Route to create a new tag
router.post("/tags", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { name } = req.body;
    try {
        const tag = yield prisma.tag.create({
            data: { name },
        });
        res.json((0, private_routes_1.bigIntToString)(tag));
    }
    catch (error) {
        console.error("Error creating tag:", error);
        res.status(500).json({ error: "Failed to create tag" });
    }
}));
// Route to update a note with tags
router.put("/notes/:id/tags", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { tagIds } = req.body; // Expecting an array of tag IDs
    try {
        const note = yield prisma.note.update({
            where: { id: BigInt(id) },
            data: {
                tags: {
                    connect: tagIds.map((tagId) => ({ id: BigInt(tagId) })),
                },
            },
        });
        res.json((0, private_routes_1.bigIntToString)(note));
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update note with tags" });
    }
}));
// Route to get all tags
router.get("/tags", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tags = yield prisma.tag.findMany();
        res.json((0, private_routes_1.bigIntToString)(tags));
    }
    catch (error) {
        console.error("Error fetching tags:", error);
        res.status(500).json({ error: "Failed to fetch tags" });
    }
}));
// Generate action plan from recent public notes
router.get("/generate-action-plan", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Generating public action plan");
    try {
        // Get the 20 most recent public notes
        const recentNotes = yield prisma.note.findMany({
            where: {
                userId: null, // Only get public notes
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 20,
            include: {
                tags: true,
            },
        });
        if (!recentNotes.length) {
            res.status(404).json({ error: "No public notes found" });
            return;
        }
        const actionPlan = yield (0, openAi_services_1.generateActionPlan)(recentNotes);
        res.json(actionPlan);
    }
    catch (error) {
        console.error("Error generating public action plan:", error);
        res.status(500).json({ error: "Failed to generate action plan" });
    }
}));
exports.default = router;
