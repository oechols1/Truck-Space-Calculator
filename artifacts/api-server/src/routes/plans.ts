import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, plansTable } from "@workspace/db";
import {
  CreatePlanBody,
  CreatePlanResponse,
  UpdatePlanBody,
  UpdatePlanResponse,
  GetPlanParams,
  UpdatePlanParams,
  DeletePlanParams,
  ListPlansResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializePlan(plan: typeof plansTable.$inferSelect) {
  return {
    id: plan.id,
    name: plan.name,
    lines: plan.lines,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

router.get("/plans", async (_req, res): Promise<void> => {
  const plans = await db
    .select()
    .from(plansTable)
    .orderBy(plansTable.updatedAt);
  res.json(ListPlansResponse.parse(plans.map(serializePlan)));
});

router.post("/plans", async (req, res): Promise<void> => {
  const parsed = CreatePlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [plan] = await db
    .insert(plansTable)
    .values({
      name: parsed.data.name,
      lines: parsed.data.lines,
    })
    .returning();

  res.status(201).json(CreatePlanResponse.parse(serializePlan(plan!)));
});

router.get("/plans/:id", async (req, res): Promise<void> => {
  const params = GetPlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [plan] = await db
    .select()
    .from(plansTable)
    .where(eq(plansTable.id, params.data.id));

  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  res.json(serializePlan(plan));
});

router.put("/plans/:id", async (req, res): Promise<void> => {
  const params = UpdatePlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [plan] = await db
    .update(plansTable)
    .set({
      name: parsed.data.name,
      lines: parsed.data.lines,
      updatedAt: new Date(),
    })
    .where(eq(plansTable.id, params.data.id))
    .returning();

  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  res.json(UpdatePlanResponse.parse(serializePlan(plan)));
});

router.delete("/plans/:id", async (req, res): Promise<void> => {
  const params = DeletePlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [plan] = await db
    .delete(plansTable)
    .where(eq(plansTable.id, params.data.id))
    .returning();

  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
