import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import {
  addProjectQcAttachment,
  createProjectQcItem,
  deleteProjectQcItem,
  duplicateProjectQcItem,
  exportProjectQcChecklist,
  getProjectQcChecklist,
  listProjectQcTerms,
  removeProjectQcAttachment,
  sendProjectQcCategory,
  updateProjectQcItem,
  upsertProjectQcTerm,
} from '../controllers/projectQcController';
import { requireProjectQcEdit, requireProjectQcSend, requireProjectQcView } from '../middlewares/projectQcGuards';

const router = Router();
router.use(requireAuth);
router.get('/terms', listProjectQcTerms);
router.post('/terms', upsertProjectQcTerm);
router.get('/:projectId', requireProjectQcView, getProjectQcChecklist);
router.get('/:projectId/export', requireProjectQcView, exportProjectQcChecklist);
router.post('/:projectId/items', requireProjectQcEdit, createProjectQcItem);
router.patch('/:projectId/items/:itemId', requireProjectQcEdit, updateProjectQcItem);
router.post('/:projectId/items/:itemId/duplicate', requireProjectQcEdit, duplicateProjectQcItem);
router.delete('/:projectId/items/:itemId', requireProjectQcEdit, deleteProjectQcItem);
router.post('/:projectId/items/:itemId/attachments', requireProjectQcEdit, addProjectQcAttachment);
router.delete('/:projectId/items/:itemId/attachments/:attachmentId', requireProjectQcEdit, removeProjectQcAttachment);
router.post('/:projectId/categories/send', requireProjectQcSend, sendProjectQcCategory);

export default router;
