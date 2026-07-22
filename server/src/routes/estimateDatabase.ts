import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import {
  createEstimateDbRecord,
  createEstimateDbVendor,
  deleteEstimateDbRecord,
  deleteEstimateDbVendor,
  duplicateEstimateDbRecord,
  getEstimateDbReports,
  listEstimateDbRecords,
  listEstimateDbTargets,
  listEstimateDbVendors,
  putEstimateDbTarget,
  updateEstimateDbRecord,
  updateEstimateDbVendor,
} from '../controllers/estimateDatabaseController';

const router = Router();
router.use(requireAuth, requireRole(['DEPARTMENT_MANAGER', 'SUPER_ADMIN', 'SYSTEM_ADMIN']));
router.get('/records', listEstimateDbRecords);
router.post('/records', createEstimateDbRecord);
router.patch('/records/:id', updateEstimateDbRecord);
router.delete('/records/:id', deleteEstimateDbRecord);
router.post('/records/:id/duplicate', duplicateEstimateDbRecord);
router.get('/vendors', listEstimateDbVendors);
router.post('/vendors', createEstimateDbVendor);
router.patch('/vendors/:id', updateEstimateDbVendor);
router.delete('/vendors/:id', deleteEstimateDbVendor);
router.get('/targets', listEstimateDbTargets);
router.put('/targets', putEstimateDbTarget);
router.get('/reports', getEstimateDbReports);
export default router;
