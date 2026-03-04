export const TextSliceRuleSchema = z
  .object({
    start: z.string().default(''),
    end: z.string().default(''),
  })
  .prefault({});

export const FlowRequestMessageSchema = z
  .object({
    role: z.enum(['system', 'assistant', 'user']),
    content: z.string().default(''),
    message_id: z.number(),
  })
  .prefault({ role: 'user', content: '', message_id: 0 });

export const FlowRequestSchema = z.object({
  version: z.literal('ew-flow/v1'),
  request_id: z.string().min(1),
  chat_id: z.string().min(1),
  message_id: z.number(),
  user_input: z.string().default(''),
  flow: z.object({
    id: z.string().min(1),
    name: z.string().default(''),
    priority: z.number().default(100),
    timeout_ms: z.number().int().positive().default(8000),
  }),
  context: z.object({
    messages: z.array(FlowRequestMessageSchema).default([]),
    turns: z.number().int().min(1).default(8),
    extract_rules: z.array(TextSliceRuleSchema).default([]),
    exclude_rules: z.array(TextSliceRuleSchema).default([]),
  }),
  worldbook: z.object({
    runtime_name: z.string().min(1),
    entries: z
      .array(
        z.object({
          name: z.string().min(1),
          enabled: z.boolean().default(true),
          content: z.string().default(''),
        }),
      )
      .default([]),
  }),
  mvu: z.object({
    message_id: z.number().default(-1),
    stat_data: z.record(z.string(), z.any()).default({}),
  }),
  serial_results: z.array(z.record(z.string(), z.any())).default([]),
});

export const WorldbookUpsertEntrySchema = z.object({
  name: z.string().min(1),
  content: z.string().default(''),
  enabled: z.boolean().default(true),
});

export const WorldbookDeleteEntrySchema = z.object({
  name: z.string().min(1),
});

export const WorldbookToggleEntrySchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean(),
});

export const ControllerVariableSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  default: z.any(),
});

export const ControllerRuleSchema = z.object({
  when: z.string().min(1),
  include_entries: z.array(z.string().min(1)).default([]),
});

export const ControllerModelSchema = z.object({
  template_id: z.literal('entry_selector_v1'),
  variables: z.array(ControllerVariableSchema).default([]),
  rules: z.array(ControllerRuleSchema).default([]),
  fallback_entries: z.array(z.string().min(1)).default([]),
});

export const FlowResponseSchema = z.object({
  version: z.literal('ew-flow/v1'),
  flow_id: z.string().min(1),
  status: z.literal('ok'),
  priority: z.number().default(100),
  reply_instruction: z.string().default(''),
  operations: z.object({
    worldbook: z
      .object({
        upsert_entries: z.array(WorldbookUpsertEntrySchema).default([]),
        delete_entries: z.array(WorldbookDeleteEntrySchema).default([]),
        toggle_entries: z.array(WorldbookToggleEntrySchema).default([]),
      })
      .default({ upsert_entries: [], delete_entries: [], toggle_entries: [] }),
    controller_model: ControllerModelSchema.optional(),
  }),
  diagnostics: z
    .object({
      trace_id: z.string().optional(),
    })
    .default({}),
});

export type TextSliceRule = z.infer<typeof TextSliceRuleSchema>;
export type FlowRequestV1 = z.infer<typeof FlowRequestSchema>;
export type FlowResponseV1 = z.infer<typeof FlowResponseSchema>;
export type ControllerModel = z.infer<typeof ControllerModelSchema>;
