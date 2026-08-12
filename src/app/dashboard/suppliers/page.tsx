import { prisma } from '@/lib/prisma';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    include: {
      products: true
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-500">Manage supplier relationships and contact information.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white h-9">
          <Plus className="w-4 h-4 mr-2" /> Add Supplier
        </Button>
      </div>

      <div className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50 border-b border-slate-200">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">Supplier Name</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">Contact</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider text-right">Products Supplied</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-slate-500 text-sm">
                  No suppliers found. Add a supplier to begin.
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium text-slate-900">{supplier.name}</TableCell>
                  <TableCell className="text-slate-600">{supplier.contact || 'No contact info'}</TableCell>
                  <TableCell className="text-right text-slate-600 font-medium">{supplier.products.length}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
