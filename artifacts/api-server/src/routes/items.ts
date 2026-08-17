import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, itemsTable, itemEquivalencesTable } from "@workspace/db";
import {
  CreateItemBody,
  CreateItemResponse,
  UpdateItemParams,
  UpdateItemBody,
  UpdateItemResponse,
  DeleteItemParams,
  ListItemsResponse,
} from "@workspace/api-zod";
import { resolveItems } from "../lib/items";

const DEFAULT_COLORS = [
  "#2563eb",
  "#d97706",
  "#059669",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
];

const router: IRouter = Router();

interface EquivalenceInput {
  baseItemId: number;
  baseUnits: number;
}

/**
 * Validates equivalence inputs. Returns an error string or null.
 * Base items must exist and must be direct-capacity items (no chained
 * equivalences), and an item cannot reference itself.
 */
async function validateEquivalences(
  equivalences: EquivalenceInput[],
  selfId: number | null,
  unitsPerStack: number,
): Promise<string | null> {
  if (equivalences.length === 0) return null;
  const baseIds = [...new Set(equivalences.map((e) => e.baseItemId))];
  if (baseIds.length !== equivalences.length) {
    return "Duplicate base items in equivalences";
  }
  if (selfId !== null && baseIds.includes(selfId)) {
    return "An item cannot be defined in terms of itself";
  }
  const bases = await db
    .select()
    .from(itemsTable)
    .where(inArray(itemsTable.id, baseIds));
  if (bases.length !== baseIds.length) {
    return "One or more base items do not exist";
  }
  const baseEqs = await db
    .select()
    .from(itemEquivalencesTable)
    .where(inArray(itemEquivalencesTable.itemId, baseIds));
  if (baseEqs.length > 0) {
    return "Base items must be defined directly (not via their own equivalences)";
  }
  // An item that other items are based on cannot itself become derived
  if (selfId !== null) {
    const [dependent] = await db
      .select()
      .from(itemEquivalencesTable)
      .where(eq(itemEquivalencesTable.baseItemId, selfId))
      .limit(1);
    if (dependent) {
      return "Other items are based on this item, so it must keep a direct capacity";
    }
  }
  // The relationship must allow at least one full stack per truck
  const first = equivalences[0]!;
  const base = bases.find((b) => b.id === first.baseItemId)!;
  const unitsPerTruck =
    (base.unitsPerStack * base.stacksPerTruck) / first.baseUnits;
  if (Math.floor(unitsPerTruck / unitsPerStack + 1e-9) < 1) {
    return "This relationship means one full stack does not fit in a truck. Reduce the base units or units per stack.";
  }
  return null;
}

async function replaceEquivalences(
  itemId: number,
  equivalences: EquivalenceInput[],
): Promise<void> {
  await db
    .delete(itemEquivalencesTable)
    .where(eq(itemEquivalencesTable.itemId, itemId));
  if (equivalences.length > 0) {
    await db.insert(itemEquivalencesTable).values(
      equivalences.map((e) => ({
        itemId,
        baseItemId: e.baseItemId,
        baseUnits: e.baseUnits,
      })),
    );
  }
}

async function resolvedItem(id: number) {
  const all = await resolveItems();
  return all.find((i) => i.id === id);
}

router.get("/items", async (_req, res): Promise<void> => {
  const items = await resolveItems();
  res.json(ListItemsResponse.parse(items));
});

router.post("/items", async (req, res): Promise<void> => {
  const parsed = CreateItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { equivalences = [], stacksPerTruck, ...rest } = parsed.data;

  if (stacksPerTruck == null && equivalences.length === 0) {
    res.status(400).json({
      error: "Provide stacksPerTruck or at least one equivalence",
    });
    return;
  }

  const eqError = await validateEquivalences(
    equivalences,
    null,
    rest.unitsPerStack,
  );
  if (eqError) {
    res.status(400).json({ error: eqError });
    return;
  }

  const existing = await db.select().from(itemsTable);
  const color =
    rest.color ?? DEFAULT_COLORS[existing.length % DEFAULT_COLORS.length]!;

  const [item] = await db
    .insert(itemsTable)
    .values({ ...rest, stacksPerTruck: stacksPerTruck ?? 1, color })
    .returning();

  await replaceEquivalences(item!.id, equivalences);

  res.status(201).json(CreateItemResponse.parse(await resolvedItem(item!.id)));
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
  const { equivalences, ...fields } = parsed.data;

  const [current] = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.id, params.data.id));
  if (!current) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  if (equivalences && equivalences.length > 0) {
    const eqError = await validateEquivalences(
      equivalences,
      params.data.id,
      fields.unitsPerStack ?? current.unitsPerStack,
    );
    if (eqError) {
      res.status(400).json({ error: eqError });
      return;
    }
  }

  // Explicitly clearing equivalences turns the item direct — it must get a
  // real direct capacity in the same request (the stored value may be a
  // placeholder from when it was created as a derived item).
  if (equivalences && equivalences.length === 0) {
    const [hadEq] = await db
      .select()
      .from(itemEquivalencesTable)
      .where(eq(itemEquivalencesTable.itemId, params.data.id))
      .limit(1);
    if (hadEq && fields.stacksPerTruck == null) {
      res.status(400).json({
        error:
          "Removing all relationships requires providing stacksPerTruck directly",
      });
      return;
    }
  }

  const [item] =
    Object.keys(fields).length > 0
      ? await db
          .update(itemsTable)
          .set(fields)
          .where(eq(itemsTable.id, params.data.id))
          .returning()
      : [current];

  if (equivalences) {
    await replaceEquivalences(item.id, equivalences);
  }

  res.json(UpdateItemResponse.parse(await resolvedItem(item.id)));
});

router.delete("/items/:id", async (req, res): Promise<void> => {
  const params = DeleteItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [dependent] = await db
    .select()
    .from(itemEquivalencesTable)
    .where(eq(itemEquivalencesTable.baseItemId, params.data.id))
    .limit(1);
  if (dependent) {
    res.status(400).json({
      error:
        "This item is used as a base for another item's equivalence. Remove that relationship first.",
    });
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
