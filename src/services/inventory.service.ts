import { prisma } from '../lib/prisma';
import { TransactionReason } from '@prisma/client';

export class InventoryService {
  /**
   * Receives a purchase and increases stock.
   */
  static async receivePurchase(productId: string, binId: string, quantity: number, referenceId?: string) {
    if (quantity <= 0) throw new Error("Quantity must be greater than zero");

    return await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.upsert({
        where: {
          productId_binId: { productId, binId },
        },
        create: {
          productId,
          binId,
          quantity,
        },
        update: {
          quantity: { increment: quantity },
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          quantityChange: quantity,
          reason: TransactionReason.PURCHASE_RECEIPT,
          referenceId,
        },
      });

      return inventory;
    });
  }

  /**
   * Dispatches a sales order and decreases stock.
   */
  static async dispatchSales(productId: string, binId: string, quantity: number, referenceId?: string) {
    if (quantity <= 0) throw new Error("Quantity must be greater than zero");

    return await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: {
          productId_binId: { productId, binId },
        },
      });

      if (!inventory || inventory.quantity < quantity) {
        throw new Error("Insufficient stock");
      }

      const updatedInventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantity: { decrement: quantity },
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          inventoryId: updatedInventory.id,
          quantityChange: -quantity,
          reason: TransactionReason.SALES_DISPATCH,
          referenceId,
        },
      });

      return updatedInventory;
    });
  }

  /**
   * Adjusts inventory for other reasons (e.g. damaged stock).
   */
  static async adjustInventory(productId: string, binId: string, quantityChange: number, reason: TransactionReason) {
    return await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { productId_binId: { productId, binId } },
      });

      if (!inventory && quantityChange < 0) {
         throw new Error("Insufficient stock");
      }
      
      if (inventory && inventory.quantity + quantityChange < 0) {
         throw new Error("Insufficient stock");
      }

      const updatedInventory = await tx.inventory.upsert({
        where: { productId_binId: { productId, binId } },
        create: {
          productId,
          binId,
          quantity: quantityChange,
        },
        update: {
          quantity: { increment: quantityChange },
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          inventoryId: updatedInventory.id,
          quantityChange,
          reason,
        },
      });

      return updatedInventory;
    });
  }
}
