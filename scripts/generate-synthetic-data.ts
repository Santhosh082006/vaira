import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

const DAYS_TO_GENERATE = 180;
const ANOMALIES_FILE = path.join(process.cwd(), 'anomalies_ground_truth.json');

// Helper to generate a random number between min and max (inclusive)
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper for normal distribution (Box-Muller transform)
function randomNormal(mean: number, stdDev: number) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return Math.round(z * stdDev + mean);
}

async function main() {
  console.log(`Starting synthetic data generation for the past ${DAYS_TO_GENERATE} days...`);

  // 1. Ensure basic hierarchy exists (Category, Warehouse, Zone, Rack, Bin)
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

  // 2. Define synthetic SKUs with different demand profiles
  const syntheticSkus = [
    { sku: 'SYN-MKB-01', name: 'Mechanical Keyboard', baseline: 15, variance: 3, type: 'steady' },
    { sku: 'SYN-WM-02', name: 'Wireless Mouse', baseline: 40, variance: 10, type: 'steady' },
    { sku: 'SYN-MON-03', name: '27" Monitor', baseline: 5, variance: 2, type: 'trending-up' },
    { sku: 'SYN-CAB-04', name: 'USB-C Cable', baseline: 100, variance: 30, type: 'seasonal' },
    { sku: 'SYN-CH-05', name: 'Ergo Chair', baseline: 2, variance: 1, type: 'steady' }
  ];

  const anomaliesLog: any[] = [];
  const transactionsToInsert: any[] = [];
  const inventoryUpdates: Record<string, number> = {}; // Track final quantity

  // 3. Process each SKU
  for (const profile of syntheticSkus) {
    // Upsert Product
    let product = await prisma.product.findUnique({ where: { sku: profile.sku } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          sku: profile.sku,
          name: profile.name,
          categoryId: category.id,
          reorderLevel: profile.baseline * 7 // default
        }
      });
    }

    // Ensure Inventory record exists
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

    // Start with some initial stock
    let currentStock = profile.baseline * 30; // 30 days of stock
    
    // Initial Receipt Transaction
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - DAYS_TO_GENERATE - 1);
    
    transactionsToInsert.push({
      inventoryId: inventory.id,
      quantityChange: currentStock,
      reason: 'PURCHASE_RECEIPT',
      referenceId: 'INIT-STOCK',
      createdAt: startDate
    });

    // 4. Generate daily history
    for (let i = DAYS_TO_GENERATE; i >= 0; i--) {
      const currentDate = new Date();
      currentDate.setDate(currentDate.getDate() - i);
      currentDate.setHours(12, 0, 0, 0);

      // Determine Daily Demand
      let expectedDemand = profile.baseline;
      
      // Apply profile trends
      if (profile.type === 'trending-up') {
        // Slowly increase over time (i goes from 180 to 0)
        const trendMultiplier = 1 + ((DAYS_TO_GENERATE - i) / DAYS_TO_GENERATE); // 1.0 to 2.0
        expectedDemand = Math.floor(expectedDemand * trendMultiplier);
      } else if (profile.type === 'seasonal') {
        // Sine wave over 180 days (approx 1 cycle)
        const seasonOffset = Math.sin(((DAYS_TO_GENERATE - i) / DAYS_TO_GENERATE) * Math.PI * 2) * (profile.baseline * 0.5);
        expectedDemand = Math.floor(expectedDemand + seasonOffset);
      }

      // Add Gaussian noise
      let dailyDemand = randomNormal(expectedDemand, profile.variance);
      if (dailyDemand < 0) dailyDemand = 0; // No negative baseline demand

      let isAnomaly = false;
      let anomalyType = '';
      let anomalyMultiplier = 1;

      // Inject Anomalies (~1.5% chance per day per SKU)
      const anomalyRoll = Math.random();
      if (anomalyRoll < 0.015) {
        isAnomaly = true;
        const anomalyKindRoll = Math.random();
        
        if (anomalyKindRoll < 0.5) {
          // Volume Spike (4x to 8x normal demand)
          anomalyMultiplier = randomInt(4, 8);
          dailyDemand = dailyDemand * anomalyMultiplier;
          anomalyType = 'volume_spike';
        } else if (anomalyKindRoll < 0.8) {
          // Volume Drop (0 demand on a normally busy day)
          if (expectedDemand > 10) {
             dailyDemand = 0;
             anomalyType = 'volume_drop';
          } else {
             isAnomaly = false;
          }
        } else {
          // Impossible Value (e.g. negative stock dispatch anomaly or crazy manual adjust)
          // We will simulate a manual adjustment that removes far too much
          dailyDemand = currentStock + randomInt(50, 200); // Tries to drop stock below 0
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

      // Create Sales Dispatch (Demand)
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

      // Reorder logic (if stock drops below 14 days of baseline)
      if (currentStock < profile.baseline * 14) {
        const restockAmount = profile.baseline * 30; // buy 30 days worth
        currentStock += restockAmount;
        
        transactionsToInsert.push({
          inventoryId: inventory.id,
          quantityChange: restockAmount,
          reason: 'PURCHASE_RECEIPT',
          referenceId: `PO-REPLENISH-${i}`,
          createdAt: new Date(currentDate.getTime() + 1000) // 1 second later
        });
      }
    }

    // Save final calculated stock to update the Inventory model later
    inventoryUpdates[inventory.id] = currentStock;
    console.log(`Generated data for SKU: ${profile.sku}. Final Stock: ${currentStock}`);
  }

  // 5. Bulk insert transactions
  console.log(`Inserting ${transactionsToInsert.length} transactions into database...`);
  // We chunk them to avoid hitting Prisma limits
  const chunkSize = 2000;
  for (let i = 0; i < transactionsToInsert.length; i += chunkSize) {
    const chunk = transactionsToInsert.slice(i, i + chunkSize);
    await prisma.inventoryTransaction.createMany({
      data: chunk
    });
  }

  // 6. Update final inventory balances
  console.log(`Updating final inventory quantities...`);
  for (const [inventoryId, quantity] of Object.entries(inventoryUpdates)) {
    await prisma.inventory.update({
      where: { id: inventoryId },
      data: { quantity }
    });
  }

  // 7. Write ground truth log
  fs.writeFileSync(ANOMALIES_FILE, JSON.stringify(anomaliesLog, null, 2));
  console.log(`\nSuccessfully injected ${anomaliesLog.length} anomalies.`);
  console.log(`Ground truth saved to: ${ANOMALIES_FILE}`);
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
