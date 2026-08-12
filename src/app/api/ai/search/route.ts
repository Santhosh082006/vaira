import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

// 1. The OpenRouter Hijack
const isOpenRouter = process.env.OPENAI_API_KEY?.startsWith('sk-or-');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'MISSING',
  baseURL: isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined,
});

// 2. The Free Models List
const FALLBACK_MODELS = [
  'google/gemma-2-9b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'huggingfaceh4/zephyr-7b-beta:free'
];

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured in .env' }, { status: 500 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }

    // 3. The Infinite Fallback Loop
    let aiText: string | null = null;
    let lastError = null;
    
    // We try all free models in sequence until one succeeds
    for (const model of FALLBACK_MODELS) {
      try {
        const response = await openai.chat.completions.create({
          model: isOpenRouter ? model : 'gpt-4o-mini', // Use GPT-4o-mini if using real OpenAI
          messages: [
            {
              role: 'system',
              content: `Parse the user request regarding a warehouse management system.
              Extract the intent and map it to our structured JSON schema. If the query is unrelated, return null for entity.
              
              Respond ONLY with raw JSON matching this schema:
              {
                "entity": "inventory" | "product" | "warehouse" | "none",
                "filters": {
                  "productName": string,
                  "category": string,
                  "quantityLessThan": number,
                  "quantityGreaterThan": number,
                  "warehouseName": string,
                  "lowStock": boolean
                }
              }`
            },
            {
              role: 'user',
              content: query
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        });

        aiText = response.choices[0]?.message?.content || null;
        if (aiText) break; // Success! Exit the loop.
      } catch (e: any) {
        console.warn(`Model ${model} failed, cycling to next... (${e.message})`);
        lastError = e;
        if (!isOpenRouter) break; // Don't loop if we are using real OpenAI
      }
    }

    if (!aiText) {
      throw new Error(lastError?.message || 'All AI models failed to respond');
    }
    
    const parsed = JSON.parse(aiText);

    if (!parsed.entity || parsed.entity === 'none') {
      return NextResponse.json({ 
        message: "I couldn't understand that query in the context of our warehouse system.", 
        results: [] 
      });
    }

    // Execute Prisma Query based on safe structured output
    let results: any[] = [];
    
    if (parsed.entity === 'inventory' || parsed.entity === 'product') {
      const where: any = {};
      
      if (parsed.filters?.productName) {
        where.product = { name: { contains: parsed.filters.productName, mode: 'insensitive' } };
      }
      if (parsed.filters?.category) {
        where.product = { ...where.product, category: { name: { contains: parsed.filters.category, mode: 'insensitive' } } };
      }
      if (parsed.filters?.quantityLessThan !== undefined) {
        where.quantity = { lt: parsed.filters.quantityLessThan };
      }
      if (parsed.filters?.quantityGreaterThan !== undefined) {
        where.quantity = { ...where.quantity, gt: parsed.filters.quantityGreaterThan };
      }
      if (parsed.filters?.lowStock) {
        where.quantity = { lt: 10 }; // Definition of low stock
      }
      if (parsed.filters?.warehouseName) {
        where.bin = { rack: { zone: { warehouse: { name: { contains: parsed.filters.warehouseName, mode: 'insensitive' } } } } };
      }

      results = await prisma.inventory.findMany({
        where,
        include: {
          product: { include: { category: true } },
          bin: { include: { rack: { include: { zone: { include: { warehouse: true } } } } } }
        },
        take: 50 // Limit results for safety
      });
    } else if (parsed.entity === 'warehouse') {
      const where: any = {};
      if (parsed.filters?.warehouseName) {
        where.name = { contains: parsed.filters.warehouseName, mode: 'insensitive' };
      }
      results = await prisma.warehouse.findMany({
        where,
        include: { zones: true }
      });
    }

    return NextResponse.json({ 
      parsedIntent: parsed,
      count: results.length,
      results 
    });

  } catch (error) {
    console.error('AI Search Error:', error);
    return NextResponse.json({ error: 'Failed to process AI search' }, { status: 500 });
  }
}
