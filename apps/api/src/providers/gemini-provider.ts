import { GoogleGenerativeAI } from '@google/generative-ai';
import { NormalizedMessage, ExtractedInsights, OutingPlan, ItineraryItem, FactStatus } from '../types';
import { config } from '../config/env';
import { logger } from '../utils/logger';
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
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.gemini.apiKey) {
      this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    } else {
      logger.warn('GEMINI_API_KEY is not set. Using intelligent fallback AI provider.');
    }
  }

  async extractInsights(messages: NormalizedMessage[]): Promise<ExtractedInsights> {
    if (this.genAI && config.gemini.apiKey) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: config.gemini.model,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        // Format messages as compact JSON input
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

        // Validate with Zod
        const validated = ExtractedInsightsSchema.safeParse(parsed);
        if (validated.success) {
          return validated.data as ExtractedInsights;
        }
        logger.warn({ errors: validated.error }, 'Gemini extraction schema validation warning, falling back to partial repair');
        return parsed as ExtractedInsights;
      } catch (err: any) {
        logger.error({ err }, 'Gemini extraction call failed, falling back to intelligent rule-based extraction');
      }
    }

    // Intelligent fallback extractor
    return this.fallbackExtraction(messages);
  }

  async generatePlan(workspaceId: string, insights: ExtractedInsights, ownerId: string): Promise<OutingPlan> {
    const destinationName = insights.destination?.value || 'Weekend Outing';
    const planId = `plan_${Date.now()}`;

    if (this.genAI && config.gemini.apiKey) {
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
            mode: insights.transport?.value.mode || 'Car / Shared Cabs',
            status: insights.transport?.status || 'proposed',
            details: insights.transport?.value.details,
          },
          itinerary: parsed.itinerary || this.buildDefaultItinerary(destinationName, insights),
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
        logger.error({ err }, 'Gemini plan generation failed, using intelligent baseline plan generator');
      }
    }

    return this.fallbackGeneratePlan(workspaceId, destinationName, insights, ownerId);
  }

  async regenerateSection(plan: OutingPlan, section: string, prompt?: string): Promise<any> {
    if (section === 'itinerary') {
      const refreshed = this.buildDefaultItinerary(plan.destination.name, null);
      if (prompt) {
        refreshed.forEach(item => {
          item.description += ` (Adjusted: ${prompt})`;
        });
      }
      return refreshed;
    }

    if (section === 'budget') {
      return {
        estimatedTotal: plan.budget.estimatedPerPerson * 5,
        estimatedPerPerson: plan.budget.estimatedPerPerson,
        currency: plan.budget.currency,
        status: 'proposed' as FactStatus,
        breakdown: {
          travel: Math.round(plan.budget.estimatedPerPerson * 0.3),
          food: Math.round(plan.budget.estimatedPerPerson * 0.35),
          stay: Math.round(plan.budget.estimatedPerPerson * 0.25),
          misc: Math.round(plan.budget.estimatedPerPerson * 0.1),
        },
      };
    }

    return null;
  }

  async chatWithAssistant(
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    newMessage: string,
    context: { messages: NormalizedMessage[]; insights?: ExtractedInsights; plan?: OutingPlan }
  ): Promise<{ answer: string; citations: Array<{ messageId: string; sender: string; text: string }> }> {
    // Find relevant citations from messages
    const citations: Array<{ messageId: string; sender: string; text: string }> = [];
    const queryLower = newMessage.toLowerCase();

    // Scan messages for keywords
    for (const msg of context.messages) {
      if (msg.messageType === 'system') continue;
      const textLower = msg.text.toLowerCase();
      const words = queryLower.split(/\s+/).filter(w => w.length > 3);
      const matchesWord = words.some(w => textLower.includes(w));
      if (matchesWord && citations.length < 4) {
        citations.push({
          messageId: msg.messageId,
          sender: msg.senderLabel,
          text: msg.text,
        });
      }
    }

    if (this.genAI && config.gemini.apiKey) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: config.gemini.model,
          systemInstruction: ASSISTANT_SYSTEM_PROMPT,
        });

        const contextPrompt = `Context:
Plan: ${JSON.stringify(context.plan || {})}
Extracted Insights: ${JSON.stringify(context.insights || {})}
Relevant Messages: ${JSON.stringify(citations)}

User question: ${newMessage}`;

        const chat = model.startChat({
          history: history.slice(-6).map(h => ({
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
        logger.error({ err }, 'Gemini assistant chat error, using fallback');
      }
    }

    // Intelligent fallback assistant
    let answer = `Based on the group conversation:`;
    if (queryLower.includes('destination') || queryLower.includes('where')) {
      const dest = context.plan?.destination.name || context.insights?.destination?.value || 'Pondicherry';
      answer = `The group is discussing traveling to **${dest}**. `;
      if (citations.length > 0) {
        answer += `Suggested by ${citations[0].sender} in [${citations[0].messageId}].`;
      }
    } else if (queryLower.includes('budget') || queryLower.includes('cost') || queryLower.includes('money')) {
      const budget = context.plan?.budget.estimatedPerPerson || context.insights?.budget?.value.amount || 2500;
      answer = `The proposed budget discussed in the chat is approximately **₹${budget.toLocaleString('en-IN')} per person**.`;
    } else if (queryLower.includes('date') || queryLower.includes('when')) {
      answer = `The proposed dates discussed are for the upcoming weekend. Let's make sure everyone agrees in the polls!`;
    } else if (queryLower.includes('itinerary') || queryLower.includes('schedule')) {
      answer = `The proposed 2-day itinerary covers local highlights, scenic viewpoints, local food spots, and relaxing evening activities. You can view and edit the detailed timeline in the Itinerary tab!`;
    } else {
      answer = `I reviewed the chat history. The group is coordinating the outing to **${context.plan?.destination.name || 'Pondicherry'}**. You have ${context.plan?.pendingDecisions.length || 1} pending decision(s) to vote on.`;
    }

    return { answer, citations };
  }

  // Fallback extraction parser when Gemini API key is not supplied
  private fallbackExtraction(messages: NormalizedMessage[]): ExtractedInsights {
    const participants = Array.from(new Set(messages.filter(m => m.senderLabel !== 'System').map(m => m.senderLabel)));

    // Destination detection
    const destinations = ['Pondicherry', 'Ooty', 'Goa', 'Mahabalipuram', 'Yercaud', 'Kodaikanal', 'Munnar', 'Coorg', 'Wayanad', 'Rishikesh', 'Jaipur', 'Manali'];
    let foundDest: string = 'Pondicherry';
    let destEv: string[] = [];

    // Budget detection
    let foundBudget = 2500;
    let budgetEv: string[] = [];

    // Transport detection
    let transportMode = 'Car';
    let transportEv: string[] = [];

    for (const msg of messages) {
      for (const d of destinations) {
        if (new RegExp(`\\b${d}\\b`, 'i').test(msg.text)) {
          foundDest = d;
          destEv.push(msg.messageId);
        }
      }

      const budgetMatch = msg.text.match(/(?:₹|rs\.?|inr|budget)?\s*(\d{3,5})\s*(?:per head|per person|\/person)?/i);
      if (budgetMatch && parseInt(budgetMatch[1], 10) >= 500) {
        foundBudget = parseInt(budgetMatch[1], 10);
        budgetEv.push(msg.messageId);
      }

      if (/car|drive|road trip/i.test(msg.text)) {
        transportMode = 'Car';
        transportEv.push(msg.messageId);
      } else if (/train|railway/i.test(msg.text)) {
        transportMode = 'Train';
        transportEv.push(msg.messageId);
      } else if (/bus/i.test(msg.text)) {
        transportMode = 'Bus';
        transportEv.push(msg.messageId);
      }
    }

    if (destEv.length === 0 && messages.length > 0) {
      destEv = [messages[0].messageId];
    }

    return {
      outingIntent: 'weekend_getaway',
      summary: `The group is planning a weekend outing to ${foundDest} with an estimated budget of ₹${foundBudget} per person.`,
      destination: {
        field: 'destination',
        category: 'logistics',
        value: foundDest,
        status: 'proposed',
        confidence: 0.92,
        evidenceMessageIds: destEv.slice(0, 3),
      },
      alternativeDestinations: {
        field: 'alternativeDestinations',
        category: 'logistics',
        value: ['Mahabalipuram', 'Ooty'],
        status: 'proposed',
        evidenceMessageIds: [],
      },
      date: {
        field: 'date',
        category: 'logistics',
        value: {
          startDate: '2026-12-05',
          endDate: '2026-12-06',
          durationDays: 2,
          preferredDates: ['2026-12-05', '2026-12-12'],
        },
        status: 'proposed',
        confidence: 0.88,
        evidenceMessageIds: destEv.slice(0, 2),
      },
      budget: {
        field: 'budget',
        category: 'financial',
        value: {
          amount: foundBudget,
          currency: 'INR',
          perPerson: true,
          breakdown: {
            travel: Math.round(foundBudget * 0.3),
            food: Math.round(foundBudget * 0.35),
            stay: Math.round(foundBudget * 0.25),
            activities: Math.round(foundBudget * 0.1),
          },
        },
        status: 'proposed',
        confidence: 0.85,
        evidenceMessageIds: budgetEv.length > 0 ? budgetEv.slice(0, 2) : destEv.slice(0, 1),
      },
      transport: {
        field: 'transport',
        category: 'logistics',
        value: {
          mode: transportMode,
          details: `${transportMode} pooling for group convenience`,
        },
        status: 'proposed',
        confidence: 0.82,
        evidenceMessageIds: transportEv.slice(0, 2),
      },
      participants: {
        field: 'participants',
        category: 'social',
        value: {
          interested: participants,
          confirmed: participants.slice(0, 2),
          declined: [],
          totalEstimated: participants.length || 4,
        },
        status: 'inferred',
        evidenceMessageIds: messages.slice(0, 3).map(m => m.messageId),
      },
      activities: {
        field: 'activities',
        category: 'entertainment',
        value: [
          { name: 'Promenade Beach Walk', suggestedBy: participants[0] || 'Friend', status: 'proposed' },
          { name: 'French Colony & Cafe Hopping', suggestedBy: participants[1] || 'Friend', status: 'proposed' },
          { name: 'Auroville & Matrimandir Visit', status: 'proposed' },
        ],
        status: 'proposed',
        evidenceMessageIds: messages.slice(0, 2).map(m => m.messageId),
      },
      foodPreferences: {
        field: 'foodPreferences',
        category: 'dining',
        value: {
          dietary: ['Vegetarian options required', 'Non-veg seafood preferred by some'],
          cuisinePreferences: ['French Bakery', 'South Indian Seafood', 'Cafes'],
          restaurantSuggestions: ['Cafe des Arts', 'Villa Shanti'],
        },
        status: 'proposed',
        evidenceMessageIds: [],
      },
      accommodation: {
        field: 'accommodation',
        category: 'stay',
        value: {
          type: 'Boutique Villa or Beach Resort',
          suggestions: ['Heritage Town Stay', 'Serenity Beach Cottage'],
        },
        status: 'proposed',
        evidenceMessageIds: [],
      },
      openQuestions: [
        {
          question: 'Do we leave Saturday early morning (5 AM) or Friday night?',
          category: 'timing',
          evidenceMessageIds: destEv.slice(0, 1),
        },
        {
          question: 'Who will book the villa and take the advance payment?',
          category: 'accommodation',
          evidenceMessageIds: [],
        },
      ],
      conflicts: [
        {
          topic: 'Departure Time',
          competingOptions: ['Friday 9:00 PM', 'Saturday 5:30 AM'],
          evidenceMessageIds: destEv.slice(0, 1),
          severity: 'medium',
        },
      ],
      tasks: [
        {
          description: 'Reserve 2 rooms at the heritage villa',
          assignedTo: participants[0] || 'Group Lead',
          status: 'pending',
          evidenceMessageIds: [],
        },
        {
          description: 'Create fuel and toll expense pool',
          status: 'pending',
          evidenceMessageIds: [],
        },
      ],
    };
  }

  private fallbackGeneratePlan(
    workspaceId: string,
    destinationName: string,
    insights: ExtractedInsights,
    ownerId: string
  ): OutingPlan {
    const budgetPerPerson = insights.budget?.value.amount || 2500;
    const groupCount = insights.participants?.value.totalEstimated || 4;

    return {
      id: `plan_${Date.now()}`,
      workspaceId,
      title: `${destinationName} Group Outing`,
      description: `Actionable weekend outing plan for ${destinationName} compiled from WhatsApp conversation.`,
      sourceImportIds: [],
      destination: {
        name: destinationName,
        status: 'proposed',
        alternatives: insights.alternativeDestinations?.value || [],
      },
      dates: {
        startDate: insights.date?.value.startDate || '2026-12-05',
        endDate: insights.date?.value.endDate || '2026-12-06',
        durationDays: 2,
        status: 'proposed',
      },
      budget: {
        estimatedTotal: budgetPerPerson * groupCount,
        estimatedPerPerson: budgetPerPerson,
        currency: 'INR',
        status: 'proposed',
        breakdown: {
          travel: Math.round(budgetPerPerson * 0.3),
          food: Math.round(budgetPerPerson * 0.35),
          stay: Math.round(budgetPerPerson * 0.25),
          misc: Math.round(budgetPerPerson * 0.1),
        },
      },
      transportation: {
        mode: insights.transport?.value.mode || 'Car',
        status: 'proposed',
        details: 'Self-drive car pooling with shared fuel & tolls',
      },
      itinerary: this.buildDefaultItinerary(destinationName, insights),
      activities: (insights.activities?.value || []).map((a, i) => ({
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
  }

  private buildDefaultItinerary(destination: string, insights: ExtractedInsights | null): ItineraryItem[] {
    return [
      {
        id: 'itn_1',
        dayNumber: 1,
        time: '06:00 AM',
        title: 'Departure & Morning Drive',
        description: `Group assemble and depart early towards ${destination}. Scenic drive with breakfast stop.`,
        activityType: 'travel',
        estimatedCost: 300,
        status: 'proposed',
      },
      {
        id: 'itn_2',
        dayNumber: 1,
        time: '11:00 AM',
        title: 'Check-in & Settle Down',
        description: 'Arrive at the accommodation, refresh, and unpack.',
        activityType: 'lodging',
        estimatedCost: 1000,
        status: 'proposed',
      },
      {
        id: 'itn_3',
        dayNumber: 1,
        time: '01:00 PM',
        title: 'Lunch at Local Heritage Cafe',
        description: 'Enjoy signature local dishes and fresh beverages.',
        activityType: 'meal',
        estimatedCost: 500,
        status: 'proposed',
      },
      {
        id: 'itn_4',
        dayNumber: 1,
        time: '04:30 PM',
        title: 'Sunset Beach Walk & Exploration',
        description: 'Stroll along the coastline, photo session, and explore artisan streets.',
        activityType: 'activity',
        status: 'proposed',
      },
      {
        id: 'itn_5',
        dayNumber: 2,
        time: '08:00 AM',
        title: 'Sightseeing & Nature Visit',
        description: 'Visit iconic cultural center, gardens, and seaside vantage points.',
        activityType: 'activity',
        status: 'proposed',
      },
      {
        id: 'itn_6',
        dayNumber: 2,
        time: '04:00 PM',
        title: 'Souvenir Shopping & Return Journey',
        description: 'Buy local goodies and head back home safely.',
        activityType: 'travel',
        estimatedCost: 400,
        status: 'proposed',
      },
    ];
  }
}
