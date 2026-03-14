import { Router, type IRouter } from "express";
import healthRouter from "./health";
import evaluationsRouter from "./evaluations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(evaluationsRouter);

export default router;
