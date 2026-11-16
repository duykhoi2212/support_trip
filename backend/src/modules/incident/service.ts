import { prisma } from '../../utils/prisma.js';
import { z } from 'zod';
import { createIncidentSchema } from './schema.js';
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
}
