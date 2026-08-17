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

    // Wipe existing transactional data to ensure a clean slate
    await prisma.inventoryTransaction.deleteMany();
    await prisma.salesOrderItem.deleteMany();
    await prisma.salesOrder.deleteMany();
    await prisma.purchaseOrderItem.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.productSupplier.deleteMany();
    await prisma.product.deleteMany();
    await prisma.bin.deleteMany();
    await prisma.rack.deleteMany();
    await prisma.zone.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.category.deleteMany();

    // 1. Ensure basic hierarchy exists
    let category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({ data: { name: 'Electronics', description: 'Synthetic Category' } });
    }

    let warehouse = await prisma.warehouse.findFirst();
    if (!warehouse) {
      warehouse = await prisma.warehouse.create({ data: { name: 'Main Distribution Center', location: 'Austin, TX' } });
    }

    // Expand warehouse structure: 4 Zones, 3 Racks/Zone, 5 Bins/Rack
    const zoneNames = ['Receiving', 'Storage', 'Picking', 'Shipping'];
    const binsList: any[] = [];
    
    for (const zName of zoneNames) {
      let zone = await prisma.zone.findFirst({ where: { warehouseId: warehouse.id, name: zName } });
      if (!zone) {
        zone = await prisma.zone.create({ data: { name: zName, warehouseId: warehouse.id } });
      }
      for (let r = 1; r <= 3; r++) {
        const rackName = `${zName}-Rack-${r}`;
        let rack = await prisma.rack.findFirst({ where: { zoneId: zone.id, name: rackName } });
        if (!rack) {
          rack = await prisma.rack.create({ data: { name: rackName, zoneId: zone.id } });
        }
        for (let b = 1; b <= 5; b++) {
          const binName = `${rackName}-Bin-${b}`;
          let bin = await prisma.bin.findFirst({ where: { rackId: rack.id, name: binName } });
          if (!bin) {
            bin = await prisma.bin.create({ data: { name: binName, rackId: rack.id } });
          }
          binsList.push(bin);
        }
      }
    }

    // Select a primary bin for storage
    const primaryBin = binsList.find(b => b.name.includes('Storage')) || binsList[0];

    // Create Suppliers
    const supplierNames = ['TechSource Global', 'ErgoLine Manufacturing', 'CableWorks Inc.', 'ElectroHub Distributors', 'Zenith Logistics'];
    const suppliers: any[] = [];
    for (const sName of supplierNames) {
      let supplier = await prisma.supplier.findFirst({ where: { name: sName } });
      if (!supplier) {
        supplier = await prisma.supplier.create({ data: { name: sName, contact: 'contact@' + sName.replace(' ', '').toLowerCase() + '.com' } });
      }
      suppliers.push(supplier);
    }

    // Create Customers
    const customerNames = ['Acme Corp', 'Beta Solutions', 'Gamma Industries', 'Delta Innovations', 'Omega Enterprises', 'Stark Industries', 'Wayne Enterprises', 'Umbrella Corp', 'Globex', 'Soylent'];
    const customers: any[] = [];
    for (const cName of customerNames) {
      let customer = await prisma.customer.findFirst({ where: { name: cName } });
      if (!customer) {
        customer = await prisma.customer.create({ data: { name: cName, contact: 'purchasing@' + cName.replace(' ', '').toLowerCase() + '.com' } });
      }
      customers.push(customer);
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

    // Purchase and Sales Orders to insert
    const purchaseOrdersToInsert: any[] = [];
    const salesOrdersToInsert: any[] = [];

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

      // Link Product to a Supplier with realistic lead time
      const assignedSupplier = suppliers[randomInt(0, suppliers.length - 1)];
      const existingProductSupplier = await prisma.productSupplier.findUnique({
        where: { productId_supplierId: { productId: product.id, supplierId: assignedSupplier.id } }
      });
      if (!existingProductSupplier) {
        await prisma.productSupplier.create({
          data: {
            productId: product.id,
            supplierId: assignedSupplier.id,
            supplierPrice: randomInt(10, 100),
            leadTimeDays: randomInt(3, 14),
            isPreferred: true
          }
        });
      }

      let inventory = await prisma.inventory.findUnique({
        where: {
          productId_binId: {
            productId: product.id,
            binId: primaryBin.id
          }
        }
      });

      if (!inventory) {
        inventory = await prisma.inventory.create({
          data: {
            productId: product.id,
            binId: primaryBin.id,
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
          
          // Generate a Sales Order for this dispatch roughly 1 in 10 times to seed order history
          const salesOrderId = `ORD-${i}-${product.id.substring(0, 4)}`;
          if (randomInt(1, 10) === 1) {
            const customer = customers[randomInt(0, customers.length - 1)];
            salesOrdersToInsert.push({
              id: salesOrderId,
              customerId: customer.id,
              status: "COMPLETED",
              createdAt: currentDate,
              updatedAt: currentDate,
              productId: product.id,
              quantity: dailyDemand,
              price: randomInt(20, 150)
            });
          }

          transactionsToInsert.push({
            inventoryId: inventory.id,
            quantityChange: -dailyDemand,
            reason: anomalyType === 'impossible_value' ? 'MANUAL_ADJUST' : 'SALES_DISPATCH',
            referenceId: isAnomaly ? `ANOMALY-${anomalyType}` : salesOrderId,
            createdAt: currentDate
          });
        }

        if (currentStock < profile.baseline * 14) {
          const restockAmount = profile.baseline * 30;
          currentStock += restockAmount;
          
          // Generate a Purchase Order
          const poId = `PO-${i}-${product.id.substring(0, 4)}`;
          purchaseOrdersToInsert.push({
            id: poId,
            supplierId: assignedSupplier.id,
            status: "COMPLETED",
            createdAt: new Date(currentDate.getTime() + 1000),
            updatedAt: new Date(currentDate.getTime() + 1000),
            productId: product.id,
            quantity: restockAmount,
            price: randomInt(10, 100)
          });

          transactionsToInsert.push({
            inventoryId: inventory.id,
            quantityChange: restockAmount,
            reason: 'PURCHASE_RECEIPT',
            referenceId: poId,
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

    // Insert the generated orders
    for (const so of salesOrdersToInsert) {
      const existing = await prisma.salesOrder.findUnique({ where: { id: so.id } });
      if (!existing) {
        await prisma.salesOrder.create({
          data: {
            id: so.id,
            customerId: so.customerId,
            status: so.status,
            createdAt: so.createdAt,
            updatedAt: so.updatedAt,
            items: {
              create: {
                productId: so.productId,
                quantity: so.quantity,
                price: so.price
              }
            }
          }
        });
      }
    }

    for (const po of purchaseOrdersToInsert) {
      const existing = await prisma.purchaseOrder.findUnique({ where: { id: po.id } });
      if (!existing) {
        await prisma.purchaseOrder.create({
          data: {
            id: po.id,
            supplierId: po.supplierId,
            status: po.status,
            createdAt: po.createdAt,
            updatedAt: po.updatedAt,
            items: {
              create: {
                productId: po.productId,
                quantity: po.quantity,
                price: po.price
              }
            }
          }
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Synthetic data seeded successfully with full relational structure.', 
      anomalyCount: anomaliesLog.length,
      anomalies: anomaliesLog
    });
  } catch (error: any) {
    console.error('Error generating synthetic data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
