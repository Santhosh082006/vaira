"use client";

import { useState } from 'react';
import { Search, Sparkles, Loader2, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function AiSearchBar() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError('');
    setMessage('');
    setIsOpen(true);

    try {
      const res = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to search');
      
      if (data.message) {
        setMessage(data.message);
        setResults([]);
      } else {
        setResults(data.results || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl">
      <form onSubmit={handleSearch} className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Sparkles className="h-4 w-4 text-blue-500" />
        </div>
        <Input
          type="text"
          placeholder="Ask AI: 'Show me low stock electronics'..."
          className="pl-10 pr-4 w-full bg-slate-100/50 border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 transition-all shadow-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0 || message || error) setIsOpen(true); }}
        />
        {isSearching && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          </div>
        )}
      </form>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-20 max-h-96 overflow-y-auto">
            {isSearching ? (
              <div className="p-4 text-sm text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> AI is analyzing your request...
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-red-500">
                {error}
              </div>
            ) : message ? (
              <div className="p-4 text-sm text-slate-500">
                {message}
              </div>
            ) : results.length > 0 ? (
              <div className="flex flex-col">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500">
                  {results.length} Result{results.length !== 1 ? 's' : ''} Found
                </div>
                {results.map((r, i) => (
                  <div key={i} className="p-3 border-b border-slate-100 hover:bg-slate-50 flex items-start gap-3">
                    <Package className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {r.product?.name || r.name} {r.quantity !== undefined && `- Stock: ${r.quantity}`}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {r.bin ? `Location: ${r.bin.rack.zone.warehouse.name} > ${r.bin.rack.zone.name} > ${r.bin.rack.name}` : r.location || 'Warehouse'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : query ? (
              <div className="p-4 text-sm text-slate-500">
                Press Enter to search...
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
