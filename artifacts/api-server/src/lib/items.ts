import { db, itemsTable, itemEquivalencesTable } from "@workspace/db";

export interface ResolvedEquivalence {
  baseItemId: number;
  baseItemName: string;
  baseUnits: number;
}

export interface ResolvedItem {
  id: number;
  name: string;
  unitsPerStack: number;
  /** Effective capacity — derived from the first equivalence when present */
  stacksPerTruck: number;
  color: string;
  equivalences: ResolvedEquivalence[];
}

/**
 * Loads all items with their equivalences and resolves effective capacity.
 * For an item with equivalences, one unit equals `baseUnits` units of the
 * base item, so the truck holds (base.unitsPerStack * base.stacksPerTruck)
 * / baseUnits units of it. Effective stacksPerTruck = floor(that /
 * unitsPerStack), derived from the FIRST equivalence.
 */
export async function resolveItems(): Promise<ResolvedItem[]> {
  const [items, equivalences] = await Promise.all([
    db.select().from(itemsTable).orderBy(itemsTable.id),
    db.select().from(itemEquivalencesTable).orderBy(itemEquivalencesTable.id),
  ]);
  const itemById = new Map(items.map((i) => [i.id, i]));

  return items.map((item) => {
    const eqs = equivalences
      .filter((e) => e.itemId === item.id)
      .map((e) => ({
        baseItemId: e.baseItemId,
        baseItemName: itemById.get(e.baseItemId)?.name ?? "Unknown",
        baseUnits: e.baseUnits,
      }));

    let stacksPerTruck = item.stacksPerTruck;
    const first = eqs[0];
    if (first) {
      const base = itemById.get(first.baseItemId);
      if (base) {
        const unitsPerTruck =
          (base.unitsPerStack * base.stacksPerTruck) / first.baseUnits;
        // May legitimately be 0 when one full stack exceeds a truck;
        // consumers must treat 0 as "cannot ship a full stack".
        stacksPerTruck = Math.floor(unitsPerTruck / item.unitsPerStack + 1e-9);
      }
    }

    return {
      id: item.id,
      name: item.name,
      unitsPerStack: item.unitsPerStack,
      stacksPerTruck,
      color: item.color,
      equivalences: eqs,
    };
  });
}
