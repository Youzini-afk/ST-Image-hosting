// ============================================================
// AI 调用模块 — 与 AI 交互，生成抽象组件树
// ============================================================

import { WidgetConfigSchema, type ApiConfig, type PresetEntrySnapshot, type UIBlock, type WidgetConfig } from './schema';
import { parseString } from '@util/common';

/**
 * 构建 system prompt
 */
export function buildSystemPrompt(presetEntries: PresetEntrySnapshot[], _presetParams: Record<string, number>): string {
  const entriesJson = JSON.stringify(
    presetEntries.map(e => ({
      id: e.id,
      name: e.name,
      enabled: e.enabled,
      role: e.role,
      position: e.position_type,
    })),
    null,
    2,
  );

  return dedent(`
    你是预设 UI 控制台架构师。根据预设条目列表，生成一个精美控制面板的 JSON 配置。

    # 条目列表

    \`\`\`json
    ${entriesJson}
    \`\`\`

    # 组件规格

    UIBlock = { id, type, content?, label?, layout?, appearance?, action?, children? }

    | 属性 | 值 |
    |------|-----|
    | type | container / card / text / toggle / divider |
    | layout.direction | column (禁止 row) |
    | layout.gap / padding | none / small / medium |
    | layout.width | full (固定) |
    | appearance.theme | glass / solid / transparent |
    | appearance.typography | h2 / body / caption |
    | appearance.corner | rounded |
    | action | { type: "toggle_preset_entry", entry_id: "<id>" } |

    输出: \`{ title: string, root: UIBlock }\`

    # 预设结构深度认知

    ## 条目分类

    预设条目分两类，处理方式不同：

    **A. 分区边界标记 → 转化为 card 标题（不生成 toggle）**
    常见格式：
    - \\`——🎥视角开始——\\` / \\`——🎥视角结束——\\`
    - \\`--------文风----\\` / \\`--------/文风-------\\`
    - \\`🌅文风开始（只开一个）\\` / \\`🌅文风结束\\`
    - \\`⭐[功能区]开始\\` / \\`⭐[功能区]结束\\`
    - \\`💡可选功能开始\\` / \\`💡可选功能结束\\`
    识别规则：名称含「开始/结束」且被边界符(\\`——\\`、\\`----\\`、\\`⭐\\`)包围

    **B. 其他所有条目 → 生成 toggle**
    包括系统条目、作者声明、功能条目等，全部生成 toggle，不做过滤。

    ## 12种功能区（按关键词识别）

    | 功能区 | 关键词 |
    |--------|--------|
    | 基础设定 | 破限、变量初始化、主提示、系统设定、道德 |
    | 角色/User | 防媚user、防支配、用户设定、读者角色、角色自主 |
    | 视角/人称 | 第一/二/三人称、char视角、user视角、上帝视角、内心话 |
    | 文风/写作 | 文风-xxx、写作指导、去八股、对白量、散文化 |
    | 思维链/CoT | 思维链、思考ing、think、CoT |
    | 对话控制 | 抢话、防抢话、转述、防转述、衔接 |
    | 剧情控制 | 推进剧情、慢推、日常/情感/色色剧情、平行 |
    | 防护/修正 | 防全知、防神化、防绝望、防机器人、防重复、防截断 |
    | NSFW | NSFW、涩涩、色情、性爱、词汇直接化 |
    | 输出格式 | 字数、输出语言、双语输出、状态栏、格式 |
    | 摘要/总结 | 大总结、小总结、摘要、前情提要 |
    | 附加功能 | 吐槽、剧情选项、平行世界、图片、小巧思 |

    ## Card 分组三级策略（按优先级）

    1️⃣ **作者显式边界** — \\`——xxx开始——\\`/\\`——xxx结束——\\` 之间的条目归为一个 card，标题取边界标记中的功能名
    2️⃣ **Emoji 前缀聚类** — 连续相同 emoji 前缀的条目归为一个 card（如连续的 📝、🎥、💬）
    3️⃣ **语义邻近聚类** — 无标记时按关键词匹配上表，相邻且同类的条目归为一个 card

    ## 互斥组识别

    名称中含 \\`(N选1)\\` \\`(二选一)\\` \\`(三选一)\\` \\`(只开一个)\\` 的条目属于互斥组。
    ⚠️ 同一预设中可能存在**多个不同功能的互斥组**（如文风4选1、节奏3选1、人称3选1），必须按**功能类型**区分：
    - 先看名称中的功能关键词（文风、节奏、人称、思维链等）
    - 功能相同的互斥条目归入同一 card
    - 功能不同的互斥条目分别归入各自功能区的 card
    - 例：\\`✔️文风-金庸(4选1)\\` 和 \\`✔️文风-古龙(4选1)\\` 归入同一「文风」card；\\`✨HBO节奏(3选1)\\` 归入「节奏」card

    # 思考指引

    在输出 JSON 前，在 \\`<think>\\` 中完成：
    1. 扫描条目，标记边界标记
    2. 用三级策略划分 card，注意互斥组按功能类型分开
    3. 检查无遗漏

    # 规则

    1. 保持条目原始顺序，禁止重排
    2. 结构 2 层：root(container) → card → [text/toggle/divider]
    3. toggle.label = 条目完整名称（不得修改）
    4. 每个 card 以 h2 text 作标题
    5. 只生成 toggle 控件（禁止 slider/button）
    6. 边界标记条目转为 card 标题，不生成 toggle
    7. 所有非边界条目必须包含，不允许遗漏
    8. 输出纯 JSON（可包裹在 \\`\\`\\`json 内），思考放 <think> 中
  `);
}

/**
 * 从 AI 回复中提取 JSON (自动剥离 <think> 思考块)
 */
function extractJson(text: string): string {
  // 剥离 <think>...</think> 思考块
  const stripped = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  const fenceMatch = stripped.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return stripped.slice(firstBrace, lastBrace + 1);
  }

  return stripped;
}

/**
 * 后处理：修正 AI 返回的不合理布局值
 */
function sanitizeBlock(block: UIBlock, isRoot = false, depth = 0): UIBlock {
  const b = { ...block };

  // 用户手动编辑过的区块，跳过强制布局修正，仅递归处理子节点
  if (b._userEdited && !isRoot) {
    if (b.children) {
      const flatChildren: UIBlock[] = [];
      for (const child of b.children) {
        if (depth >= 2 && !child._userEdited && (child.type === 'container' || child.type === 'card')) {
          if (child.children) {
            flatChildren.push(...child.children.map(gc => sanitizeBlock(gc, false, depth + 1)));
          }
        } else {
          flatChildren.push(sanitizeBlock(child, false, depth + 1));
        }
      }
      b.children = flatChildren;
    }
    return b;
  }

  // card 和 container 强制 width: 'full' + direction: 'column'
  if (b.type === 'card' || b.type === 'container') {
    if (!b.layout) b.layout = {};
    // 强制 column 布局，禁止 row（悬浮窗口窄小时 row 会溢出）
    if (b.layout.direction === 'row') {
      b.layout.direction = 'column';
    }
    // 'hug' 和 'auto' 会导致内容过窄，强制改为 'full'
    if (!b.layout.width || b.layout.width === 'hug' || b.layout.width === 'auto') {
      b.layout.width = 'full';
    }
    // card 至少要有 padding
    if (b.type === 'card' && !b.layout.padding) {
      b.layout.padding = 'medium';
    }
  }

  // root 节点强制 column + full
  if (isRoot) {
    if (!b.layout) b.layout = {};
    b.layout.direction = 'column';
    b.layout.width = 'full';
    if (!b.layout.padding) b.layout.padding = 'medium';
    if (!b.layout.gap) b.layout.gap = 'medium';
  }

  // 递归处理子节点，同时拍扁过深嵌套
  if (b.children) {
    const flatChildren: UIBlock[] = [];
    for (const child of b.children) {
      // 如果深度 ≥ 2 且子节点是 container/card，把它的 children 提升上来（拍扁）
      if (depth >= 2 && (child.type === 'container' || child.type === 'card')) {
        if (child.children) {
          flatChildren.push(...child.children.map(gc => sanitizeBlock(gc, false, depth + 1)));
        }
      } else {
        flatChildren.push(sanitizeBlock(child, false, depth + 1));
      }
    }
    b.children = flatChildren;
  }

  return b;
}

function sanitizeWidgetConfig(config: WidgetConfig): WidgetConfig {
  return {
    ...config,
    root: sanitizeBlock(config.root, true),
  };
}


export async function callAI(
  userMessage: string,
  presetEntries: PresetEntrySnapshot[],
  presetParams: Record<string, number>,
  apiConfig: ApiConfig,
  customSystemPrompt?: string,
  currentConfig?: WidgetConfig | null,
  onStream?: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<WidgetConfig> {
  const systemPrompt = customSystemPrompt?.trim() || buildSystemPrompt(presetEntries, presetParams);

  console.info('[预设控制] system prompt 长度:', systemPrompt.length, '字符');
  console.info('[预设控制] API 模式:', apiConfig.mode, apiConfig.mode === 'custom' ? apiConfig.custom_url : '(使用酒馆API)');

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // 注入当前面板配置作为上下文
  if (currentConfig) {
    messages.push({
      role: 'assistant',
      content: `当前面板配置：\n\`\`\`json\n${JSON.stringify(currentConfig)}\n\`\`\``,
    });
  }

  messages.push({ role: 'user', content: userMessage });

  // === 解析可用 API 源 ===
  const parentWin = (() => {
    try {
      return (window.parent && window.parent !== window) ? window.parent : window;
    } catch { return window; }
  })();

  const stApi = (typeof SillyTavern !== 'undefined' ? SillyTavern : (parentWin as any).SillyTavern) as typeof SillyTavern | undefined;
  const thApi = (typeof TavernHelper !== 'undefined' ? TavernHelper : (parentWin as any).TavernHelper) as typeof TavernHelper | undefined;
  const fetchFn = parentWin.fetch.bind(parentWin);

  console.info('[预设控制] API 源检测:', {
    SillyTavern: !!stApi?.getRequestHeaders,
    TavernHelper: !!thApi?.generateRaw,
    generateRaw: typeof generateRaw === 'function',
    mode: apiConfig.mode,
    stream: apiConfig.gen_stream,
  });

  let rawResponse: string;

  if (apiConfig.mode === 'custom' && apiConfig.custom_url) {
    // === 自定义 API ===
    const useStream = !!(apiConfig.gen_stream && onStream);

    if (useStream) {
      // === 流式：直接调用自定义 API（绕过 ST 代理，因为 ST 代理不转发 SSE） ===
      const baseUrl = apiConfig.custom_url.replace(/\/+$/, '');
      const streamUrl = `${baseUrl}/chat/completions`;

      const streamBody = {
        messages,
        model: (apiConfig.custom_model || '').replace(/^models\//, ''),
        max_tokens: apiConfig.gen_max_tokens || 64000,
        temperature: apiConfig.gen_temperature ?? 0.7,
        top_p: apiConfig.gen_top_p ?? 0.95,
        stream: true,
      };

      const streamHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiConfig.custom_key) {
        streamHeaders['Authorization'] = `Bearer ${apiConfig.custom_key}`;
      }

      console.info('[预设控制] 流式直接调用:', streamUrl);
      const response = await fetchFn(streamUrl, {
        method: 'POST',
        headers: streamHeaders,
        body: JSON.stringify(streamBody),
        signal,
      });

      if (!response.ok) {
        const errTxt = await response.text();
        throw new Error(`API 请求失败: ${response.status} ${errTxt}`);
      }

      // === SSE 流式读取 ===
      rawResponse = '';
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        if (signal?.aborted) { reader.cancel(); break; }
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              rawResponse += delta;
              onStream(delta);
            }
          } catch {
            // 非 JSON 行，忽略
          }
        }
      }
    } else {
      // === 非流式：通过 ST 代理 ===
      if (!stApi?.getRequestHeaders) {
        throw new Error('SillyTavern.getRequestHeaders 不可用');
      }

      const requestBody = {
        messages: messages,
        model: (apiConfig.custom_model || '').replace(/^models\//, ''),
        max_tokens: apiConfig.gen_max_tokens || 64000,
        temperature: apiConfig.gen_temperature ?? 0.7,
        top_p: apiConfig.gen_top_p ?? 0.95,
        stream: false,
        chat_completion_source: 'custom',
        group_names: [],
        include_reasoning: false,
        reasoning_effort: 'medium',
        enable_web_search: false,
        request_images: false,
        custom_prompt_post_processing: 'strict',
        reverse_proxy: apiConfig.custom_url,
        proxy_password: '',
        custom_url: apiConfig.custom_url,
        custom_include_headers: apiConfig.custom_key
          ? `Authorization: Bearer ${apiConfig.custom_key}`
          : '',
      };

      console.info('[预设控制] 非流式通过 ST 代理调用...');
      const response = await fetchFn('/api/backends/chat-completions/generate', {
        method: 'POST',
        headers: { ...stApi.getRequestHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal,
      });

      if (!response.ok) {
        const errTxt = await response.text();
        throw new Error(`API 请求失败: ${response.status} ${errTxt}`);
      }

      const data = await response.json();
      if (data?.choices?.[0]) {
        rawResponse = (data.choices[0].message?.content || '').trim();
      } else if (data?.content) {
        rawResponse = data.content.trim();
      } else {
        const errorMessage = data?.error?.message || JSON.stringify(data).slice(0, 500);
        throw new Error(`API 返回无效响应: ${errorMessage}`);
      }
    }
  } else {
    // === 酒馆主 API ===
    const genRawFn =
      (typeof thApi?.generateRaw === 'function' ? thApi.generateRaw : undefined) ||
      (typeof generateRaw === 'function' ? generateRaw : undefined);

    if (!genRawFn) {
      throw new Error('generateRaw 不可用 — 请确认已安装酒馆助手(TavernHelper)扩展');
    }

    console.info('[预设控制] 正在通过酒馆 API 调用 generateRaw...');
    const response = await genRawFn({
      ordered_prompts: messages,
      should_stream: apiConfig.gen_stream ?? true,
    });

    if (typeof response !== 'string') {
      throw new Error('主API调用未返回预期的文本响应');
    }
    rawResponse = response.trim();
  }

  console.info('[预设控制] AI 返回, 长度:', rawResponse?.length ?? 0);

  const jsonStr = extractJson(rawResponse);

  let parsed: unknown;
  try {
    parsed = parseString(jsonStr);
  } catch (err) {
    throw new Error(`AI 返回的内容无法解析为有效 JSON:\n${jsonStr}`);
  }

  const result = WidgetConfigSchema.safeParse(parsed);
  if (!result.success) {
    const errorInfo = z.prettifyError(result.error);
    throw new Error(`AI 返回的 JSON 不符合预期格式:\n${errorInfo}`);
  }

  // 后处理：自动修正 AI 返回的不合理布局值
  const sanitized = sanitizeWidgetConfig(result.data);
  console.info('[预设控制] 解析并修正成功:', sanitized);
  return sanitized;
}
