import { prisma } from '../../utils/prisma.js';
import { z } from 'zod';
import { createIncidentSchema, listMyIncidentsQuerySchema } from './schema.js';
import { incident_status } from '@prisma/client';

export class IncidentService {
  static async reportIncident(userId: bigint, rawInput: z.infer<typeof createIncidentSchema> | any) {
    const input = createIncidentSchema.parse(rawInput);

    const report = await prisma.incidentReport.create({
      data: {
        reporter_id: userId,
        trip_id: input.trip_id ? BigInt(input.trip_id) : undefined,
        request_id: input.request_id ? BigInt(input.request_id) : undefined,
        title: input.title,
        description: input.description,
        status: incident_status.NOT_RECEIVED,
      },
    });

    return {
      ...report,
      id: report.id.toString(),
      reporter_id: report.reporter_id.toString(),
      trip_id: report.trip_id?.toString() || null,
      request_id: report.request_id?.toString() || null,
    };
  }

  /**
   * Người dùng / Tài xế xem danh sách báo cáo sự cố do chính mình gửi và tiến độ xử lý của Admin
   */
  static async getMyIncidents(
    userId: bigint,
    rawQuery?: z.infer<typeof listMyIncidentsQuerySchema> | any
  ) {
    const query = listMyIncidentsQuerySchema.parse(rawQuery || {});

    const where: any = {
      reporter_id: userId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.from_date || query.to_date) {
      where.created_at = {};
      if (query.from_date) {
        where.created_at.gte = new Date(`${query.from_date}T00:00:00.000+07:00`);
      }
      if (query.to_date) {
        where.created_at.lte = new Date(`${query.to_date}T23:59:59.999+07:00`);
      }
    }

    const [incidents, allStatuses] = await Promise.all([
      prisma.incidentReport.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          handler: {
            select: {
              id: true,
              full_name: true,
            },
          },
          trip: {
            select: {
              id: true,
              code: true,
              origin_name: true,
              dest_name: true,
              departure_time: true,
              status: true,
            },
          },
          transport_request: {
            select: {
              id: true,
              code: true,
              type: true,
              status: true,
            },
          },
        },
      }),
      prisma.incidentReport.groupBy({
        by: ['status'],
        where: { reporter_id: userId },
        _count: true,
      }),
    ]);

    const summary = {
      total: 0,
      not_received: 0,
      received: 0,
      processing: 0,
      resolved: 0,
    };

    for (const row of allStatuses) {
      summary.total += row._count;
      if (row.status === incident_status.NOT_RECEIVED) summary.not_received = row._count;
      if (row.status === incident_status.RECEIVED) summary.received = row._count;
      if (row.status === incident_status.PROCESSING) summary.processing = row._count;
      if (row.status === incident_status.RESOLVED) summary.resolved = row._count;
    }

    return {
      incidents: incidents.map((inc) => ({
        ...inc,
        id: inc.id.toString(),
        reporter_id: inc.reporter_id.toString(),
        handled_by: inc.handled_by?.toString() || null,
        trip_id: inc.trip_id?.toString() || null,
        request_id: inc.request_id?.toString() || null,
        handler: inc.handler
          ? {
              ...inc.handler,
              id: inc.handler.id.toString(),
            }
          : null,
        trip: inc.trip
          ? {
              ...inc.trip,
              id: inc.trip.id.toString(),
            }
          : null,
        transport_request: inc.transport_request
          ? {
              ...inc.transport_request,
              id: inc.transport_request.id.toString(),
            }
          : null,
      })),
      summary,
    };
  }
}
