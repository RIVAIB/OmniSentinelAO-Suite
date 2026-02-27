import { z } from 'zod';

// ============================================
// ENUMS
// ============================================

export const AgentTypeEnum = z.enum(['orchestrator', 'specialist', 'utility']);
export const AgentStatusEnum = z.enum(['active', 'inactive', 'maintenance']);
export const MissionStatusEnum = z.enum(['proposed', 'running', 'paused', 'done', 'failed']);
export const TriggerTypeEnum = z.enum(['manual', 'scheduled', 'event']);
export const StepStatusEnum = z.enum(['pending', 'running', 'done', 'failed', 'skipped']);
export const ChannelTypeEnum = z.enum(['whatsapp', 'telegram', 'webchat', 'internal']);
export const ConversationStatusEnum = z.enum(['active', 'closed', 'escalated']);

// ============================================
// AGENT SCHEMAS
// ============================================

export const AgentConfigSchema = z.object({
  systemPrompt: z.string().optional(),
  model: z.string().default('claude-3-5-sonnet'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().default(4096),
  tools: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  type: AgentTypeEnum,
  status: AgentStatusEnum.default('inactive'),
  config: AgentConfigSchema.default(() => ({
    model: 'claude-3-5-sonnet',
    temperature: 0.7,
    maxTokens: 4096,
    tools: [],
  })),
});

export const UpdateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: AgentTypeEnum.optional(),
  status: AgentStatusEnum.optional(),
  config: AgentConfigSchema.partial().optional(),
});

export const AgentFiltersSchema = z.object({
  status: AgentStatusEnum.optional(),
  type: AgentTypeEnum.optional(),
});

// ============================================
// MISSION SCHEMAS
// ============================================

export const CreateMissionSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: MissionStatusEnum.default('proposed'),
  priority: z.number().int().min(1).max(10).default(5),
  trigger_type: TriggerTypeEnum.default('manual'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateMissionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: MissionStatusEnum.optional(),
  priority: z.number().int().min(1).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const MissionFiltersSchema = z.object({
  status: MissionStatusEnum.optional(),
  priority_min: z.coerce.number().int().min(1).max(10).optional(),
  priority_max: z.coerce.number().int().min(1).max(10).optional(),
});

// ============================================
// MISSION STEP SCHEMAS
// ============================================

export const CreateStepSchema = z.object({
  agent_id: z.string().uuid(),
  step_order: z.number().int().positive(),
  status: StepStatusEnum.default('pending'),
  input: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateStepSchema = z.object({
  status: StepStatusEnum.optional(),
  output: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional(),
});

// ============================================
// CONVERSATION SCHEMAS
// ============================================

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const CreateConversationSchema = z.object({
  channel: ChannelTypeEnum,
  contact_id: z.string().min(1),
  agent_id: z.string().uuid().optional(),
  status: ConversationStatusEnum.default('active'),
  messages: z.array(MessageSchema).default([]),
});

export const UpdateConversationSchema = z.object({
  status: ConversationStatusEnum.optional(),
  agent_id: z.string().uuid().optional(),
});

export const AddMessageSchema = z.object({
  message: MessageSchema,
});

// ============================================
// MEMORY SCHEMAS
// ============================================

export const CreateMemorySchema = z.object({
  agent_id: z.string().uuid(),
  contact_id: z.string().min(1),
  key: z.string().min(1).max(255),
  value: z.record(z.string(), z.unknown()),
  importance: z.number().int().min(1).max(10).default(5),
  expires_at: z.string().datetime().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type CreateAgent = z.infer<typeof CreateAgentSchema>;
export type UpdateAgent = z.infer<typeof UpdateAgentSchema>;
export type AgentFilters = z.infer<typeof AgentFiltersSchema>;

export type CreateMission = z.infer<typeof CreateMissionSchema>;
export type UpdateMission = z.infer<typeof UpdateMissionSchema>;
export type MissionFilters = z.infer<typeof MissionFiltersSchema>;

export type CreateStep = z.infer<typeof CreateStepSchema>;
export type UpdateStep = z.infer<typeof UpdateStepSchema>;

export type Message = z.infer<typeof MessageSchema>;
export type CreateConversation = z.infer<typeof CreateConversationSchema>;
export type UpdateConversation = z.infer<typeof UpdateConversationSchema>;

export type CreateMemory = z.infer<typeof CreateMemorySchema>;
