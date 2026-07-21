import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import {
  acceptProjectIntake,
  getProjectIntake,
  listProjectIntakes,
  reviewProjectIntake,
  saveProjectIntakeDraft,
} from '../controllers/projectIntakeController';
import {
  requireProjectIntakeEdit,
  requireProjectIntakeReview,
  requireProjectIntakeView,
} from '../middlewares/projectIntakeGuards';

const router = Router();

router.use(requireAuth);
router.get('/', listProjectIntakes);
router.get('/:id', requireProjectIntakeView, getProjectIntake);
router.patch('/:id', requireProjectIntakeEdit, saveProjectIntakeDraft);
router.post('/:id/review', requireProjectIntakeReview, reviewProjectIntake);
router.post('/:id/accept', requireProjectIntakeReview, acceptProjectIntake);

export default router;
