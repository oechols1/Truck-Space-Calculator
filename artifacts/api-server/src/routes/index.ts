import { Router, type IRouter } from "express";
import healthRouter from "./health";
import itemsRouter from "./items";
import loadsRouter from "./loads";
import plansRouter from "./plans";

const router: IRouter = Router();

router.use(healthRouter);
router.use(itemsRouter);
router.use(loadsRouter);
router.use(plansRouter);

export default router;
