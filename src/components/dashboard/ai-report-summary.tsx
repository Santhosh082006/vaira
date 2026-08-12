"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AiReportSummaryProps {
  inventoryData: any;
}

export function AiReportSummary({ inventoryData }: AiReportSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsight = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // We pass only aggregated data to save tokens and prevent huge payloads
      const totalItems = inventoryData.length;
      const lowStockItems = inventoryData.filter((i: any) => i.quantity < 10).map((i: any) => ({ sku: i.product.sku, name: i.product.name, qty: i.quantity }));
      const outOfStockItems = inventoryData.filter((i: any) => i.quantity === 0).map((i: any) => ({ sku: i.product.sku, name: i.product.name }));

      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contextData: { 
            totalItems, 
            lowStockItems, 
            outOfStockItems, 
            date: new Date().toISOString()
          } 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate insight');
      
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={generateInsight} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white h-9">
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {summary ? 'Regenerate Insight' : 'Generate New Insight'}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}

      {summary ? (
        <Card className="shadow-sm border-blue-200 bg-blue-50/10">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base font-semibold text-slate-900">AI Executive Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {summary}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-sm border-blue-100 bg-blue-50/30 opacity-60">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base font-semibold text-slate-900">Fulfillment Velocity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                <p>Click "Generate New Insight" to analyze real-time fulfillment velocity.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-amber-200 bg-amber-50/30 opacity-60">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base font-semibold text-slate-900">Stock Risk Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                <p>Click "Generate New Insight" to detect potential stockout risks based on current trajectories.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
