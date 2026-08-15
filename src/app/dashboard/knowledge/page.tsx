'use client';

import { useState, useEffect } from 'react';
import { Book, Plus, Upload, Trash2, Send, Loader2, Info, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@ai-sdk/react';

type Document = {
  id: string;
  title: string;
  createdAt: string;
  _count: { chunks: number };
};

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload State
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  // Chat State
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();
  const isLoading = status === 'submitted' || status === 'streaming';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ role: 'user', parts: [{ type: 'text', text: input }] });
    setInput('');
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      if (Array.isArray(data)) setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    
    setUploading(true);
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      if (res.ok) {
        setTitle('');
        setContent('');
        setShowUpload(false);
        fetchDocuments();
      } else {
        const error = await res.json();
        alert(error.error || 'Upload failed');
      }
    } catch (err) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' });
      fetchDocuments();
    } catch (err) {
      alert('Delete failed');
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Knowledge Base</h1>
          <p className="text-sm text-slate-500">Manage SOPs and chat with AI regarding warehouse operations.</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white h-9"
          onClick={() => setShowUpload(!showUpload)}
        >
          {showUpload ? 'Cancel' : <><Plus className="w-4 h-4 mr-2" /> Add Document</>}
        </Button>
      </div>

      {showUpload && (
        <div className="border border-slate-200 rounded-lg bg-white shadow-sm p-6">
          <h2 className="text-lg font-medium text-slate-900 mb-4">Upload Knowledge Document</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Return Policy Q3" 
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
              <textarea 
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Paste the raw text of the document here..." 
                className="w-full px-3 py-2 border border-slate-300 rounded-md h-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required 
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={uploading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><Upload className="w-4 h-4 mr-2" /> Upload & Embed</>}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Documents List */}
        <div className="lg:col-span-1 border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="bg-slate-50 border-b border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Book className="w-4 h-4 text-slate-500" />
              Indexed Documents
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No documents indexed. Upload an SOP to enable AI RAG capabilities.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="p-3 border border-slate-100 rounded-lg hover:bg-slate-50 group flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{doc.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{doc._count.chunks} chunks embedded</p>
                    </div>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: AI Chat */}
        <div className="lg:col-span-2 border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden flex flex-col h-[500px]">
          <div className="bg-blue-50/50 border-b border-blue-100 p-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              Vaira Operations Assistant
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                <p>Ask a question about the warehouse SOPs.</p>
                <p className="text-xs mt-1">e.g., "What is the return policy for damaged goods?"</p>
              </div>
            )}
            
            {messages.map((m: any) => (
              <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-slate-100 text-slate-900 rounded-bl-none'
                }`}>
                  {/* Render reasoning trace (tool calls) */}
                  {m.toolInvocations && m.toolInvocations.length > 0 && (
                    <div className="mb-2 p-2 bg-slate-200/50 rounded-md border border-slate-300 text-xs font-mono text-slate-600 space-y-1">
                      {m.toolInvocations.map((tool: any) => (
                        <div key={tool.toolCallId} className="flex items-start gap-1.5">
                          <FileText className="w-3.5 h-3.5 mt-0.5 text-indigo-500" />
                          <div>
                            <span className="text-indigo-600 font-semibold">{tool.toolName}</span>
                            <span className="text-slate-400 block truncate max-w-[200px]">({JSON.stringify(tool.args)})</span>
                            {tool.state === 'result' ? (
                              <div className="text-emerald-600 mt-0.5 flex items-center gap-1">
                                <span>✓ SOPs retrieved</span>
                              </div>
                            ) : (
                              <div className="text-amber-600 mt-0.5 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Searching knowledge base...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-slate-100 text-slate-900 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-200 bg-white">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input 
                type="text" 
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about warehouse procedures..." 
                className="flex-1 px-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={isLoading || documents.length === 0}
              />
              <Button 
                type="submit" 
                disabled={isLoading || !input.trim() || documents.length === 0} 
                className="rounded-full w-10 h-10 p-0 bg-blue-600 hover:bg-blue-700 shrink-0"
              >
                <Send className="w-4 h-4 text-white" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
