import { z } from 'zod';

export const FactStatusSchema = z.enum(['confirmed', 'proposed', 'inferred', 'conflicting', 'unknown']);

export const ExtractedFactSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    field: z.string(),
    category: z.string(),
    value: valueSchema,
    status: FactStatusSchema,
    confidence: z.number().min(0).max(1).optional(),
    evidenceMessageIds: z.array(z.string()).default([]),
    evidenceAttachmentIds: z.array(z.string()).optional().default([]),
    originalText: z.string().optional(),
  });

export const ExtractedInsightsSchema = z.object({
  outingIntent: z.string().default('trip'),
  summary: z.string(),
  destination: ExtractedFactSchema(z.string()).optional(),
  alternativeDestinations: ExtractedFactSchema(z.array(z.string())).optional(),
  date: ExtractedFactSchema(
    z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      durationDays: z.number().optional(),
      preferredDates: z.array(z.string()).optional(),
    })
  ).optional(),
  budget: ExtractedFactSchema(
    z.object({
      amount: z.number().optional(),
      currency: z.string().default('INR'),
      perPerson: z.boolean().default(true),
      breakdown: z.record(z.string(), z.number()).optional(),
    })
  ).optional(),
  transport: ExtractedFactSchema(
    z.object({
      mode: z.string().optional(),
      details: z.string().optional(),
    })
  ).optional(),
  participants: ExtractedFactSchema(
    z.object({
      interested: z.array(z.string()).default([]),
      confirmed: z.array(z.string()).default([]),
      declined: z.array(z.string()).default([]),
      totalEstimated: z.number().default(0),
    })
  ).optional(),
  activities: ExtractedFactSchema(
    z.array(
      z.object({
        name: z.string(),
        suggestedBy: z.string().optional(),
        status: FactStatusSchema,
      })
    )
  ).optional(),
  foodPreferences: ExtractedFactSchema(
    z.object({
      dietary: z.array(z.string()).default([]),
      cuisinePreferences: z.array(z.string()).default([]),
      restaurantSuggestions: z.array(z.string()).default([]),
    })
  ).optional(),
  accommodation: ExtractedFactSchema(
    z.object({
      type: z.string().optional(),
      suggestions: z.array(z.string()).default([]),
    })
  ).optional(),
  openQuestions: z.array(
    z.object({
      question: z.string(),
      askedBy: z.string().optional(),
      evidenceMessageIds: z.array(z.string()).default([]),
      category: z.string().optional(),
    })
  ).default([]),
  conflicts: z.array(
    z.object({
      topic: z.string(),
      competingOptions: z.array(z.string()),
      evidenceMessageIds: z.array(z.string()).default([]),
      severity: z.enum(['low', 'medium', 'high']).default('medium'),
    })
  ).default([]),
  tasks: z.array(
    z.object({
      description: z.string(),
      assignedTo: z.string().optional(),
      status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
      evidenceMessageIds: z.array(z.string()).default([]),
    })
  ).default([]),
});

export type ExtractedInsightsValidated = z.infer<typeof ExtractedInsightsSchema>;
