import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { mapAdapter } from '../../adapters/map/ors.js';

export const mapRouter = Router();

const routeRequestSchema = z.object({
  origin: z.object({
    lat: z.number({ required_error: 'Vui lòng cung cấp vĩ độ điểm đi' }),
    lng: z.number({ required_error: 'Vui lòng cung cấp kinh độ điểm đi' }),
  }),
  destination: z.object({
    lat: z.number({ required_error: 'Vui lòng cung cấp vĩ độ điểm đến' }),
    lng: z.number({ required_error: 'Vui lòng cung cấp kinh độ điểm đến' }),
  }),
});

mapRouter.post('/route', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = routeRequestSchema.parse(req.body);
    const result = await mapAdapter.getRoute(validated.origin, validated.destination);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});
