import { prisma } from '../src/lib/prisma';
import { InventoryService } from '../src/services/inventory.service';
import { OrderService } from '../src/services/order.service';
import { WarehouseService } from '../src/services/warehouse.service';

async function runInboundWorkflow() {
  console.log('\n--- Running Inbound Workflow ---');
  
  // 1. Setup Data
  const supplier = await prisma.supplier.create({ data: { name: 'E2E Supplier' } });
  const category = await prisma.category.create({ data: { name: 'E2E Category' } });
  const product = await prisma.product.create({ 
    data: { name: 'E2E Product', sku: 'E2E-001', categoryId: category.id } 
  });
  const warehouse = await WarehouseService.createWarehouse('E2E Warehouse');
  const zone = await WarehouseService.createZone(warehouse.id, 'E2E Zone');
  const rack = await WarehouseService.createRack(zone.id, 'E2E Rack');
  const bin = await WarehouseService.createBin(rack.id, 'E2E Bin');

  // 2. Create Purchase Order
  let po = await OrderService.createPurchaseOrder(supplier.id, [
    { productId: product.id, quantity: 100, price: 50 }
  ]);
  console.log('✅ PO Created:', po.id);

  // 3. Approve PO
  po = await OrderService.updatePOStatus(po.id, 'APPROVED');
  console.log('✅ PO Approved');

  // 4. Receive PO (Inventory Increase)
  const receivedItem = po.items[0];
  const inventory = await InventoryService.receivePurchase(receivedItem.productId, bin.id, receivedItem.quantity, `PO-${po.id}`);
  console.log('✅ Inventory Received:', inventory.quantity, 'units in', bin.name);

  // 5. Complete PO
  po = await OrderService.updatePOStatus(po.id, 'COMPLETED');
  console.log('✅ PO Completed');

  // Verify Audit Logs & Transactions
  const tx = await prisma.inventoryTransaction.findFirst({ where: { inventoryId: inventory.id } });
  if (tx && tx.quantityChange === 100) console.log('✅ Transaction Record Verified');
  else throw new Error('Transaction record missing or incorrect');

  return { product, bin, inventory };
}

async function runOutboundWorkflow(productId: string, binId: string) {
  console.log('\n--- Running Outbound Workflow ---');

  // 1. Setup Data
  const customer = await prisma.customer.create({ data: { name: 'E2E Customer' } });

  // 2. Create Sales Order
  let so = await OrderService.createSalesOrder(customer.id, [
    { productId: productId, quantity: 30, price: 100 }
  ]);
  console.log('✅ SO Created:', so.id);

  // 3. Confirm & Allocate SO
  so = await OrderService.updateSOStatus(so.id, 'CONFIRMED');
  so = await OrderService.updateSOStatus(so.id, 'ALLOCATED');
  console.log('✅ SO Allocated');

  // 4. Dispatch SO (Inventory Decrease)
  const dispatchItem = so.items[0];
  const inventory = await InventoryService.dispatchSales(dispatchItem.productId, binId, dispatchItem.quantity, `SO-${so.id}`);
  console.log('✅ Inventory Dispatched. Remaining:', inventory.quantity, 'units');

  // 5. Complete SO
  so = await OrderService.updateSOStatus(so.id, 'DISPATCHED');
  console.log('✅ SO Dispatched');

  // Verify Audit Logs & Transactions
  const tx = await prisma.inventoryTransaction.findFirst({ 
    where: { inventoryId: inventory.id, reason: 'SALES_DISPATCH' },
    orderBy: { createdAt: 'desc' }
  });
  if (tx && tx.quantityChange === -30) console.log('✅ Transaction Record Verified');
  else throw new Error('Transaction record missing or incorrect');
}

async function main() {
  try {
    const { product, bin } = await runInboundWorkflow();
    await runOutboundWorkflow(product.id, bin.id);
    console.log('\n🎉 ALL E2E WORKFLOWS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ WORKFLOW FAILED:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
