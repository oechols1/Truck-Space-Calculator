import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const itemsTable = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  unitsPerStack: integer("units_per_stack").notNull(),
  stacksPerTruck: integer("stacks_per_truck").notNull(),
  color: text("color").notNull(),
});

export const itemEquivalencesTable = pgTable("item_equivalences", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => itemsTable.id, { onDelete: "cascade" }),
  baseItemId: integer("base_item_id")
    .notNull()
    .references(() => itemsTable.id, { onDelete: "cascade" }),
  baseUnits: integer("base_units").notNull(),
});

export const insertItemSchema = createInsertSchema(itemsTable).omit({
  id: true,
});
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof itemsTable.$inferSelect;
export type ItemEquivalence = typeof itemEquivalencesTable.$inferSelect;
