import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import {
  approveProjectPmSchedule,
  assignProjectPmSchedule,
  getProjectPmSchedule,
  listProjectPmSchedules,
  rejectProjectPmSchedule,
  requestProjectPmScheduleDraft,
  saveProjectPmScheduleDraft,
  submitProjectPmSchedule,
} from '../controllers/projectPmScheduleController';
import {
  requireProjectPmScheduleAssign,
  requireProjectPmScheduleEdit,
  requireProjectPmScheduleReview,
  requireProjectPmScheduleView,
} from '../middlewares/projectPmScheduleGuards';

const router = Router();
router.use(requireAuth);
router.get('/', listProjectPmSchedules);
router.get('/:projectId', requireProjectPmScheduleView, getProjectPmSchedule);
router.post('/:projectId/assignment', requireProjectPmScheduleAssign, assignProjectPmSchedule);
router.post('/:projectId/request', requireProjectPmScheduleAssign, requestProjectPmScheduleDraft);
router.patch('/:projectId/draft', requireProjectPmScheduleEdit, saveProjectPmScheduleDraft);
router.post('/:projectId/submit', requireProjectPmScheduleEdit, submitProjectPmSchedule);
router.post('/:projectId/approve', requireProjectPmScheduleReview, approveProjectPmSchedule);
router.post('/:projectId/reject', requireProjectPmScheduleReview, rejectProjectPmSchedule);

export default router;
