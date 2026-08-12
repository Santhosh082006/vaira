import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import OpenAI from 'openai';

// 1. The OpenRouter Hijack
const isOpenRouter = process.env.OPENAI_API_KEY?.startsWith('sk-or-');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'MISSING',
  baseURL: isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined,
});

// 2. The Free Models List
const FALLBACK_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-2-9b-it:free',
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

    const { contextData } = await req.json();

    if (!contextData) {
      return NextResponse.json({ error: 'Missing context data' }, { status: 400 });
    }

    // 3. The Infinite Fallback Loop
    let summary: string | null = null;
    let lastError = null;

    for (const model of FALLBACK_MODELS) {
      try {
        const response = await openai.chat.completions.create({
          model: isOpenRouter ? model : 'gpt-4o', // Use GPT-4o if using real OpenAI for better reasoning
          messages: [
            {
              role: 'system',
              content: `You are an expert AI Warehouse Management assistant.
              Generate a concise, professional business summary for the warehouse manager based STRICTLY on the following verified database metrics.
              DO NOT invent, guess, or hallucinate any numbers or metrics. If a metric is not in the data, do not mention it.
              Format your response in plain text with clear paragraphs or markdown bullet points. Do not use overly complex formatting.
              Highlight any critical risks (e.g., low stock).`
            },
            {
              role: 'user',
              content: `Verified Data:\n${JSON.stringify(contextData, null, 2)}`
            }
          ],
          temperature: 0.3,
        });

        summary = response.choices[0]?.message?.content || null;
        if (summary) break;
      } catch (e: any) {
        console.warn(`Model ${model} failed, cycling to next... (${e.message})`);
        lastError = e;
        if (!isOpenRouter) break; // Don't loop if we are using real OpenAI
      }
    }

    if (!summary) {
      throw new Error(lastError?.message || 'All AI models failed to respond');
    }

    return NextResponse.json({ summary });

  } catch (error) {
    console.error('AI Summarize Error:', error);
    return NextResponse.json({ error: 'Failed to generate AI summary' }, { status: 500 });
  }
}
