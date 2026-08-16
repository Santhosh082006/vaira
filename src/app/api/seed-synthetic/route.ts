import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DAYS_TO_GENERATE = 180;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomNormal(mean: number, stdDev: number) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.round(z * stdDev + mean);
}

export async function GET() {
  try {
    console.log(`Starting synthetic data generation for the past ${DAYS_TO_GENERATE} days...`);

    let category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({ data: { name: 'Electronics', description: 'Synthetic Category' } });
    }

    let warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) {
      warehouse = await prisma.warehouse.create({ data: { name: 'Main Distribution Center' } });
    }
    let zone = await prisma.zone.findFirst({ where: { warehouseId: warehouse.id } });
    if (!zone) {
      zone = await prisma.zone.create({ data: { name: 'Zone A', warehouseId: warehouse.id } });
    }
    let rack = await prisma.rack.findFirst({ where: { zoneId: zone.id } });
    if (!rack) {
      rack = await prisma.rack.create({ data: { name: 'Rack 1', zoneId: zone.id } });
    }
    let bin = await prisma.bin.findFirst({ where: { rackId: rack.id } });
    if (!bin) {
      bin = await prisma.bin.create({ data: { name: 'Bin A-01', rackId: rack.id } });
    }

    const syntheticSkus = [
      { sku: 'SYN-MKB-01', name: 'Mechanical Keyboard', baseline: 15, variance: 3, type: 'steady' },
      { sku: 'SYN-WM-02', name: 'Wireless Mouse', baseline: 40, variance: 10, type: 'steady' },
      { sku: 'SYN-MON-03', name: '27" Monitor', baseline: 5, variance: 2, type: 'trending-up' },
      { sku: 'SYN-CAB-04', name: 'USB-C Cable', baseline: 100, variance: 30, type: 'seasonal' },
      { sku: 'SYN-CH-05', name: 'Ergo Chair', baseline: 2, variance: 1, type: 'steady' }
    ];

    const anomaliesLog: any[] = [];
    const transactionsToInsert: any[] = [];
    const inventoryUpdates: Record<string, number> = {};

    for (const profile of syntheticSkus) {
      let product = await prisma.product.findUnique({ where: { sku: profile.sku } });
      if (!product) {
        product = await prisma.product.create({
          data: {
            sku: profile.sku,
            name: profile.name,
            categoryId: category.id,
            reorderLevel: profile.baseline * 7
          }
        });
      }

      let inventory = await prisma.inventory.findUnique({
        where: {
          productId_binId: {
            productId: product.id,
            binId: bin.id
          }
        }
      });

      if (!inventory) {
        inventory = await prisma.inventory.create({
          data: {
            productId: product.id,
            binId: bin.id,
            quantity: 0
          }
        });
      }

      let currentStock = profile.baseline * 30;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - DAYS_TO_GENERATE - 1);
      
      transactionsToInsert.push({
        inventoryId: inventory.id,
        quantityChange: currentStock,
        reason: 'PURCHASE_RECEIPT',
        referenceId: 'INIT-STOCK',
        createdAt: startDate
      });

      for (let i = DAYS_TO_GENERATE; i >= 0; i--) {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - i);
        currentDate.setHours(12, 0, 0, 0);

        let expectedDemand = profile.baseline;
        
        if (profile.type === 'trending-up') {
          const trendMultiplier = 1 + ((DAYS_TO_GENERATE - i) / DAYS_TO_GENERATE);
          expectedDemand = Math.floor(expectedDemand * trendMultiplier);
        } else if (profile.type === 'seasonal') {
          const seasonOffset = Math.sin(((DAYS_TO_GENERATE - i) / DAYS_TO_GENERATE) * Math.PI * 2) * (profile.baseline * 0.5);
          expectedDemand = Math.floor(expectedDemand + seasonOffset);
        }

        let dailyDemand = randomNormal(expectedDemand, profile.variance);
        if (dailyDemand < 0) dailyDemand = 0;

        let isAnomaly = false;
        let anomalyType = '';
        let anomalyMultiplier = 1;

        const anomalyRoll = Math.random();
        if (anomalyRoll < 0.015) {
          isAnomaly = true;
          const anomalyKindRoll = Math.random();
          
          if (anomalyKindRoll < 0.5) {
            anomalyMultiplier = randomInt(4, 8);
            dailyDemand = dailyDemand * anomalyMultiplier;
            anomalyType = 'volume_spike';
          } else if (anomalyKindRoll < 0.8) {
            if (expectedDemand > 10) {
               dailyDemand = 0;
               anomalyType = 'volume_drop';
            } else {
               isAnomaly = false;
            }
          } else {
            dailyDemand = currentStock + randomInt(50, 200);
            anomalyType = 'impossible_value';
          }

          if (isAnomaly) {
            anomaliesLog.push({
              date: currentDate.toISOString().split('T')[0],
              sku: profile.sku,
              anomalyType,
              expectedDemand,
              actualDemand: dailyDemand,
              notes: `Injected anomaly: ${anomalyType}`
            });
          }
        }

        if (dailyDemand > 0) {
          currentStock -= dailyDemand;
          
          transactionsToInsert.push({
            inventoryId: inventory.id,
            quantityChange: -dailyDemand,
            reason: anomalyType === 'impossible_value' ? 'MANUAL_ADJUST' : 'SALES_DISPATCH',
            referenceId: isAnomaly ? `ANOMALY-${anomalyType}` : `ORD-${i}`,
            createdAt: currentDate
          });
        }

        if (currentStock < profile.baseline * 14) {
          const restockAmount = profile.baseline * 30;
          currentStock += restockAmount;
          
          transactionsToInsert.push({
            inventoryId: inventory.id,
            quantityChange: restockAmount,
            reason: 'PURCHASE_RECEIPT',
            referenceId: `PO-REPLENISH-${i}`,
            createdAt: new Date(currentDate.getTime() + 1000)
          });
        }
      }

      inventoryUpdates[inventory.id] = currentStock;
    }

    const chunkSize = 2000;
    for (let i = 0; i < transactionsToInsert.length; i += chunkSize) {
      const chunk = transactionsToInsert.slice(i, i + chunkSize);
      await prisma.inventoryTransaction.createMany({
        data: chunk
      });
    }

    for (const [inventoryId, quantity] of Object.entries(inventoryUpdates)) {
      await prisma.inventory.update({
        where: { id: inventoryId },
        data: { quantity }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Synthetic data seeded successfully', 
      anomalyCount: anomaliesLog.length,
      anomalies: anomaliesLog
    });
  } catch (error: any) {
    console.error('Error generating synthetic data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
