import express, { Request, Response, NextFunction, Router } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { summarizeNote } from "../services/openAi.services";

const router = Router();

router.get(
  "/notes",
  async (req: Request, res: Response, next: NextFunction) => {
    const notes = await prisma.note.findMany({
      include: {
        tags: true,
      },
    });
    res.json(bigIntToString(notes));
  }
);

router.get("/notes/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const note = await prisma.note.findUnique({
      where: { id: BigInt(id) },
      include: {
        tags: true,
        
      },
    });
    if (!note) {
      console.log("Note not found");
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
      const notes = Array.isArray(req.body) ? req.body : [req.body];

      // Create notes one by one to handle tag connections
      const createdNotes = await Promise.all(
        notes.map(({ title, content, tags = [] }) =>
          prisma.note.create({
            data: {
              title,
              content,
              tags: {
                connect: tags.map((tag: any) => ({ id: BigInt(tag.id) })),
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
    const { title, content } = req.body;
    try {
      const note = await prisma.note.update({
        where: { id: BigInt(id) },
        data: { title, content },
      });
      res.json(bigIntToString(note));
    } catch (error) {
      res.status(404).json({ error: "Note not found" });
    }
  }
);

router.delete(
  "/notes/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
      await prisma.note.delete({
        where: { id: BigInt(id) },
      });
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

module.exports = router;
