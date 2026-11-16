import { Router } from 'express';
import { authenticateToken } from '../../middlewares/auth.js';
import { IncidentController } from './controller.js';

export const incidentRouter = Router();

incidentRouter.use(authenticateToken);

incidentRouter.post('/', IncidentController.report);
