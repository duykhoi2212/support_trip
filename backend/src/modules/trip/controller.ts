import { Request, Response, NextFunction } from 'express';
import { TripService } from './service.js';
import { createTripSchema, cancelTripSchema, searchTripsSchema } from './schema.js';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { trip_status } from '@prisma/client';

export class TripController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');

      const validated = createTripSchema.parse(req.body);
      const trip = await TripService.createTrip(req.user.id, validated);

      res.status(201).json({
        success: true,
        data: trip,
        message: 'Tạo chuyến xe thành công.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyTrips(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
      const status = req.query.status as trip_status | undefined;

      const trips = await TripService.getMyTrips(req.user.id, status);
      res.status(200).json({
        success: true,
        data: trips,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tripId = BigInt(req.params.id);
      const trip = await TripService.getTripById(tripId);

      res.status(200).json({
        success: true,
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
      const tripId = BigInt(req.params.id);
      const validated = cancelTripSchema.parse(req.body);

      const trip = await TripService.cancelTrip(req.user.id, tripId, validated);
      res.status(200).json({
        success: true,
        data: trip,
        message: 'Hủy chuyến xe thành công.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = searchTripsSchema.parse(req.query);
      const trips = await TripService.searchTrips(validated);

      res.status(200).json({
        success: true,
        data: trips,
      });
    } catch (error) {
      next(error);
    }
  }

  static async searchAi(req: Request, res: Response, next: NextFunction) {
    try {
      const prompt = req.body.prompt || req.query.prompt;
      if (!prompt || typeof prompt !== 'string') {
        throw new AppError(400, 'PROMPT_REQUIRED', 'Vui lòng nhập nội dung tìm kiếm.');
      }

      const result = await TripService.searchTripsWithAi(prompt);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDriverHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
      const query = {
        status: req.query.status as string | undefined,
        from_date: req.query.from_date as string | undefined,
        to_date: req.query.to_date as string | undefined,
      };

      const result = await TripService.getDriverHistory(req.user.id, query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

