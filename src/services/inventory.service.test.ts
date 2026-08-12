import { describe, it, expect, beforeAll } from 'vitest';
import { InventoryService } from './inventory.service';
import { prisma } from '../lib/prisma';
import { TransactionReason } from '@prisma/client';

describe('InventoryService', () => {
  let testProductId: string;
  let testBinId: string;

  beforeAll(async () => {
    // Setup base data
    const category = await prisma.category.create({
      data: { name: 'Test Category' }
    });
    
    const product = await prisma.product.create({
      data: {
        sku: 'TEST-SKU-' + Date.now(),
        name: 'Test Product',
        categoryId: category.id,
      }
    });
    testProductId = product.id;

    const warehouse = await prisma.warehouse.create({
      data: { name: 'Test Warehouse' }
    });
    const zone = await prisma.zone.create({
      data: { name: 'Test Zone', warehouseId: warehouse.id }
    });
    const rack = await prisma.rack.create({
      data: { name: 'Test Rack', zoneId: zone.id }
    });
    const bin = await prisma.bin.create({
      data: { name: 'Test Bin', rackId: rack.id }
    });
    testBinId = bin.id;
  });

  it('should receive a purchase and increase stock', async () => {
    const result = await InventoryService.receivePurchase(testProductId, testBinId, 100);
    
    expect(result.quantity).toBe(100);

    const tx = await prisma.inventoryTransaction.findFirst({
      where: { inventoryId: result.id },
      orderBy: { createdAt: 'desc' }
    });
    
    expect(tx?.quantityChange).toBe(100);
    expect(tx?.reason).toBe(TransactionReason.PURCHASE_RECEIPT);
  });

  it('should dispatch sales and decrease stock', async () => {
    const result = await InventoryService.dispatchSales(testProductId, testBinId, 20);
    
    expect(result.quantity).toBe(80); // 100 - 20
  });

  it('should fail to dispatch sales if stock is insufficient', async () => {
    await expect(
      InventoryService.dispatchSales(testProductId, testBinId, 200)
    ).rejects.toThrow('Insufficient stock');
  });

  it('should manually adjust inventory', async () => {
    const result = await InventoryService.adjustInventory(
      testProductId, 
      testBinId, 
      -5, 
      TransactionReason.DAMAGED
    );
    
    expect(result.quantity).toBe(75); // 80 - 5
  });
});
