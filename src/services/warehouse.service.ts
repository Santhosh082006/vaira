import { prisma } from '@/lib/prisma';

export class WarehouseService {
  static async createWarehouse(name: string, location?: string) {
    return prisma.warehouse.create({ data: { name, location } });
  }

  static async createZone(warehouseId: string, name: string) {
    return prisma.zone.create({ data: { warehouseId, name } });
  }

  static async createRack(zoneId: string, name: string) {
    return prisma.rack.create({ data: { zoneId, name } });
  }

  static async createBin(rackId: string, name: string) {
    return prisma.bin.create({ data: { rackId, name } });
  }

  static async getFullHierarchy() {
    return prisma.warehouse.findMany({
      include: {
        zones: {
          include: {
            racks: {
              include: {
                bins: {
                  include: {
                    inventory: { include: { product: true } }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }
}
