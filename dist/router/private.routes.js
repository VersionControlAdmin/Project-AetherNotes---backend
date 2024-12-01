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
exports.bigIntToString = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const openAi_services_1 = require("../services/openAi.services");
const router = (0, express_1.Router)();
// Get all notes for logged-in user
router.get("/notes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = BigInt(req.user.userId); // From auth middleware
        const notes = yield prisma.note.findMany({
            where: {
                userId: userId,
            },
            include: {
                tags: true,
            },
        });
        res.json(bigIntToString(notes));
    }
    catch (error) {
        res.status(500).json({ error: "Failed to retrieve notes" });
    }
}));
// Get specific note for logged-in user
router.get("/notes/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const userId = BigInt(req.user.userId);
    try {
        const note = yield prisma.note.findFirst({
            where: {
                id: BigInt(id),
                userId: userId, // Ensure user owns the note
            },
            include: {
                tags: true,
            },
        });
        if (!note) {
            return;
        }
        res.json(bigIntToString(note));
    }
    catch (error) {
        res.status(500).json({ error: "Failed to retrieve note" });
    }
}));
// Create note for logged-in user
router.post("/notes", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = BigInt(req.user.userId);
        const notes = Array.isArray(req.body) ? req.body : [req.body];
        const createdNotes = yield Promise.all(notes.map(({ title, content, tags = [] }) => prisma.note.create({
            data: {
                title,
                content,
                userId: userId,
                tags: {
                    connect: tags.map((tag) => ({ id: BigInt(tag.id) })),
                },
            },
            include: {
                tags: true,
            },
        })));
        res.json(bigIntToString(createdNotes));
    }
    catch (error) {
        console.error("Error creating notes:", error);
        res.status(500).json({ error: "Failed to create notes" });
    }
}));
// Update note for logged-in user
router.put("/notes/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { title, content, tags } = req.body; // tags should be array of {id} objects
    const userId = BigInt(req.user.userId);
    try {
        // First, ensure the note belongs to the user
        const noteExists = yield prisma.note.findFirst({
            where: {
                id: BigInt(id),
                userId: userId,
            },
        });
        if (!noteExists) {
            res.status(404).json({ error: "Note not found or unauthorized" });
            return;
        }
        // Update the note with new title, content, and tags
        const updatedNote = yield prisma.note.update({
            where: { id: BigInt(id) },
            data: Object.assign(Object.assign(Object.assign({}, (title && { title })), (content && { content })), { tags: tags
                    ? {
                        set: [], // Clear existing tags
                        connect: tags.map((tag) => ({
                            id: BigInt(tag.id),
                        })),
                    }
                    : undefined }),
            include: { tags: true },
        });
        res.json(bigIntToString(updatedNote));
    }
    catch (error) {
        console.error("Error updating note:", error);
        res.status(500).json({ error: "Failed to update note" });
    }
}));
// Delete note for logged-in user
router.delete("/notes/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const userId = BigInt(req.user.userId);
    try {
        const result = yield prisma.note.deleteMany({
            where: {
                id: BigInt(id),
                userId: userId, // Ensure user owns the note
            },
        });
        if (result.count === 0) {
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: "Failed to delete note" });
    }
}));
// Summarize note for logged-in user
router.post("/notes/:id/summarize", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const userId = BigInt(req.user.userId);
    try {
        const note = yield prisma.note.findFirst({
            where: {
                id: BigInt(id),
                userId: userId,
            },
        });
        if (!note) {
            return;
            //   return res.status(404).json({ error: "Note not found or unauthorized" });
        }
        const summary = yield (0, openAi_services_1.summarizeNote)(note.title, note.content);
        const updatedNote = yield prisma.note.update({
            where: { id: BigInt(id) },
            data: { summary },
            include: { tags: true },
        });
        res.json(bigIntToString(updatedNote));
    }
    catch (error) {
        console.error("Error summarizing note:", error);
        res.status(500).json({ error: "Failed to summarize note" });
    }
}));
// Update note tags for logged-in user
router.put("/notes/:id/tags", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { tagIds } = req.body;
    const userId = BigInt(req.user.userId);
    try {
        // First verify the note belongs to the user
        const noteExists = yield prisma.note.findFirst({
            where: {
                id: BigInt(id),
                userId: userId,
            },
        });
        if (!noteExists) {
            return;
        }
        const note = yield prisma.note.update({
            where: { id: BigInt(id) },
            data: {
                tags: {
                    connect: tagIds.map((tagId) => ({ id: BigInt(tagId) })),
                },
            },
            include: { tags: true },
        });
        res.json(bigIntToString(note));
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update note tags" });
    }
}));
// Generate action plan from recent notes
router.get("/generate-action-plan", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Generating action plan");
    const userId = BigInt(req.user.userId);
    try {
        // Get the 20 most recent notes for the user
        const recentNotes = yield prisma.note.findMany({
            where: {
                userId: userId,
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
            res.status(404).json({ error: "No notes found" });
            return;
        }
        const actionPlan = yield (0, openAi_services_1.generateActionPlan)(recentNotes);
        res.json(actionPlan);
    }
    catch (error) {
        console.error("Error generating action plan:", error);
        res.status(500).json({ error: "Failed to generate action plan" });
    }
}));
const bigIntToString = (data) => {
    if (data === null || data === undefined)
        return data;
    if (typeof data === "bigint")
        return data.toString();
    if (data instanceof Date)
        return data.toISOString();
    if (Array.isArray(data))
        return data.map(bigIntToString);
    if (typeof data === "object") {
        return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, bigIntToString(v)]));
    }
    return data;
};
exports.bigIntToString = bigIntToString;
router.get("/tags", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tags = yield prisma.tag.findMany();
        res.json(bigIntToString(tags));
    }
    catch (error) {
        console.error("Error fetching tags:", error);
        res.status(500).json({ error: "Failed to fetch tags" });
    }
}));
exports.default = router;
