import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini API
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || 'MISSING_GEMINI_KEY' 
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }

    // 1. Embed the user's query
    const embedResponse = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: query,
    });
    
    const queryEmbedding = embedResponse.embeddings?.[0]?.values;
    if (!queryEmbedding) {
      throw new Error('Failed to embed query');
    }

    // 2. Perform Vector Similarity Search using pgvector (<=> operator is Cosine Distance)
    // We select the top 5 most similar chunks.
    const similarChunks = await prisma.$queryRaw<
      Array<{ id: string; content: string; documentId: string; title: string; similarity: number }>
    >`
      SELECT 
        c.id, 
        c.content, 
        c."documentId",
        d.title,
        1 - (c.embedding <=> ${queryEmbedding}::vector) as similarity
      FROM "DocumentChunk" c
      JOIN "KnowledgeDocument" d ON c."documentId" = d.id
      ORDER BY c.embedding <=> ${queryEmbedding}::vector
      LIMIT 5
    `;

    // 3. Construct the prompt with grounded context
    const contextText = similarChunks
      .map(chunk => `[Document: ${chunk.title}]\n${chunk.content}`)
      .join('\n\n---\n\n');

    const systemPrompt = `You are the Vaira Operations Assistant.
You have been provided with knowledge base documents from the warehouse.
Answer the user's question using ONLY the context provided below.
If the answer cannot be found in the context, politely say "I cannot find the answer to this in the warehouse knowledge base."
When answering, use markdown and explicitly cite the document title in brackets at the end of the sentence or bullet point, e.g. [Document: SOP - Returns].
Do not invent information.

CONTEXT:
${contextText}`;

    // 4. Generate grounded response using Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. I will only answer based on the provided context and cite my sources.' }] },
        { role: 'user', parts: [{ text: query }] }
      ],
      config: {
        temperature: 0.1, // Low temperature for factual accuracy
      }
    });

    const answer = response.text;

    return NextResponse.json({
      answer,
      sources: similarChunks.map(c => ({ title: c.title, similarity: c.similarity }))
    });

  } catch (error) {
    console.error('RAG Error:', error);
    return NextResponse.json({ error: 'Failed to process RAG query' }, { status: 500 });
  }
}
