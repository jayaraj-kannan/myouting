import { GoogleGenerativeAI } from '@google/generative-ai';
import { NormalizedMessage, ExtractedInsights, OutingPlan, ItineraryItem, FactStatus } from '../types';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errors';
import { ExtractedInsightsSchema } from '../schemas/ai-schemas';
import { OUTING_EXTRACTION_SYSTEM_PROMPT, PLAN_GENERATION_SYSTEM_PROMPT, ASSISTANT_SYSTEM_PROMPT } from '../prompts';

export interface AiProvider {
  extractInsights(messages: NormalizedMessage[]): Promise<ExtractedInsights>;
  generatePlan(workspaceId: string, insights: ExtractedInsights, ownerId: string): Promise<OutingPlan>;
  regenerateSection(plan: OutingPlan, section: string, prompt?: string): Promise<any>;
  chatWithAssistant(
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    newMessage: string,
    context: { messages: NormalizedMessage[]; insights?: ExtractedInsights; plan?: OutingPlan }
  ): Promise<{ answer: string; citations: Array<{ messageId: string; sender: string; text: string }> }>;
}

export class GeminiAiProvider implements AiProvider {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!config.gemini.apiKey) {
      throw new ApiError(500, 'CONFIG_ERROR', 'GEMINI_API_KEY environment variable is required.');
    }
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async extractInsights(messages: NormalizedMessage[]): Promise<ExtractedInsights> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: config.gemini.model,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const chatSnippet = messages.map(m => ({
        id: m.messageId,
        time: m.timestamp,
        sender: m.senderLabel,
        text: m.text,
      }));

      const prompt = `${OUTING_EXTRACTION_SYSTEM_PROMPT}\n\nHere are the normalized chat messages:\n${JSON.stringify(chatSnippet, null, 2)}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text);

      const validated = ExtractedInsightsSchema.safeParse(parsed);
      if (validated.success) {
        return validated.data as ExtractedInsights;
      }

      logger.warn({ errors: validated.error }, 'Schema validation issues in Gemini output, returning parsed JSON');
      return parsed as ExtractedInsights;
    } catch (err: any) {
      logger.error({ err }, 'Gemini extraction API call failed');
      throw new ApiError(500, 'GEMINI_EXTRACTION_FAILED', `Gemini extraction failed: ${err.message}`);
    }
  }

  async generatePlan(workspaceId: string, insights: ExtractedInsights, ownerId: string): Promise<OutingPlan> {
    const destinationName = insights.destination?.value || 'Weekend Outing';
    const planId = `plan_${Date.now()}`;

    try {
      const model = this.genAI.getGenerativeModel({
        model: config.gemini.model,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const prompt = `${PLAN_GENERATION_SYSTEM_PROMPT}\n\nInsights:\n${JSON.stringify(insights, null, 2)}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text);

      return {
        id: planId,
        workspaceId,
        title: parsed.title || `${destinationName} Trip Plan`,
        description: parsed.description || insights.summary || 'Outing plan generated from conversation',
        sourceImportIds: [],
        destination: {
          name: destinationName,
          status: insights.destination?.status || 'proposed',
          alternatives: insights.alternativeDestinations?.value || [],
        },
        dates: {
          startDate: insights.date?.value.startDate || null,
          endDate: insights.date?.value.endDate || null,
          durationDays: insights.date?.value.durationDays || 2,
          status: insights.date?.status || 'proposed',
        },
        budget: {
          estimatedTotal: (insights.budget?.value.amount || 2500) * (insights.participants?.value.totalEstimated || 4),
          estimatedPerPerson: insights.budget?.value.amount || 2500,
          currency: insights.budget?.value.currency || 'INR',
          status: insights.budget?.status || 'proposed',
          breakdown: insights.budget?.value.breakdown || {
            travel: 800,
            food: 1000,
            stay: 1200,
            activities: 500,
          },
        },
        transportation: {
          mode: insights.transport?.value.mode || 'Car',
          status: insights.transport?.status || 'proposed',
          details: insights.transport?.value.details,
        },
        itinerary: parsed.itinerary || [],
        activities: parsed.activities || (insights.activities?.value || []).map((a, i) => ({
          id: `act_${i + 1}`,
          title: a.name,
          status: a.status,
        })),
        pendingDecisions: (insights.conflicts || []).map((c, i) => ({
          id: `dec_${i + 1}`,
          topic: c.topic,
          options: c.competingOptions,
        })),
        tasks: (insights.tasks || []).map((t, i) => ({
          id: `task_${i + 1}`,
          title: t.description,
          assigneeName: t.assignedTo,
          status: t.status,
        })),
        status: 'draft',
        ownerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      logger.error({ err }, 'Gemini plan generation API call failed');
      throw new ApiError(500, 'GEMINI_PLAN_GENERATION_FAILED', `Gemini plan generation failed: ${err.message}`);
    }
  }

  async regenerateSection(plan: OutingPlan, section: string, prompt?: string): Promise<any> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: config.gemini.model,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const userPrompt = `You are updating the "${section}" section of the outing plan for "${plan.destination.name}".
Current plan data for ${section}: ${JSON.stringify((plan as any)[section])}
User instruction: ${prompt || 'Improve and refine this section with realistic recommendations'}
Return updated strictly valid JSON matching the structure of this section.`;

      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      return JSON.parse(text);
    } catch (err: any) {
      logger.error({ err }, `Gemini regenerate section ${section} failed`);
      throw new ApiError(500, 'GEMINI_REGENERATE_FAILED', `Failed to regenerate ${section}: ${err.message}`);
    }
  }

  async chatWithAssistant(
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    newMessage: string,
    context: { messages: NormalizedMessage[]; insights?: ExtractedInsights; plan?: OutingPlan }
  ): Promise<{ answer: string; citations: Array<{ messageId: string; sender: string; text: string }> }> {
    const citations: Array<{ messageId: string; sender: string; text: string }> = [];
    const queryLower = newMessage.toLowerCase();

    for (const msg of context.messages) {
      if (msg.messageType === 'system') continue;
      const textLower = msg.text.toLowerCase();
      const words = queryLower.split(/\s+/).filter(w => w.length > 3);
      const matchesWord = words.some(w => textLower.includes(w));
      if (matchesWord && citations.length < 5) {
        citations.push({
          messageId: msg.messageId,
          sender: msg.senderLabel,
          text: msg.text,
        });
      }
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: config.gemini.model,
        systemInstruction: ASSISTANT_SYSTEM_PROMPT,
      });

      const contextPrompt = `Context:
Plan: ${JSON.stringify(context.plan || {})}
Extracted Insights: ${JSON.stringify(context.insights || {})}
Relevant Source Chat Messages: ${JSON.stringify(citations)}

User question: ${newMessage}`;

      const chat = model.startChat({
        history: history.slice(-8).map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        })),
      });

      const result = await chat.sendMessage(contextPrompt);
      return {
        answer: result.response.text(),
        citations,
      };
    } catch (err: any) {
      logger.error({ err }, 'Gemini assistant chat error');
      throw new ApiError(500, 'GEMINI_ASSISTANT_FAILED', `Gemini assistant error: ${err.message}`);
    }
  }
}
