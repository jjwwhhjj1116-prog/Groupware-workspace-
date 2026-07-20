import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import {
  addEstimateRequestActivity,
  addEstimateRequestAttachment,
  changeEstimateRequestStatus,
  createEstimateRequest,
  getEstimateRequest,
  listEstimateRequests,
  removeEstimateRequestAttachment,
  updateEstimateRequest,
} from '../controllers/estimateRequestController';
import {
  requireEstimateRequestManage,
  requireEstimateRequestView,
} from '../middlewares/estimateRequestGuards';
import {
  createEstimateSheet,
  getEstimateSheet,
  markEstimateSheetSent,
  recordEstimateSheetExport,
  saveEstimateSheetVersion,
} from '../controllers/estimateSheetController';

const router = Router();

router.use(requireAuth);
router.get('/', listEstimateRequests);
router.post('/', createEstimateRequest);
router.get('/:id', requireEstimateRequestView, getEstimateRequest);
router.get('/:id/estimate-sheet', requireEstimateRequestView, getEstimateSheet);
router.post('/:id/estimate-sheet', requireEstimateRequestManage, createEstimateSheet);
router.post('/:id/estimate-sheet/versions', requireEstimateRequestManage, saveEstimateSheetVersion);
router.post('/:id/estimate-sheet/sent', requireEstimateRequestManage, markEstimateSheetSent);
router.post('/:id/estimate-sheet/exports', requireEstimateRequestManage, recordEstimateSheetExport);
router.patch('/:id', requireEstimateRequestManage, updateEstimateRequest);
router.post('/:id/status', requireEstimateRequestManage, changeEstimateRequestStatus);
router.post('/:id/activities', requireEstimateRequestManage, addEstimateRequestActivity);
router.post('/:id/attachments', requireEstimateRequestManage, addEstimateRequestAttachment);
router.delete('/:id/attachments/:attachmentId', requireEstimateRequestManage, removeEstimateRequestAttachment);

export default router;
