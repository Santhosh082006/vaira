import { prisma } from '@/lib/prisma';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    include: {
      salesOrders: true
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">Manage customer records and order history.</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white h-9">
          <Plus className="w-4 h-4 mr-2" /> Add Customer
        </Button>
      </div>

      <div className="border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50 border-b border-slate-200">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">Customer Name</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider">Contact</TableHead>
              <TableHead className="text-slate-600 font-medium h-10 text-xs uppercase tracking-wider text-right">Total Orders</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-slate-500 text-sm">
                  No customers found. Add a customer to begin.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id} className="border-slate-100 hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium text-slate-900">{customer.name}</TableCell>
                  <TableCell className="text-slate-600">{customer.contact || 'No contact info'}</TableCell>
                  <TableCell className="text-right text-slate-600 font-medium">{customer.salesOrders.length}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
