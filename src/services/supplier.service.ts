import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class SupplierService {
  static async createSupplier(data: Prisma.SupplierCreateInput) {
    return prisma.supplier.create({ data });
  }

  static async updateSupplier(id: string, data: Prisma.SupplierUpdateInput) {
    return prisma.supplier.update({ where: { id }, data });
  }

  static async getSupplier(id: string) {
    return prisma.supplier.findUnique({
      where: { id },
      include: { products: { include: { product: true } } }
    });
  }

  static async getAllSuppliers() {
    return prisma.supplier.findMany({
      orderBy: { name: 'asc' }
    });
  }

  static async linkProduct(supplierId: string, productId: string, price: number, supplierSku?: string, leadTimeDays?: number, isPreferred: boolean = false) {
    return prisma.productSupplier.upsert({
      where: {
        productId_supplierId: { productId, supplierId }
      },
      update: {
        supplierPrice: price,
        supplierSku,
        leadTimeDays,
        isPreferred
      },
      create: {
        productId,
        supplierId,
        supplierPrice: price,
        supplierSku,
        leadTimeDays,
        isPreferred
      }
    });
  }

  static async unlinkProduct(supplierId: string, productId: string) {
    return prisma.productSupplier.delete({
      where: {
        productId_supplierId: { productId, supplierId }
      }
    });
  }
}
