import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { createUnitPriceTable, getProjectProfit, listUnitPriceTables, updateProjectProfit } from '../controllers/projectProfitController';
import { requireProjectProfitEdit, requireProjectProfitView } from '../middlewares/projectProfitGuards';

const router = Router();
router.use(requireAuth);
router.get('/unit-prices', listUnitPriceTables);
router.post('/unit-prices', createUnitPriceTable);
router.get('/:projectId', requireProjectProfitView, getProjectProfit);
router.put('/:projectId', requireProjectProfitEdit, updateProjectProfit);

export default router;
