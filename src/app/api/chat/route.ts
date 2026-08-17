import { createOpenAI } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { calculateDynamicReorderPoints } from '@/lib/services/demandForecasting';
import { detectAnomalies } from '@/lib/services/anomalyDetection';
import { GoogleGenAI } from '@google/genai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'MISSING_OPENAI_KEY',
  baseURL: process.env.OPENAI_API_KEY?.startsWith('sk-or-') ? 'https://openrouter.ai/api/v1' : 'https://api.openai.com/v1'
});

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || 'MISSING_GEMINI_KEY' 
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    // @ts-ignore - Ignore type error between LanguageModelV1 and LanguageModel
    model: openai('gpt-4o-mini'),
    messages,
    system: `You are Vaira's Operations Assistant. 
    You are an expert supply chain analyst. 
    Always use your available tools to fetch REAL data from the warehouse database or SOP knowledge base before answering questions.
    Never hallucinate numbers or SOPs. If the data is empty, say so.
    IMPORTANT FOR LOCAL/FALLBACK MODELS: If you cannot determine which tool to use or fail to emit a valid tool call, DO NOT guess or hallucinate. Instead, reply EXACTLY with: "I couldn't determine which data to query. Could you please rephrase your request?"
    Present your findings professionally.`,
    maxSteps: 3,
    tools: {
      get_stock_level: tool({
        description: 'Get the current stock level and basic details for a specific SKU.',
        parameters: z.object({
          sku: z.string().describe('The product SKU (e.g. SYN-MKB-01)')
        }),
        // @ts-ignore
        execute: async ({ sku }: { sku: string }) => {
          const product = await prisma.product.findUnique({
            where: { sku },
            include: { inventory: true }
          });
          
          if (!product) return { error: `SKU ${sku} not found.` };
          
          const currentStock = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
          return {
            sku: product.sku,
            name: product.name,
            currentStock,
            reorderLevel: product.reorderLevel
          };
        }
      }),

      get_reorder_candidates: tool({
        description: 'Get a list of all products that currently need to be reordered based on dynamic forecasting (status is REORDER_NOW or CRITICAL).',
        parameters: z.object({}),
        // @ts-ignore
        execute: async () => {
          // Uses exponential smoothing and dynamic safety stock
          const forecasts = await calculateDynamicReorderPoints(new Date(), 60);
          const needsReorder = forecasts.filter(f => f.status === 'REORDER_NOW' || f.status === 'CRITICAL');
          
          return {
            totalCandidates: needsReorder.length,
            candidates: needsReorder
          };
        }
      }),

      get_recent_anomalies: tool({
        description: 'Run statistical anomaly detection to find recent volume spikes, volume drops, or impossible inventory values.',
        parameters: z.object({
          lookbackDays: z.number().default(30).describe('Number of days to look back for anomalies.')
        }),
        // @ts-ignore
        execute: async ({ lookbackDays }: { lookbackDays: number }) => {
          const targetDate = new Date();
          // We look back to see anomalies over the specified period
          const anomalies = await detectAnomalies(targetDate, lookbackDays, 2.5);
          
          // Return the top 5 most severe anomalies to avoid overloading the context window
          const sortedAnomalies = anomalies.sort((a, b) => b.severity - a.severity).slice(0, 5);
          
          return {
            totalFound: anomalies.length,
            returned: sortedAnomalies.length,
            anomalies: sortedAnomalies
          };
        }
      }),

      search_sops: tool({
        description: 'Search the warehouse Standard Operating Procedures (SOPs) and knowledge base for policies, guidelines, and instructions.',
        parameters: z.object({
          query: z.string().describe('The search query to find relevant SOPs (e.g. "how to handle damaged goods")')
        }),
        // @ts-ignore
        execute: async ({ query }: { query: string }) => {
          // 1. Embed the user's query
          const embedResponse = await ai.models.embedContent({
            model: 'text-embedding-004',
            contents: query,
          });
          
          const queryEmbedding = embedResponse.embeddings?.[0]?.values;
          if (!queryEmbedding) {
            return { error: 'Failed to embed query for SOP search.' };
          }

          // 2. Perform Vector Similarity Search using pgvector
          const similarChunks = await prisma.$queryRaw<
            Array<{ title: string; content: string; similarity: number }>
          >`
            SELECT 
              d.title,
              c.content, 
              1 - (c.embedding <=> ${queryEmbedding}::vector) as similarity
            FROM "DocumentChunk" c
            JOIN "KnowledgeDocument" d ON c."documentId" = d.id
            ORDER BY c.embedding <=> ${queryEmbedding}::vector
            LIMIT 5
          `;

          if (similarChunks.length === 0) {
            return { result: 'No relevant SOPs found for this query.' };
          }

          return {
            totalFound: similarChunks.length,
            documents: similarChunks.map(c => ({ title: c.title, content: c.content }))
          };
        }
      })
    }
  });

  // @ts-ignore - Ignore the StreamTextResult type issue with toDataStreamResponse
  return result.toDataStreamResponse();
}
