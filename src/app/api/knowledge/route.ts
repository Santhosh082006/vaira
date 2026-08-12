import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini API for embeddings
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || 'MISSING_GEMINI_KEY' 
});

// Simple chunking function (splits by double newline, or rough word count)
function chunkText(text: string, maxTokens: number = 500): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const p of paragraphs) {
    if (currentChunk.length + p.length > maxTokens * 4) { // rough character estimation
      chunks.push(currentChunk.trim());
      currentChunk = p;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + p;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Fallback for massive single paragraphs
  return chunks.flatMap(chunk => {
    if (chunk.length <= maxTokens * 4) return [chunk];
    // Very naive split if a single paragraph is too huge
    const words = chunk.split(' ');
    const subChunks = [];
    for (let i = 0; i < words.length; i += maxTokens) {
      subChunks.push(words.slice(i, i + maxTokens).join(' '));
    }
    return subChunks;
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !['ADMIN', 'MANAGER'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions for Knowledge Base.' }, { status: 403 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing from environment variables.' }, { status: 500 });
    }

    const { title, content } = await req.json();

    if (!title || !content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Title and content are required.' }, { status: 400 });
    }

    // 1. Save Document
    const document = await prisma.knowledgeDocument.create({
      data: {
        title,
        content,
      }
    });

    // 2. Chunking
    const chunks = chunkText(content, 400);

    // 3. Generate Embeddings & Store
    let processedChunks = 0;
    for (const text of chunks) {
      if (!text.trim()) continue;
      
      try {
        const response = await ai.models.embedContent({
          model: 'text-embedding-004',
          contents: text,
        });

        const embedding = response.embeddings?.[0]?.values;
        if (!embedding || embedding.length !== 768) {
          throw new Error('Invalid embedding returned');
        }

        // 4. Save to PostgreSQL using pgvector raw query for the vector type
        // Prisma's Unsupported("vector(768)") requires raw queries for inserts
        await prisma.$executeRaw`
          INSERT INTO "DocumentChunk" (id, "documentId", content, embedding, "createdAt")
          VALUES (gen_random_uuid(), ${document.id}::uuid, ${text}, ${embedding}::vector, NOW())
        `;
        
        processedChunks++;
      } catch (err) {
        console.error('Failed to embed chunk:', err);
        // Continue with other chunks even if one fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      documentId: document.id, 
      chunksProcessed: processedChunks 
    });

  } catch (error) {
    console.error('Knowledge Upload Error:', error);
    return NextResponse.json({ error: 'Failed to process document' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const documents = await prisma.knowledgeDocument.findMany({
      select: {
        id: true,
        title: true,
        createdAt: true,
        _count: {
          select: { chunks: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(documents);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !['ADMIN', 'MANAGER'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await prisma.knowledgeDocument.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
