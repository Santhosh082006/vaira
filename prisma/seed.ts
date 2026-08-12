import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcrypt';

async function main() {
  console.log('Start seeding...');

  // Create Admin User
  const passwordHash = await bcrypt.hash('password', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vaira.app' },
    update: {},
    create: {
      email: 'admin@vaira.app',
      name: 'System Admin',
      passwordHash,
      role: 'ADMIN',
    }
  });

  // Create Category
  const category = await prisma.category.create({
    data: {
      name: 'Electronics',
      description: 'Electronic items and accessories',
    },
  });

  // Create Product
  const product = await prisma.product.create({
    data: {
      sku: 'SKU-ELEC-001',
      barcode: '123456789012',
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse',
      categoryId: category.id,
      reorderLevel: 20,
    },
  });

  // Create Warehouse Hierarchy
  const warehouse = await prisma.warehouse.create({
    data: {
      name: 'Main Distribution Center',
      location: 'New York, NY',
    },
  });

  const zone = await prisma.zone.create({
    data: {
      name: 'Zone A (Electronics)',
      warehouseId: warehouse.id,
    },
  });

  const rack = await prisma.rack.create({
    data: {
      name: 'Rack A1',
      zoneId: zone.id,
    },
  });

  const bin = await prisma.bin.create({
    data: {
      name: 'Bin A1-01',
      rackId: rack.id,
    },
  });

  console.log(`Created Warehouse: ${warehouse.name} -> Zone: ${zone.name} -> Rack: ${rack.name} -> Bin: ${bin.name}`);
  console.log(`Created Product: ${product.name} under Category: ${category.name}`);
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
