import { PrismaClient } from '@prisma/client';

// Đảm bảo BigInt được serialize thành string khi trả về JSON qua API
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export const prisma = new PrismaClient();

