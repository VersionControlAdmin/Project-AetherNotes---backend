import express, { Request, Response, NextFunction, Router } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { summarizeNote, generateActionPlan } from "../services/openAi.services";
import { bigIntToString } from "./private.routes";
const router = Router();

// Add these interfaces at the top of the file
interface NoteInput {
  title: string;
  content: string;
  tags?: Array<{ id: string }>;
}

router.get(
  "/notes",
  async (req: Request, res: Response, next: NextFunction) => {
    const notes = await prisma.note.findMany({
      where: {
        userId: null,
      },
      include: {
        tags: true,
      },
    });
    console.log("notes", notes);
    res.json(bigIntToString(notes));
  }
);

router.get("/notes/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const note = await prisma.note.findFirst({
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
    res.json(bigIntToString(note));
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve note" });
  }
});

router.post(
  "/notes",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notes: NoteInput[] = Array.isArray(req.body) ? req.body : [req.body];

      const createdNotes = await Promise.all(
        notes.map(({ title, content, tags = [] }) =>
          prisma.note.create({
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
          })
        )
      );

      res.json(bigIntToString(createdNotes));
    } catch (error) {
      console.error("Error creating notes:", error);
      res.status(500).json({ error: "Failed to create notes" });
    }
  }
);

router.put(
  "/notes/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { title, content, tags } = req.body;

    try {
      const noteExists = await prisma.note.findFirst({
        where: {
          id: BigInt(id),
          userId: null,
        },
      });

      if (!noteExists) {
        res.status(404).json({ error: "Note not found or unauthorized" });
        return;
      }

      const updatedNote = await prisma.note.update({
        where: { id: BigInt(id) },
        data: {
          ...(title && { title }),
          ...(content && { content }),
          tags: tags
            ? {
                set: [],
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
  }
);

router.delete(
  "/notes/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
      const result = await prisma.note.deleteMany({
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
    } catch (error) {
      res.status(404).json({ error: "Note not found" });
    }
  }
);

router.post(
  "/notes/:id/summarize",
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
      const note = await prisma.note.findUnique({
        where: { id: BigInt(id) },
      });

      if (!note) {
        return;
      }

      const summary = await summarizeNote(note.title, note.content);

      const updatedNote = await prisma.note.update({
        where: { id: BigInt(id) },
        data: { summary },
      });

      res.json(bigIntToString(updatedNote));
    } catch (error) {
      console.error("Error summarizing note:", error);
      res.status(500).json({ error: "Failed to summarize note" });
    }
  }
);

// Route to create a new tag
router.post(
  "/tags",
  async (req: Request, res: Response, next: NextFunction) => {
    const { name } = req.body;
    try {
      const tag = await prisma.tag.create({
        data: { name },
      });
      res.json(bigIntToString(tag));
    } catch (error) {
      console.error("Error creating tag:", error);
      res.status(500).json({ error: "Failed to create tag" });
    }
  }
);

// Route to update a note with tags
router.put(
  "/notes/:id/tags",
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { tagIds } = req.body; // Expecting an array of tag IDs
    try {
      const note = await prisma.note.update({
        where: { id: BigInt(id) },
        data: {
          tags: {
            connect: tagIds.map((tagId: string) => ({ id: BigInt(tagId) })),
          },
        },
      });
      res.json(bigIntToString(note));
    } catch (error) {
      res.status(500).json({ error: "Failed to update note with tags" });
    }
  }
);

// Route to get all tags
router.get("/tags", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await prisma.tag.findMany();
    res.json(bigIntToString(tags));
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

// Generate action plan from recent public notes
router.get("/generate-action-plan", async (req: Request, res: Response) => {
  console.log("Generating public action plan");

  try {
    // Get the 20 most recent public notes
    const recentNotes = await prisma.note.findMany({
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

    const actionPlan = await generateActionPlan(recentNotes);
    res.json(actionPlan);
  } catch (error) {
    console.error("Error generating public action plan:", error);
    res.status(500).json({ error: "Failed to generate action plan" });
  }
});

export default router;
