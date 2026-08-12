import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class ProductService {
  static async createProduct(data: Prisma.ProductUncheckedCreateInput) {
    return prisma.product.create({ data });
  }

  static async updateProduct(id: string, data: Prisma.ProductUncheckedUpdateInput) {
    return prisma.product.update({ where: { id }, data });
  }

  static async deleteProduct(id: string) {
    const inventoryCount = await prisma.inventory.count({ 
      where: { 
        productId: id,
        quantity: { gt: 0 }
      } 
    });
    
    if (inventoryCount > 0) {
      throw new Error("Cannot delete product with active inventory. Please empty inventory first.");
    }
    
    return prisma.product.delete({ where: { id } });
  }

  static async getProduct(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: { 
        category: true, 
        suppliers: { include: { supplier: true } }, 
        inventory: { include: { bin: { include: { rack: { include: { zone: { include: { warehouse: true } } } } } } } } 
      }
    });
  }

  static async searchProducts(query: string = '', categoryId?: string) {
    return prisma.product.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { sku: { contains: query, mode: 'insensitive' } },
            ]
          },
          ...(categoryId ? [{ categoryId }] : [])
        ]
      },
      include: { 
        category: true, 
        inventory: true,
        suppliers: true 
      }
    });
  }
}
