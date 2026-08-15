import Link from 'next/link';
import { Package, MapPin, ShoppingCart, LayoutDashboard, Settings, LogOut, Box, LineChart, FileText } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AiSearchBar } from '@/components/dashboard/ai-search-bar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shadow-sm z-10 hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10 text-blue-600">
            <Box className="w-8 h-8" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Vaira</h1>
          </div>
          
          <nav className="space-y-1">
            <NavItem href="/dashboard" icon={<LayoutDashboard size={18} />} label="Overview" />
            <NavItem href="/dashboard/products" icon={<Package size={18} />} label="Products" />
            <NavItem href="/dashboard/suppliers" icon={<Box size={18} />} label="Suppliers" />
            <NavItem href="/dashboard/customers" icon={<ShoppingCart size={18} />} label="Customers" />
            <NavItem href="/dashboard/warehouses" icon={<MapPin size={18} />} label="Warehouses" />
            <NavItem href="/dashboard/orders" icon={<ShoppingCart size={18} />} label="Orders" />
            <NavItem href="/dashboard/reports" icon={<LineChart size={18} />} label="Intelligence" />
            <NavItem href="/dashboard/knowledge" icon={<FileText size={18} />} label="SOPs" />
            <NavItem href="/dashboard/audit-logs" icon={<Box size={18} />} label="Audit Logs" />
            <NavItem href="/dashboard/settings" icon={<Settings size={18} />} label="Settings" />
          </nav>
        </div>

        <div className="p-6 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              {session.user?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">{session.user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{session.user?.email}</p>
            </div>
          </div>
          <Link href="/api/auth/signout" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors w-full p-2 rounded-md hover:bg-slate-100">
            <LogOut size={16} /> Sign out
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center px-4 md:px-8 shrink-0 z-10 shadow-sm">
          <AiSearchBar />
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link 
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors group"
    >
      <span className="text-slate-400 group-hover:text-blue-600 transition-colors">{icon}</span>
      {label}
    </Link>
  );
}
