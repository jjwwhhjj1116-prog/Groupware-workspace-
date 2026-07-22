import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import {
  addDeliveryFile,
  addDeliveryRecord,
  approveDailyReport,
  createDailyReport,
  createDeliveryRound,
  createDownloadRequest,
  getProjectDelivery,
  reviewDownloadRequest,
} from '../controllers/projectDeliveryController';
import { requireProjectDailyWrite, requireProjectDeliveryManage, requireProjectDeliveryView } from '../middlewares/projectDeliveryGuards';

const router = Router();
router.use(requireAuth);
router.get('/:projectId', requireProjectDeliveryView, getProjectDelivery);
router.post('/:projectId/rounds', requireProjectDeliveryManage, createDeliveryRound);
router.post('/:projectId/rounds/:roundId/files', requireProjectDeliveryManage, addDeliveryFile);
router.post('/:projectId/records', requireProjectDeliveryManage, addDeliveryRecord);
router.post('/:projectId/download-requests', requireProjectDeliveryManage, createDownloadRequest);
router.post('/:projectId/download-requests/:requestId/review', requireProjectDeliveryView, reviewDownloadRequest);
router.post('/:projectId/daily-reports', requireProjectDailyWrite, createDailyReport);
router.post('/:projectId/daily-reports/:reportId/approve', requireProjectDeliveryView, approveDailyReport);

export default router;
