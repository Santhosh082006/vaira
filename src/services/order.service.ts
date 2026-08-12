import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class OrderService {
  // --- Purchase Orders (Inbound) ---
  
  static async createPurchaseOrder(supplierId: string, items: { productId: string, quantity: number, price: number }[]) {
    return prisma.purchaseOrder.create({
      data: {
        supplierId,
        status: 'DRAFT',
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        }
      },
      include: { items: true }
    });
  }

  static async updatePOStatus(id: string, status: 'DRAFT' | 'APPROVED' | 'RECEIVED' | 'COMPLETED') {
    return prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: { items: true }
    });
  }

  // --- Sales Orders (Outbound) ---

  static async createSalesOrder(customerId: string, items: { productId: string, quantity: number, price: number }[]) {
    return prisma.salesOrder.create({
      data: {
        customerId,
        status: 'CREATED',
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        }
      },
      include: { items: true }
    });
  }

  static async updateSOStatus(id: string, status: 'CREATED' | 'CONFIRMED' | 'ALLOCATED' | 'PICKING' | 'PACKED' | 'DISPATCHED') {
    return prisma.salesOrder.update({
      where: { id },
      data: { status },
      include: { items: true }
    });
  }
  
  static async getAllOrders() {
    const [pos, sos] = await Promise.all([
      prisma.purchaseOrder.findMany({ include: { supplier: true, items: true }, orderBy: { createdAt: 'desc' } }),
      prisma.salesOrder.findMany({ include: { customer: true, items: true }, orderBy: { createdAt: 'desc' } })
    ]);
    return { purchaseOrders: pos, salesOrders: sos };
  }
}
