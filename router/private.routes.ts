import express, { Request, Response, NextFunction, Router } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { summarizeNote, generateActionPlan } from "../services/openAi.services";

const router = Router();

// Add these interfaces at the top of the file
interface NoteInput {
  title: string;
  content: string;
  tags?: Array<{ id: string }>;
}

// Get all notes for logged-in user
router.get("/notes", async (req: Request, res: Response) => {
  try {
    const userId = BigInt(req.user!.userId); // From auth middleware
    const notes = await prisma.note.findMany({
      where: {
        userId: userId,
      },
      include: {
        tags: true,
      },
    });
    res.json(bigIntToString(notes));
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve notes" });
  }
});

// Get specific note for logged-in user
router.get("/notes/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = BigInt(req.user!.userId);

  try {
    const note = await prisma.note.findFirst({
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
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve note" });
  }
});

// Create note for logged-in user
router.post("/notes", async (req: Request, res: Response) => {
  try {
    const userId = BigInt(req.user!.userId);
    const notes: NoteInput[] = Array.isArray(req.body) ? req.body : [req.body];

    const createdNotes = await Promise.all(
      notes.map(({ title, content, tags = [] }) =>
        prisma.note.create({
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
        })
      )
    );

    res.json(bigIntToString(createdNotes));
  } catch (error) {
    console.error("Error creating notes:", error);
    res.status(500).json({ error: "Failed to create notes" });
  }
});

// Update note for logged-in user
router.put("/notes/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, content, tags } = req.body; // tags should be array of {id} objects
  const userId = BigInt(req.user!.userId);

  try {
    // First, ensure the note belongs to the user
    const noteExists = await prisma.note.findFirst({
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
    const updatedNote = await prisma.note.update({
      where: { id: BigInt(id) },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        tags: tags
          ? {
              set: [], // Clear existing tags
              connect: tags.map((tag: { id: string }) => ({
                id: BigInt(tag.id),
              })),
            }
          : undefined,
      },
      include: { tags: true },
    });

    res.json(bigIntToString(updatedNote));
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ error: "Failed to update note" });
  }
});

// Delete note for logged-in user
router.delete("/notes/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = BigInt(req.user!.userId);

  try {
    const result = await prisma.note.deleteMany({
      where: {
        id: BigInt(id),
        userId: userId, // Ensure user owns the note
      },
    });

    if (result.count === 0) {
      return;
    }

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// Summarize note for logged-in user
router.post("/notes/:id/summarize", async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = BigInt(req.user!.userId);

  try {
    const note = await prisma.note.findFirst({
      where: {
        id: BigInt(id),
        userId: userId,
      },
    });

    if (!note) {
      return;
      //   return res.status(404).json({ error: "Note not found or unauthorized" });
    }

    const summary = await summarizeNote(note.title, note.content);

    const updatedNote = await prisma.note.update({
      where: { id: BigInt(id) },
      data: { summary },
      include: { tags: true },
    });

    res.json(bigIntToString(updatedNote));
  } catch (error) {
    console.error("Error summarizing note:", error);
    res.status(500).json({ error: "Failed to summarize note" });
  }
});

// Update note tags for logged-in user
router.put("/notes/:id/tags", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { tagIds } = req.body;
  const userId = BigInt(req.user!.userId);

  try {
    // First verify the note belongs to the user
    const noteExists = await prisma.note.findFirst({
      where: {
        id: BigInt(id),
        userId: userId,
      },
    });

    if (!noteExists) {
      return;
    }

    const note = await prisma.note.update({
      where: { id: BigInt(id) },
      data: {
        tags: {
          connect: tagIds.map((tagId: string) => ({ id: BigInt(tagId) })),
        },
      },
      include: { tags: true },
    });

    res.json(bigIntToString(note));
  } catch (error) {
    res.status(500).json({ error: "Failed to update note tags" });
  }
});

// Generate action plan from recent notes
router.get("/generate-action-plan", async (req: Request, res: Response) => {
  const userId = BigInt(req.user!.userId);
  try {
    // Get the 20 most recent notes for the user
    const recentNotes = await prisma.note.findMany({
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
    const actionPlan = await generateActionPlan(recentNotes);
    res.json(actionPlan);
  } catch (error) {
    console.error("Error generating action plan:", error);
    res.status(500).json({ error: "Failed to generate action plan" });
  }
});

const bigIntToString = (data: any): any => {
  if (data === null || data === undefined) return data;
  if (typeof data === "bigint") return data.toString();
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map(bigIntToString);
  if (typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, bigIntToString(v)])
    );
  }
  return data;
};
router.get("/tags", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await prisma.tag.findMany();
    res.json(bigIntToString(tags));
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

export default router;
export { bigIntToString };
