import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import {
  addProjectOperationActivity,
  deleteProjectOperationActivity,
  getProjectOperation,
  listProjectOperations,
  reviewProjectOperationStart,
  updateProjectOperationMilestones,
} from '../controllers/projectOperationController';
import { requireProjectOperationApprove, requireProjectOperationEdit, requireProjectOperationView } from '../middlewares/projectOperationGuards';

const router = Router();
router.use(requireAuth);
router.get('/', listProjectOperations);
router.get('/:projectId', requireProjectOperationView, getProjectOperation);
router.post('/:projectId/activities', requireProjectOperationEdit, addProjectOperationActivity);
router.delete('/:projectId/activities/:activityId', requireProjectOperationEdit, deleteProjectOperationActivity);
router.patch('/:projectId/milestones', requireProjectOperationEdit, updateProjectOperationMilestones);
router.post('/:projectId/start-review', requireProjectOperationApprove, reviewProjectOperationStart);

export default router;
