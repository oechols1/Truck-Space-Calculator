import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, itemsTable } from "@workspace/db";
import {
  CreateItemBody,
  CreateItemResponse,
  UpdateItemParams,
  UpdateItemBody,
  UpdateItemResponse,
  DeleteItemParams,
  ListItemsResponse,
} from "@workspace/api-zod";

const DEFAULT_COLORS = [
  "#2563eb",
  "#d97706",
  "#059669",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
];

const router: IRouter = Router();

router.get("/items", async (_req, res): Promise<void> => {
  const items = await db.select().from(itemsTable).orderBy(itemsTable.id);
  res.json(ListItemsResponse.parse(items));
});

router.post("/items", async (req, res): Promise<void> => {
  const parsed = CreateItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(itemsTable);
  const color =
    parsed.data.color ??
    DEFAULT_COLORS[existing.length % DEFAULT_COLORS.length]!;

  const [item] = await db
    .insert(itemsTable)
    .values({ ...parsed.data, color })
    .returning();

  res.status(201).json(CreateItemResponse.parse(item));
});

router.patch("/items/:id", async (req, res): Promise<void> => {
  const params = UpdateItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .update(itemsTable)
    .set(parsed.data)
    .where(eq(itemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json(UpdateItemResponse.parse(item));
});

router.delete("/items/:id", async (req, res): Promise<void> => {
  const params = DeleteItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(itemsTable)
    .where(eq(itemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
