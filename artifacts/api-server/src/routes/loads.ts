import { Router, type IRouter } from "express";
import { CalculateLoadBody, CalculateLoadResponse } from "@workspace/api-zod";
import { resolveItems } from "../lib/items";

const router: IRouter = Router();

router.post("/loads/calculate", async (req, res): Promise<void> => {
  const parsed = CalculateLoadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const lines = parsed.data.lines.filter((l) => l.quantity > 0);

  const allItems = await resolveItems();
  const itemById = new Map(allItems.map((i) => [i.id, i]));

  for (const line of lines) {
    const item = itemById.get(line.itemId);
    if (!item) {
      res.status(400).json({ error: `Unknown item id: ${line.itemId}` });
      return;
    }
    if (item.stacksPerTruck < 1) {
      res.status(400).json({
        error: `A full stack of "${item.name}" does not fit in one truck. Check its relationship or stack rules.`,
      });
      return;
    }
  }

  // Merge duplicate lines for the same item
  const quantities = new Map<number, number>();
  for (const line of lines) {
    quantities.set(
      line.itemId,
      (quantities.get(line.itemId) ?? 0) + line.quantity,
    );
  }

  let totalFraction = 0;
  const resultLines = [...quantities.entries()].map(([itemId, quantity]) => {
    const item = itemById.get(itemId)!;
    const stacksNeeded = Math.ceil(quantity / item.unitsPerStack);
    const roundedUpTo = stacksNeeded * item.unitsPerStack;
    const capacityFraction = stacksNeeded / item.stacksPerTruck;
    totalFraction += capacityFraction;
    return {
      itemId,
      itemName: item.name,
      color: item.color,
      quantity,
      stacksNeeded,
      roundedUp: roundedUpTo !== quantity,
      roundedUpTo,
      capacityFractionPct: round2(capacityFraction * 100),
    };
  });

  const fits = totalFraction <= 1 + 1e-9;
  const trucksNeeded =
    resultLines.length === 0 ? 0 : Math.max(1, Math.ceil(totalFraction - 1e-9));

  // Remaining room in the last truck, expressed per item type
  const remainingFraction =
    resultLines.length === 0
      ? 1
      : Math.min(1, Math.max(0, trucksNeeded - totalFraction));

  const remainingRoom = allItems.map((item) => {
    const stacks = Math.floor(remainingFraction * item.stacksPerTruck + 1e-9);
    return {
      itemId: item.id,
      itemName: item.name,
      stacks,
      units: stacks * item.unitsPerStack,
    };
  });

  res.json(
    CalculateLoadResponse.parse({
      fits,
      capacityUsedPct: round2(totalFraction * 100),
      trucksNeeded,
      lines: resultLines,
      remainingRoom,
    }),
  );
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default router;
