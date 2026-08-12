import { prisma } from '@/lib/prisma';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      inventory: true
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">Manage catalog and SKUs.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white h-9">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      <div className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50 border-b border-slate-200">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">SKU</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">Name</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">Category</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider text-right">Reorder Level</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider text-right">Total Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500 text-sm">
                  No products found. Add your first product to get started.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const totalStock = product.inventory.reduce((acc, inv) => acc + inv.quantity, 0);
                const isLowStock = totalStock <= product.reorderLevel;

                return (
                  <TableRow key={product.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                    <TableCell className="font-mono text-xs text-slate-600">{product.sku}</TableCell>
                    <TableCell className="font-medium text-slate-900">{product.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {product.category.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-slate-500">{product.reorderLevel}</TableCell>
                    <TableCell className="text-right">
                      {isLowStock ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          {totalStock} (Low)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-sm font-medium text-slate-900">
                          {totalStock}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
