"use client";

import { useChat } from '@ai-sdk/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Loader2, Send, Database, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRef, useEffect } from 'react';

export function AiReportSummary({ inventoryData }: { inventoryData?: any }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = (useChat as any)({
    api: '/api/chat',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <Card className="shadow-sm border-blue-200 flex flex-col h-[600px]">
      <CardHeader className="flex flex-row items-center gap-2 pb-2 bg-blue-50/50 border-b border-blue-100">
        <Activity className="h-5 w-5 text-blue-600" />
        <CardTitle className="text-base font-semibold text-slate-900">
          Operations Intelligence
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
            <Database className="w-12 h-12 text-slate-300" />
            <p className="text-sm text-center max-w-sm">
              Ask me about reorder candidates, current stock levels, or to scan for recent anomalies in the warehouse.
            </p>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 bg-white border rounded-md shadow-sm">"What should we reorder?"</span>
              <span className="px-2 py-1 bg-white border rounded-md shadow-sm">"Check for anomalies"</span>
            </div>
          </div>
        ) : (
          messages.map((m: any) => (
            <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div 
                className={`max-w-[80%] rounded-lg p-3 text-sm shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                {/* Render reasoning trace (tool calls) */}
                {m.toolInvocations && m.toolInvocations.length > 0 && (
                  <div className="mb-2 p-2 bg-slate-100 rounded-md border border-slate-200 text-xs font-mono text-slate-600 space-y-1">
                    {m.toolInvocations.map((tool: any) => (
                      <div key={tool.toolCallId} className="flex items-start gap-1.5">
                        <Database className="w-3.5 h-3.5 mt-0.5 text-indigo-500" />
                        <div>
                          <span className="text-indigo-600 font-semibold">{tool.toolName}</span>
                          <span className="text-slate-400">({JSON.stringify(tool.args)})</span>
                          {tool.state === 'result' ? (
                            <div className="text-emerald-600 mt-0.5 flex items-center gap-1">
                              <span>✓ Data retrieved</span>
                            </div>
                          ) : (
                            <div className="text-amber-600 mt-0.5 flex items-center gap-1 animate-pulse">
                              <Loader2 className="w-3 h-3 animate-spin" /> Querying database...
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Render Text Content */}
                <div className="whitespace-pre-wrap leading-relaxed">
                  {m.content}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-start">
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm shadow-sm flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input 
            value={input} 
            onChange={handleInputChange} 
            placeholder="Query operations..." 
            className="flex-1 focus-visible:ring-blue-500"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="bg-blue-600 hover:bg-blue-700 w-10 p-0">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
