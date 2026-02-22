<template>
  <div ref="rootRef" class="wb-assistant-root" :style="themeStyles">

    <!-- ═══ Mobile Tab View ═══ -->
    <template v-if="isMobile">
      <div class="mobile-tab-view">
        <div class="mobile-tab-content">

          <!-- Tab: 列表 -->
          <Transition name="mobile-tab">
            <div v-show="mobileTab === 'list'" class="mobile-pane">
              <section class="wb-toolbar">
                <label class="toolbar-label">
                <span>世界书</span>
                <div ref="worldbookPickerRef" class="worldbook-picker">
                  <button class="worldbook-picker-trigger" type="button" @click="toggleWorldbookPicker">
                    <span class="worldbook-picker-trigger-text" :title="selectedWorldbookName || '请选择世界书'">
                      {{ selectedWorldbookName || '请选择世界书' }}
                    </span>
                    <span class="worldbook-picker-arrow">▾</span>
                  </button>
                  <div v-if="worldbookPickerOpen" class="worldbook-picker-dropdown">
                    <input
                      v-model="worldbookPickerSearchText"
                      type="text"
                      class="text-input worldbook-picker-search"
                      placeholder="搜索世界书..."
                      @keydown.enter.prevent="filteredSelectableWorldbookNames[0] && selectWorldbookFromPicker(filteredSelectableWorldbookNames[0])"
                    />
                    <div class="worldbook-picker-list">
                      <button
                        v-for="name in filteredSelectableWorldbookNames"
                        :key="`wb-pick-m-${name}`"
                        class="worldbook-picker-item"
                        :class="{ active: name === selectedWorldbookName }"
                        type="button"
                        @click="selectWorldbookFromPicker(name)"
                      >{{ name }}</button>
                      <div v-if="!filteredSelectableWorldbookNames.length" class="empty-note">没有匹配的世界书</div>
                    </div>
                  </div>
                </div>
              </label>
              <div class="toolbar-btns" style="display:flex;gap:6px;flex-wrap:wrap;">
                <button class="btn" type="button" :class="{ 'glow-pulse': hasUnsavedChanges }" :disabled="!hasUnsavedChanges" @click="saveCurrentWorldbook" style="padding:8px 14px;font-size:13px;">💾 保存</button>
                <button class="btn" type="button" @click="addEntry" style="padding:8px 14px;font-size:13px;">+ 新条目</button>
                <button class="btn" type="button" @click="triggerImport" style="padding:8px 14px;font-size:13px;">📥 导入</button>
                <button class="btn" type="button" :disabled="!selectedWorldbookName" @click="exportCurrentWorldbook" style="padding:8px 14px;font-size:13px;">📤 导出</button>
                <button class="btn" type="button" @click="toggleGlobalMode" :style="{ padding:'8px 14px', fontSize:'13px', background: globalWorldbookMode ? '#2563eb' : '', color: globalWorldbookMode ? '#fff' : '' }">🌐 全局</button>
              </div>
            </section>
            <div class="wb-bindings" v-if="bindings.global.length || bindings.charPrimary || bindings.charAdditional.length || bindings.chat">
              <span v-for="name in bindings.global" :key="`bg-m-${name}`" class="binding-chip global" :title="name">{{ name }}</span>
              <span v-if="bindings.charPrimary" :key="`bc-m-${bindings.charPrimary}`" class="binding-chip char" :title="bindings.charPrimary">{{ bindings.charPrimary }}</span>
              <span v-for="name in bindings.charAdditional" :key="`bca-m-${name}`" class="binding-chip char" :title="name">{{ name }}</span>
              <span v-if="bindings.chat" :key="`bch-m-${bindings.chat}`" class="binding-chip chat" :title="bindings.chat">{{ bindings.chat }}</span>
            </div>
            <!-- Global Mode Panel (mobile) -->
            <div v-if="globalWorldbookMode" style="border:1px solid var(--wb-border-subtle);border-radius:8px;padding:10px;margin-bottom:8px;background:var(--wb-bg-card);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-weight:600;font-size:13px;">🌐 全局世界书（{{ bindings.global.length }}）</span>
                <button class="btn mini danger" type="button" :disabled="!bindings.global.length" @click="clearGlobalWorldbooks" style="font-size:11px;">清空</button>
              </div>
              <label class="field" style="margin-bottom:6px;">
                <span style="font-size:12px;">预设（切换即应用）</span>
                <select v-model="selectedGlobalPresetId" class="text-input" @change="onGlobalPresetSelectionChanged" style="font-size:12px;">
                  <option value="">默认预设（清空全局世界书）</option>
                  <option v-for="preset in globalWorldbookPresets" :key="preset.id" :value="preset.id">
                    {{ preset.name }}（{{ preset.worldbooks.length }}）
                  </option>
                </select>
              </label>
              <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
                <button class="btn mini" type="button" :disabled="!bindings.global.length" @click="saveCurrentAsGlobalPreset" style="font-size:11px;">保存组合</button>
                <button class="btn mini" type="button" :disabled="!selectedGlobalPreset" @click="overwriteSelectedGlobalPreset" style="font-size:11px;">覆盖预设</button>
                <button class="btn mini danger" type="button" :disabled="!selectedGlobalPreset" @click="deleteSelectedGlobalPreset" style="font-size:11px;">删除预设</button>
              </div>
              <label class="field" style="margin-bottom:6px;">
                <span style="font-size:12px;">搜索并添加</span>
                <input v-model="globalAddSearchText" type="text" class="text-input" placeholder="搜索世界书..." @keydown.enter.prevent="addFirstGlobalCandidate" style="font-size:12px;" />
              </label>
              <div v-if="globalAddCandidates.length" style="max-height:120px;overflow-y:auto;margin-bottom:6px;">
                <button v-for="name in globalAddCandidates" :key="`m-add-${name}`" type="button" style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:6px 8px;border:none;background:var(--wb-input-bg);border-radius:4px;color:var(--wb-text-main);font-size:12px;margin-bottom:2px;cursor:pointer;" @click="addGlobalWorldbook(name)">
                  <span>{{ name }}</span><span style="color:#22c55e;">+ 添加</span>
                </button>
              </div>
              <div v-if="filteredGlobalWorldbooks.length" style="font-size:12px;margin-bottom:4px;opacity:0.7;">已启用：</div>
              <div style="display:flex;flex-direction:column;gap:2px;margin-bottom:8px;">
                <button v-for="name in filteredGlobalWorldbooks" :key="`m-gl-${name}`" type="button" style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:6px 8px;border:none;background:var(--wb-input-bg);border-radius:4px;color:var(--wb-text-main);font-size:12px;cursor:pointer;" @click="removeGlobalWorldbook(name)">
                  <span>{{ name }}</span><span style="color:#ef4444;">移除</span>
                </button>
              </div>
              <!-- Role Binding Section -->
              <div style="border-top:1px solid var(--wb-border-subtle);padding-top:8px;margin-top:4px;">
                <div style="font-size:12px;font-weight:600;margin-bottom:6px;">角色绑定</div>
                <div style="font-size:11px;margin-bottom:6px;opacity:0.8;" :style="{ color: currentRoleContext ? '#60a5fa' : '#94a3b8' }">
                  {{ currentRoleContext ? `当前角色: ${currentRoleContext.name}` : '当前未进入角色聊天' }}
                </div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
                  <button class="btn mini" type="button" :disabled="!selectedGlobalPreset || !currentRoleContext" @click="bindCurrentRoleToSelectedPreset" style="font-size:11px;">绑定当前角色</button>
                  <button class="btn mini" type="button" :disabled="!selectedGlobalPreset || !isCurrentRoleBoundToSelectedPreset" @click="unbindCurrentRoleFromSelectedPreset" style="font-size:11px;">解绑当前角色</button>
                </div>
                <div style="margin-bottom:6px;">
                  <button type="button" :disabled="!selectedGlobalPreset" @click="toggleRolePicker" style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:6px 8px;border:1px solid var(--wb-border-subtle);border-radius:4px;background:var(--wb-input-bg);color:var(--wb-text-main);font-size:12px;cursor:pointer;">
                    <span>{{ selectedGlobalPreset ? '从角色卡列表选择绑定' : '请先选择预设' }}</span>
                    <span>{{ rolePickerOpen ? '▴' : '▾' }}</span>
                  </button>
                  <div v-if="rolePickerOpen" style="margin-top:4px;">
                    <input v-model="roleBindSearchText" type="text" class="text-input" placeholder="搜索角色名..." style="font-size:12px;margin-bottom:4px;" @keydown.enter.prevent="bindFirstRoleCandidate" />
                    <div style="max-height:120px;overflow-y:auto;">
                      <button v-for="candidate in roleBindingCandidates" :key="`m-role-${candidate.key}`" type="button" :disabled="candidate.bound" style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:6px 8px;border:none;background:var(--wb-input-bg);border-radius:4px;color:var(--wb-text-main);font-size:12px;margin-bottom:2px;cursor:pointer;opacity: 1;" :style="{ opacity: candidate.bound ? '0.5' : '1' }" @click="bindRoleCandidateToSelectedPreset(candidate)">
                        <span>{{ candidate.name }}</span><span :style="{ color: candidate.bound ? '#94a3b8' : '#22c55e' }">{{ candidate.bound ? '已绑定' : '绑定' }}</span>
                      </button>
                      <div v-if="!roleBindingCandidates.length" style="font-size:11px;opacity:0.5;padding:4px;">没有匹配角色</div>
                    </div>
                  </div>
                </div>
                <div v-if="selectedGlobalPreset" style="display:flex;flex-wrap:wrap;gap:4px;">
                  <button v-for="binding in selectedGlobalPresetRoleBindings" :key="`m-rb-${selectedGlobalPreset?.id}-${binding.key}`" type="button" style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border:1px solid var(--wb-border-subtle);border-radius:4px;background:var(--wb-input-bg);color:var(--wb-text-main);font-size:11px;cursor:pointer;" @click="removeRoleBindingFromSelectedPreset(binding.key)">
                    {{ binding.name }} <span style="color:#ef4444;">×</span>
                  </button>
                  <div v-if="!selectedGlobalPresetRoleBindings.length" style="font-size:11px;opacity:0.5;">当前预设尚未绑定角色</div>
                </div>
                <div v-else style="font-size:11px;opacity:0.5;">选择预设后可配置角色绑定</div>
              </div>
            </div>
            <div class="mobile-entry-list">
              <button
                v-for="entry in filteredEntries"
                :key="`me-${entry.uid}`"
                type="button"
                class="entry-item"
                :data-status="getEntryVisualStatus(entry)"
                :class="{ selected: entry.uid === selectedEntryUid, disabled: !entry.enabled }"
                @click="selectEntry(entry.uid)"
                style="border: 1px solid var(--wb-border-subtle); border-radius: 8px; padding: 8px 10px; margin-bottom: 4px;"
              >
                <div class="entry-item-head">
                  <span class="entry-status-dot" :data-status="getEntryVisualStatus(entry)"></span>
                  <div class="entry-item-title">{{ entry.name || `条目 ${entry.uid}` }}</div>
                  <span class="entry-chip uid">#{{ entry.uid }}</span>
                </div>
                <div class="entry-item-keys" v-if="entry.strategy.keys?.length">
                  {{ entry.strategy.keys.join(', ') }}
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;font-size:10px;opacity:0.8;">
                  <span style="background:var(--wb-input-bg);padding:2px 6px;border-radius:4px;">📍 {{ getPositionTypeLabel(entry.position.type) }}</span>
                  <span style="background:var(--wb-input-bg);padding:2px 6px;border-radius:4px;">⚖️ #{{ entry.position.order }}</span>
                  <span v-if="entry.recursion.prevent_incoming" style="background:var(--wb-input-bg);padding:2px 6px;border-radius:4px;color:#f59e0b;">🚫入</span>
                  <span v-if="entry.recursion.prevent_outgoing" style="background:var(--wb-input-bg);padding:2px 6px;border-radius:4px;color:#f59e0b;">🚫出</span>
                </div>
              </button>
              <div v-if="!filteredEntries.length" class="empty-note">暂无条目</div>
            </div>
          </Transition>

          <!-- Tab: 编辑 -->
          <Transition name="mobile-tab">
            <div v-show="mobileTab === 'edit'" class="mobile-pane">
              <template v-if="selectedEntry">
              <header class="editor-head">
                <label class="field editor-comment">
                  <span>备注 (COMMENT)</span>
                  <input v-model="selectedEntry.name" type="text" class="text-input" />
                </label>
                <div class="editor-badges">
                  <span class="editor-badge" :class="selectedEntry.enabled ? 'on' : 'off'">{{ selectedEntry.enabled ? 'EN' : 'OFF' }}</span>
                  <span class="editor-badge mono">#{{ selectedEntry.uid }}</span>
                  <span class="editor-badge mono">~{{ selectedTokenEstimate }}T</span>
                </div>
              </header>
              <section class="editor-grid two-cols editor-keyword-grid">
                <label class="field">
                  <span>主要关键词 (KEYS)</span>
                  <textarea v-model="selectedKeysText" class="text-area compact"></textarea>
                </label>
                <label class="field">
                  <span>次要关键词 (SECONDARY)</span>
                  <textarea v-model="selectedSecondaryKeysText" class="text-area compact"></textarea>
                </label>
              </section>
              <section class="editor-content-block" ref="editorContentBlockRef">
                <div v-if="isMobile" class="content-top-drag-handle" @pointerdown="startContentTopDrag">
                  <span class="content-top-drag-grip">━━━</span>
                </div>
                <div class="editor-content-title">世界观设定 / 内容 (CONTENT)</div>
                <textarea
                  ref="contentTextareaRef"
                  v-model="selectedEntry.content"
                  class="text-area large editor-content-area"
                  style="min-height: calc(100vh - 500px);"
                ></textarea>
                <div class="content-resize-handle" @pointerdown="startContentResize">
                  <span class="content-resize-grip">━━━</span>
                </div>
              </section>
            </template>
            <div v-else class="empty-block">请在列表中选择一个条目</div>
          </div>
          </Transition>

          <!-- Tab: 设置 -->
          <Transition name="mobile-tab">
          <div v-show="mobileTab === 'settings'" class="mobile-pane">
            <template v-if="selectedEntry">
              <article class="editor-card">
                <h4>触发策略 (STRATEGY)</h4>
                <label class="field checkbox-inline">
                  <input v-model="selectedEntry.enabled" type="checkbox" />
                  <span>启用条目</span>
                </label>
                <div class="strategy-switch">
                  <button type="button" class="strategy-pill constant" :class="{ active: selectedEntry.strategy.type === 'constant' }" @click="selectedEntry.strategy.type = 'constant'">🔵 常驻</button>
                  <button type="button" class="strategy-pill vector" :class="{ active: selectedEntry.strategy.type === 'vectorized' }" @click="selectedEntry.strategy.type = 'vectorized'">📎 向量化</button>
                  <button type="button" class="strategy-pill selective" :class="{ active: selectedEntry.strategy.type === 'selective' }" @click="selectedEntry.strategy.type = 'selective'">🟢 关键词</button>
                </div>
                <details class="editor-advanced">
                  <summary>高级策略设置</summary>
                  <label class="field">
                    <span>次要逻辑 (LOGIC)</span>
                    <select v-model="selectedEntry.strategy.keys_secondary.logic" class="text-input">
                      <option v-for="item in secondaryLogicOptions" :key="`ml-${item}`" :value="item">{{ getSecondaryLogicLabel(item) }}</option>
                    </select>
                  </label>
                  <label class="field">
                    <span>扫描深度</span>
                    <input v-model="selectedScanDepthText" type="text" class="text-input" placeholder="留空或 same_as_global" />
                  </label>
                  <label class="field">
                    <span>概率(0-100)</span>
                    <input v-model.number="selectedEntry.probability" type="number" class="text-input" min="0" max="100" step="1" />
                  </label>
                </details>
              </article>
              <article class="editor-card">
                <h4>插入设置 (INSERTION)</h4>
                <label class="field">
                  <span>位置 (Position)</span>
                  <select v-model="selectedEntry.position.type" class="text-input" @change="handleSelectedPositionTypeChanged">
                    <option v-for="item in positionTypeOptions" :key="`mp-${item}`" :value="item">{{ getPositionTypeLabel(item) }}</option>
                  </select>
                </label>
                <label class="field">
                  <span>权重 (Order)</span>
                  <input v-model.number="selectedEntry.position.order" type="number" class="text-input" step="1" />
                </label>
                <div class="editor-grid two-cols">
                  <label class="field" :class="{ disabled: selectedEntry.position.type !== 'at_depth' }">
                    <span>at_depth role</span>
                    <select v-model="selectedEntry.position.role" class="text-input" :disabled="selectedEntry.position.type !== 'at_depth'">
                      <option value="system">system</option>
                      <option value="assistant">assistant</option>
                      <option value="user">user</option>
                    </select>
                  </label>
                  <label class="field" :class="{ disabled: selectedEntry.position.type !== 'at_depth' }">
                    <span>at_depth depth</span>
                    <input v-model.number="selectedEntry.position.depth" type="number" class="text-input" min="1" step="1" :disabled="selectedEntry.position.type !== 'at_depth'" />
                  </label>
                </div>
              </article>
              <article class="editor-card">
                <h4>递归与效果 (RECURSION)</h4>
                <label class="field checkbox-inline">
                  <input v-model="selectedEntry.recursion.prevent_incoming" type="checkbox" />
                  <span>不可递归命中</span>
                </label>
                <label class="field checkbox-inline">
                  <input v-model="selectedEntry.recursion.prevent_outgoing" type="checkbox" />
                  <span>阻止后续递归</span>
                </label>
              </article>
              <details class="editor-advanced">
                <summary>高级字段 / extra JSON</summary>
                <label class="field">
                  <span>extra JSON（未知字段）</span>
                  <textarea v-model="selectedExtraText" class="text-area compact" placeholder="{ ... }"></textarea>
                </label>
                <div class="field-actions">
                  <button class="btn" type="button" @click="applyExtraJson">应用 extra</button>
                  <button class="btn" type="button" @click="clearExtra">清空 extra</button>
                </div>
              </details>
              <div class="mobile-danger-zone">
                <button class="btn danger" type="button" @click="removeSelectedEntry">🗑 删除此条目</button>
                <button class="btn" type="button" @click="duplicateSelectedEntry">📋 复制条目</button>
              </div>
            </template>
            <div v-else class="empty-block">请在列表中选择一个条目</div>
          </div>
          </Transition>

          <!-- Tab: AI -->
          <Transition name="mobile-tab">
          <div v-show="mobileTab === 'ai'" class="mobile-pane">
            <section class="ai-generator-panel mobile-ai-panel">
              <div class="ai-chat-area">
                <div v-if="!aiActiveSession" class="ai-chat-empty">
                  <div class="ai-chat-empty-icon">🤖</div>
                  <div class="ai-chat-empty-text">新建一个对话开始生成</div>
                  <button class="btn" type="button" @click="aiCreateSession">+ 新建对话</button>
                </div>
                <template v-else>
                  <div class="ai-chat-messages" ref="aiChatMessagesRef">
                    <div v-for="(msg, idx) in aiActiveMessages" :key="`mmsg-${idx}`" class="ai-chat-bubble" :class="msg.role">
                      <div class="ai-chat-bubble-role">{{ msg.role === 'user' ? '👤 你' : '🤖 AI' }}</div>
                      <div class="ai-chat-bubble-content">{{ msg.content }}</div>
                    </div>
                    <div v-if="aiIsGenerating && aiStreamingText" class="ai-chat-bubble assistant streaming">
                      <div class="ai-chat-bubble-role">🤖 AI</div>
                      <div class="ai-chat-bubble-content">{{ aiStreamingText }}<span class="ai-cursor">▌</span></div>
                    </div>
                    <div v-if="aiIsGenerating && !aiStreamingText" class="ai-chat-bubble assistant streaming">
                      <div class="ai-chat-bubble-role">🤖 AI</div>
                      <div class="ai-chat-bubble-content"><span class="ai-thinking">思考中...</span></div>
                    </div>
                  </div>
                  <div class="ai-chat-input-bar">
                    <label class="ai-context-toggle" title="开启后，AI 将能看到酒馆的预设、世界书和正则上下文">
                      <input v-model="aiUseContext" type="checkbox" />
                      <span>{{ aiUseContext ? '📖 附带上下文' : '🔒 纯净模式' }}</span>
                    </label>
                    <textarea v-model="aiChatInputText" class="text-input ai-chat-input" placeholder="输入提示词..." rows="2" :disabled="aiIsGenerating" @keydown.enter.exact.prevent="aiSendMessage"></textarea>
                    <button v-if="!aiIsGenerating" class="btn ai-send-btn" type="button" :disabled="!aiChatInputText.trim()" @click="aiSendMessage">发送</button>
                    <button v-else class="btn danger ai-stop-btn" type="button" @click="aiStopGeneration">停止</button>
                  </div>
                </template>
              </div>
            </section>
          </div>
          </Transition>

        </div>
      </div>
      <!-- Tab Bar: bottom, direct child of wb-assistant-root via fragment -->
      <div style="display:flex !important;flex-shrink:0;height:52px;background:#1e293b;border-top:1px solid #334155;z-index:99999;">
        <button @click="mobileTab = 'list'" :style="{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',border:'none',borderTop: mobileTab==='list' ? '2px solid #60a5fa' : '2px solid transparent',background:'transparent',color: mobileTab==='list' ? '#e2e8f0' : '#94a3b8',fontSize:'10px',padding:'4px 0',gap:'2px' }">
          <span style="font-size:20px;">📋</span><span>列表</span>
        </button>
        <button @click="mobileTab = 'edit'" :style="{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',border:'none',borderTop: mobileTab==='edit' ? '2px solid #60a5fa' : '2px solid transparent',background:'transparent',color: mobileTab==='edit' ? '#e2e8f0' : '#94a3b8',fontSize:'10px',padding:'4px 0',gap:'2px' }">
          <span style="font-size:20px;">✏️</span><span>编辑</span>
        </button>
        <button @click="mobileTab = 'settings'" :style="{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',border:'none',borderTop: mobileTab==='settings' ? '2px solid #60a5fa' : '2px solid transparent',background:'transparent',color: mobileTab==='settings' ? '#e2e8f0' : '#94a3b8',fontSize:'10px',padding:'4px 0',gap:'2px' }">
          <span style="font-size:20px;">⚙️</span><span>设置</span>
        </button>
        <button @click="mobileTab = 'ai'" :style="{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',border:'none',borderTop: mobileTab==='ai' ? '2px solid #60a5fa' : '2px solid transparent',background:'transparent',color: mobileTab==='ai' ? '#e2e8f0' : '#94a3b8',fontSize:'10px',padding:'4px 0',gap:'2px' }">
          <span style="font-size:20px;">🤖</span><span>AI</span>
        </button>
      </div>
    </template>

    <!-- ═══ Desktop Layout ═══ -->
    <template v-if="!isMobile">
    <section class="wb-toolbar">
            <label class="toolbar-label">
              <span>世界书</span>
              <div ref="worldbookPickerRef" class="worldbook-picker">
                <button class="worldbook-picker-trigger" type="button" @click="toggleWorldbookPicker">
                  <span class="worldbook-picker-trigger-text" :title="selectedWorldbookName || '请选择世界书'">
                    {{ selectedWorldbookName || '请选择世界书' }}
                  </span>
                  <span class="worldbook-picker-trigger-arrow">{{ worldbookPickerOpen ? '▴' : '▾' }}</span>
                </button>
                <div v-if="worldbookPickerOpen" class="worldbook-picker-dropdown">
                  <input
                    ref="worldbookPickerSearchInputRef"
                    v-model="worldbookPickerSearchText"
                    type="text"
                    class="text-input worldbook-picker-search"
                    placeholder="搜索世界书..."
                    @keydown.enter.prevent="filteredSelectableWorldbookNames[0] && selectWorldbookFromPicker(filteredSelectableWorldbookNames[0])"
                  />
                  <div class="worldbook-picker-list">
                    <button
                      v-for="name in filteredSelectableWorldbookNames"
                      :key="`worldbook-${name}`"
                      class="worldbook-picker-item"
                      :class="{ active: name === selectedWorldbookName }"
                      type="button"
                      @click="selectWorldbookFromPicker(name)"
                    >
                      {{ name }}
                    </button>
                    <div v-if="!filteredSelectableWorldbookNames.length" class="empty-note">没有匹配的世界书</div>
                  </div>
                </div>
              </div>
            </label>
            <button class="btn" type="button" @click="createNewWorldbook">新建</button>
            <button class="btn" type="button" :disabled="!selectedWorldbookName" @click="duplicateWorldbook">
              另存为
            </button>
            <button class="btn danger" type="button" :disabled="!selectedWorldbookName" @click="deleteCurrentWorldbook">
              删除
            </button>
            <button class="btn" type="button" :disabled="!selectedWorldbookName" @click="exportCurrentWorldbook">
              导出
            </button>
            <button class="btn" type="button" @click="triggerImport">导入</button>
            <input
              ref="importFileInput"
              class="hidden-input"
              type="file"
              accept=".json,application/json"
              @change="onImportChange"
            />
          </section>

          <div class="wb-scroll-area">
          <section class="wb-bindings">
            <div class="wb-history-shortcuts">
              <button
                class="btn history-btn utility-btn"
                type="button"
                :class="{ active: globalWorldbookMode }"
                @click="toggleGlobalMode"
              >
                🌐 全局模式
              </button>
              <button class="btn history-btn" type="button" :disabled="!selectedEntry" @click="openEntryHistoryModal">
                🕰️ 条目时光机
              </button>
              <button
                class="btn history-btn"
                type="button"
                :disabled="!selectedWorldbookName"
                @click="openWorldbookHistoryModal"
              >
                ⏪ 整本时光机
              </button>
              <button
                class="btn history-btn utility-btn"
                type="button"
                :class="{ active: floatingPanels.find.visible }"
                :disabled="!draftEntries.length"
                @click="toggleFloatingPanel('find')"
              >
                🔎 查找与替换
              </button>
              <button
                class="btn history-btn utility-btn"
                type="button"
                :class="{ active: floatingPanels.activation.visible }"
                @click="toggleFloatingPanel('activation')"
              >
                📡 激活监控
              </button>
              <button
                class="btn history-btn utility-btn"
                type="button"
                :class="{ active: aiGeneratorMode }"
                @click="aiToggleMode"
              >
                🤖 AI 生成
              </button>
            </div>
            <div v-if="globalWorldbookMode" class="global-mode-panel">
              <div class="global-mode-head">
                <span class="global-mode-title">全局世界书（{{ bindings.global.length }}）</span>
                <button class="btn mini danger" type="button" :disabled="!bindings.global.length" @click="clearGlobalWorldbooks">
                  清空全局
                </button>
              </div>
              <div class="global-preset-panel">
                <label class="field">
                  <span>世界书预设（切换即应用）</span>
                  <select v-model="selectedGlobalPresetId" class="text-input" @change="onGlobalPresetSelectionChanged">
                    <option value="">默认预设（清空全局世界书）</option>
                    <option v-for="preset in globalWorldbookPresets" :key="preset.id" :value="preset.id">
                      {{ preset.name }}（{{ preset.worldbooks.length }}）
                    </option>
                  </select>
                </label>
                <div class="global-mode-actions">
                  <button class="btn" type="button" :disabled="!bindings.global.length" @click="saveCurrentAsGlobalPreset">
                    保存当前组合
                  </button>
                  <button class="btn" type="button" :disabled="!selectedGlobalPreset" @click="overwriteSelectedGlobalPreset">
                    覆盖当前预设
                  </button>
                  <button class="btn danger" type="button" :disabled="!selectedGlobalPreset" @click="deleteSelectedGlobalPreset">
                    删除预设
                  </button>
                </div>
                <div class="preset-role-panel">
                  <div class="preset-role-head">
                    <span>角色绑定（一个预设可绑定多个角色）</span>
                    <span class="preset-role-current" :class="{ empty: !currentRoleContext }">
                      {{ currentRoleContext ? `当前角色: ${currentRoleContext.name}` : '当前未进入角色聊天' }}
                    </span>
                  </div>
                  <div class="preset-role-actions">
                    <button
                      class="btn mini"
                      type="button"
                      :disabled="!selectedGlobalPreset || !currentRoleContext"
                      @click="bindCurrentRoleToSelectedPreset"
                    >
                      绑定当前角色
                    </button>
                    <button
                      class="btn mini"
                      type="button"
                      :disabled="!selectedGlobalPreset || !isCurrentRoleBoundToSelectedPreset"
                      @click="unbindCurrentRoleFromSelectedPreset"
                    >
                      解绑当前角色
                    </button>
                  </div>
                  <div ref="rolePickerRef" class="role-picker">
                    <button
                      class="role-picker-trigger"
                      type="button"
                      :disabled="!selectedGlobalPreset"
                      @click="toggleRolePicker"
                    >
                      <span class="role-picker-trigger-text">
                        {{ selectedGlobalPreset ? '从角色卡列表选择绑定' : '请先选择预设' }}
                      </span>
                      <span class="role-picker-trigger-arrow">{{ rolePickerOpen ? '▴' : '▾' }}</span>
                    </button>
                    <div v-if="rolePickerOpen" class="role-picker-dropdown">
                      <input
                        ref="rolePickerSearchInputRef"
                        v-model="roleBindSearchText"
                        type="text"
                        class="text-input role-picker-search"
                        placeholder="搜索角色名 / avatar..."
                        @keydown.enter.prevent="bindFirstRoleCandidate"
                      />
                      <div class="role-picker-list">
                        <button
                          v-for="candidate in roleBindingCandidates"
                          :key="`role-candidate-${candidate.key}`"
                          class="role-picker-item"
                          type="button"
                          :disabled="candidate.bound"
                          @click="bindRoleCandidateToSelectedPreset(candidate)"
                        >
                          <span class="name">{{ candidate.name }}</span>
                          <span class="meta">{{ candidate.bound ? '已绑定' : '绑定' }}</span>
                        </button>
                        <div v-if="!roleBindingCandidates.length" class="empty-note">没有匹配角色</div>
                      </div>
                    </div>
                  </div>
                  <div class="preset-role-tags">
                    <button
                      v-for="binding in selectedGlobalPresetRoleBindings"
                      :key="`binding-${selectedGlobalPreset?.id}-${binding.key}`"
                      class="preset-role-tag"
                      type="button"
                      :title="`点击移除绑定: ${binding.name}`"
                      @click="removeRoleBindingFromSelectedPreset(binding.key)"
                    >
                      <span>{{ binding.name }}</span>
                      <span class="remove">×</span>
                    </button>
                    <div v-if="selectedGlobalPreset && !selectedGlobalPresetRoleBindings.length" class="empty-note">
                      当前预设尚未绑定角色
                    </div>
                    <div v-if="!selectedGlobalPreset" class="empty-note">选择预设后可配置角色绑定</div>
                  </div>
                </div>
              </div>
              <div class="global-mode-grid">
                <div class="global-mode-column">
                  <label class="field">
                    <span>搜索并添加常驻世界书</span>
                    <input
                      v-model="globalAddSearchText"
                      type="text"
                      class="text-input"
                      placeholder="搜索并添加常驻世界书..."
                      @keydown.enter.prevent="addFirstGlobalCandidate"
                    />
                  </label>
                  <div class="global-mode-list">
                    <button
                      v-for="name in globalAddCandidates"
                      :key="`add-${name}`"
                      class="global-mode-item add"
                      type="button"
                      @click="addGlobalWorldbook(name)"
                    >
                      <span class="global-mode-item-name">{{ name }}</span>
                      <span class="global-mode-item-action">添加</span>
                    </button>
                    <div v-if="!globalAddCandidates.length" class="empty-note">没有可添加的世界书</div>
                  </div>
                </div>
                <div class="global-mode-column">
                  <label class="field">
                    <span>筛选常驻世界书</span>
                    <input
                      v-model="globalFilterText"
                      type="text"
                      class="text-input"
                      placeholder="筛选常驻世界书..."
                    />
                  </label>
                  <div class="global-mode-list">
                    <button
                      v-for="name in filteredGlobalWorldbooks"
                      :key="`global-${name}`"
                      class="global-mode-item active"
                      type="button"
                      @click="removeGlobalWorldbook(name)"
                    >
                      <span class="global-mode-item-name">{{ name }}</span>
                      <span class="global-mode-item-action">移除</span>
                    </button>
                    <div v-if="!filteredGlobalWorldbooks.length" class="empty-note">
                      {{ bindings.global.length ? '没有匹配结果' : '暂无常驻世界书' }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="global-mode-actions">
                <button class="btn" type="button" :disabled="!selectedWorldbookName" @click="toggleGlobalBinding">
                  {{ isGlobalBound ? '移出全局' : '加入全局' }}
                </button>
              </div>
            </div>
          </section>

          <!-- ═══ AI Generator Panel ═══ -->
          <section v-if="aiGeneratorMode" class="ai-generator-panel">
            <div class="ai-sidebar">
              <div class="ai-sidebar-head">
                <span class="ai-sidebar-title">对话列表</span>
                <button class="btn mini" type="button" @click="aiCreateSession">+ 新建</button>
              </div>
              <div class="ai-session-list">
                <button
                  v-for="session in aiSessions"
                  :key="session.id"
                  class="ai-session-item"
                  :class="{ active: session.id === aiActiveSession?.id }"
                  type="button"
                  @click="aiSwitchSession(session.id)"
                >
                  <span class="ai-session-title">{{ session.title }}</span>
                  <span class="ai-session-meta">{{ session.messages.length }} 条消息</span>
                  <button
                    class="ai-session-delete"
                    type="button"
                    title="删除对话"
                    @click.stop="aiDeleteSession(session.id)"
                  >×</button>
                </button>
                <div v-if="!aiSessions.length" class="empty-note">暂无对话，点击上方新建</div>
              </div>
            </div>
            <div class="ai-chat-area">
              <div v-if="!aiActiveSession" class="ai-chat-empty">
                <div class="ai-chat-empty-icon">🤖</div>
                <div class="ai-chat-empty-text">选择或新建一个对话开始生成</div>
              </div>
              <template v-else>
                <div class="ai-chat-messages" ref="aiChatMessagesRef">
                  <div
                    v-for="(msg, idx) in aiActiveMessages"
                    :key="`msg-${idx}`"
                    class="ai-chat-bubble"
                    :class="msg.role"
                  >
                    <div class="ai-chat-bubble-role">{{ msg.role === 'user' ? '👤 你' : '🤖 AI' }}</div>
                    <div class="ai-chat-bubble-content">{{ msg.content }}</div>
                  </div>
                  <div v-if="aiIsGenerating && aiStreamingText" class="ai-chat-bubble assistant streaming">
                    <div class="ai-chat-bubble-role">🤖 AI</div>
                    <div class="ai-chat-bubble-content">{{ aiStreamingText }}<span class="ai-cursor">▌</span></div>
                  </div>
                  <div v-if="aiIsGenerating && !aiStreamingText" class="ai-chat-bubble assistant streaming">
                    <div class="ai-chat-bubble-role">🤖 AI</div>
                    <div class="ai-chat-bubble-content"><span class="ai-thinking">思考中...</span></div>
                  </div>
                </div>
                <div class="ai-chat-input-bar">
                  <label class="ai-context-toggle" title="开启后，AI 将能看到酒馆的预设、世界书和正则上下文">
                    <input v-model="aiUseContext" type="checkbox" />
                    <span>{{ aiUseContext ? '📖 附带上下文' : '🔒 纯净模式' }}</span>
                  </label>
                  <textarea
                    v-model="aiChatInputText"
                    class="text-input ai-chat-input"
                    placeholder="输入提示词，让 AI 生成世界书条目..."
                    rows="2"
                    :disabled="aiIsGenerating"
                    @keydown.enter.exact.prevent="aiSendMessage"
                  ></textarea>
                  <button
                    v-if="!aiIsGenerating"
                    class="btn ai-send-btn"
                    type="button"
                    :disabled="!aiChatInputText.trim()"
                    @click="aiSendMessage"
                  >发送</button>
                  <button
                    v-else
                    class="btn danger ai-stop-btn"
                    type="button"
                    @click="aiStopGeneration"
                  >停止</button>
                </div>
              </template>
            </div>
          </section>

          <!-- ═══ Tag Review Modal ═══ -->
          <div v-if="aiShowTagReview" class="ai-tag-review-overlay" @click.self="aiShowTagReview = false">
            <div class="ai-tag-review-modal">
              <div class="ai-tag-review-head">
                <span class="ai-tag-review-title">📋 提取到的条目（{{ aiExtractedTags.length }}）</span>
                <button class="ai-tag-review-close" type="button" @click="aiShowTagReview = false">×</button>
              </div>
              <div class="ai-tag-review-target">
                <label class="field">
                  <span>目标世界书</span>
                  <select v-model="aiTargetWorldbook" class="text-input">
                    <option value="">请选择目标世界书</option>
                    <option v-for="name in worldbookNames" :key="`ai-wb-${name}`" :value="name">{{ name }}</option>
                  </select>
                </label>
              </div>
              <div class="ai-tag-list">
                <label
                  v-for="(tag, idx) in aiExtractedTags"
                  :key="`tag-${idx}`"
                  class="ai-tag-item"
                >
                  <input v-model="tag.selected" type="checkbox" />
                  <div class="ai-tag-info">
                    <span class="ai-tag-name">{{ tag.tag }}</span>
                    <span class="ai-tag-preview">{{ tag.content.slice(0, 120) }}{{ tag.content.length > 120 ? '...' : '' }}</span>
                  </div>
                </label>
              </div>
              <div class="ai-tag-review-actions">
                <button class="btn" type="button" @click="aiExtractedTags.forEach(t => t.selected = true)">全选</button>
                <button class="btn" type="button" @click="aiExtractedTags.forEach(t => t.selected = false)">全不选</button>
                <button
                  class="btn primary"
                  type="button"
                  :disabled="!aiTargetWorldbook || !aiExtractedTags.some(t => t.selected)"
                  @click="aiCreateSelectedEntries"
                >创建选中条目（{{ aiExtractedTags.filter(t => t.selected).length }}）</button>
              </div>
            </div>
          </div>

          <section v-show="!aiGeneratorMode" ref="mainLayoutRef" class="wb-main-layout" :style="mainLayoutStyle">
            <aside v-show="!showMobileEditor" class="wb-entry-list">
              <div class="list-search">
                <input v-model="searchText" type="text" class="text-input" placeholder="搜索名称 / 内容 / 关键词" />
                <label class="checkbox-inline">
                  <input v-model="onlyEnabled" type="checkbox" />
                  <span>仅启用</span>
                </label>
              </div>
              <div class="list-summary">
                条目 {{ filteredEntries.length }} / {{ draftEntries.length }} | 启用 {{ enabledEntryCount }}
              </div>
              <div class="list-scroll">
                <button
                  v-for="entry in filteredEntries"
                  :key="entry.uid"
                  type="button"
                  class="entry-item"
                  :data-status="getEntryVisualStatus(entry)"
                  :class="{
                    selected: entry.uid === selectedEntryUid,
                    disabled: !entry.enabled,
                  }"
                  @click="selectEntry(entry.uid)"
                >
                  <div class="entry-item-head">
                    <span class="entry-status-dot" :data-status="getEntryVisualStatus(entry)"></span>
                    <div class="entry-item-title">{{ entry.name || `条目 ${entry.uid}` }}</div>
                    <span class="entry-chip uid">#{{ entry.uid }}</span>
                  </div>
                  <div class="entry-item-tags">
                    <span class="entry-chip status" :data-status="getEntryVisualStatus(entry)">
                      {{ getEntryStatusLabel(entry) }}
                    </span>
                    <span class="entry-chip">🔑 {{ entry.strategy.keys.length }}</span>
                    <span class="entry-chip">🎯 {{ entry.probability }}</span>
                    <span class="entry-chip mono">#{{ entry.position.order }}</span>
                  </div>
                  <div class="entry-item-preview">{{ getEntryKeyPreview(entry) }}</div>
                </button>
              </div>
              <div class="list-actions">
                <button class="btn" type="button" :disabled="!selectedWorldbookName" @click="addEntry">新增</button>
                <button class="btn" type="button" :disabled="!selectedEntry" @click="duplicateSelectedEntry">
                  复制
                </button>
                <button class="btn danger" type="button" :disabled="!selectedEntry" @click="removeSelectedEntry">
                  删除
                </button>
                <button class="btn" type="button" :disabled="!selectedEntry" @click="moveSelectedEntry(-1)">
                  上移
                </button>
                <button class="btn" type="button" :disabled="!selectedEntry" @click="moveSelectedEntry(1)">下移</button>
              </div>
            </aside>
            <div
              v-show="!isMobile"
              class="wb-resize-handle main"
              :class="{ dragging: paneResizeState?.key === 'main' }"
              @pointerdown="startPaneResize('main', $event)"
            ></div>

            <main v-show="!isMobile || showMobileEditor" class="wb-editor">
              <template v-if="selectedEntry">
                <div ref="editorShellRef" class="wb-editor-shell" :style="editorShellStyle">
                  <section class="editor-center">
                    <header class="editor-head">
                      <div v-if="isMobile" class="editor-back-btn" @click="goBackToList">
                        ← 返回
                      </div>
                      <label class="field editor-comment">
                        <span>备注 (COMMENT)</span>
                        <input v-model="selectedEntry.name" type="text" class="text-input" />
                      </label>
                      <div class="editor-badges">
                        <span class="editor-badge" :class="selectedEntry.enabled ? 'on' : 'off'">
                          {{ selectedEntry.enabled ? 'EN' : 'OFF' }}
                        </span>
                        <span class="editor-badge strategy" :data-status="getEntryVisualStatus(selectedEntry)">
                          {{ getEntryStatusLabel(selectedEntry) }}
                        </span>
                        <span class="editor-badge mono">#{{ selectedEntry.uid }}</span>
                        <span class="editor-badge mono">Chars {{ selectedContentChars }}</span>
                        <span class="editor-badge mono">~{{ selectedTokenEstimate }}T</span>
                      </div>
                    </header>

                    <section class="editor-grid two-cols editor-keyword-grid">
                      <label class="field">
                        <span>主要关键词 (KEYS)</span>
                        <textarea v-model="selectedKeysText" class="text-area compact"></textarea>
                      </label>
                      <label class="field">
                        <span>次要关键词 (SECONDARY)</span>
                        <textarea v-model="selectedSecondaryKeysText" class="text-area compact"></textarea>
                      </label>
                    </section>

                    <section class="editor-content-block">
                      <div class="editor-content-title">世界观设定 / 内容 (CONTENT)</div>
                      <textarea
                        ref="contentTextareaRef"
                        v-model="selectedEntry.content"
                        class="text-area large editor-content-area"
                      ></textarea>
                      <div
                        class="content-resize-handle"
                        @pointerdown="startContentResize"
                      >
                        <span class="content-resize-grip">⋯</span>
                      </div>
                    </section>

                    <details class="editor-advanced">
                      <summary>高级字段 / extra JSON</summary>
                      <label class="field">
                        <span>extra JSON（未知字段）</span>
                        <textarea v-model="selectedExtraText" class="text-area compact" placeholder="{ ... }"></textarea>
                      </label>
                      <div class="field-actions">
                        <button class="btn" type="button" @click="applyExtraJson">应用 extra</button>
                        <button class="btn" type="button" @click="clearExtra">清空 extra</button>
                      </div>
                    </details>
                  </section>
                  <div
                    v-show="!isMobile"
                    class="wb-resize-handle editor"
                    :class="{ dragging: paneResizeState?.key === 'editor' }"
                    @pointerdown="startPaneResize('editor', $event)"
                  ></div>

                  <aside class="editor-side">
                    <article class="editor-card">
                      <h4>触发策略 (STRATEGY)</h4>
                      <label class="field checkbox-inline">
                        <input v-model="selectedEntry.enabled" type="checkbox" />
                        <span>启用条目</span>
                      </label>
                      <div class="strategy-switch">
                        <button
                          type="button"
                          class="strategy-pill constant"
                          :class="{ active: selectedEntry.strategy.type === 'constant' }"
                          @click="selectedEntry.strategy.type = 'constant'"
                        >
                          🔵 常驻 (Constant)
                        </button>
                        <button
                          type="button"
                          class="strategy-pill vector"
                          :class="{ active: selectedEntry.strategy.type === 'vectorized' }"
                          @click="selectedEntry.strategy.type = 'vectorized'"
                        >
                          📎 向量化 (Vector)
                        </button>
                        <button
                          type="button"
                          class="strategy-pill selective"
                          :class="{ active: selectedEntry.strategy.type === 'selective' }"
                          @click="selectedEntry.strategy.type = 'selective'"
                        >
                          🟢 关键词 (Selective)
                        </button>
                      </div>
                      <details class="editor-advanced">
                        <summary>高级设置</summary>
                        <label class="field">
                          <span>次要逻辑 (LOGIC)</span>
                          <select v-model="selectedEntry.strategy.keys_secondary.logic" class="text-input">
                            <option v-for="item in secondaryLogicOptions" :key="item" :value="item">
                              {{ getSecondaryLogicLabel(item) }}
                            </option>
                          </select>
                        </label>
                        <label class="field">
                          <span>扫描深度</span>
                          <input
                            v-model="selectedScanDepthText"
                            type="text"
                            class="text-input"
                            placeholder="留空或 same_as_global"
                          />
                        </label>
                        <label class="field">
                          <span>概率(0-100)</span>
                          <input
                            v-model.number="selectedEntry.probability"
                            type="number"
                            class="text-input"
                            min="0"
                            max="100"
                            step="1"
                          />
                        </label>
                      </details>
                    </article>

                    <article class="editor-card">
                      <h4>插入设置 (INSERTION)</h4>
                      <label class="field">
                        <span>位置 (Position)</span>
                        <select
                          v-model="selectedEntry.position.type"
                          class="text-input"
                          @change="handleSelectedPositionTypeChanged"
                        >
                          <option v-for="item in positionTypeOptions" :key="item" :value="item">
                            {{ getPositionTypeLabel(item) }}
                          </option>
                        </select>
                      </label>
                      <label class="field">
                        <span>权重 (Order)</span>
                        <input v-model.number="selectedEntry.position.order" type="number" class="text-input" step="1" />
                      </label>
                      <div class="editor-grid two-cols">
                        <label class="field" :class="{ disabled: selectedEntry.position.type !== 'at_depth' }">
                          <span>at_depth role</span>
                          <select
                            v-model="selectedEntry.position.role"
                            class="text-input"
                            :disabled="selectedEntry.position.type !== 'at_depth'"
                          >
                            <option value="system">system</option>
                            <option value="assistant">assistant</option>
                            <option value="user">user</option>
                          </select>
                        </label>
                        <label class="field" :class="{ disabled: selectedEntry.position.type !== 'at_depth' }">
                          <span>at_depth depth</span>
                          <input
                            v-model.number="selectedEntry.position.depth"
                            type="number"
                            class="text-input"
                            min="1"
                            step="1"
                            :disabled="selectedEntry.position.type !== 'at_depth'"
                          />
                        </label>
                      </div>
                    </article>

                    <article class="editor-card">
                      <h4>递归与效果 (RECURSION)</h4>
                      <label class="field checkbox-inline">
                        <input v-model="selectedEntry.recursion.prevent_incoming" type="checkbox" />
                        <span>不可递归命中 (Exclude Incoming)</span>
                      </label>
                      <label class="field checkbox-inline">
                        <input v-model="selectedEntry.recursion.prevent_outgoing" type="checkbox" />
                        <span>阻止后续递归 (Prevent Outgoing)</span>
                      </label>
                      <label class="field">
                        <span>递归延迟层级</span>
                        <input
                          v-model="selectedRecursionDelayText"
                          type="text"
                          class="text-input"
                          placeholder="留空表示 null"
                        />
                      </label>
                      <div class="editor-grid two-cols">
                        <label class="field">
                          <span>sticky</span>
                          <input
                            v-model="selectedStickyText"
                            type="text"
                            class="text-input"
                            placeholder="留空表示 null"
                          />
                        </label>
                        <label class="field">
                          <span>cooldown</span>
                          <input
                            v-model="selectedCooldownText"
                            type="text"
                            class="text-input"
                            placeholder="留空表示 null"
                          />
                        </label>
                      </div>
                      <label class="field">
                        <span>delay</span>
                        <input
                          v-model="selectedEffectDelayText"
                          type="text"
                          class="text-input"
                          placeholder="留空表示 null"
                        />
                      </label>
                    </article>
                  </aside>
                </div>
              </template>
              <template v-else>
                <div class="empty-block">请选择或新增一个条目后开始编辑。</div>
              </template>
            </main>
          </section>
          </div>

          <footer class="wb-status" :class="{ 'has-unsaved': hasUnsavedChanges }">
            <span>{{ isBusy ? '加载中...' : statusMessage }}</span>
            <span>
              当前条目: {{ draftEntries.length }} | 内容字符: {{ totalContentChars }} |
              {{ hasUnsavedChanges ? '存在未保存修改' : '已同步' }}
            </span>
          </footer>
    </template>
    <!-- ═══ End Desktop Layout ═══ -->

          <div v-if="showEntryHistoryModal" class="wb-modal-backdrop" @click.self="showEntryHistoryModal = false">
            <div class="wb-history-modal">
              <div class="wb-history-modal-header">
                <div>
                  <strong>🕰️ 条目时光机</strong>
                  <span>{{ entryHistorySummary }}</span>
                </div>
                <div class="wb-history-modal-actions">
                  <button class="btn mini" type="button" :disabled="!selectedEntry" @click="createManualEntrySnapshot">
                    记录条目
                  </button>
                  <button
                    class="btn mini danger"
                    type="button"
                    :disabled="!entrySnapshotsForSelected.length"
                    @click="clearCurrentEntrySnapshots"
                  >
                    清空条目历史
                  </button>
                  <button class="btn mini" type="button" @click="showEntryHistoryModal = false">关闭</button>
                </div>
              </div>

              <div class="wb-history-modal-main">
                <aside class="wb-history-versions">
                  <div class="wb-history-versions-title">版本列表（L/R）</div>
                  <div class="wb-history-versions-scroll">
                    <div v-for="ver in entryVersionViews" :key="ver.id" class="wb-history-version-item">
                      <div class="wb-history-version-line">
                        <strong>{{ formatHistoryOptionLabel(ver.label, ver.ts, ver.isCurrent) }}</strong>
                        <div class="wb-history-lr">
                          <button class="mini-lr" :class="{ active: entryHistoryLeftId === ver.id }" @click="entryHistoryLeftId = ver.id">L</button>
                          <button class="mini-lr" :class="{ active: entryHistoryRightId === ver.id }" @click="entryHistoryRightId = ver.id">R</button>
                        </div>
                      </div>
                      <span>{{ ver.name }}</span>
                    </div>
                    <div v-if="entryVersionViews.length <= 1" class="empty-note">暂无历史条目版本</div>
                  </div>
                </aside>

                <section class="wb-history-diff-wrap">
                  <div class="wb-history-diff-head">
                    <div>
                      Left: {{ selectedEntryHistoryLeft ? formatHistoryOptionLabel(selectedEntryHistoryLeft.label, selectedEntryHistoryLeft.ts, selectedEntryHistoryLeft.isCurrent) : '-' }}
                      |
                      Right: {{ selectedEntryHistoryRight ? formatHistoryOptionLabel(selectedEntryHistoryRight.label, selectedEntryHistoryRight.ts, selectedEntryHistoryRight.isCurrent) : '-' }}
                    </div>
                    <button class="btn mini" type="button" :disabled="!canRestoreEntryFromLeft" @click="restoreEntryFromLeftHistory">
                      恢复到 Left
                    </button>
                  </div>
                  <div class="wb-history-diff-grid">
                    <div>
                      <div class="wb-history-diff-title">Left</div>
                      <div class="wb-history-diff-body" v-html="entryHistoryDiff.leftHtml"></div>
                    </div>
                    <div>
                      <div class="wb-history-diff-title">Right</div>
                      <div class="wb-history-diff-body" v-html="entryHistoryDiff.rightHtml"></div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <div v-if="showWorldbookHistoryModal" class="wb-modal-backdrop" @click.self="showWorldbookHistoryModal = false">
            <div class="wb-history-modal">
              <div class="wb-history-modal-header">
                <div>
                  <strong>⏪ 时光机（整本回滚）</strong>
                  <span>{{ getWorldbookVersionDiffSummary(selectedWorldbookHistoryLeft, selectedWorldbookHistoryRight) }}</span>
                </div>
                <div class="wb-history-modal-actions">
                  <button class="btn mini" type="button" :disabled="!selectedWorldbookName" @click="createManualSnapshot">
                    创建整本快照
                  </button>
                  <button
                    class="btn mini danger"
                    type="button"
                    :disabled="!snapshotsForCurrent.length"
                    @click="clearCurrentSnapshots"
                  >
                    清空整本快照
                  </button>
                  <button class="btn mini" type="button" @click="showWorldbookHistoryModal = false">关闭</button>
                </div>
              </div>

              <div class="wb-history-modal-main">
                <aside class="wb-history-versions">
                  <div class="wb-history-versions-title">版本列表（L/R）</div>
                  <div class="wb-history-versions-scroll">
                    <div v-for="ver in worldbookVersionViews" :key="ver.id" class="wb-history-version-item">
                      <div class="wb-history-version-line">
                        <strong>{{ formatHistoryOptionLabel(ver.label, ver.ts, ver.isCurrent) }}</strong>
                        <div class="wb-history-lr">
                          <button class="mini-lr" :class="{ active: worldbookHistoryLeftId === ver.id }" @click="worldbookHistoryLeftId = ver.id">L</button>
                          <button class="mini-lr" :class="{ active: worldbookHistoryRightId === ver.id }" @click="worldbookHistoryRightId = ver.id">R</button>
                        </div>
                      </div>
                      <span>entries: {{ ver.entries.length }}</span>
                    </div>
                  </div>
                </aside>

                <section class="wb-history-diff-wrap">
                  <div class="wb-history-diff-head">
                    <div>
                      Left: {{ selectedWorldbookHistoryLeft ? formatHistoryOptionLabel(selectedWorldbookHistoryLeft.label, selectedWorldbookHistoryLeft.ts, selectedWorldbookHistoryLeft.isCurrent) : '-' }}
                      |
                      Right: {{ selectedWorldbookHistoryRight ? formatHistoryOptionLabel(selectedWorldbookHistoryRight.label, selectedWorldbookHistoryRight.ts, selectedWorldbookHistoryRight.isCurrent) : '-' }}
                    </div>
                    <button
                      class="btn mini"
                      type="button"
                      :disabled="!canRestoreWorldbookFromLeft"
                      @click="restoreWorldbookFromLeftHistory"
                    >
                      恢复到 Left
                    </button>
                  </div>
                  <div class="wb-history-diff-grid">
                    <div>
                      <div class="wb-history-diff-title">Left</div>
                      <div class="wb-history-diff-body" v-html="worldbookHistoryDiff.leftHtml"></div>
                    </div>
                    <div>
                      <div class="wb-history-diff-title">Right</div>
                      <div class="wb-history-diff-body" v-html="worldbookHistoryDiff.rightHtml"></div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <div
            v-if="floatingPanels.find.visible"
            class="wb-floating-window find-window"
            :style="getFloatingPanelStyle('find')"
            @pointerdown="bringFloatingToFront('find')"
          >
            <div class="wb-floating-header" @pointerdown="startFloatingDrag('find', $event)">
              <strong>🔎 查找与替换</strong>
              <div class="wb-floating-header-actions">
                <button
                  class="btn mini"
                  type="button"
                  :disabled="!draftEntries.length"
                  @pointerdown.stop
                  @click="findFirstMatch"
                >
                  查找
                </button>
                <button
                  class="btn mini"
                  type="button"
                  :disabled="!draftEntries.length"
                  @pointerdown.stop
                  @click="findPreviousMatch"
                >
                  上一个
                </button>
                <button
                  class="btn mini"
                  type="button"
                  :disabled="!draftEntries.length"
                  @pointerdown.stop
                  @click="findNextMatch"
                >
                  下一个
                </button>
                <button
                  class="btn mini"
                  type="button"
                  :disabled="!draftEntries.length"
                  @pointerdown.stop
                  @click="applyBatchReplace"
                >
                  替换全部
                </button>
                <button class="btn mini danger" type="button" @pointerdown.stop @click="closeFloatingPanel('find')">
                  关闭
                </button>
              </div>
            </div>
            <div class="wb-floating-body">
              <div class="tool-line stacked">
                <input v-model="batchFindText" type="text" class="text-input" placeholder="查找文本 / 正则" />
                <input v-model="batchReplaceText" type="text" class="text-input" placeholder="替换为" />
                <div class="find-scope-line">
                  <label class="checkbox-inline">
                    <input v-model="batchSearchScope" type="radio" value="all" />
                    <span>全部条目</span>
                  </label>
                  <label class="checkbox-inline">
                    <input v-model="batchSearchScope" type="radio" value="current" :disabled="!selectedEntry" />
                    <span>当前条目</span>
                  </label>
                  <span class="find-summary-text">{{ findHitSummaryText }}</span>
                </div>
                <input
                  v-model="batchExcludeText"
                  type="text"
                  class="text-input"
                  placeholder="排除项：#UID / 名称 / 内容 / 关键词（逗号或换行）"
                />
                <div v-if="activeFindHit" class="find-active-hit">
                  <strong>#{{ activeFindHit.entryUid }} {{ activeFindHit.entryName || `条目 ${activeFindHit.entryUid}` }}</strong>
                  <span>{{ getFindFieldLabel(activeFindHit.field) }} · {{ activeFindHit.preview }}</span>
                </div>
                <div class="batch-exclude-note">
                  示例: `#12, name:世界观, content:{{user}}, keys:吸血鬼`（默认命中名称/内容/关键词即排除）
                </div>
                <div v-if="batchExcludeTokensPreview.length" class="batch-exclude-chips">
                  <span v-for="token in batchExcludeTokensPreview" :key="token" class="exclude-chip">{{ token }}</span>
                </div>
                <div class="find-flags">
                  <label class="checkbox-inline">
                    <input v-model="batchUseRegex" type="checkbox" />
                    <span>正则模式</span>
                  </label>
                  <label class="checkbox-inline">
                    <input v-model="batchInName" type="checkbox" />
                    <span>名称</span>
                  </label>
                  <label class="checkbox-inline">
                    <input v-model="batchInContent" type="checkbox" />
                    <span>内容</span>
                  </label>
                  <label class="checkbox-inline">
                    <input v-model="batchInKeys" type="checkbox" />
                    <span>关键词</span>
                  </label>
                </div>
              </div>
              <details class="tool-details">
                <summary>附加批处理工具</summary>
                <div class="tool-line">
                  <button class="btn" type="button" :disabled="!draftEntries.length" @click="normalizeAllEntries">
                    标准化全部
                  </button>
                  <button class="btn" type="button" :disabled="!draftEntries.length" @click="sortEntriesByOrderDesc">
                    按 order 排序
                  </button>
                </div>
                <div class="tool-line">
                  <button class="btn" type="button" :disabled="!draftEntries.length" @click="setEnabledForAll(true)">
                    全部启用
                  </button>
                  <button class="btn" type="button" :disabled="!draftEntries.length" @click="setEnabledForAll(false)">
                    全部禁用
                  </button>
                </div>
              </details>
            </div>
          </div>

          <div
            v-if="floatingPanels.activation.visible"
            class="wb-floating-window activation-window"
            :style="getFloatingPanelStyle('activation')"
            @pointerdown="bringFloatingToFront('activation')"
          >
            <div class="wb-floating-header" @pointerdown="startFloatingDrag('activation', $event)">
              <strong>📡 激活监控（WORLD_INFO_ACTIVATED）</strong>
              <div class="wb-floating-header-actions">
                <button
                  class="btn mini danger"
                  type="button"
                  :disabled="!activationLogs.length"
                  @pointerdown.stop
                  @click="clearActivationLogs"
                >
                  清空
                </button>
                <button
                  class="btn mini danger"
                  type="button"
                  @pointerdown.stop
                  @click="closeFloatingPanel('activation')"
                >
                  关闭
                </button>
              </div>
            </div>
            <div class="wb-floating-body">
              <div class="tool-scroll">
                <div v-for="log in activationLogs" :key="log.id" class="activation-item">
                  <div class="activation-main">
                    <strong>{{ log.world }}</strong>
                    <span>#{{ log.uid }} · {{ log.name }}</span>
                  </div>
                  <div class="activation-sub">
                    <span>{{ formatDateTime(log.time) }}</span>
                    <span>{{ log.contentPreview }}</span>
                  </div>
                </div>
                <div v-if="!activationLogs.length" class="empty-note">暂无激活记录</div>
              </div>
            </div>
          </div>
  </div>
</template>

<script setup lang="ts">
import { diffLines } from 'https://testingcf.jsdelivr.net/npm/diff/+esm';
import { klona } from 'klona';

type StrategyType = WorldbookEntry['strategy']['type'];
type SecondaryLogic = WorldbookEntry['strategy']['keys_secondary']['logic'];
type PositionType = WorldbookEntry['position']['type'];
type RoleType = WorldbookEntry['position']['role'];
type EntryVisualStatus = 'constant' | 'vector' | 'normal' | 'disabled';
type FloatingPanelKey = 'find' | 'activation';
type PaneResizeKey = 'main' | 'editor';
type BatchSearchScope = 'all' | 'current';
type FindFieldKey = 'name' | 'content' | 'keys';

interface FloatingPanelState {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  width: number;
}

interface PaneResizeState {
  key: PaneResizeKey;
  pointerId: number;
  doc: Document;
  win: Window;
}

type ThemeKey = 'ocean' | 'nebula' | 'forest' | 'sunset' | 'coffee' | 'paper' | 'snow';

const THEMES: Record<ThemeKey, { name: string; label: string; colors: Record<string, string> }> = {
  ocean: {
    name: 'Ocean (Deep)',
    label: '深海',
    colors: {
      '--wb-bg-root': '#0f172a',
      '--wb-bg-panel': '#1e293b',
      '--wb-text-main': '#f1f5f9',
      '--wb-text-muted': '#94a3b8',
      '--wb-primary': '#0ea5e9',
      '--wb-primary-light': '#38bdf8',
      '--wb-primary-hover': 'rgba(56, 189, 248, 0.15)',
      '--wb-primary-soft': 'rgba(14, 165, 233, 0.15)',
      '--wb-primary-glow': 'rgba(14, 165, 233, 0.4)',
      '--wb-input-bg': 'rgba(0, 0, 0, 0.25)',
      '--wb-input-bg-hover': 'rgba(0, 0, 0, 0.35)',
      '--wb-input-bg-focus': 'rgba(0, 0, 0, 0.45)',
      '--wb-border-subtle': 'rgba(255, 255, 255, 0.08)',
      '--wb-border-main': 'rgba(255, 255, 255, 0.12)',
      '--wb-shadow-main': '0 12px 28px rgba(0, 0, 0, 0.5)',
      '--wb-scrollbar-thumb': 'rgba(255, 255, 255, 0.2)',
    },
  },
  nebula: {
    name: 'Nebula (Dark)',
    label: '星云',
    colors: {
      '--wb-bg-root': '#170b25',
      '--wb-bg-panel': '#261836',
      '--wb-text-main': '#f3e8ff',
      '--wb-text-muted': '#a855f7',
      '--wb-primary': '#c084fc',
      '--wb-primary-light': '#d8b4fe',
      '--wb-primary-hover': 'rgba(192, 132, 252, 0.15)',
      '--wb-primary-soft': 'rgba(168, 85, 247, 0.15)',
      '--wb-primary-glow': 'rgba(192, 132, 252, 0.4)',
      '--wb-input-bg': 'rgba(0, 0, 0, 0.25)',
      '--wb-input-bg-hover': 'rgba(0, 0, 0, 0.35)',
      '--wb-input-bg-focus': 'rgba(0, 0, 0, 0.45)',
      '--wb-border-subtle': 'rgba(255, 255, 255, 0.08)',
      '--wb-border-main': 'rgba(255, 255, 255, 0.12)',
      '--wb-shadow-main': '0 12px 28px rgba(0, 0, 0, 0.5)',
      '--wb-scrollbar-thumb': 'rgba(255, 255, 255, 0.2)',
    },
  },
  forest: {
    name: 'Forest',
    label: '森林',
    colors: {
      '--wb-bg-root': '#051812',
      '--wb-bg-panel': '#0d2b21',
      '--wb-text-main': '#ecfdf5',
      '--wb-text-muted': '#34d399',
      '--wb-primary': '#10b981',
      '--wb-primary-light': '#34d399',
      '--wb-primary-hover': 'rgba(16, 185, 129, 0.15)',
      '--wb-primary-soft': 'rgba(5, 150, 105, 0.15)',
      '--wb-primary-glow': 'rgba(16, 185, 129, 0.4)',
      '--wb-input-bg': 'rgba(0, 0, 0, 0.25)',
      '--wb-input-bg-hover': 'rgba(0, 0, 0, 0.35)',
      '--wb-input-bg-focus': 'rgba(0, 0, 0, 0.45)',
      '--wb-border-subtle': 'rgba(255, 255, 255, 0.08)',
      '--wb-border-main': 'rgba(255, 255, 255, 0.12)',
      '--wb-shadow-main': '0 12px 28px rgba(0, 0, 0, 0.5)',
      '--wb-scrollbar-thumb': 'rgba(255, 255, 255, 0.2)',
    },
  },
  sunset: {
    name: 'Sunset',
    label: '日落',
    colors: {
      '--wb-bg-root': '#1a0f0f',
      '--wb-bg-panel': '#2e1818',
      '--wb-text-main': '#fff1f2',
      '--wb-text-muted': '#fb7185',
      '--wb-primary': '#fb923c',
      '--wb-primary-light': '#fdba74',
      '--wb-primary-hover': 'rgba(251, 146, 60, 0.15)',
      '--wb-primary-soft': 'rgba(234, 88, 12, 0.15)',
      '--wb-primary-glow': 'rgba(251, 146, 60, 0.4)',
      '--wb-input-bg': 'rgba(0, 0, 0, 0.25)',
      '--wb-input-bg-hover': 'rgba(0, 0, 0, 0.35)',
      '--wb-input-bg-focus': 'rgba(0, 0, 0, 0.45)',
      '--wb-border-subtle': 'rgba(255, 255, 255, 0.08)',
      '--wb-border-main': 'rgba(255, 255, 255, 0.12)',
      '--wb-shadow-main': '0 12px 28px rgba(0, 0, 0, 0.5)',
      '--wb-scrollbar-thumb': 'rgba(255, 255, 255, 0.2)',
    },
  },
  coffee: {
    name: 'Coffee',
    label: '咖啡',
    colors: {
      '--wb-bg-root': '#161009',
      '--wb-bg-panel': '#291e16',
      '--wb-text-main': '#fffbeb',
      '--wb-text-muted': '#d97706',
      '--wb-primary': '#fbbf24',
      '--wb-primary-light': '#fcd34d',
      '--wb-primary-hover': 'rgba(251, 191, 36, 0.15)',
      '--wb-primary-soft': 'rgba(217, 119, 6, 0.15)',
      '--wb-primary-glow': 'rgba(251, 191, 36, 0.4)',
      '--wb-input-bg': 'rgba(0, 0, 0, 0.25)',
      '--wb-input-bg-hover': 'rgba(0, 0, 0, 0.35)',
      '--wb-input-bg-focus': 'rgba(0, 0, 0, 0.45)',
      '--wb-border-subtle': 'rgba(255, 255, 255, 0.08)',
      '--wb-border-main': 'rgba(255, 255, 255, 0.12)',
      '--wb-shadow-main': '0 12px 28px rgba(0, 0, 0, 0.5)',
      '--wb-scrollbar-thumb': 'rgba(255, 255, 255, 0.2)',
    },
  },
  paper: {
    name: 'Paper (Light)',
    label: '纸莎草',
    colors: {
      '--wb-bg-root': '#fbf9f5',
      '--wb-bg-panel': '#f0eadd',
      '--wb-text-main': '#4a3b32',
      '--wb-text-muted': '#8c7b70',
      '--wb-primary': '#d97706',
      '--wb-primary-light': '#b45309',
      '--wb-primary-hover': 'rgba(217, 119, 6, 0.1)',
      '--wb-primary-soft': 'rgba(180, 83, 9, 0.1)',
      '--wb-primary-glow': 'rgba(217, 119, 6, 0.25)',
      '--wb-input-bg': '#f7f3ec',
      '--wb-input-bg-hover': '#f2ece2',
      '--wb-input-bg-focus': '#ffffff',
      '--wb-border-subtle': 'rgba(74, 59, 50, 0.12)',
      '--wb-border-main': 'rgba(74, 59, 50, 0.2)',
      '--wb-shadow-main': '0 8px 24px rgba(74, 59, 50, 0.12)',
      '--wb-scrollbar-thumb': 'rgba(74, 59, 50, 0.25)',
    },
  },
  snow: {
    name: 'Snow (Light)',
    label: '雪白',
    colors: {
      '--wb-bg-root': '#ffffff',
      '--wb-bg-panel': '#f4f4f5',
      '--wb-text-main': '#18181b',
      '--wb-text-muted': '#71717a',
      '--wb-primary': '#2563eb',
      '--wb-primary-light': '#3b82f6',
      '--wb-primary-hover': 'rgba(37, 99, 235, 0.1)',
      '--wb-primary-soft': 'rgba(37, 99, 235, 0.08)',
      '--wb-primary-glow': 'rgba(37, 99, 235, 0.25)',
      '--wb-input-bg': '#ffffff',
      '--wb-input-bg-hover': '#fafafa',
      '--wb-input-bg-focus': '#ffffff',
      '--wb-border-subtle': '#e4e4e7',
      '--wb-border-main': '#d4d4d8',
      '--wb-shadow-main': '0 12px 28px rgba(0, 0, 0, 0.08)',
      '--wb-scrollbar-thumb': '#a1a1aa',
    },
  },
};

interface WorldbookSnapshot {
  id: string;
  label: string;
  ts: number;
  entries: WorldbookEntry[];
}

interface EntrySnapshot {
  id: string;
  label: string;
  ts: number;
  uid: number;
  name: string;
  entry: WorldbookEntry;
}

interface EntryVersionView {
  id: string;
  label: string;
  ts: number;
  name: string;
  entry: WorldbookEntry;
  isCurrent: boolean;
}

interface WorldbookVersionView {
  id: string;
  label: string;
  ts: number;
  entries: WorldbookEntry[];
  isCurrent: boolean;
}

interface PresetRoleBinding {
  key: string;
  name: string;
  avatar: string;
  updated_at: number;
}

interface RoleBindingCandidate extends PresetRoleBinding {
  bound: boolean;
}

interface GlobalWorldbookPreset {
  id: string;
  name: string;
  worldbooks: string[];
  role_bindings: PresetRoleBinding[];
  updated_at: number;
}

interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AIChatSession {
  id: string;
  title: string;
  createdAt: number;
  messages: AIChatMessage[];
}

interface AIGeneratorState {
  sessions: AIChatSession[];
  activeSessionId: string | null;
}

interface ExtractedTag {
  tag: string;
  content: string;
  selected: boolean;
}

interface PersistedState {
  last_worldbook: string;
  history: Record<string, WorldbookSnapshot[]>;
  entry_history: Record<string, Record<string, EntrySnapshot[]>>;
  global_presets: GlobalWorldbookPreset[];
  last_global_preset_id: string;
  role_override_baseline: { preset_id: string; worldbooks: string[] } | null;
  theme: ThemeKey;
  ai_chat: AIGeneratorState;
}

interface ActivationLog {
  id: string;
  time: number;
  world: string;
  uid: number | string;
  name: string;
  contentPreview: string;
}

interface ImportedPayload {
  name: string;
  entries: WorldbookEntry[];
}

interface EventSubscription {
  stop: () => void;
}

interface FindHit {
  entryUid: number;
  entryName: string;
  field: FindFieldKey;
  start: number;
  end: number;
  matchedText: string;
  preview: string;
}

const STORAGE_KEY = 'worldbook_assistant_state_v1';
const DIRTY_STATE_KEY = '__WB_ASSISTANT_HAS_UNSAVED_CHANGES__';
const HISTORY_LIMIT = 12;
const ENTRY_HISTORY_LIMIT = 7;
const ACTIVATION_LOG_LIMIT = 120;
const RESIZE_HANDLE_SIZE = 10;
const MAIN_PANE_MIN = 220;
const MAIN_EDITOR_MIN = 540;
const EDITOR_SIDE_MIN = 280;
const EDITOR_CENTER_MIN = 420;
const GLOBAL_PRESET_LIMIT = 64;

const strategyTypeOptions: StrategyType[] = ['constant', 'selective', 'vectorized'];
const secondaryLogicOptions: SecondaryLogic[] = ['and_any', 'and_all', 'not_all', 'not_any'];
const positionTypeOptions: PositionType[] = [
  'before_character_definition',
  'after_character_definition',
  'before_example_messages',
  'after_example_messages',
  'before_author_note',
  'after_author_note',
  'at_depth',
];

const worldbookNames = ref<string[]>([]);
const selectedWorldbookName = ref('');
const worldbookPickerOpen = ref(false);
const worldbookPickerSearchText = ref('');
const worldbookPickerRef = ref<HTMLElement | null>(null);
const worldbookPickerSearchInputRef = ref<HTMLInputElement | null>(null);
const rolePickerOpen = ref(false);
const rolePickerRef = ref<HTMLElement | null>(null);
const rolePickerSearchInputRef = ref<HTMLInputElement | null>(null);
const currentTheme = ref<ThemeKey>('ocean');
const themePickerOpen = ref(false);
const globalWorldbookMode = ref(false);
const aiGeneratorMode = ref(false);
const aiIsGenerating = ref(false);
const aiCurrentGenerationId = ref<string | null>(null);
const aiStreamingText = ref('');
const aiExtractedTags = ref<ExtractedTag[]>([]);
const aiShowTagReview = ref(false);
const aiTargetWorldbook = ref('');
const aiChatInputText = ref('');
const aiUseContext = ref(true);
const aiChatMessagesRef = ref<HTMLDivElement | null>(null);

const AI_CHAT_SESSION_LIMIT = 50;
const AI_CHAT_MESSAGE_LIMIT = 200;
const selectedGlobalPresetId = ref('');
const currentRoleContext = ref<PresetRoleBinding | null>(null);
const roleBindingSourceCandidates = ref<PresetRoleBinding[]>([]);
const originalEntries = ref<WorldbookEntry[]>([]);
const draftEntries = ref<WorldbookEntry[]>([]);
const selectedEntryUid = ref<number | null>(null);

const searchText = ref('');
const onlyEnabled = ref(false);
const importFileInput = ref<HTMLInputElement | null>(null);
const selectedExtraText = ref('');
const globalAddSearchText = ref('');
const globalFilterText = ref('');
const roleBindSearchText = ref('');

const batchFindText = ref('');
const batchReplaceText = ref('');
const batchExcludeText = ref('');
const batchUseRegex = ref(false);
const batchInName = ref(true);
const batchInContent = ref(true);
const batchInKeys = ref(false);
const batchSearchScope = ref<BatchSearchScope>('all');
const findHits = ref<FindHit[]>([]);
const findHitIndex = ref(-1);

const statusMessage = ref('就绪');
const isBusy = ref(false);
const isSaving = ref(false);
const showEntryHistoryModal = ref(false);
const showWorldbookHistoryModal = ref(false);
const entryHistoryLeftId = ref('');
const entryHistoryRightId = ref('');
const worldbookHistoryLeftId = ref('');
const worldbookHistoryRightId = ref('');
const floatingZCounter = ref(10005);
const floatingPanels = reactive<Record<FloatingPanelKey, FloatingPanelState>>({
  find: { visible: false, x: 420, y: 170, z: 10006, width: 500 },
  activation: { visible: false, x: 760, y: 230, z: 10008, width: 480 },
});
const activeFloatingDrag = ref<{
  key: FloatingPanelKey;
  pointerId: number;
  offsetX: number;
  offsetY: number;
  doc: Document;
  win: Window;
} | null>(null);
const floatingPanelKeys: FloatingPanelKey[] = ['find', 'activation'];
const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1440);
const mainLayoutRef = ref<HTMLElement | null>(null);
const editorShellRef = ref<HTMLElement | null>(null);
const contentTextareaRef = ref<HTMLTextAreaElement | null>(null);
const mainPaneWidth = ref(320);
const editorSideWidth = ref(360);
const paneResizeState = ref<PaneResizeState | null>(null);
const hostResizeWindow = ref<Window | null>(null);

const screenWidth = ref(typeof window !== 'undefined' ? window.screen.width : 1440);
const screenHeight = ref(typeof window !== 'undefined' ? window.screen.height : 900);

const isMobile = computed(() => screenWidth.value < screenHeight.value);

// Keep screen dimensions in sync on orientation change
let _screenSyncCleanup: (() => void) | null = null;
if (typeof window !== 'undefined') {
  const syncScreenDims = () => {
    screenWidth.value = window.screen.width;
    screenHeight.value = window.screen.height;
  };
  const orientHandler = () => setTimeout(syncScreenDims, 150);
  window.addEventListener('orientationchange', orientHandler);
  window.addEventListener('resize', syncScreenDims);
  _screenSyncCleanup = () => {
    window.removeEventListener('orientationchange', orientHandler);
    window.removeEventListener('resize', syncScreenDims);
  };
}
const showMobileEditor = computed(() => isMobile.value && selectedEntryUid.value !== null);
const mobileTab = ref<'list' | 'edit' | 'settings' | 'ai'>('list');

const bindings = reactive({
  global: [] as string[],
  charPrimary: null as string | null,
  charAdditional: [] as string[],
  chat: null as string | null,
});

const activationLogs = ref<ActivationLog[]>([]);
const persistedState = ref<PersistedState>(createDefaultPersistedState());

const subscriptions: EventSubscription[] = [];

const selectedEntry = computed(() => {
  if (selectedEntryUid.value === null) {
    return null;
  }
  return draftEntries.value.find(entry => entry.uid === selectedEntryUid.value) ?? null;
});

const selectedEntryIndex = computed(() => {
  if (!selectedEntry.value) {
    return -1;
  }
  return draftEntries.value.findIndex(entry => entry.uid === selectedEntry.value?.uid);
});

const filteredEntries = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();
  return draftEntries.value.filter(entry => {
    if (onlyEnabled.value && !entry.enabled) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    const keysJoined = entry.strategy.keys.map(stringifyKeyword).join(' ').toLowerCase();
    return (
      entry.name.toLowerCase().includes(keyword) ||
      entry.content.toLowerCase().includes(keyword) ||
      keysJoined.includes(keyword)
    );
  });
});

const enabledEntryCount = computed(() => draftEntries.value.filter(entry => entry.enabled).length);

const totalContentChars = computed(() =>
  draftEntries.value.reduce((sum, entry) => {
    return sum + entry.content.length;
  }, 0),
);

const hasUnsavedChanges = computed(() => JSON.stringify(draftEntries.value) !== JSON.stringify(originalEntries.value));
const isCompactLayout = computed(() => viewportWidth.value <= 1100);

const mainLayoutStyle = computed<Record<string, string> | undefined>(() => {
  if (isMobile.value) {
    return {
      display: 'block',
      height: 'auto',
      overflow: 'visible',
    };
  }
  if (isCompactLayout.value) {
    return undefined;
  }
  return {
    gridTemplateColumns: `minmax(${MAIN_PANE_MIN}px, min(${mainPaneWidth.value}px, calc(100% - ${MAIN_EDITOR_MIN + RESIZE_HANDLE_SIZE}px))) ${RESIZE_HANDLE_SIZE}px minmax(0, 1fr)`,
  };
});

const editorShellStyle = computed<Record<string, string> | undefined>(() => {
  if (isCompactLayout.value) {
    return undefined;
  }
  return {
    gridTemplateColumns: `minmax(0, 1fr) ${RESIZE_HANDLE_SIZE}px minmax(${EDITOR_SIDE_MIN}px, min(${editorSideWidth.value}px, calc(100% - ${EDITOR_CENTER_MIN + RESIZE_HANDLE_SIZE}px)))`,
  };
});

const themeStyles = computed(() => {
  return THEMES[currentTheme.value].colors;
});

const selectableWorldbookNames = computed(() => {
  if (!globalWorldbookMode.value) {
    return worldbookNames.value;
  }
  return bindings.global.filter(name => worldbookNames.value.includes(name));
});

const globalWorldbookPresets = computed(() => persistedState.value.global_presets ?? []);

const selectedGlobalPreset = computed(() => {
  return globalWorldbookPresets.value.find(item => item.id === selectedGlobalPresetId.value) ?? null;
});

const selectedGlobalPresetRoleBindings = computed(() => selectedGlobalPreset.value?.role_bindings ?? []);

const isCurrentRoleBoundToSelectedPreset = computed(() => {
  const role = currentRoleContext.value;
  const preset = selectedGlobalPreset.value;
  if (!role || !preset) {
    return false;
  }
  return preset.role_bindings.some(item => item.key === role.key);
});

const roleBindingCandidates = computed<RoleBindingCandidate[]>(() => {
  const keyword = roleBindSearchText.value.trim().toLowerCase();
  const boundSet = new Set(selectedGlobalPresetRoleBindings.value.map(item => item.key));
  const list = roleBindingSourceCandidates.value;
  const filtered = keyword
    ? list.filter(item => {
        return (
          item.name.toLowerCase().includes(keyword) ||
          item.avatar.toLowerCase().includes(keyword) ||
          item.key.toLowerCase().includes(keyword)
        );
      })
    : list;
  return filtered.map(item => ({
    ...item,
    bound: boundSet.has(item.key),
  }));
});

const filteredSelectableWorldbookNames = computed(() => {
  const keyword = worldbookPickerSearchText.value.trim().toLowerCase();
  if (!keyword) {
    return selectableWorldbookNames.value;
  }
  return selectableWorldbookNames.value.filter(name => name.toLowerCase().includes(keyword));
});

const globalAddCandidates = computed(() => {
  const keyword = globalAddSearchText.value.trim().toLowerCase();
  return worldbookNames.value.filter(name => {
    if (bindings.global.includes(name)) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    return name.toLowerCase().includes(keyword);
  });
});

const filteredGlobalWorldbooks = computed(() => {
  const keyword = globalFilterText.value.trim().toLowerCase();
  if (!keyword) {
    return bindings.global;
  }
  return bindings.global.filter(name => name.toLowerCase().includes(keyword));
});

const isGlobalBound = computed(() => {
  if (!selectedWorldbookName.value) {
    return false;
  }
  return bindings.global.includes(selectedWorldbookName.value);
});

const snapshotsForCurrent = computed(() => {
  if (!selectedWorldbookName.value) {
    return [];
  }
  return persistedState.value.history[selectedWorldbookName.value] ?? [];
});

const entrySnapshotsForSelected = computed(() => {
  if (!selectedWorldbookName.value || !selectedEntry.value) {
    return [];
  }
  const byWorldbook = persistedState.value.entry_history[selectedWorldbookName.value] ?? {};
  return byWorldbook[String(selectedEntry.value.uid)] ?? [];
});

const entryVersionViews = computed<EntryVersionView[]>(() => {
  if (!selectedEntry.value) {
    return [];
  }
  const baselineEntry = originalEntries.value.find(item => item.uid === selectedEntry.value?.uid) ?? null;
  const current: EntryVersionView = {
    id: '__current__',
    label: '当前版本',
    ts: Date.now(),
    name: selectedEntry.value.name,
    entry: selectedEntry.value,
    isCurrent: true,
  };
  const baseline = baselineEntry
    ? ({
        id: '__baseline__',
        label: '加载基线',
        ts: 0,
        name: baselineEntry.name,
        entry: baselineEntry,
        isCurrent: false,
      } satisfies EntryVersionView)
    : null;
  const history = entrySnapshotsForSelected.value.map(item => ({
    id: item.id,
    label: item.label,
    ts: item.ts,
    name: item.name,
    entry: item.entry,
    isCurrent: false,
  }));
  return [current, ...(baseline ? [baseline] : []), ...history];
});

const selectedEntryHistoryLeft = computed(() => {
  return entryVersionViews.value.find(item => item.id === entryHistoryLeftId.value) ?? null;
});

const selectedEntryHistoryRight = computed(() => {
  return entryVersionViews.value.find(item => item.id === entryHistoryRightId.value) ?? null;
});

const canRestoreEntryFromLeft = computed(() => {
  return Boolean(selectedEntry.value && selectedEntryHistoryLeft.value && !selectedEntryHistoryLeft.value.isCurrent);
});

const worldbookVersionViews = computed<WorldbookVersionView[]>(() => {
  if (!selectedWorldbookName.value) {
    return [];
  }
  const current: WorldbookVersionView = {
    id: '__current__',
    label: '当前草稿',
    ts: Date.now(),
    entries: draftEntries.value,
    isCurrent: true,
  };
  const baseline: WorldbookVersionView | null = {
    id: '__baseline__',
    label: '加载基线',
    ts: 0,
    entries: originalEntries.value,
    isCurrent: false,
  };
  const history = snapshotsForCurrent.value.map(item => ({
    id: item.id,
    label: item.label,
    ts: item.ts,
    entries: item.entries,
    isCurrent: false,
  }));
  return [current, ...(originalEntries.value.length ? [baseline] : []), ...history];
});

const selectedWorldbookHistoryLeft = computed(() => {
  return worldbookVersionViews.value.find(item => item.id === worldbookHistoryLeftId.value) ?? null;
});

const selectedWorldbookHistoryRight = computed(() => {
  return worldbookVersionViews.value.find(item => item.id === worldbookHistoryRightId.value) ?? null;
});

const canRestoreWorldbookFromLeft = computed(() => {
  return Boolean(selectedWorldbookHistoryLeft.value && !selectedWorldbookHistoryLeft.value.isCurrent);
});

const batchExcludeTokensPreview = computed(() => parseBatchExcludeTokens(batchExcludeText.value));

const activeFindHit = computed(() => {
  if (findHitIndex.value < 0 || findHitIndex.value >= findHits.value.length) {
    return null;
  }
  return findHits.value[findHitIndex.value] ?? null;
});

const findHitSummaryText = computed(() => {
  if (!batchFindText.value.trim()) {
    return '输入查找文本后可定位';
  }
  if (!findHits.value.length) {
    return '暂无匹配';
  }
  if (!activeFindHit.value) {
    return `匹配 0 / ${findHits.value.length}`;
  }
  return `匹配 ${findHitIndex.value + 1} / ${findHits.value.length}`;
});

const entryHistoryDiff = computed(() => {
  return buildDiffHtml(
    serializeEntryVersionForDiff(selectedEntryHistoryLeft.value),
    serializeEntryVersionForDiff(selectedEntryHistoryRight.value),
  );
});

const entryHistorySummary = computed(() => {
  return getEntryVersionDiffSummary(selectedEntryHistoryLeft.value, selectedEntryHistoryRight.value);
});

const worldbookHistoryDiff = computed(() => {
  return buildDiffHtml(
    serializeWorldbookVersionForDiff(selectedWorldbookHistoryLeft.value),
    serializeWorldbookVersionForDiff(selectedWorldbookHistoryRight.value),
  );
});

const selectedKeysText = computed({
  get: () => {
    if (!selectedEntry.value) {
      return '';
    }
    return selectedEntry.value.strategy.keys.map(stringifyKeyword).join(', ');
  },
  set: (value: string) => {
    if (!selectedEntry.value) {
      return;
    }
    selectedEntry.value.strategy.keys = parseKeywordsFromText(value);
  },
});

const selectedSecondaryKeysText = computed({
  get: () => {
    if (!selectedEntry.value) {
      return '';
    }
    return selectedEntry.value.strategy.keys_secondary.keys.map(stringifyKeyword).join(', ');
  },
  set: (value: string) => {
    if (!selectedEntry.value) {
      return;
    }
    selectedEntry.value.strategy.keys_secondary.keys = parseKeywordsFromText(value);
  },
});

const selectedScanDepthText = computed({
  get: () => {
    if (!selectedEntry.value) {
      return '';
    }
    const depth = selectedEntry.value.strategy.scan_depth;
    return typeof depth === 'number' ? String(depth) : 'same_as_global';
  },
  set: (value: string) => {
    if (!selectedEntry.value) {
      return;
    }
    selectedEntry.value.strategy.scan_depth = normalizeScanDepth(value);
  },
});

const selectedRecursionDelayText = computed({
  get: () => (selectedEntry.value ? nullableNumberToText(selectedEntry.value.recursion.delay_until) : ''),
  set: (value: string) => {
    if (!selectedEntry.value) {
      return;
    }
    selectedEntry.value.recursion.delay_until = parseNullableInteger(value);
  },
});

const selectedStickyText = computed({
  get: () => (selectedEntry.value ? nullableNumberToText(selectedEntry.value.effect.sticky) : ''),
  set: (value: string) => {
    if (!selectedEntry.value) {
      return;
    }
    selectedEntry.value.effect.sticky = parseNullableInteger(value);
  },
});

const selectedCooldownText = computed({
  get: () => (selectedEntry.value ? nullableNumberToText(selectedEntry.value.effect.cooldown) : ''),
  set: (value: string) => {
    if (!selectedEntry.value) {
      return;
    }
    selectedEntry.value.effect.cooldown = parseNullableInteger(value);
  },
});

const selectedEffectDelayText = computed({
  get: () => (selectedEntry.value ? nullableNumberToText(selectedEntry.value.effect.delay) : ''),
  set: (value: string) => {
    if (!selectedEntry.value) {
      return;
    }
    selectedEntry.value.effect.delay = parseNullableInteger(value);
  },
});

const selectedContentChars = computed(() => {
  return selectedEntry.value?.content.length ?? 0;
});

const selectedTokenEstimate = computed(() => {
  const chars = selectedContentChars.value;
  if (chars <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(chars / 3.6));
});

watch(selectedWorldbookName, name => {
  closeWorldbookPicker();
  if (!name) {
    draftEntries.value = [];
    originalEntries.value = [];
    selectedEntryUid.value = null;
    return;
  }
  updatePersistedState(state => {
    state.last_worldbook = name;
  });
  void loadWorldbook(name);
});

watch(
  () => selectedEntryUid.value,
  () => {
    syncExtraTextWithSelection();
  },
);

watch(
  [
    batchFindText,
    batchReplaceText,
    batchExcludeText,
    batchUseRegex,
    batchInName,
    batchInContent,
    batchInKeys,
    batchSearchScope,
  ],
  () => {
    resetFindState();
  },
);

watch(
  entryVersionViews,
  views => {
    if (!views.length) {
      entryHistoryLeftId.value = '';
      entryHistoryRightId.value = '';
      return;
    }

    const ids = new Set(views.map(item => item.id));
    if (!ids.has(entryHistoryRightId.value)) {
      entryHistoryRightId.value = '__current__';
    }
    if (!ids.has(entryHistoryLeftId.value)) {
      const fallback = views.find(item => !item.isCurrent) ?? views[0];
      entryHistoryLeftId.value = fallback.id;
    }
    if (entryHistoryLeftId.value === entryHistoryRightId.value && views.length > 1) {
      const fallback = views.find(item => item.id !== entryHistoryRightId.value);
      if (fallback) {
        entryHistoryLeftId.value = fallback.id;
      }
    }
  },
  { immediate: true },
);

watch(
  worldbookVersionViews,
  views => {
    if (!views.length) {
      worldbookHistoryLeftId.value = '';
      worldbookHistoryRightId.value = '';
      return;
    }

    const ids = new Set(views.map(item => item.id));
    if (!ids.has(worldbookHistoryRightId.value)) {
      worldbookHistoryRightId.value = '__current__';
    }
    if (!ids.has(worldbookHistoryLeftId.value)) {
      const fallback = views.find(item => !item.isCurrent) ?? views[0];
      worldbookHistoryLeftId.value = fallback.id;
    }
    if (worldbookHistoryLeftId.value === worldbookHistoryRightId.value && views.length > 1) {
      const fallback = views.find(item => item.id !== worldbookHistoryRightId.value);
      if (fallback) {
        worldbookHistoryLeftId.value = fallback.id;
      }
    }
  },
  { immediate: true },
);

watch(
  () => selectedEntry.value?.position.type,
  () => {
    if (!selectedEntry.value) {
      return;
    }
    if (selectedEntry.value.position.type !== 'at_depth') {
      selectedEntry.value.position.role = 'system';
      selectedEntry.value.position.depth = 4;
    }
  },
);

watch(
  hasUnsavedChanges,
  dirty => {
    const target = window as unknown as Record<string, unknown>;
    target[DIRTY_STATE_KEY] = dirty;
  },
  { immediate: true },
);

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toStringSafe(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  return String(value);
}

function toNumberSafe(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' && !value.trim()) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(0, Math.floor(parsed));
}

function nullableNumberToText(value: number | null): string {
  return value === null ? '' : String(value);
}

function stringifyKeyword(value: string | RegExp): string {
  return value instanceof RegExp ? value.toString() : value;
}

function parseKeywordToken(token: string): string | RegExp {
  const trimmed = token.trim();
  if (!trimmed) {
    return '';
  }
  const regexMatch = trimmed.match(/^\/(.+)\/([dgimsuy]*)$/);
  if (!regexMatch) {
    return trimmed;
  }
  try {
    return new RegExp(regexMatch[1], regexMatch[2]);
  } catch {
    return trimmed;
  }
}

function normalizeKeywordList(value: unknown): (string | RegExp)[] {
  const sourceList = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\n,]/g) : [];
  const normalized: (string | RegExp)[] = [];
  const seen = new Set<string>();

  for (const item of sourceList) {
    const token = item instanceof RegExp ? item : parseKeywordToken(toStringSafe(item).trim());
    const tokenString = stringifyKeyword(token);
    if (!tokenString) {
      continue;
    }
    const dedupeKey = tokenString.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    normalized.push(token);
  }

  return normalized;
}

function parseKeywordsFromText(value: string): (string | RegExp)[] {
  return normalizeKeywordList(value.split(/[\n,]/g));
}

function normalizePresetRoleBindings(rawList: unknown): PresetRoleBinding[] {
  if (!Array.isArray(rawList)) {
    return [];
  }
  const normalized: PresetRoleBinding[] = [];
  const seen = new Set<string>();
  for (const item of rawList) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }
    const key = toStringSafe(record.key).trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push({
      key,
      name: toStringSafe(record.name, key),
      avatar: toStringSafe(record.avatar),
      updated_at: toNumberSafe(record.updated_at, Date.now()),
    });
  }
  return normalized;
}

function getStrategyTypeLabel(type: StrategyType): string {
  if (type === 'constant') {
    return '🔵 常驻 (constant)';
  }
  if (type === 'vectorized') {
    return '📎 向量化 (vectorized)';
  }
  return '🟢 关键词 (selective)';
}

function getSecondaryLogicLabel(logic: SecondaryLogic): string {
  const map: Record<SecondaryLogic, string> = {
    and_any: '任一命中 (and_any)',
    and_all: '全部命中 (and_all)',
    not_all: '不全命中 (not_all)',
    not_any: '全部不命中 (not_any)',
  };
  return map[logic];
}

function getPositionTypeLabel(type: PositionType): string {
  const map: Record<PositionType, string> = {
    before_character_definition: '角色设定前',
    after_character_definition: '角色设定后',
    before_example_messages: '示例消息前',
    after_example_messages: '示例消息后',
    before_author_note: '作者注释前',
    after_author_note: '作者注释后',
    at_depth: '指定深度插入',
  };
  return map[type];
}

function getEntryVisualStatus(entry: WorldbookEntry): EntryVisualStatus {
  if (!entry.enabled) {
    return 'disabled';
  }
  if (entry.strategy.type === 'constant') {
    return 'constant';
  }
  if (entry.strategy.type === 'vectorized') {
    return 'vector';
  }
  return 'normal';
}

function getEntryStatusLabel(entry: WorldbookEntry): string {
  const status = getEntryVisualStatus(entry);
  if (status === 'disabled') {
    return '⚫ 禁用';
  }
  if (status === 'constant') {
    return '🔵 常驻';
  }
  if (status === 'vector') {
    return '📎 向量化';
  }
  return '🟢 关键词';
}

function getEntryKeyPreview(entry: WorldbookEntry): string {
  const rendered = entry.strategy.keys
    .slice(0, 3)
    .map(key => stringifyKeyword(key))
    .join(' / ');
  if (!rendered) {
    return '无关键词';
  }
  if (entry.strategy.keys.length > 3) {
    return `${rendered} ...`;
  }
  return rendered;
}

function normalizeSecondaryLogic(value: unknown): SecondaryLogic {
  if (typeof value === 'string' && secondaryLogicOptions.includes(value as SecondaryLogic)) {
    return value as SecondaryLogic;
  }
  if (typeof value === 'number') {
    const map: SecondaryLogic[] = ['and_any', 'and_all', 'not_all', 'not_any'];
    return map[value] ?? 'and_any';
  }
  return 'and_any';
}

function normalizeStrategyType(
  raw: Record<string, unknown>,
  strategyRecord: Record<string, unknown> | null,
): StrategyType {
  const directType = strategyRecord?.type;
  if (typeof directType === 'string' && strategyTypeOptions.includes(directType as StrategyType)) {
    return directType as StrategyType;
  }
  if (raw.constant) {
    return 'constant';
  }
  if (raw.vectorized) {
    return 'vectorized';
  }
  return 'selective';
}

function normalizePositionType(value: unknown): PositionType {
  if (typeof value === 'string') {
    if (positionTypeOptions.includes(value as PositionType)) {
      return value as PositionType;
    }
    const depthMatch = value.match(/^at_depth_as_(system|assistant|user)$/);
    if (depthMatch) {
      return 'at_depth';
    }
  }
  if (typeof value === 'number') {
    const map: Record<number, PositionType> = {
      0: 'before_character_definition',
      1: 'after_character_definition',
      2: 'before_example_messages',
      3: 'after_example_messages',
      4: 'before_author_note',
      5: 'after_author_note',
      6: 'at_depth',
    };
    return map[value] ?? 'after_character_definition';
  }
  return 'after_character_definition';
}

function normalizeRole(value: unknown): RoleType {
  if (value === 'assistant' || value === 'user' || value === 'system') {
    return value;
  }
  if (typeof value === 'number') {
    const map: Record<number, RoleType> = {
      0: 'system',
      1: 'assistant',
      2: 'user',
    };
    return map[value] ?? 'system';
  }
  if (typeof value === 'string') {
    if (value.includes('assistant')) {
      return 'assistant';
    }
    if (value.includes('user')) {
      return 'user';
    }
  }
  return 'system';
}

function normalizeScanDepth(value: unknown): 'same_as_global' | number {
  if (value === 'same_as_global') {
    return 'same_as_global';
  }
  const numeric = Math.floor(toNumberSafe(value, NaN));
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }
  return 'same_as_global';
}

function createDefaultEntry(uid: number): WorldbookEntry {
  return {
    uid,
    name: `条目 ${uid}`,
    enabled: true,
    strategy: {
      type: 'selective',
      keys: [],
      keys_secondary: {
        logic: 'and_any',
        keys: [],
      },
      scan_depth: 'same_as_global',
    },
    position: {
      type: 'after_character_definition',
      role: 'system',
      depth: 4,
      order: 100,
    },
    content: '',
    probability: 100,
    recursion: {
      prevent_incoming: false,
      prevent_outgoing: false,
      delay_until: null,
    },
    effect: {
      sticky: null,
      cooldown: null,
      delay: null,
    },
  };
}

function collectExtraFields(raw: Record<string, unknown>): Record<string, unknown> | undefined {
  const known = new Set([
    'uid',
    'id',
    'name',
    'comment',
    'enabled',
    'disable',
    'strategy',
    'position',
    'content',
    'probability',
    'recursion',
    'effect',
    'extra',
    'keys',
    'key',
    'secondary_keys',
    'keysecondary',
    'filters',
    'logic',
    'selectiveLogic',
    'scan_depth',
    'constant',
    'vectorized',
    'selective',
    'insertion_order',
    'order',
    'role',
    'depth',
    'preventRecursion',
    'excludeRecursion',
    'delayUntilRecursion',
    'sticky',
    'cooldown',
    'delay',
    'useProbability',
  ]);

  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!known.has(key)) {
      extra[key] = value;
    }
  }
  if (Object.keys(extra).length === 0) {
    return undefined;
  }
  return extra;
}

function normalizeEntry(rawInput: unknown, fallbackUid: number): WorldbookEntry {
  const raw = asRecord(rawInput) ?? {};
  const base = createDefaultEntry(fallbackUid);
  const strategyRecord = asRecord(raw.strategy);
  const positionRecord = asRecord(raw.position);
  const recursionRecord = asRecord(raw.recursion);
  const effectRecord = asRecord(raw.effect);
  const secondaryRecord = asRecord(strategyRecord?.keys_secondary);

  const uid = Math.max(0, Math.floor(toNumberSafe(raw.uid ?? raw.id, fallbackUid)));
  const name = toStringSafe(raw.name ?? raw.comment, `条目 ${uid}`).trim() || `条目 ${uid}`;
  const strategyType = normalizeStrategyType(raw, strategyRecord);
  const keys = normalizeKeywordList(strategyRecord?.keys ?? raw.keys ?? raw.key);
  const secondaryKeys = normalizeKeywordList(
    secondaryRecord?.keys ?? raw.secondary_keys ?? raw.keysecondary ?? raw.filters,
  );
  const secondaryLogic = normalizeSecondaryLogic(secondaryRecord?.logic ?? raw.logic ?? raw.selectiveLogic);
  const positionType = normalizePositionType(positionRecord?.type ?? raw.position);
  const role = normalizeRole(positionRecord?.role ?? raw.role);
  const depth = Math.max(1, Math.floor(toNumberSafe(positionRecord?.depth ?? raw.depth, 4)));
  const order = Math.floor(toNumberSafe(positionRecord?.order ?? raw.insertion_order ?? raw.order, 100));
  const probability = clampNumber(toNumberSafe(raw.probability, 100), 0, 100);

  const preventIncoming = recursionRecord?.prevent_incoming ?? raw.preventRecursion;
  const preventOutgoing = recursionRecord?.prevent_outgoing ?? raw.excludeRecursion;

  const entry: WorldbookEntry = {
    ...base,
    uid,
    name,
    enabled: raw.enabled === undefined ? !Boolean(raw.disable) : Boolean(raw.enabled),
    strategy: {
      type: strategyType,
      keys,
      keys_secondary: {
        logic: secondaryLogic,
        keys: secondaryKeys,
      },
      scan_depth: normalizeScanDepth(strategyRecord?.scan_depth ?? raw.scan_depth),
    },
    position: {
      type: positionType,
      role: positionType === 'at_depth' ? role : 'system',
      depth: positionType === 'at_depth' ? depth : 4,
      order,
    },
    content: toStringSafe(raw.content),
    probability,
    recursion: {
      prevent_incoming: Boolean(preventIncoming),
      prevent_outgoing: Boolean(preventOutgoing),
      delay_until: parseNullableInteger(recursionRecord?.delay_until ?? raw.delayUntilRecursion),
    },
    effect: {
      sticky: parseNullableInteger(effectRecord?.sticky ?? raw.sticky),
      cooldown: parseNullableInteger(effectRecord?.cooldown ?? raw.cooldown),
      delay: parseNullableInteger(effectRecord?.delay ?? raw.delay),
    },
  };

  const directExtra = asRecord(raw.extra);
  if (directExtra && Object.keys(directExtra).length > 0) {
    entry.extra = klona(directExtra);
  } else {
    const extras = collectExtraFields(raw);
    if (extras) {
      entry.extra = klona(extras);
    }
  }

  return entry;
}

function normalizeEntryList(rawEntries: unknown[]): WorldbookEntry[] {
  const result: WorldbookEntry[] = [];
  const uidSet = new Set<number>();

  for (let index = 0; index < rawEntries.length; index += 1) {
    const rawRecord = asRecord(rawEntries[index]);
    let uid = Math.max(0, Math.floor(toNumberSafe(rawRecord?.uid ?? rawRecord?.id, index)));
    while (uidSet.has(uid)) {
      uid += 1;
    }
    uidSet.add(uid);
    result.push(normalizeEntry(rawEntries[index], uid));
  }

  return result;
}

function getNextUid(entries: WorldbookEntry[]): number {
  if (entries.length === 0) {
    return 0;
  }
  return Math.max(...entries.map(entry => entry.uid)) + 1;
}

function createDefaultPersistedState(): PersistedState {
  return {
    last_worldbook: '',
    history: {},
    entry_history: {},
    global_presets: [],
    last_global_preset_id: '',
    role_override_baseline: null,
    theme: 'ocean',
    ai_chat: { sessions: [], activeSessionId: null },
  };
}

function normalizePersistedState(input: unknown): PersistedState {
  const root = asRecord(input);
  if (!root) {
    return createDefaultPersistedState();
  }

  const historyRoot = asRecord(root.history) ?? {};
  const history: Record<string, WorldbookSnapshot[]> = {};
  for (const [name, rawSnapshots] of Object.entries(historyRoot)) {
    if (!Array.isArray(rawSnapshots)) {
      continue;
    }
    history[name] = rawSnapshots
      .map(item => {
        const record = asRecord(item);
        if (!record) {
          return null;
        }
        const entriesRaw = Array.isArray(record.entries) ? record.entries : [];
        return {
          id: toStringSafe(record.id, createId('snapshot')),
          label: toStringSafe(record.label, '快照'),
          ts: toNumberSafe(record.ts, Date.now()),
          entries: normalizeEntryList(entriesRaw),
        } satisfies WorldbookSnapshot;
      })
      .filter((item): item is WorldbookSnapshot => item !== null)
      .slice(0, HISTORY_LIMIT);
  }

  const entryHistoryRoot = asRecord(root.entry_history) ?? {};
  const entryHistory: Record<string, Record<string, EntrySnapshot[]>> = {};
  for (const [worldbookName, rawByUid] of Object.entries(entryHistoryRoot)) {
    const uidRecord = asRecord(rawByUid);
    if (!uidRecord) {
      continue;
    }
    const normalizedByUid: Record<string, EntrySnapshot[]> = {};
    for (const [uidKey, rawItems] of Object.entries(uidRecord)) {
      if (!Array.isArray(rawItems)) {
        continue;
      }
      const uidNumber = Math.max(0, Math.floor(toNumberSafe(uidKey, 0)));
      normalizedByUid[uidKey] = rawItems
        .map(item => {
          const record = asRecord(item);
          if (!record) {
            return null;
          }
          return {
            id: toStringSafe(record.id, createId('entry-snapshot')),
            label: toStringSafe(record.label, '条目快照'),
            ts: toNumberSafe(record.ts, Date.now()),
            uid: uidNumber,
            name: toStringSafe(record.name, `条目 ${uidNumber}`),
            entry: normalizeEntry(record.entry, uidNumber),
          } satisfies EntrySnapshot;
        })
        .filter((item): item is EntrySnapshot => item !== null)
        .slice(0, ENTRY_HISTORY_LIMIT);
    }
    if (Object.keys(normalizedByUid).length > 0) {
      entryHistory[worldbookName] = normalizedByUid;
    }
  }

  const globalPresetsRaw = Array.isArray(root.global_presets) ? root.global_presets : [];
  const globalPresets = globalPresetsRaw
    .map(item => {
      const record = asRecord(item);
      if (!record) {
        return null;
      }
      const worldbooksRaw = Array.isArray(record.worldbooks) ? record.worldbooks : [];
      const worldbooks = [...new Set(worldbooksRaw.map(name => toStringSafe(name).trim()).filter(Boolean))];
      const roleBindings = normalizePresetRoleBindings(record.role_bindings);
      return {
        id: toStringSafe(record.id, createId('global-preset')),
        name: toStringSafe(record.name, '未命名预设'),
        worldbooks,
        role_bindings: roleBindings,
        updated_at: toNumberSafe(record.updated_at, Date.now()),
      } satisfies GlobalWorldbookPreset;
    })
    .filter((item): item is GlobalWorldbookPreset => item !== null)
    .slice(0, GLOBAL_PRESET_LIMIT);

  const rawBaseline = asRecord(root.role_override_baseline);
  let roleOverrideBaseline: PersistedState['role_override_baseline'] = null;
  if (rawBaseline) {
    const baselineWorldbooks = Array.isArray(rawBaseline.worldbooks)
      ? rawBaseline.worldbooks.map(name => toStringSafe(name).trim()).filter(Boolean)
      : [];
    roleOverrideBaseline = {
      preset_id: toStringSafe(rawBaseline.preset_id),
      worldbooks: [...new Set(baselineWorldbooks)],
    };
  }

  const aiChatRaw = asRecord(root.ai_chat);
  const aiChat: AIGeneratorState = { sessions: [], activeSessionId: null };
  if (aiChatRaw) {
    aiChat.activeSessionId = toStringSafe(aiChatRaw.activeSessionId) || null;
    if (Array.isArray(aiChatRaw.sessions)) {
      aiChat.sessions = aiChatRaw.sessions
        .map((s: unknown) => {
          const sr = asRecord(s);
          if (!sr) return null;
          const msgs = Array.isArray(sr.messages)
            ? sr.messages.map((m: unknown) => {
                const mr = asRecord(m);
                if (!mr) return null;
                return {
                  role: mr.role === 'assistant' ? 'assistant' : 'user',
                  content: toStringSafe(mr.content),
                  timestamp: toNumberSafe(mr.timestamp, Date.now()),
                } satisfies AIChatMessage;
              }).filter((m): m is AIChatMessage => m !== null)
            : [];
          return {
            id: toStringSafe(sr.id, createId('ai-chat')),
            title: toStringSafe(sr.title, '新对话'),
            createdAt: toNumberSafe(sr.createdAt, Date.now()),
            messages: msgs.slice(0, AI_CHAT_MESSAGE_LIMIT),
          } satisfies AIChatSession;
        })
        .filter((s): s is AIChatSession => s !== null)
        .slice(0, AI_CHAT_SESSION_LIMIT);
    }
  }

  return {
    last_worldbook: toStringSafe(root.last_worldbook),
    history,
    entry_history: entryHistory,
    global_presets: globalPresets,
    last_global_preset_id: toStringSafe(root.last_global_preset_id),
    role_override_baseline: roleOverrideBaseline,
    theme: (toStringSafe(root.theme) as ThemeKey) || 'ocean',
    ai_chat: aiChat,
  };
}

function readPersistedState(): PersistedState {
  const vars = getVariables({ type: 'script', script_id: getScriptId() });
  return normalizePersistedState(vars[STORAGE_KEY]);
}

function syncSelectedGlobalPresetFromState(): void {
  const presets = persistedState.value.global_presets;
  const byId = new Set(presets.map(item => item.id));
  const preferredId = persistedState.value.last_global_preset_id;
  if (preferredId && byId.has(preferredId)) {
    selectedGlobalPresetId.value = preferredId;
    return;
  }
  if (selectedGlobalPresetId.value && byId.has(selectedGlobalPresetId.value)) {
    return;
  }
  selectedGlobalPresetId.value = '';
}

function writePersistedState(state: PersistedState): void {
  const vars = getVariables({ type: 'script', script_id: getScriptId() });
  vars[STORAGE_KEY] = state;
  replaceVariables(vars, { type: 'script', script_id: getScriptId() });
  persistedState.value = state;
  syncSelectedGlobalPresetFromState();
}

function updatePersistedState(mutator: (state: PersistedState) => void): void {
  const state = readPersistedState();
  mutator(state);
  writePersistedState(state);
}

// ── AI Chat: computed ──────────────────────────────────────────────
const aiSessions = computed(() => persistedState.value.ai_chat.sessions);

const aiActiveSession = computed((): AIChatSession | null => {
  const id = persistedState.value.ai_chat.activeSessionId;
  if (!id) return null;
  return aiSessions.value.find(s => s.id === id) ?? null;
});

const aiActiveMessages = computed((): AIChatMessage[] => aiActiveSession.value?.messages ?? []);

// ── AI Chat: CRUD ──────────────────────────────────────────────────
function aiCreateSession(): void {
  const id = createId('ai-chat');
  const session: AIChatSession = {
    id,
    title: `对话 ${aiSessions.value.length + 1}`,
    createdAt: Date.now(),
    messages: [],
  };
  updatePersistedState(state => {
    state.ai_chat.sessions.unshift(session);
    state.ai_chat.activeSessionId = id;
  });
  setStatus('已创建新对话');
}

function aiDeleteSession(id: string): void {
  updatePersistedState(state => {
    state.ai_chat.sessions = state.ai_chat.sessions.filter(s => s.id !== id);
    if (state.ai_chat.activeSessionId === id) {
      state.ai_chat.activeSessionId = state.ai_chat.sessions[0]?.id ?? null;
    }
  });
  setStatus('已删除对话');
}

function aiSwitchSession(id: string): void {
  updatePersistedState(state => {
    state.ai_chat.activeSessionId = id;
  });
}

function aiRenameSession(id: string, title: string): void {
  updatePersistedState(state => {
    const session = state.ai_chat.sessions.find(s => s.id === id);
    if (session) {
      session.title = title.trim() || session.title;
    }
  });
}

function aiAddMessage(role: 'user' | 'assistant', content: string): void {
  const sessionId = persistedState.value.ai_chat.activeSessionId;
  if (!sessionId) return;
  updatePersistedState(state => {
    const session = state.ai_chat.sessions.find(s => s.id === sessionId);
    if (session) {
      session.messages.push({ role, content, timestamp: Date.now() });
      if (session.messages.length > AI_CHAT_MESSAGE_LIMIT) {
        session.messages = session.messages.slice(-AI_CHAT_MESSAGE_LIMIT);
      }
    }
  });
}

// ── AI Chat: generate ──────────────────────────────────────────────
let aiStreamSubscription: { stop: () => void } | null = null;

async function aiSendMessage(): Promise<void> {
  const text = aiChatInputText.value.trim();
  if (!text || aiIsGenerating.value) return;

  const sessionId = persistedState.value.ai_chat.activeSessionId;
  if (!sessionId) {
    aiCreateSession();
  }

  aiChatInputText.value = '';
  aiAddMessage('user', text);

  const session = persistedState.value.ai_chat.sessions.find(
    s => s.id === persistedState.value.ai_chat.activeSessionId
  );
  if (!session) return;

  // Build prompts from session history (excluding the user message we just added since generate will use user_input)
  const historyPrompts: RolePrompt[] = session.messages.slice(0, -1).map(m => ({
    role: m.role,
    content: m.content,
  }));

  const generationId = createId('ai-gen');
  aiCurrentGenerationId.value = generationId;
  aiIsGenerating.value = true;
  aiStreamingText.value = '';

  // Subscribe to streaming events
  aiStreamSubscription = eventOn(
    iframe_events.STREAM_TOKEN_RECEIVED_FULLY,
    (fullText: string, genId: string) => {
      if (genId === generationId) {
        aiStreamingText.value = fullText;
      }
    }
  );

  try {
    const generateConfig: Parameters<typeof generate>[0] = {
      generation_id: generationId,
      user_input: text,
      should_stream: true,
      should_silence: true,
    };

    if (!aiUseContext.value) {
      // 纯净模式: 覆盖 chat_history, 不使用酒馆上下文
      generateConfig.overrides = {
        chat_history: { prompts: historyPrompts },
      };
    }
    // 附带上下文模式: 不设置 chat_history, 让酒馆构建完整 prompt (预设+世界书+正则)

    const result = await generate(generateConfig);

    aiAddMessage('assistant', result);
    aiStreamingText.value = '';

    // Auto-extract tags
    const tags = aiExtractTags(result);
    if (tags.length > 0) {
      aiExtractedTags.value = tags;
      aiShowTagReview.value = true;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`AI 生成失败: ${message}`);
    setStatus(`AI 生成失败: ${message}`);
  } finally {
    aiIsGenerating.value = false;
    aiCurrentGenerationId.value = null;
    aiStreamSubscription?.stop();
    aiStreamSubscription = null;
  }
}

function aiStopGeneration(): void {
  if (aiCurrentGenerationId.value) {
    stopGenerationById(aiCurrentGenerationId.value);
  }
}

// ── AI Chat: tag extraction ────────────────────────────────────────
function aiExtractTags(text: string): ExtractedTag[] {
  const regex = /<([^/<>\s]+)>([\s\S]*?)<\/\1>/g;
  const results: ExtractedTag[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    results.push({
      tag: match[1],
      content: match[0],
      selected: true,
    });
  }
  return results;
}

async function aiCreateSelectedEntries(): Promise<void> {
  const selected = aiExtractedTags.value.filter(t => t.selected);
  if (selected.length === 0) {
    toastr.warning('请至少勾选一个条目');
    return;
  }

  const targetName = aiTargetWorldbook.value;
  if (!targetName) {
    toastr.warning('请选择目标世界书');
    return;
  }

  try {
    const newEntries = selected.map(t => ({
      name: t.tag,
      content: t.content,
    }));

    await createWorldbookEntries(targetName, newEntries);
    toastr.success(`已创建 ${selected.length} 个条目到 "${targetName}"`);
    setStatus(`已创建 ${selected.length} 个条目到 "${targetName}"`);
    aiShowTagReview.value = false;
    aiExtractedTags.value = [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`创建条目失败: ${message}`);
  }
}

function aiToggleMode(): void {
  aiGeneratorMode.value = !aiGeneratorMode.value;
  if (aiGeneratorMode.value) {
    globalWorldbookMode.value = false;
  }
}

function setStatus(message: string): void {
  statusMessage.value = message;
}

function syncExtraTextWithSelection(): void {
  if (!selectedEntry.value || !selectedEntry.value.extra) {
    selectedExtraText.value = '';
    return;
  }
  selectedExtraText.value = JSON.stringify(selectedEntry.value.extra, null, 2);
}

function formatDateTime(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return String(timestamp);
  }
}

function formatHistoryOptionLabel(label: string, ts: number, isCurrent: boolean): string {
  if (isCurrent) {
    return 'Current（当前）';
  }
  if (label === '加载基线' || ts <= 0) {
    return label;
  }
  return `${label} · ${formatDateTime(ts)}`;
}

function getEntryVersionPreview(view: EntryVersionView | null): string {
  if (!view) {
    return '';
  }
  const content = toStringSafe(view.entry.content).replace(/\s+/g, ' ').trim();
  if (!content) {
    return '(空内容)';
  }
  return content.slice(0, 160);
}

function getWorldbookVersionDiffSummary(
  left: WorldbookVersionView | null,
  right: WorldbookVersionView | null,
): string {
  if (!left || !right) {
    return '请选择左右版本进行对比';
  }
  const leftMap = new Map<number, WorldbookEntry>();
  const rightMap = new Map<number, WorldbookEntry>();
  left.entries.forEach(entry => leftMap.set(entry.uid, entry));
  right.entries.forEach(entry => rightMap.set(entry.uid, entry));

  let added = 0;
  let removed = 0;
  let changed = 0;

  for (const [uid, rightEntry] of rightMap) {
    const leftEntry = leftMap.get(uid);
    if (!leftEntry) {
      added += 1;
      continue;
    }
    if (JSON.stringify(leftEntry) !== JSON.stringify(rightEntry)) {
      changed += 1;
    }
  }
  for (const uid of leftMap.keys()) {
    if (!rightMap.has(uid)) {
      removed += 1;
    }
  }

  return `新增 ${added} / 修改 ${changed} / 删除 ${removed}`;
}

function getEntryVersionDiffSummary(left: EntryVersionView | null, right: EntryVersionView | null): string {
  if (!left || !right) {
    return '请在左侧选择两个版本进行比对';
  }
  const leftText = serializeEntryVersionForDiff(left);
  const rightText = serializeEntryVersionForDiff(right);
  const parts = diffLines(leftText, rightText) as Array<{ value: string; added?: boolean; removed?: boolean }>;
  let addLines = 0;
  let delLines = 0;
  for (const part of parts) {
    const lines = part.value.split('\n');
    if (lines.length && lines[lines.length - 1] === '') {
      lines.pop();
    }
    if (part.added) {
      addLines += lines.length;
    } else if (part.removed) {
      delLines += lines.length;
    }
  }
  const changed = Math.min(addLines, delLines);
  const added = Math.max(0, addLines - changed);
  const removed = Math.max(0, delLines - changed);
  return `新增行 ${added} / 修改行 ${changed} / 删除行 ${removed}`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function serializeEntryVersionForDiff(view: EntryVersionView | null): string {
  if (!view) {
    return '';
  }
  const entry = view.entry;
  const payload = {
    uid: entry.uid,
    name: entry.name,
    enabled: entry.enabled,
    strategy: entry.strategy,
    position: entry.position,
    probability: entry.probability,
    recursion: entry.recursion,
    effect: entry.effect,
    content: entry.content,
    extra: entry.extra ?? null,
  };
  return JSON.stringify(payload, null, 2);
}

function serializeWorldbookVersionForDiff(view: WorldbookVersionView | null): string {
  if (!view) {
    return '';
  }
  const entries = view.entries
    .map(entry => ({
      uid: entry.uid,
      name: entry.name,
      enabled: entry.enabled,
      type: entry.strategy.type,
      keys: entry.strategy.keys.map(stringifyKeyword),
      position: entry.position,
      probability: entry.probability,
      content: entry.content,
    }))
    .sort((left, right) => left.uid - right.uid);
  return JSON.stringify({ entries }, null, 2);
}

function buildDiffHtml(leftText: string, rightText: string): { leftHtml: string; rightHtml: string } {
  const leftRendered: string[] = [];
  const rightRendered: string[] = [];
  let leftLineNo = 1;
  let rightLineNo = 1;
  const parts = diffLines(leftText, rightText);

  for (const part of parts as Array<{ value: string; added?: boolean; removed?: boolean }>) {
    const lines = part.value.split('\n');
    if (lines.length && lines[lines.length - 1] === '') {
      lines.pop();
    }
    if (!lines.length) {
      continue;
    }

    if (part.added) {
      for (const line of lines) {
        leftRendered.push(`<div class="diff-row empty"><span class="line-no"></span><span class="line-text">&nbsp;</span></div>`);
        rightRendered.push(
          `<div class="diff-row add"><span class="line-no">${rightLineNo}</span><span class="line-text">${escapeHtml(line) || '&nbsp;'}</span></div>`,
        );
        rightLineNo += 1;
      }
      continue;
    }

    if (part.removed) {
      for (const line of lines) {
        leftRendered.push(
          `<div class="diff-row del"><span class="line-no">${leftLineNo}</span><span class="line-text">${escapeHtml(line) || '&nbsp;'}</span></div>`,
        );
        rightRendered.push(`<div class="diff-row empty"><span class="line-no"></span><span class="line-text">&nbsp;</span></div>`);
        leftLineNo += 1;
      }
      continue;
    }

    for (const line of lines) {
      const safe = escapeHtml(line) || '&nbsp;';
      leftRendered.push(`<div class="diff-row"><span class="line-no">${leftLineNo}</span><span class="line-text">${safe}</span></div>`);
      rightRendered.push(`<div class="diff-row"><span class="line-no">${rightLineNo}</span><span class="line-text">${safe}</span></div>`);
      leftLineNo += 1;
      rightLineNo += 1;
    }
  }

  return {
    leftHtml: leftRendered.join(''),
    rightHtml: rightRendered.join(''),
  };
}

function parseBatchExcludeTokens(value: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const raw of value.split(/[\n,]/g)) {
    const token = raw.trim().toLowerCase();
    if (!token || seen.has(token)) {
      continue;
    }
    seen.add(token);
    tokens.push(token);
  }
  return tokens;
}

function shouldExcludeEntryForBatch(entry: WorldbookEntry, tokens: string[]): boolean {
  if (!tokens.length) {
    return false;
  }
  const name = entry.name.toLowerCase();
  const content = entry.content.toLowerCase();
  const keys = entry.strategy.keys.map(key => stringifyKeyword(key).toLowerCase()).join(' ');
  const secondaryKeys = entry.strategy.keys_secondary.keys.map(key => stringifyKeyword(key).toLowerCase()).join(' ');

  for (const token of tokens) {
    const uidMatch = token.match(/^(?:#|uid:)?(\d+)$/);
    if (uidMatch && Number(uidMatch[1]) === entry.uid) {
      return true;
    }

    const scoped = token.match(/^(name|content|keys|secondary|secondary_keys):(.+)$/);
    if (scoped) {
      const scope = scoped[1];
      const needle = scoped[2].trim();
      if (!needle) {
        continue;
      }

      if (scope === 'name' && name.includes(needle)) {
        return true;
      }
      if (scope === 'content' && content.includes(needle)) {
        return true;
      }
      if (scope === 'keys' && keys.includes(needle)) {
        return true;
      }
      if ((scope === 'secondary' || scope === 'secondary_keys') && secondaryKeys.includes(needle)) {
        return true;
      }
      continue;
    }

    const plain = token.trim();
    if (!plain) {
      continue;
    }

    if (
      name.includes(plain) ||
      content.includes(plain) ||
      keys.includes(plain) ||
      secondaryKeys.includes(plain)
    ) {
      return true;
    }
  }
  return false;
}

function getFindFieldLabel(field: FindFieldKey): string {
  if (field === 'name') {
    return '名称';
  }
  if (field === 'content') {
    return '内容';
  }
  return '关键词';
}

function resolveBatchRegex(findText: string): RegExp | null {
  if (!batchUseRegex.value) {
    return null;
  }
  try {
    return new RegExp(findText, 'g');
  } catch (error) {
    toastr.error(`正则表达式无效: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function getBatchTargetEntries(): WorldbookEntry[] {
  if (batchSearchScope.value === 'current') {
    return selectedEntry.value ? [selectedEntry.value] : [];
  }
  return draftEntries.value;
}

function getEnabledFindFields(): FindFieldKey[] {
  const fields: FindFieldKey[] = [];
  if (batchInName.value) {
    fields.push('name');
  }
  if (batchInContent.value) {
    fields.push('content');
  }
  if (batchInKeys.value) {
    fields.push('keys');
  }
  return fields;
}

function getEntryFieldText(entry: WorldbookEntry, field: FindFieldKey): string {
  if (field === 'name') {
    return entry.name;
  }
  if (field === 'content') {
    return entry.content;
  }
  return entry.strategy.keys.map(key => stringifyKeyword(key)).join(', ');
}

function collectMatchIndexes(text: string, findText: string, regex: RegExp | null): Array<{ start: number; end: number; matchedText: string }> {
  const hits: Array<{ start: number; end: number; matchedText: string }> = [];
  if (!text || !findText) {
    return hits;
  }

  if (!regex) {
    let cursor = 0;
    while (cursor <= text.length) {
      const start = text.indexOf(findText, cursor);
      if (start < 0) {
        break;
      }
      const end = start + findText.length;
      hits.push({
        start,
        end,
        matchedText: text.slice(start, end),
      });
      cursor = Math.max(end, start + 1);
    }
    return hits;
  }

  const runtime = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  let result: RegExpExecArray | null = null;
  while ((result = runtime.exec(text)) !== null) {
    const matched = result[0] ?? '';
    if (!matched) {
      runtime.lastIndex += 1;
      continue;
    }
    const start = result.index;
    const end = start + matched.length;
    hits.push({
      start,
      end,
      matchedText: matched,
    });
  }
  return hits;
}

function buildFindPreview(text: string, start: number, end: number): string {
  const left = Math.max(0, start - 18);
  const right = Math.min(text.length, end + 22);
  const prefix = left > 0 ? '...' : '';
  const suffix = right < text.length ? '...' : '';
  return `${prefix}${text.slice(left, right).replace(/\s+/g, ' ')}${suffix}`;
}

function collectFindHits(findText: string, regex: RegExp | null, excludeTokens: string[]): FindHit[] {
  const fields = getEnabledFindFields();
  if (!fields.length) {
    return [];
  }
  const entries = getBatchTargetEntries();
  const hits: FindHit[] = [];

  for (const entry of entries) {
    if (shouldExcludeEntryForBatch(entry, excludeTokens)) {
      continue;
    }
    for (const field of fields) {
      const text = getEntryFieldText(entry, field);
      const indexes = collectMatchIndexes(text, findText, regex);
      for (const match of indexes) {
        hits.push({
          entryUid: entry.uid,
          entryName: entry.name,
          field,
          start: match.start,
          end: match.end,
          matchedText: match.matchedText,
          preview: buildFindPreview(text, match.start, match.end),
        });
      }
    }
  }

  return hits;
}

function isSameFindHit(left: FindHit, right: FindHit): boolean {
  return (
    left.entryUid === right.entryUid &&
    left.field === right.field &&
    left.start === right.start &&
    left.end === right.end &&
    left.matchedText === right.matchedText
  );
}

function resetFindState(): void {
  findHits.value = [];
  findHitIndex.value = -1;
}

function getFindTargetElement(field: FindFieldKey): HTMLInputElement | HTMLTextAreaElement | null {
  const root = editorShellRef.value;
  if (!root) {
    return null;
  }
  if (field === 'name') {
    return root.querySelector('.editor-comment input.text-input');
  }
  if (field === 'content') {
    return root.querySelector('.editor-content-area');
  }
  return root.querySelector('.editor-keyword-grid .field textarea');
}

function getTextareaLineHeight(element: HTMLTextAreaElement): number {
  const style = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(style.lineHeight);
  if (Number.isFinite(lineHeight) && lineHeight > 0) {
    return lineHeight;
  }
  const fontSize = Number.parseFloat(style.fontSize);
  if (Number.isFinite(fontSize) && fontSize > 0) {
    return fontSize * 1.4;
  }
  return 18;
}

function scrollTextareaToSelection(element: HTMLTextAreaElement, start: number): void {
  const lineHeight = getTextareaLineHeight(element);
  const before = element.value.slice(0, start);
  const lineIndex = before.split('\n').length - 1;
  const desiredTop = Math.max(0, lineIndex * lineHeight - element.clientHeight * 0.35);
  element.scrollTop = desiredTop;
}

async function revealFindHitInEditor(hit: FindHit): Promise<void> {
  await nextTick();
  let target = getFindTargetElement(hit.field);
  if (!target) {
    await nextTick();
    target = getFindTargetElement(hit.field);
    if (!target) {
      return;
    }
  }

  const maxLen = target.value.length;
  const start = Math.max(0, Math.min(hit.start, maxLen));
  const end = Math.max(start, Math.min(hit.end, maxLen));

  target.focus();
  target.setSelectionRange(start, end);
  if (target instanceof HTMLTextAreaElement) {
    scrollTextareaToSelection(target, start);
  }
  target.scrollIntoView({ block: 'center', inline: 'nearest' });
  requestAnimationFrame(() => {
    target?.scrollIntoView({ block: 'center', inline: 'nearest' });
    if (target instanceof HTMLTextAreaElement) {
      scrollTextareaToSelection(target, start);
    }
  });
}

function moveToFindHit(hit: FindHit, index: number, total: number): void {
  findHitIndex.value = index;
  selectedEntryUid.value = hit.entryUid;
  void revealFindHitInEditor(hit);
  const entryLabel = hit.entryName || `条目 ${hit.entryUid}`;
  setStatus(`查找 ${index + 1}/${total}: ${entryLabel} · ${getFindFieldLabel(hit.field)} · ${hit.preview}`);
}

function runFind(step: -1 | 0 | 1): void {
  const findText = batchFindText.value;
  if (!findText) {
    toastr.warning('请先输入查找文本');
    return;
  }

  if (!getEnabledFindFields().length) {
    toastr.warning('请至少勾选一个查找字段');
    return;
  }

  if (batchSearchScope.value === 'current' && !selectedEntry.value) {
    toastr.warning('当前条目模式下请先选择一个条目');
    return;
  }

  const excludeTokens = parseBatchExcludeTokens(batchExcludeText.value);
  const regex = resolveBatchRegex(findText);
  if (batchUseRegex.value && !regex) {
    return;
  }

  const hits = collectFindHits(findText, regex, excludeTokens);
  findHits.value = hits;

  if (!hits.length) {
    findHitIndex.value = -1;
    setStatus('查找完成：未找到匹配');
    toastr.info('未找到匹配项');
    return;
  }

  if (step === 0) {
    moveToFindHit(hits[0], 0, hits.length);
    return;
  }

  const prevHit = activeFindHit.value;
  const currentIndex = prevHit ? hits.findIndex(item => isSameFindHit(item, prevHit)) : findHitIndex.value;
  let nextIndex: number;
  if (currentIndex < 0) {
    nextIndex = step > 0 ? 0 : hits.length - 1;
  } else {
    nextIndex = (currentIndex + step + hits.length) % hits.length;
  }
  moveToFindHit(hits[nextIndex], nextIndex, hits.length);
}

function findFirstMatch(): void {
  runFind(0);
}

function findNextMatch(): void {
  runFind(1);
}

function findPreviousMatch(): void {
  runFind(-1);
}

function ensureSelectedEntryExists(): void {
  if (!draftEntries.value.length) {
    selectedEntryUid.value = null;
    return;
  }
  if (selectedEntryUid.value === null) {
    selectedEntryUid.value = draftEntries.value[0].uid;
    return;
  }
  const exists = draftEntries.value.some(entry => entry.uid === selectedEntryUid.value);
  if (!exists) {
    selectedEntryUid.value = draftEntries.value[0].uid;
  }
}

function selectEntry(uid: number): void {
  selectedEntryUid.value = uid;
  if (isMobile.value) {
    mobileTab.value = 'edit';
  }
}

function goBackToList(): void {
  selectedEntryUid.value = null;
  mobileTab.value = 'list';
}

function createEntrySnapshotRecord(
  label: string,
  uid: number,
  name: string,
  entry: WorldbookEntry,
): EntrySnapshot {
  return {
    id: createId('entry-snapshot'),
    label,
    ts: Date.now(),
    uid,
    name: name || `条目 ${uid}`,
    entry: normalizeEntry(klona(entry), uid),
  };
}

function pushEntrySnapshotsBulk(
  items: Array<{
    label: string;
    uid: number;
    name: string;
    entry: WorldbookEntry;
  }>,
): number {
  if (!selectedWorldbookName.value || !items.length) {
    return 0;
  }

  let added = 0;
  const worldbookName = selectedWorldbookName.value;

  updatePersistedState(state => {
    const byWorldbook = state.entry_history[worldbookName] ?? {};

    for (const item of items) {
      const uidKey = String(item.uid);
      const incoming = createEntrySnapshotRecord(item.label, item.uid, item.name, item.entry);
      const list = byWorldbook[uidKey] ?? [];

      if (list[0] && JSON.stringify(list[0].entry) === JSON.stringify(incoming.entry)) {
        continue;
      }

      list.unshift(incoming);
      if (list.length > ENTRY_HISTORY_LIMIT) {
        list.length = ENTRY_HISTORY_LIMIT;
      }
      byWorldbook[uidKey] = list;
      added += 1;
    }

    state.entry_history[worldbookName] = byWorldbook;
  });

  return added;
}

function pushEntrySnapshot(label: string, entry: WorldbookEntry): boolean {
  const added = pushEntrySnapshotsBulk([
    {
      label,
      uid: entry.uid,
      name: entry.name,
      entry,
    },
  ]);
  return added > 0;
}

function collectEntrySnapshotsBeforeSave(): Array<{
  label: string;
  uid: number;
  name: string;
  entry: WorldbookEntry;
}> {
  const result: Array<{
    label: string;
    uid: number;
    name: string;
    entry: WorldbookEntry;
  }> = [];
  const draftByUid = new Map<number, WorldbookEntry>();
  draftEntries.value.forEach(entry => {
    draftByUid.set(entry.uid, entry);
  });

  for (const previous of originalEntries.value) {
    const current = draftByUid.get(previous.uid);
    if (!current) {
      result.push({
        label: '保存前（删除前）',
        uid: previous.uid,
        name: previous.name,
        entry: previous,
      });
      continue;
    }
    if (JSON.stringify(previous) !== JSON.stringify(current)) {
      result.push({
        label: '保存前',
        uid: previous.uid,
        name: previous.name,
        entry: previous,
      });
    }
  }

  return result;
}

function pushSnapshot(label: string): void {
  if (!selectedWorldbookName.value) {
    return;
  }
  const worldbookName = selectedWorldbookName.value;
  const snapshot: WorldbookSnapshot = {
    id: createId('snapshot'),
    label,
    ts: Date.now(),
    entries: klona(draftEntries.value),
  };

  updatePersistedState(state => {
    const list = state.history[worldbookName] ?? [];
    list.unshift(snapshot);
    if (list.length > HISTORY_LIMIT) {
      list.length = HISTORY_LIMIT;
    }
    state.history[worldbookName] = list;
  });
}

function createManualSnapshot(): void {
  if (!selectedWorldbookName.value) {
    toastr.warning('请先选择世界书');
    return;
  }
  pushSnapshot('手动快照');
  toastr.success('已创建快照');
}

function openEntryHistoryModal(): void {
  if (!selectedEntry.value) {
    toastr.warning('请先选择条目');
    return;
  }
  const nonCurrent = entryVersionViews.value.find(item => !item.isCurrent) ?? null;
  entryHistoryRightId.value = '__current__';
  entryHistoryLeftId.value = nonCurrent?.id ?? '__current__';
  showEntryHistoryModal.value = true;
}

function openWorldbookHistoryModal(): void {
  if (!selectedWorldbookName.value) {
    toastr.warning('请先选择世界书');
    return;
  }
  const nonCurrent = worldbookVersionViews.value.find(item => !item.isCurrent) ?? null;
  worldbookHistoryRightId.value = '__current__';
  worldbookHistoryLeftId.value = nonCurrent?.id ?? '__current__';
  showWorldbookHistoryModal.value = true;
}

function createManualEntrySnapshot(): void {
  if (!selectedEntry.value) {
    toastr.warning('请先选择条目');
    return;
  }
  const added = pushEntrySnapshot('手动条目快照', selectedEntry.value);
  if (added) {
    toastr.success('已记录当前条目快照');
  } else {
    toastr.info('当前条目与最近快照一致，未重复记录');
  }
}

function restoreSnapshot(snapshotId: string): void {
  const snapshot = snapshotsForCurrent.value.find(item => item.id === snapshotId);
  if (!snapshot) {
    return;
  }
  if (!confirm(`回滚到快照 "${snapshot.label}" ? 当前未保存修改会被覆盖。`)) {
    return;
  }
  draftEntries.value = normalizeEntryList(snapshot.entries);
  ensureSelectedEntryExists();
  setStatus(`已回滚到快照：${snapshot.label}`);
}

function restoreWorldbookFromLeftHistory(): void {
  const target = selectedWorldbookHistoryLeft.value;
  if (!target || target.isCurrent) {
    return;
  }
  if (!confirm(`恢复到 Left 版本 "${target.label}" ? 当前未保存修改会被覆盖。`)) {
    return;
  }
  draftEntries.value = normalizeEntryList(klona(target.entries));
  ensureSelectedEntryExists();
  setStatus(`已从时光机恢复：${target.label}`);
  toastr.success('已恢复整本世界书到 Left 版本');
}

function deleteSnapshot(snapshotId: string): void {
  if (!selectedWorldbookName.value) {
    return;
  }
  updatePersistedState(state => {
    const list = state.history[selectedWorldbookName.value] ?? [];
    state.history[selectedWorldbookName.value] = list.filter(item => item.id !== snapshotId);
  });
}

function clearCurrentSnapshots(): void {
  if (!selectedWorldbookName.value || !snapshotsForCurrent.value.length) {
    return;
  }
  if (!confirm(`清空 "${selectedWorldbookName.value}" 的全部快照？`)) {
    return;
  }
  updatePersistedState(state => {
    delete state.history[selectedWorldbookName.value];
  });
}

function restoreEntrySnapshot(snapshotId: string): void {
  if (!selectedEntry.value || selectedEntryIndex.value < 0) {
    return;
  }
  const snapshot = entrySnapshotsForSelected.value.find(item => item.id === snapshotId);
  if (!snapshot) {
    return;
  }
  if (!confirm(`回滚当前条目到快照 "${snapshot.label}" ?`)) {
    return;
  }

  // 回滚前自动留一份，便于撤回
  pushEntrySnapshot('回滚前自动快照', selectedEntry.value);

  const restored = normalizeEntry(klona(snapshot.entry), selectedEntry.value.uid);
  restored.uid = selectedEntry.value.uid;
  draftEntries.value.splice(selectedEntryIndex.value, 1, restored);
  selectedEntryUid.value = restored.uid;
  setStatus(`已回滚条目到快照：${snapshot.label}`);
  toastr.success('已恢复条目快照');
}

function restoreEntryFromLeftHistory(): void {
  const target = selectedEntryHistoryLeft.value;
  if (!target || target.isCurrent) {
    return;
  }
  if (!selectedEntry.value || selectedEntryIndex.value < 0) {
    return;
  }
  if (!confirm(`回滚当前条目到 "${target.label}" ?`)) {
    return;
  }
  pushEntrySnapshot('回滚前自动快照', selectedEntry.value);
  const restored = normalizeEntry(klona(target.entry), selectedEntry.value.uid);
  restored.uid = selectedEntry.value.uid;
  draftEntries.value.splice(selectedEntryIndex.value, 1, restored);
  selectedEntryUid.value = restored.uid;
  setStatus(`已从条目时光机恢复：${target.label}`);
  toastr.success('已恢复条目到 Left 版本');
}

function deleteEntrySnapshot(snapshotId: string): void {
  if (!selectedWorldbookName.value || !selectedEntry.value) {
    return;
  }
  const worldbookName = selectedWorldbookName.value;
  const uidKey = String(selectedEntry.value.uid);
  updatePersistedState(state => {
    const byWorldbook = state.entry_history[worldbookName] ?? {};
    const list = byWorldbook[uidKey] ?? [];
    byWorldbook[uidKey] = list.filter(item => item.id !== snapshotId);
    state.entry_history[worldbookName] = byWorldbook;
  });
}

function clearCurrentEntrySnapshots(): void {
  if (!selectedWorldbookName.value || !selectedEntry.value || !entrySnapshotsForSelected.value.length) {
    return;
  }
  if (!confirm(`清空条目 #${selectedEntry.value.uid} 的历史快照？`)) {
    return;
  }
  const worldbookName = selectedWorldbookName.value;
  const uidKey = String(selectedEntry.value.uid);
  updatePersistedState(state => {
    const byWorldbook = state.entry_history[worldbookName] ?? {};
    delete byWorldbook[uidKey];
    state.entry_history[worldbookName] = byWorldbook;
  });
}

function handleSelectedPositionTypeChanged(): void {
  if (!selectedEntry.value) {
    return;
  }
  if (selectedEntry.value.position.type !== 'at_depth') {
    selectedEntry.value.position.role = 'system';
    selectedEntry.value.position.depth = 4;
  }
}

function applyExtraJson(): void {
  if (!selectedEntry.value) {
    return;
  }
  const text = selectedExtraText.value.trim();
  if (!text) {
    selectedEntry.value.extra = undefined;
    return;
  }
  try {
    const parsed = JSON.parse(text);
    const parsedRecord = asRecord(parsed);
    if (!parsedRecord) {
      throw new Error('extra 必须是 JSON 对象');
    }
    selectedEntry.value.extra = klona(parsedRecord);
    toastr.success('extra 已应用');
  } catch (error) {
    toastr.error(`extra JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function clearExtra(): void {
  if (!selectedEntry.value) {
    return;
  }
  selectedEntry.value.extra = undefined;
  selectedExtraText.value = '';
}

function addEntry(): void {
  const uid = getNextUid(draftEntries.value);
  const entry = createDefaultEntry(uid);
  draftEntries.value.push(entry);
  selectedEntryUid.value = uid;
  setStatus(`已新增条目 #${uid}`);
}

function duplicateSelectedEntry(): void {
  if (!selectedEntry.value || selectedEntryIndex.value < 0) {
    return;
  }
  const uid = getNextUid(draftEntries.value);
  const duplicated = normalizeEntry(klona(selectedEntry.value), uid);
  duplicated.uid = uid;
  duplicated.name = `${duplicated.name} (副本)`;
  draftEntries.value.splice(selectedEntryIndex.value + 1, 0, duplicated);
  selectedEntryUid.value = uid;
  setStatus(`已复制条目 #${selectedEntry.value.uid}`);
}

function removeSelectedEntry(): void {
  if (!selectedEntry.value || selectedEntryIndex.value < 0) {
    return;
  }
  if (!confirm(`确定删除条目 "${selectedEntry.value.name}" ?`)) {
    return;
  }
  pushEntrySnapshot('删除前快照', selectedEntry.value);
  draftEntries.value.splice(selectedEntryIndex.value, 1);
  if (isMobile.value) {
    selectedEntryUid.value = null;
  } else {
    ensureSelectedEntryExists();
  }
  setStatus('已删除条目');
}

function moveSelectedEntry(direction: -1 | 1): void {
  if (selectedEntryIndex.value < 0) {
    return;
  }
  const target = selectedEntryIndex.value + direction;
  if (target < 0 || target >= draftEntries.value.length) {
    return;
  }
  const [entry] = draftEntries.value.splice(selectedEntryIndex.value, 1);
  draftEntries.value.splice(target, 0, entry);
  selectedEntryUid.value = entry.uid;
}

function normalizeAllEntries(): void {
  draftEntries.value = normalizeEntryList(draftEntries.value.map(entry => klona(entry)));
  ensureSelectedEntryExists();
  setStatus('已完成条目标准化');
}

function sortEntriesByOrderDesc(): void {
  draftEntries.value.sort((left, right) => right.position.order - left.position.order);
  ensureSelectedEntryExists();
  setStatus('已按 order 降序排列');
}

function setEnabledForAll(enabled: boolean): void {
  draftEntries.value.forEach(entry => {
    entry.enabled = enabled;
  });
  setStatus(enabled ? '已启用全部条目' : '已禁用全部条目');
}

function applyBatchReplace(): void {
  const findText = batchFindText.value;
  if (!findText) {
    toastr.warning('请先输入查找文本');
    return;
  }
  if (!getEnabledFindFields().length) {
    toastr.warning('请至少勾选一个查找字段');
    return;
  }
  if (batchSearchScope.value === 'current' && !selectedEntry.value) {
    toastr.warning('当前条目模式下请先选择一个条目');
    return;
  }

  const targetEntries = getBatchTargetEntries();
  if (!targetEntries.length) {
    toastr.warning('没有可处理的条目');
    return;
  }

  const excludeTokens = parseBatchExcludeTokens(batchExcludeText.value);
  const regex = resolveBatchRegex(findText);
  if (batchUseRegex.value && !regex) {
    return;
  }

  let touched = 0;
  let skipped = 0;
  for (const entry of targetEntries) {
    if (shouldExcludeEntryForBatch(entry, excludeTokens)) {
      skipped += 1;
      continue;
    }

    let changed = false;

    if (batchInName.value) {
      const next = regex
        ? entry.name.replace(regex, batchReplaceText.value)
        : entry.name.split(findText).join(batchReplaceText.value);
      if (next !== entry.name) {
        entry.name = next;
        changed = true;
      }
    }

    if (batchInContent.value) {
      const next = regex
        ? entry.content.replace(regex, batchReplaceText.value)
        : entry.content.split(findText).join(batchReplaceText.value);
      if (next !== entry.content) {
        entry.content = next;
        changed = true;
      }
    }

    if (batchInKeys.value) {
      const nextKeys = entry.strategy.keys.map(key => {
        const text = stringifyKeyword(key);
        return regex ? text.replace(regex, batchReplaceText.value) : text.split(findText).join(batchReplaceText.value);
      });
      const normalized = normalizeKeywordList(nextKeys);
      if (
        JSON.stringify(normalized.map(stringifyKeyword)) !== JSON.stringify(entry.strategy.keys.map(stringifyKeyword))
      ) {
        entry.strategy.keys = normalized;
        changed = true;
      }
    }

    if (changed) {
      touched += 1;
    }
  }

  resetFindState();
  setStatus(
    `查找替换完成（${batchSearchScope.value === 'current' ? '当前条目' : '全部条目'}），修改 ${touched} 条，排除 ${skipped} 条`,
  );
}

function downloadJson(filename: string, payload: unknown): void {
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function exportCurrentWorldbook(): void {
  if (!selectedWorldbookName.value) {
    return;
  }
  const payload = {
    format: 'worldbook_assistant_v1',
    name: selectedWorldbookName.value,
    exported_at: new Date().toISOString(),
    entries: draftEntries.value,
  };
  const filename = `${selectedWorldbookName.value.replace(/[\\/:*?"<>|]/g, '_')}.json`;
  downloadJson(filename, payload);
}

function collectRawEntries(root: Record<string, unknown>): unknown[] {
  if (Array.isArray(root.entries)) {
    return root.entries;
  }
  const entriesMap = asRecord(root.entries);
  if (entriesMap) {
    return Object.values(entriesMap);
  }
  const dataRoot = asRecord(root.data);
  if (dataRoot) {
    if (Array.isArray(dataRoot.entries)) {
      return dataRoot.entries;
    }
    const dataEntriesMap = asRecord(dataRoot.entries);
    if (dataEntriesMap) {
      return Object.values(dataEntriesMap);
    }
  }
  return [];
}

function parseImportedPayload(fileName: string, text: string): ImportedPayload {
  const parsed = JSON.parse(text) as unknown;
  const fallbackName = fileName.replace(/\.[^/.]+$/, '') || '导入世界书';

  if (Array.isArray(parsed)) {
    return {
      name: fallbackName,
      entries: normalizeEntryList(parsed),
    };
  }

  const root = asRecord(parsed);
  if (!root) {
    throw new Error('导入内容必须是 JSON 对象或数组');
  }

  const entries = collectRawEntries(root);
  if (!entries.length) {
    throw new Error('未识别到有效的 entries');
  }

  const dataRoot = asRecord(root.data);
  const nameCandidate = toStringSafe(root.name ?? dataRoot?.name, fallbackName).trim();

  return {
    name: nameCandidate || fallbackName,
    entries: normalizeEntryList(entries),
  };
}

function triggerImport(): void {
  importFileInput.value?.click();
}

async function onImportChange(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement | null;
  const file = target?.files?.[0];
  if (!file) {
    return;
  }

  const fileText = await file.text();
  try {
    const payload = parseImportedPayload(file.name, fileText);
    const suggested = payload.name || file.name.replace(/\.[^/.]+$/, '');
    const newNameRaw = prompt('请输入新世界书名称', suggested);
    const newName = toStringSafe(newNameRaw).trim();
    if (!newName) {
      return;
    }
    await createOrReplaceWorldbook(newName, payload.entries, { render: 'immediate' });
    await reloadWorldbookNames(newName);
    await refreshBindings();
    toastr.success(`已导入为新世界书: ${newName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const shouldFallback = confirm(`解析导入文件失败: ${message}\n是否尝试按酒馆原生方式导入？`);
    if (!shouldFallback) {
      return;
    }
    const response = await importRawWorldbook(file.name, fileText);
    if (!response.ok) {
      throw new Error(`原生导入失败: HTTP ${response.status}`);
    }
    await hardRefresh();
    toastr.success('已按酒馆原生方式导入');
  } finally {
    if (target) {
      target.value = '';
    }
  }
}

async function refreshBindings(): Promise<void> {
  bindings.global = [...getGlobalWorldbookNames()];
  try {
    const charBindings = getCharWorldbookNames('current');
    bindings.charPrimary = charBindings.primary;
    bindings.charAdditional = [...charBindings.additional];
  } catch {
    bindings.charPrimary = null;
    bindings.charAdditional = [];
  }

  try {
    bindings.chat = getChatWorldbookName('current');
  } catch {
    bindings.chat = null;
  }
  if (globalWorldbookMode.value) {
    ensureSelectionForGlobalMode();
  }
}

function resolveContextWorldbookCandidate(): string | null {
  const available = worldbookNames.value;
  if (!available.length) {
    return null;
  }
  const chatBound = toStringSafe(bindings.chat).trim();
  if (chatBound && available.includes(chatBound)) {
    return chatBound;
  }
  const charPrimary = toStringSafe(bindings.charPrimary).trim();
  if (charPrimary && available.includes(charPrimary)) {
    return charPrimary;
  }
  const charAdditional = bindings.charAdditional.find(name => available.includes(name));
  return charAdditional ?? null;
}

function ensureSelectionForGlobalMode(): void {
  if (!globalWorldbookMode.value) {
    return;
  }
  const globals = selectableWorldbookNames.value;
  if (!globals.length) {
    selectedWorldbookName.value = '';
    return;
  }
  if (!globals.includes(selectedWorldbookName.value)) {
    selectedWorldbookName.value = globals[0];
  }
}

function trySelectWorldbookByContext(options: { preferWhenEmptyOnly?: boolean; force?: boolean } = {}): boolean {
  if (globalWorldbookMode.value) {
    return false;
  }
  if (options.preferWhenEmptyOnly && selectedWorldbookName.value) {
    return false;
  }
  const candidate = resolveContextWorldbookCandidate();
  if (!candidate || candidate === selectedWorldbookName.value) {
    return false;
  }
  if (!options.force && hasUnsavedChanges.value) {
    setStatus('检测到聊天/角色世界书变更，但当前有未保存修改，已跳过自动切换');
    return false;
  }
  selectedWorldbookName.value = candidate;
  setStatus(`已自动定位到上下文世界书: ${candidate}`);
  return true;
}

function toggleGlobalMode(): void {
  globalWorldbookMode.value = !globalWorldbookMode.value;
  if (globalWorldbookMode.value) {
    aiGeneratorMode.value = false;
    ensureSelectionForGlobalMode();
    setStatus('已切换到全局世界书模式');
    return;
  }
  if (!selectedWorldbookName.value) {
    trySelectWorldbookByContext({ force: true });
  }
  setStatus('已切换到上下文世界书模式');
}

async function applyGlobalWorldbooks(nextGlobal: string[], statusLabel = '已更新全局世界书'): Promise<boolean> {
  const normalized = [...new Set(nextGlobal.map(name => name.trim()).filter(Boolean))].filter(name =>
    worldbookNames.value.includes(name),
  );
  try {
    await rebindGlobalWorldbooks(normalized);
    await refreshBindings();
    ensureSelectionForGlobalMode();
    setStatus(`${statusLabel}（${normalized.length} 本）`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`更新全局世界书失败: ${message}`);
    return false;
  }
}

function addFirstGlobalCandidate(): void {
  const first = globalAddCandidates.value[0];
  if (!first) {
    return;
  }
  void addGlobalWorldbook(first);
}

async function addGlobalWorldbook(name: string): Promise<void> {
  if (!name || bindings.global.includes(name)) {
    return;
  }
  const success = await applyGlobalWorldbooks([...bindings.global, name], `已添加到全局: ${name}`);
  if (success) {
    globalAddSearchText.value = '';
    updatePersistedState(state => {
      state.role_override_baseline = null;
    });
  }
}

async function removeGlobalWorldbook(name: string): Promise<void> {
  if (!name || !bindings.global.includes(name)) {
    return;
  }
  const success = await applyGlobalWorldbooks(
    bindings.global.filter(item => item !== name),
    `已移出全局: ${name}`,
  );
  if (success) {
    updatePersistedState(state => {
      state.role_override_baseline = null;
    });
  }
}

async function clearGlobalWorldbooks(): Promise<void> {
  if (!bindings.global.length) {
    return;
  }
  if (!confirm('确定清空所有全局世界书吗？')) {
    return;
  }
  const success = await applyGlobalWorldbooks([], '已清空全局世界书');
  if (success) {
    updatePersistedState(state => {
      state.role_override_baseline = null;
    });
  }
}

function getCurrentGlobalWorldbookSet(): string[] {
  return [...new Set(bindings.global.map(name => name.trim()).filter(Boolean))];
}

function normalizeWorldbookSet(input: string[]): string[] {
  return [...new Set(input.map(name => name.trim()).filter(Boolean))];
}

function isSameWorldbookSet(left: string[], right: string[]): boolean {
  const leftSorted = [...normalizeWorldbookSet(left)].sort();
  const rightSorted = [...normalizeWorldbookSet(right)].sort();
  if (leftSorted.length !== rightSorted.length) {
    return false;
  }
  for (let index = 0; index < leftSorted.length; index += 1) {
    if (leftSorted[index] !== rightSorted[index]) {
      return false;
    }
  }
  return true;
}

function refreshRoleBindingCandidates(): void {
  let names: string[] = [];
  try {
    names = typeof getCharacterNames === 'function' ? getCharacterNames() : [];
  } catch (error) {
    console.warn('[WorldbookAssistant] getCharacterNames failed:', error);
  }

  const dedupe = new Set<string>();
  const result: PresetRoleBinding[] = [];

  for (const charName of names) {
    const trimmed = charName.trim();
    if (!trimmed) {
      continue;
    }
    const key = `char:${trimmed}`;
    if (dedupe.has(key)) {
      continue;
    }
    dedupe.add(key);
    result.push({
      key,
      name: trimmed,
      avatar: '',
      updated_at: Date.now(),
    });
  }

  result.sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'));

  const current = resolveCurrentRoleContext();
  if (current && !result.some(item => item.key === current.key)) {
    result.unshift(current);
  }
  roleBindingSourceCandidates.value = result;
}

function resolveCurrentRoleContext(): PresetRoleBinding | null {
  let name: string | null = null;
  try {
    name = typeof getCurrentCharacterName === 'function' ? getCurrentCharacterName() : null;
  } catch (error) {
    console.warn('[WorldbookAssistant] getCurrentCharacterName failed:', error);
  }
  if (!name) {
    return null;
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return null;
  }
  return {
    key: `char:${trimmed}`,
    name: trimmed,
    avatar: '',
    updated_at: Date.now(),
  };
}

function refreshCurrentRoleContext(): void {
  currentRoleContext.value = resolveCurrentRoleContext();
}

async function applyPresetWorldbooks(
  preset: GlobalWorldbookPreset,
  options: { statusPrefix?: string; silentWhenSame?: boolean } = {},
): Promise<boolean> {
  const normalized = normalizeWorldbookSet(preset.worldbooks);
  const missing = normalized.filter(name => !worldbookNames.value.includes(name));
  const matched = normalized.filter(name => worldbookNames.value.includes(name));

  if (options.silentWhenSame && isSameWorldbookSet(getCurrentGlobalWorldbookSet(), matched)) {
    updatePersistedState(state => {
      state.last_global_preset_id = preset.id;
    });
    return true;
  }

  const statusPrefix = options.statusPrefix ?? '已应用预设';
  const success = await applyGlobalWorldbooks(matched, `${statusPrefix}: ${preset.name}`);
  if (!success) {
    return false;
  }
  updatePersistedState(state => {
    state.last_global_preset_id = preset.id;
  });
  if (missing.length) {
    toastr.warning(`预设内有 ${missing.length} 本世界书在当前环境不存在，已自动忽略`);
  }
  return true;
}

async function applySelectedGlobalPreset(): Promise<void> {
  const preset = selectedGlobalPreset.value;
  if (!preset) {
    return;
  }
  const success = await applyPresetWorldbooks(preset);
  if (success) {
    updatePersistedState(state => {
      state.role_override_baseline = null;
    });
  }
}

function getRoleBoundPresetForCurrentContext(): GlobalWorldbookPreset | null {
  const role = currentRoleContext.value;
  if (!role) {
    return null;
  }
  return (
    globalWorldbookPresets.value.find(item => item.role_bindings.some(binding => binding.key === role.key)) ?? null
  );
}

async function autoApplyRoleBoundPreset(): Promise<void> {
  const rolePreset = getRoleBoundPresetForCurrentContext();
  if (!rolePreset) {
    const baseline = persistedState.value.role_override_baseline;
    if (baseline) {
      updatePersistedState(state => {
        state.role_override_baseline = null;
        state.last_global_preset_id = baseline.preset_id;
      });
      selectedGlobalPresetId.value = baseline.preset_id;
      if (baseline.preset_id) {
        const baselinePreset = globalWorldbookPresets.value.find(item => item.id === baseline.preset_id);
        if (baselinePreset) {
          await applyPresetWorldbooks(baselinePreset, {
            statusPrefix: '已恢复角色切换前的预设',
            silentWhenSame: true,
          });
        } else {
          await applyGlobalWorldbooks(
            baseline.worldbooks,
            '已恢复角色切换前的全局世界书',
          );
        }
      } else {
        await applyGlobalWorldbooks(
          baseline.worldbooks,
          '已恢复角色切换前的全局世界书',
        );
      }
    }
    return;
  }
  if (!persistedState.value.role_override_baseline) {
    updatePersistedState(state => {
      state.role_override_baseline = {
        preset_id: selectedGlobalPresetId.value,
        worldbooks: getCurrentGlobalWorldbookSet(),
      };
    });
  }
  selectedGlobalPresetId.value = rolePreset.id;
  await applyPresetWorldbooks(rolePreset, {
    statusPrefix: `已按角色自动切换预设（${currentRoleContext.value?.name ?? '当前角色'}）`,
    silentWhenSame: true,
  });
}

function onGlobalPresetSelectionChanged(): void {
  closeRolePicker();
  if (!selectedGlobalPresetId.value) {
    updatePersistedState(state => {
      state.last_global_preset_id = '';
      state.role_override_baseline = null;
    });
    if (bindings.global.length) {
      void applyGlobalWorldbooks([], '已切换到默认预设（清空全局世界书）');
    } else {
      setStatus('已切换到默认预设');
    }
    return;
  }
  void applySelectedGlobalPreset();
}

function bindRoleToSelectedPreset(role: PresetRoleBinding): void {
  const preset = selectedGlobalPreset.value;
  if (!preset) {
    toastr.warning('请先选择预设');
    return;
  }
  updatePersistedState(state => {
    state.global_presets = (state.global_presets ?? []).map(item => {
      if (item.id !== preset.id) {
        return item;
      }
      const nextBindings = normalizePresetRoleBindings([
        ...item.role_bindings.filter(binding => binding.key !== role.key),
        {
          key: role.key,
          name: role.name,
          avatar: role.avatar,
          updated_at: Date.now(),
        } satisfies PresetRoleBinding,
      ]);
      return {
        ...item,
        role_bindings: nextBindings,
        updated_at: Date.now(),
      };
    });
    state.last_global_preset_id = preset.id;
  });
  setStatus(`已绑定角色到预设: ${role.name} → ${preset.name}`);
}

function bindCurrentRoleToSelectedPreset(): void {
  const role = currentRoleContext.value;
  if (!role) {
    toastr.warning('当前没有可绑定的角色');
    return;
  }
  bindRoleToSelectedPreset(role);
}

function bindRoleCandidateToSelectedPreset(candidate: RoleBindingCandidate): void {
  if (candidate.bound) {
    return;
  }
  bindRoleToSelectedPreset(candidate);
  closeRolePicker();
}

function removeRoleBindingFromSelectedPreset(bindingKey: string): void {
  const preset = selectedGlobalPreset.value;
  if (!preset || !bindingKey) {
    return;
  }
  updatePersistedState(state => {
    state.global_presets = (state.global_presets ?? []).map(item => {
      if (item.id !== preset.id) {
        return item;
      }
      return {
        ...item,
        role_bindings: item.role_bindings.filter(binding => binding.key !== bindingKey),
        updated_at: Date.now(),
      };
    });
  });
}

function unbindCurrentRoleFromSelectedPreset(): void {
  const role = currentRoleContext.value;
  if (!role) {
    toastr.warning('当前没有可解绑的角色');
    return;
  }
  removeRoleBindingFromSelectedPreset(role.key);
  setStatus(`已解绑角色: ${role.name}`);
}

function saveCurrentAsGlobalPreset(): void {
  const current = getCurrentGlobalWorldbookSet();
  if (!current.length) {
    toastr.warning('当前全局世界书为空，无法保存预设');
    return;
  }
  const defaultName = selectedGlobalPreset.value?.name || `全局预设 ${globalWorldbookPresets.value.length + 1}`;
  const nameRaw = prompt('请输入预设名称', defaultName);
  const name = toStringSafe(nameRaw).trim();
  if (!name) {
    return;
  }
  const sameNamePreset = globalWorldbookPresets.value.find(item => item.name === name);
  if (sameNamePreset && !confirm(`预设 "${name}" 已存在，是否覆盖？`)) {
    return;
  }
  const presetId = sameNamePreset?.id || createId('global-preset');
  const nextPreset: GlobalWorldbookPreset = {
    id: presetId,
    name,
    worldbooks: current,
    role_bindings: sameNamePreset?.role_bindings ?? [],
    updated_at: Date.now(),
  };
  updatePersistedState(state => {
    const list = (state.global_presets ?? []).filter(item => item.id !== presetId);
    list.unshift(nextPreset);
    state.global_presets = list.slice(0, GLOBAL_PRESET_LIMIT);
    state.last_global_preset_id = presetId;
  });
  selectedGlobalPresetId.value = presetId;
  setStatus(`已保存预设: ${name}（${current.length} 本）`);
  toastr.success(`已保存预设: ${name}`);
}

function overwriteSelectedGlobalPreset(): void {
  const preset = selectedGlobalPreset.value;
  if (!preset) {
    return;
  }
  const current = getCurrentGlobalWorldbookSet();
  if (!current.length) {
    toastr.warning('当前全局世界书为空，无法覆盖预设');
    return;
  }
  if (!confirm(`确定用当前全局世界书覆盖预设 "${preset.name}" 吗？`)) {
    return;
  }
  updatePersistedState(state => {
    state.global_presets = (state.global_presets ?? []).map(item => {
      if (item.id !== preset.id) {
        return item;
      }
      return {
        ...item,
        worldbooks: current,
        updated_at: Date.now(),
      };
    });
    state.last_global_preset_id = preset.id;
  });
  setStatus(`已覆盖预设: ${preset.name}（${current.length} 本）`);
  toastr.success(`已覆盖预设: ${preset.name}`);
}

function deleteSelectedGlobalPreset(): void {
  const preset = selectedGlobalPreset.value;
  if (!preset) {
    return;
  }
  if (!confirm(`确定删除预设 "${preset.name}" 吗？`)) {
    return;
  }
  updatePersistedState(state => {
    state.global_presets = (state.global_presets ?? []).filter(item => item.id !== preset.id);
    if (state.last_global_preset_id === preset.id) {
      state.last_global_preset_id = '';
    }
  });
  selectedGlobalPresetId.value = '';
  setStatus(`已删除预设: ${preset.name}`);
}

function closeWorldbookPicker(): void {
  worldbookPickerOpen.value = false;
}

function closeRolePicker(): void {
  rolePickerOpen.value = false;
}

function openWorldbookPicker(): void {
  worldbookPickerSearchText.value = '';
  worldbookPickerOpen.value = true;
  void nextTick(() => {
    worldbookPickerSearchInputRef.value?.focus();
  });
}

function openRolePicker(): void {
  if (!selectedGlobalPreset.value) {
    return;
  }
  roleBindSearchText.value = '';
  refreshRoleBindingCandidates();
  rolePickerOpen.value = true;
  void nextTick(() => {
    rolePickerSearchInputRef.value?.focus();
  });
}

function toggleWorldbookPicker(): void {
  if (worldbookPickerOpen.value) {
    closeWorldbookPicker();
    return;
  }
  openWorldbookPicker();
}

function toggleRolePicker(): void {
  if (rolePickerOpen.value) {
    closeRolePicker();
    return;
  }
  void openRolePicker();
}

function toggleTheme(): void {
  const keys = Object.keys(THEMES) as ThemeKey[];
  const index = keys.indexOf(currentTheme.value);
  const nextIndex = (index + 1) % keys.length;
  currentTheme.value = keys[nextIndex];
  setStatus(`已切换主题: ${THEMES[currentTheme.value].name}`);
}

function setTheme(key: ThemeKey): void {
  currentTheme.value = key;
  themePickerOpen.value = false;
  setStatus(`已切换主题: ${THEMES[key].label}`);
}

function onSetThemeEvent(event: Event): void {
  const key = (event as CustomEvent).detail as string;
  if (key && key in THEMES) {
    setTheme(key as ThemeKey);
  }
}

function selectWorldbookFromPicker(name: string): void {
  if (!name) {
    return;
  }
  selectedWorldbookName.value = name;
  closeWorldbookPicker();
}

function bindFirstRoleCandidate(): void {
  const first = roleBindingCandidates.value.find(item => !item.bound);
  if (!first) {
    return;
  }
  bindRoleCandidateToSelectedPreset(first);
}

function onHostPointerDownForWorldbookPicker(event: PointerEvent): void {
  if (!worldbookPickerOpen.value && !rolePickerOpen.value && !themePickerOpen.value) {
    return;
  }
  const target = event.target as Node | null;
  if (!target) {
    closeWorldbookPicker();
    closeRolePicker();
    themePickerOpen.value = false;
    return;
  }

  if (worldbookPickerOpen.value) {
    const worldbookRoot = worldbookPickerRef.value;
    if (!worldbookRoot || !worldbookRoot.contains(target)) {
      closeWorldbookPicker();
    }
  }

  if (rolePickerOpen.value) {
    const roleRoot = rolePickerRef.value;
    if (!roleRoot || !roleRoot.contains(target)) {
      closeRolePicker();
    }
  }

  if (themePickerOpen.value) {
    themePickerOpen.value = false;
  }
}

function onHostKeyDownForWorldbookPicker(event: KeyboardEvent): void {
  if (!worldbookPickerOpen.value && !rolePickerOpen.value) {
    return;
  }
  if (event.key === 'Escape') {
    closeWorldbookPicker();
    closeRolePicker();
  }
}

async function loadWorldbook(name: string): Promise<void> {
  if (!name) {
    return;
  }
  isBusy.value = true;
  try {
    const rawEntries = await getWorldbook(name);
    const normalized = normalizeEntryList(rawEntries);
    draftEntries.value = klona(normalized);
    originalEntries.value = klona(normalized);
    ensureSelectedEntryExists();
    setStatus(`已加载 "${name}"，条目 ${normalized.length}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`读取世界书失败: ${message}`);
    setStatus(`读取失败: ${message}`);
  } finally {
    isBusy.value = false;
  }
}

async function reloadWorldbookNames(preferred?: string): Promise<void> {
  const names = [...getWorldbookNames()].sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'));
  worldbookNames.value = names;

  if (!names.length) {
    selectedWorldbookName.value = '';
    draftEntries.value = [];
    originalEntries.value = [];
    selectedEntryUid.value = null;
    return;
  }

  const fallbackName = persistedState.value.last_worldbook;
  const candidate =
    (preferred && names.includes(preferred) && preferred) ||
    (fallbackName && names.includes(fallbackName) && fallbackName) ||
    selectedWorldbookName.value ||
    names[0];

  if (candidate && selectedWorldbookName.value !== candidate) {
    selectedWorldbookName.value = candidate;
    return;
  }

  if (selectedWorldbookName.value && !draftEntries.value.length) {
    await loadWorldbook(selectedWorldbookName.value);
  }
}

async function hardRefresh(): Promise<void> {
  persistedState.value = readPersistedState();
  syncSelectedGlobalPresetFromState();
  await reloadWorldbookNames(selectedWorldbookName.value || undefined);
  await refreshBindings();
  refreshRoleBindingCandidates();
  refreshCurrentRoleContext();
  await autoApplyRoleBoundPreset();
  if (globalWorldbookMode.value) {
    ensureSelectionForGlobalMode();
  } else {
    trySelectWorldbookByContext({ preferWhenEmptyOnly: true });
  }
  setStatus('已刷新世界书和绑定信息');
}

async function saveCurrentWorldbook(): Promise<void> {
  if (!selectedWorldbookName.value) {
    toastr.warning('请先选择世界书');
    return;
  }
  if (!hasUnsavedChanges.value) {
    setStatus('当前没有需要保存的修改');
    return;
  }
  isSaving.value = true;
  try {
    draftEntries.value = normalizeEntryList(draftEntries.value.map(entry => klona(entry)));
    const pendingEntrySnapshots = collectEntrySnapshotsBeforeSave();
    const savedEntrySnapshotCount = pushEntrySnapshotsBulk(pendingEntrySnapshots);
    await replaceWorldbook(selectedWorldbookName.value, klona(draftEntries.value), { render: 'immediate' });
    originalEntries.value = klona(draftEntries.value);
    pushSnapshot('保存后快照');
    await refreshBindings();
    toastr.success(`已保存: ${selectedWorldbookName.value}`);
    setStatus(`保存成功: ${selectedWorldbookName.value}（条目历史 +${savedEntrySnapshotCount}）`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`保存失败: ${message}`);
    setStatus(`保存失败: ${message}`);
  } finally {
    isSaving.value = false;
  }
}

async function createNewWorldbook(): Promise<void> {
  const nameRaw = prompt('请输入新世界书名称');
  const name = toStringSafe(nameRaw).trim();
  if (!name) {
    return;
  }
  try {
    await createOrReplaceWorldbook(name, [], { render: 'immediate' });
    await reloadWorldbookNames(name);
    await refreshBindings();
    toastr.success(`已创建世界书: ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`创建失败: ${message}`);
  }
}

async function duplicateWorldbook(): Promise<void> {
  if (!selectedWorldbookName.value) {
    return;
  }
  const suggested = `${selectedWorldbookName.value}_copy`;
  const newNameRaw = prompt('请输入复制后的名称', suggested);
  const newName = toStringSafe(newNameRaw).trim();
  if (!newName) {
    return;
  }
  try {
    await createOrReplaceWorldbook(newName, klona(draftEntries.value), { render: 'immediate' });
    await reloadWorldbookNames(newName);
    await refreshBindings();
    toastr.success(`已复制为: ${newName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`复制失败: ${message}`);
  }
}

async function deleteCurrentWorldbook(): Promise<void> {
  if (!selectedWorldbookName.value) {
    return;
  }
  const current = selectedWorldbookName.value;
  if (!confirm(`确定删除世界书 "${current}" ?`)) {
    return;
  }
  try {
    const success = await deleteWorldbook(current);
    if (!success) {
      throw new Error('返回 false');
    }
    updatePersistedState(state => {
      delete state.history[current];
      delete state.entry_history[current];
    });
    toastr.success(`已删除: ${current}`);
    await reloadWorldbookNames();
    await refreshBindings();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toastr.error(`删除失败: ${message}`);
  }
}

async function toggleGlobalBinding(): Promise<void> {
  if (!selectedWorldbookName.value) {
    return;
  }
  const next = new Set(getGlobalWorldbookNames());
  if (next.has(selectedWorldbookName.value)) {
    next.delete(selectedWorldbookName.value);
  } else {
    next.add(selectedWorldbookName.value);
  }
  await applyGlobalWorldbooks([...next], '已更新全局绑定');
}

function pushActivationLogs(entries: Array<{ world: string } & Record<string, unknown>>): void {
  const logs = entries.map(item => {
    const uid = item.uid ?? item.displayIndex ?? '?';
    const name = toStringSafe(item.name ?? item.comment, `UID ${uid}`);
    const content = toStringSafe(item.content).replace(/\s+/g, ' ').trim().slice(0, 80);
    return {
      id: createId('activation'),
      time: Date.now(),
      world: toStringSafe(item.world, 'unknown'),
      uid: typeof uid === 'number' || typeof uid === 'string' ? uid : '?',
      name,
      contentPreview: content || '(空内容)',
    } satisfies ActivationLog;
  });
  activationLogs.value.unshift(...logs);
  if (activationLogs.value.length > ACTIVATION_LOG_LIMIT) {
    activationLogs.value.length = ACTIVATION_LOG_LIMIT;
  }
}

function clearActivationLogs(): void {
  activationLogs.value = [];
}

function resolveHostWindow(): Window {
  return mainLayoutRef.value?.ownerDocument?.defaultView ?? editorShellRef.value?.ownerDocument?.defaultView ?? window;
}

function clampFloatingPanelToViewport(panel: FloatingPanelState): void {
  const hostWin = resolveHostWindow();
  const viewportWidth = hostWin.innerWidth;
  const viewportHeight = hostWin.innerHeight;
  const maxX = Math.max(8, viewportWidth - panel.width - 8);
  const maxY = Math.max(8, viewportHeight - 68);
  panel.x = clampNumber(panel.x, 8, maxX);
  panel.y = clampNumber(panel.y, 8, maxY);
}

function handleFloatingWindowResize(): void {
  const hostWin = resolveHostWindow();
  viewportWidth.value = hostWin.innerWidth;
  clampPaneWidths();
  for (const key of floatingPanelKeys) {
    if (!floatingPanels[key].visible) {
      continue;
    }
    clampFloatingPanelToViewport(floatingPanels[key]);
  }
}

function bringFloatingToFront(key: FloatingPanelKey): void {
  floatingZCounter.value += 1;
  floatingPanels[key].z = floatingZCounter.value;
}

function openFloatingPanel(key: FloatingPanelKey): void {
  const panel = floatingPanels[key];
  panel.visible = true;
  clampFloatingPanelToViewport(panel);
  bringFloatingToFront(key);
}

function closeFloatingPanel(key: FloatingPanelKey): void {
  floatingPanels[key].visible = false;
  if (activeFloatingDrag.value?.key === key) {
    stopFloatingDrag();
  }
}

function toggleFloatingPanel(key: FloatingPanelKey): void {
  if (floatingPanels[key].visible) {
    closeFloatingPanel(key);
    return;
  }
  openFloatingPanel(key);
}

function getFloatingPanelStyle(key: FloatingPanelKey): Record<string, string> {
  const panel = floatingPanels[key];
  return {
    left: `${panel.x}px`,
    top: `${panel.y}px`,
    zIndex: String(panel.z),
    width: `${panel.width}px`,
  };
}

function startFloatingDrag(key: FloatingPanelKey, event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }
  const panel = floatingPanels[key];
  const target = event.currentTarget as HTMLElement | null;
  if (!target) {
    return;
  }
  const hostDoc = target.ownerDocument ?? document;
  const hostWin = hostDoc.defaultView ?? window;
  const rect = target.getBoundingClientRect();
  bringFloatingToFront(key);
  const dragState = {
    key,
    pointerId: event.pointerId,
    offsetX: event.clientX - panel.x,
    offsetY: event.clientY - panel.y,
    doc: hostDoc,
    win: hostWin,
  };
  activeFloatingDrag.value = dragState;
  target.setPointerCapture?.(event.pointerId);
  hostDoc.addEventListener('pointermove', onFloatingDragMove);
  hostDoc.addEventListener('pointerup', stopFloatingDrag);
  hostDoc.addEventListener('pointercancel', stopFloatingDrag);
  hostWin.addEventListener('blur', stopFloatingDrag);
  panel.x = clampNumber(event.clientX - dragState.offsetX, 8, Math.max(8, hostWin.innerWidth - panel.width - 8));
  panel.y = clampNumber(event.clientY - dragState.offsetY, 8, Math.max(8, hostWin.innerHeight - rect.height - 8));
  event.preventDefault();
}

function onFloatingDragMove(event: PointerEvent): void {
  const drag = activeFloatingDrag.value;
  if (!drag) {
    return;
  }
  if (event.pointerId !== drag.pointerId) {
    return;
  }
  const panel = floatingPanels[drag.key];
  panel.x = clampNumber(event.clientX - drag.offsetX, 8, Math.max(8, drag.win.innerWidth - panel.width - 8));
  panel.y = clampNumber(event.clientY - drag.offsetY, 8, Math.max(8, drag.win.innerHeight - 68));
}

function stopFloatingDrag(): void {
  const drag = activeFloatingDrag.value;
  if (drag) {
    drag.doc.removeEventListener('pointermove', onFloatingDragMove);
    drag.doc.removeEventListener('pointerup', stopFloatingDrag);
    drag.doc.removeEventListener('pointercancel', stopFloatingDrag);
    drag.win.removeEventListener('blur', stopFloatingDrag);
  }
  activeFloatingDrag.value = null;
}

function clampPaneWidths(): void {
  if (isCompactLayout.value) {
    return;
  }

  const mainRect = mainLayoutRef.value?.getBoundingClientRect();
  if (mainRect) {
    const maxLeft = Math.max(MAIN_PANE_MIN, Math.floor(mainRect.width - MAIN_EDITOR_MIN - RESIZE_HANDLE_SIZE));
    mainPaneWidth.value = clampNumber(mainPaneWidth.value, MAIN_PANE_MIN, maxLeft);
  }

  const editorRect = editorShellRef.value?.getBoundingClientRect();
  if (editorRect) {
    const maxSide = Math.max(EDITOR_SIDE_MIN, Math.floor(editorRect.width - EDITOR_CENTER_MIN - RESIZE_HANDLE_SIZE));
    editorSideWidth.value = clampNumber(editorSideWidth.value, EDITOR_SIDE_MIN, maxSide);
  }
}

function startContentResize(e: PointerEvent): void {
  e.preventDefault();
  const textarea = contentTextareaRef.value;
  if (!textarea) return;

  const startY = e.clientY;
  const startHeight = textarea.offsetHeight;
  const target = e.currentTarget as HTMLElement;
  target.setPointerCapture(e.pointerId);

  // Disable textarea interaction during drag to reduce reflow
  textarea.style.pointerEvents = 'none';
  textarea.style.willChange = 'height';

  let rafId = 0;
  let pendingHeight = startHeight;

  const applyHeight = () => {
    textarea.style.height = `${pendingHeight}px`;
    textarea.style.minHeight = `${pendingHeight}px`;
    rafId = 0;
  };

  const onMove = (ev: PointerEvent) => {
    pendingHeight = Math.max(120, startHeight + (ev.clientY - startY));
    if (!rafId) {
      rafId = requestAnimationFrame(applyHeight);
    }
  };

  const onUp = () => {
    if (rafId) cancelAnimationFrame(rafId);
    applyHeight();
    textarea.style.pointerEvents = '';
    textarea.style.willChange = '';
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', onUp);
  };

  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onUp);
}

const editorContentBlockRef = ref<HTMLElement | null>(null);
let contentTopDragOffset = 0;

function startContentTopDrag(e: PointerEvent): void {
  e.preventDefault();
  const block = editorContentBlockRef.value;
  if (!block) return;

  const startY = e.clientY;
  const startOffset = contentTopDragOffset;
  const target = e.currentTarget as HTMLElement;
  target.setPointerCapture(e.pointerId);

  let rafId = 0;
  let pendingOffset = startOffset;

  const apply = () => {
    block.style.marginTop = `${-pendingOffset}px`;
    rafId = 0;
  };

  const onMove = (ev: PointerEvent) => {
    const delta = startY - ev.clientY; // positive = drag up
    pendingOffset = Math.max(0, Math.min(400, startOffset + delta));
    if (!rafId) {
      rafId = requestAnimationFrame(apply);
    }
  };

  const onUp = () => {
    if (rafId) cancelAnimationFrame(rafId);
    contentTopDragOffset = pendingOffset;
    apply();
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', onUp);
  };

  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onUp);
}

function startPaneResize(key: PaneResizeKey, event: PointerEvent): void {
  if (isCompactLayout.value) {
    return;
  }
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }
  const target = event.currentTarget as HTMLElement | null;
  const hostDoc = target?.ownerDocument ?? document;
  const hostWin = hostDoc.defaultView ?? window;
  paneResizeState.value = {
    key,
    pointerId: event.pointerId,
    doc: hostDoc,
    win: hostWin,
  };
  target?.setPointerCapture?.(event.pointerId);
  hostDoc.addEventListener('pointermove', onPaneResizeMove);
  hostDoc.addEventListener('pointerup', stopPaneResize);
  hostDoc.addEventListener('pointercancel', stopPaneResize);
  hostWin.addEventListener('blur', stopPaneResize);
  event.preventDefault();
}

function onPaneResizeMove(event: PointerEvent): void {
  const state = paneResizeState.value;
  if (!state || event.pointerId !== state.pointerId) {
    return;
  }
  if (state.key === 'main') {
    const rect = mainLayoutRef.value?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const left = Math.floor(event.clientX - rect.left);
    const maxLeft = Math.max(MAIN_PANE_MIN, Math.floor(rect.width - MAIN_EDITOR_MIN - RESIZE_HANDLE_SIZE));
    mainPaneWidth.value = clampNumber(left, MAIN_PANE_MIN, maxLeft);
    return;
  }

  const rect = editorShellRef.value?.getBoundingClientRect();
  if (!rect) {
    return;
  }
  const side = Math.floor(rect.right - event.clientX);
  const maxSide = Math.max(EDITOR_SIDE_MIN, Math.floor(rect.width - EDITOR_CENTER_MIN - RESIZE_HANDLE_SIZE));
  editorSideWidth.value = clampNumber(side, EDITOR_SIDE_MIN, maxSide);
}

function stopPaneResize(): void {
  const state = paneResizeState.value;
  if (state) {
    state.doc.removeEventListener('pointermove', onPaneResizeMove);
    state.doc.removeEventListener('pointerup', stopPaneResize);
    state.doc.removeEventListener('pointercancel', stopPaneResize);
    state.win.removeEventListener('blur', stopPaneResize);
  }
  paneResizeState.value = null;
}

function onPanelRefresh(): void {
  void hardRefresh();
}

function onPanelSave(): void {
  void saveCurrentWorldbook();
}

function discardUnsavedDraft(): void {
  if (!hasUnsavedChanges.value) {
    const target = window as unknown as Record<string, unknown>;
    target[DIRTY_STATE_KEY] = false;
    return;
  }
  draftEntries.value = klona(originalEntries.value);
  ensureSelectedEntryExists();
  resetFindState();
  setStatus('已放弃未保存修改');
}

function onPanelDiscard(): void {
  discardUnsavedDraft();
}

const rootRef = ref<HTMLElement | null>(null);
let _rootResizeObserver: ResizeObserver | null = null;
let _mobileResizeHandler: (() => void) | null = null;

onMounted(() => {
  // Fix mobile height: compute exact pixel height based on viewport position
  if (isMobile.value && rootRef.value) {
    const hostWin = (() => { try { return window.parent || window; } catch { return window; } })();
    const el = rootRef.value;

    const syncHeight = () => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = hostWin.innerHeight || window.innerHeight || 0;
      const available = vh - rect.top;
      if (available > 0) {
        el.style.height = available + 'px';
        el.style.maxHeight = available + 'px';
        el.style.overflow = 'hidden';
      }
    };

    // Initial + delayed (wait for layout)
    syncHeight();
    requestAnimationFrame(syncHeight);
    setTimeout(syncHeight, 100);
    setTimeout(syncHeight, 500);

    // Respond to resize
    _mobileResizeHandler = syncHeight;
    hostWin.addEventListener('resize', syncHeight);

    // Also observe parent just in case
    const parent = el.parentElement;
    if (parent) {
      _rootResizeObserver = new ResizeObserver(syncHeight);
      _rootResizeObserver.observe(parent);
    }
  }
  persistedState.value = readPersistedState();
  syncSelectedGlobalPresetFromState();

  subscriptions.push(
    eventOn(tavern_events.WORLD_INFO_ACTIVATED, entries => {
      pushActivationLogs(entries as Array<{ world: string } & Record<string, unknown>>);
    }),
  );
  subscriptions.push(
    eventOn(tavern_events.WORLDINFO_UPDATED, () => {
      void hardRefresh();
    }),
  );
  subscriptions.push(
    eventOn(tavern_events.CHAT_CHANGED, () => {
      void (async () => {
        await refreshBindings();
        refreshRoleBindingCandidates();
        refreshCurrentRoleContext();
        await autoApplyRoleBoundPreset();
        if (globalWorldbookMode.value) {
          ensureSelectionForGlobalMode();
          return;
        }
        trySelectWorldbookByContext();
      })();
    }),
  );

  window.addEventListener('wb-helper:refresh', onPanelRefresh);
  window.addEventListener('wb-helper:save', onPanelSave);
  window.addEventListener('wb-helper:discard', onPanelDiscard);
  window.addEventListener('wb-helper:toggle-theme', toggleTheme);
  window.addEventListener('wb-helper:set-theme', onSetThemeEvent);
  hostResizeWindow.value = resolveHostWindow();
  const hostDoc = hostResizeWindow.value.document;
  hostDoc.addEventListener('pointerdown', onHostPointerDownForWorldbookPicker, true);
  hostDoc.addEventListener('keydown', onHostKeyDownForWorldbookPicker, true);
  hostResizeWindow.value.addEventListener('resize', handleFloatingWindowResize);

  handleFloatingWindowResize();
  updateHostPanelTheme();
  void hardRefresh();
});

onUnmounted(() => {
  _rootResizeObserver?.disconnect();
  _rootResizeObserver = null;
  if (_mobileResizeHandler) {
    try { (window.parent || window).removeEventListener('resize', _mobileResizeHandler); } catch { /* ignore */ }
    _mobileResizeHandler = null;
  }
  const target = window as unknown as Record<string, unknown>;
  target[DIRTY_STATE_KEY] = false;
  subscriptions.forEach(subscription => {
    subscription.stop();
  });
  stopFloatingDrag();
  stopPaneResize();
  window.removeEventListener('wb-helper:refresh', onPanelRefresh);
  window.removeEventListener('wb-helper:save', onPanelSave);
  window.removeEventListener('wb-helper:discard', onPanelDiscard);
  window.removeEventListener('wb-helper:toggle-theme', toggleTheme);
  window.removeEventListener('wb-helper:set-theme', onSetThemeEvent);
  hostResizeWindow.value?.document.removeEventListener('pointerdown', onHostPointerDownForWorldbookPicker, true);
  hostResizeWindow.value?.document.removeEventListener('keydown', onHostKeyDownForWorldbookPicker, true);
  hostResizeWindow.value?.removeEventListener('resize', handleFloatingWindowResize);
  hostResizeWindow.value = null;
  _screenSyncCleanup?.();
  _screenSyncCleanup = null;
});

function updateHostPanelTheme() {
  const panel = document.getElementById('wb-assistant-panel');
  if (!panel) return;
  const theme = THEMES[currentTheme.value];
  const colors = theme.colors;
  
  panel.style.setProperty('--wb-host-bg', colors['--wb-bg-root']);
  panel.style.setProperty('--wb-host-header-bg', colors['--wb-bg-panel']);
  panel.style.setProperty('--wb-host-border', colors['--wb-border-main']);
  panel.style.setProperty('--wb-host-text', colors['--wb-text-main']);
  panel.style.setProperty('--wb-host-tool-bg', colors['--wb-input-bg']);
  panel.style.setProperty('--wb-host-tool-border', colors['--wb-border-subtle']);
}

watch(currentTheme, () => {
  updateHostPanelTheme();
});

watch(hasUnsavedChanges, (val) => {
  const panel = document.getElementById('wb-assistant-panel');
  if (panel) {
    const saveBtn = panel.querySelector('.wb-assistant-save');
    if (saveBtn) {
      if (val) {
        saveBtn.classList.add('glow-pulse');
      } else {
        saveBtn.classList.remove('glow-pulse');
      }
    }
  }
}, { immediate: true });
</script>

<style scoped>
.wb-assistant-root {
  flex: 1;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
  background: var(--wb-bg-root);
  color: var(--wb-text-main);
  font-size: 13px;
  line-height: 1.35;
  border-radius: 10px;
  overflow: hidden;
}


.wb-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wb-settings-wrapper {
  width: 100%;
}

.wb-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 12px;
  padding: 12px 16px;
  background: var(--wb-bg-panel);
  margin-bottom: 8px;
}

.wb-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wb-title strong {
  font-size: 16px;
}

.wb-title span {
  color: var(--wb-text-muted);
}

.wb-header-actions,
.list-actions,
.tool-line {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.wb-toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  border-radius: 12px;
  padding: 10px 12px;
  background: var(--wb-bg-panel);
}

.toolbar-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--wb-text-muted);
  min-width: 320px;
  flex: 1 1 520px;
}

.toolbar-select {
  min-width: 200px;
}

.toolbar-select.small {
  min-width: 160px;
}

.worldbook-picker {
  position: relative;
  flex: 1 1 auto;
  min-width: 240px;
}

.worldbook-picker-trigger {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--wb-input-bg);
  color: var(--wb-text-main);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
}

.worldbook-picker-trigger:hover {
  border-color: var(--wb-primary-light);
}

.worldbook-picker-trigger-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.worldbook-picker-trigger-arrow {
  flex-shrink: 0;
  color: var(--wb-text-muted);
}

.worldbook-picker-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 10120;
  border: 1px solid var(--wb-border-subtle);
  border-radius: 8px;
  background: var(--wb-input-bg-focus);
  box-shadow: var(--wb-shadow-main);
  padding: 8px;
  display: grid;
  gap: 8px;
}

.worldbook-picker-search {
  width: 100%;
}

.worldbook-picker-list {
  max-height: 260px;
  overflow: auto;
  border: none;
  border-radius: 8px;
  background: var(--wb-bg-panel);
  display: flex;
  flex-direction: column;
}

.worldbook-picker-item {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--wb-border-subtle);
  background: transparent;
  color: var(--wb-text-main);
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
}

.worldbook-picker-item:last-child {
  border-bottom: none;
}

.worldbook-picker-item:hover {
  background: var(--wb-primary-soft);
}

.worldbook-picker-item.active {
  background: var(--wb-primary-soft);
  color: var(--wb-primary-light);
}

.wb-bindings {
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 8px;
  background: var(--wb-bg-panel);
}

.wb-history-shortcuts {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.global-mode-panel {
  border-radius: 12px;
  background: var(--wb-bg-panel);
  padding: 12px;
  display: grid;
  gap: 12px;
}

.global-mode-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.global-mode-title {
  color: var(--wb-primary-light);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.global-preset-panel {
  border-radius: 8px;
  background: var(--wb-bg-panel);
  padding: 10px;
  display: grid;
  gap: 8px;
}

.preset-role-panel {
  border-radius: 8px;
  background: var(--wb-bg-panel);
  padding: 10px;
  display: grid;
  gap: 6px;
}

.preset-role-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-role-current {
  color: var(--wb-primary);
  font-size: 12px;
}

.preset-role-current.empty {
  color: var(--wb-text-muted);
}

.preset-role-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.role-picker {
  position: relative;
}

.role-picker-trigger {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--wb-input-bg);
  color: var(--wb-text-main);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
}

.role-picker-trigger:disabled {
  opacity: 0.55;
  cursor: default;
}

.role-picker-trigger:hover:not(:disabled) {
  border-color: var(--wb-primary-light);
}

.role-picker-trigger-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.role-picker-trigger-arrow {
  flex-shrink: 0;
  color: var(--wb-text-muted);
}

.role-picker-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 10130;
  border: 1px solid var(--wb-border-subtle);
  border-radius: 8px;
  background: var(--wb-input-bg-focus);
  box-shadow: var(--wb-shadow-main);
  padding: 8px;
  display: grid;
  gap: 8px;
}

.role-picker-search {
  width: 100%;
}

.role-picker-list {
  border: none;
  border-radius: 8px;
  background: var(--wb-bg-panel);
  max-height: 220px;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.role-picker-item {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--wb-border-subtle);
  background: transparent;
  color: var(--wb-text-main);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  cursor: pointer;
}

.role-picker-item:last-child {
  border-bottom: none;
}

.role-picker-item:hover:not(:disabled) {
  background: var(--wb-primary-soft);
}

.role-picker-item:disabled {
  opacity: 0.55;
  cursor: default;
}

.role-picker-item .name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-picker-item .meta {
  color: var(--wb-primary-light);
  flex-shrink: 0;
  font-size: 11px;
}

.preset-role-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.preset-role-tag {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 999px;
  background: var(--wb-bg-panel);
  color: var(--wb-text-main);
  padding: 2px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.preset-role-tag:hover {
  border-color: #f43f5e;
}

.preset-role-tag .remove {
  color: #fca5a5;
}

.global-mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.global-mode-column {
  border-radius: 8px;
  padding: 10px;
  background: var(--wb-bg-panel);
  display: grid;
  gap: 6px;
  min-height: 168px;
}

.global-mode-list {
  border-radius: 8px;
  background: var(--wb-input-bg);
  max-height: 176px;
  min-height: 88px;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.global-mode-item {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--wb-border-subtle);
  background: transparent;
  color: var(--wb-text-main);
  padding: 7px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-align: left;
}

.global-mode-item:last-child {
  border-bottom: none;
}

.global-mode-item:hover {
  background: var(--wb-primary-soft);
}

.global-mode-item.add .global-mode-item-action {
  color: #86efac;
}

.global-mode-item.active .global-mode-item-action {
  color: #fca5a5;
}

.global-mode-item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-mode-item-action {
  font-size: 12px;
  flex-shrink: 0;
}

/* View Transitions */
.mobile-tab-enter-active,
.mobile-tab-leave-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100%;
  height: 100%;
}
.mobile-tab-enter-from {
  opacity: 0;
  transform: translateX(15px);
}
.mobile-tab-leave-to {
  opacity: 0;
  transform: translateX(-15px);
}

.desktop-content-enter-active,
.desktop-content-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.desktop-content-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.desktop-content-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.global-mode-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.history-btn {
  border-color: var(--wb-primary);
  background: var(--wb-primary-soft);
}

.utility-btn {
  border-color: var(--wb-primary-light);
  background: var(--wb-primary-soft);
}

.utility-btn.active {
  border-color: var(--wb-primary-light);
  background: var(--wb-primary-soft);
  color: var(--wb-primary-light);
}

.wb-main-layout {
  flex: 1;
  min-height: 60vh;
  display: grid;
  grid-template-columns: 320px 10px minmax(0, 1fr);
  gap: 0;
}

.wb-entry-list,
.wb-editor {
  border-radius: 12px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: transparent;
  min-height: 0;
}

.list-search {
  display: grid;
  gap: 6px;
  padding: 0 8px;
}

.list-summary {
  color: var(--wb-text-muted);
  font-size: 12px;
  padding: 0 8px;
}

.list-scroll {
  flex: 1 1 auto;
  min-height: 210px;
  max-height: calc(70vh - 210px);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.entry-item {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--wb-text-main);
  border-radius: 8px;
  padding: 10px 12px 10px 14px;
  cursor: pointer;
  display: grid;
  gap: 6px;
  position: relative;
  transition: background-color 0.15s ease;
  margin-bottom: 4px;
}

.entry-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 8px 0 0 8px;
  background: linear-gradient(to bottom, #64748b, rgba(100, 116, 139, 0.05));
}

.entry-item[data-status='constant']::before {
  background: linear-gradient(to bottom, #3b82f6, rgba(59, 130, 246, 0));
}

.entry-item[data-status='vector']::before {
  background: linear-gradient(to bottom, #a855f7, rgba(168, 85, 247, 0));
}

.entry-item[data-status='normal']::before {
  background: linear-gradient(to bottom, #22c55e, rgba(34, 197, 94, 0));
}

.entry-item[data-status='disabled']::before {
  background: linear-gradient(to bottom, #6b7280, rgba(107, 114, 128, 0));
}

.entry-item:hover {
  background: var(--wb-primary-hover);
  transform: none;
}

.entry-item.selected {
  background: var(--wb-primary-soft);
  box-shadow: none;
}

.entry-item.disabled {
  opacity: 0.74;
}

.entry-item-head {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.entry-status-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #64748b;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px var(--wb-bg-panel);
}

.entry-status-dot[data-status='constant'] {
  background: #3b82f6;
}

.entry-status-dot[data-status='vector'] {
  background: #a855f7;
}

.entry-status-dot[data-status='normal'] {
  background: #22c55e;
}

.entry-status-dot[data-status='disabled'] {
  background: #6b7280;
}

.entry-item-title {
  font-weight: 700;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-item-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.entry-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  border-radius: 999px;
  padding: 2px 8px;
  color: var(--wb-text-muted);
  font-size: 11px;
  background: var(--wb-bg-panel);
}

.entry-chip.uid {
  color: var(--wb-primary-light);
  font-size: 10px;
  padding: 1px 7px;
}

.entry-chip.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 10px;
}

.entry-chip.status[data-status='constant'] {
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.16);
}

.entry-chip.status[data-status='vector'] {
  color: #d8b4fe;
  background: rgba(168, 85, 247, 0.16);
}

.entry-chip.status[data-status='normal'] {
  color: #86efac;
  background: rgba(34, 197, 94, 0.16);
}

.entry-chip.status[data-status='disabled'] {
  color: #cbd5e1;
  background: rgba(100, 116, 139, 0.15);
}

.entry-item-preview {
  color: var(--wb-text-muted);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 16px;
  opacity: 0.85;
}

.entry-item-preview::before {
  content: 'Keys: ';
  color: var(--wb-text-muted);
  margin-right: 4px;
}

.wb-editor {
  max-height: 70vh;
  overflow: hidden;
}

.wb-editor-shell {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 10px 360px;
  gap: 0;
}

.wb-resize-handle {
  position: relative;
  width: 10px;
  cursor: col-resize;
  user-select: none;
  touch-action: none;
}

.wb-resize-handle::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 12px;
  bottom: 12px;
  width: 2px;
  border-radius: 999px;
  background: var(--wb-primary-hover);
  transition: background-color 0.15s ease;
}

.wb-resize-handle:hover::before,
.wb-resize-handle.dragging::before {
  background: var(--wb-primary-light);
}

.editor-center {
  border: none;
  border-radius: 12px;
  background: var(--wb-bg-panel);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  overflow: auto;
}

.editor-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-end;
  border-bottom: 1px solid var(--wb-border-subtle);
  padding-bottom: 12px;
}

.editor-comment {
  flex: 1;
}

.editor-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.editor-badge {
  font-size: 10px;
  border: none;
  border-radius: 999px;
  padding: 2px 8px;
  color: var(--wb-text-muted);
  background: var(--wb-bg-panel);
  white-space: nowrap;
}

.editor-badge.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.editor-badge.on {
  color: #86efac;
  background: rgba(34, 197, 94, 0.12);
}

.editor-badge.off {
  color: #cbd5e1;
  background: rgba(100, 116, 139, 0.15);
}

.editor-badge.strategy[data-status='constant'] {
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.12);
}

.editor-badge.strategy[data-status='vector'] {
  color: #d8b4fe;
  background: rgba(168, 85, 247, 0.12);
}

.editor-badge.strategy[data-status='normal'] {
  color: #86efac;
  background: rgba(34, 197, 94, 0.12);
}

.editor-badge.strategy[data-status='disabled'] {
  color: #cbd5e1;
  background: rgba(100, 116, 139, 0.12);
}

.editor-keyword-grid .text-area.compact {
  min-height: 36px;
  height: 36px;
  line-height: 1.35;
}

.editor-content-block {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.editor-content-title {
  font-size: 12px;
  color: var(--wb-primary-light);
  letter-spacing: 0.01em;
}

.editor-content-area {
  min-height: 320px;
  flex: 1;
  resize: none;
  line-height: 1.5;
}

.content-resize-handle {
  display: none;
  align-items: center;
  justify-content: center;
  height: 22px;
  cursor: ns-resize;
  background: var(--wb-bg-panel);
  border-radius: 0 0 8px 8px;
  touch-action: none;
  user-select: none;
}

.content-resize-grip {
  font-size: 12px;
  color: var(--wb-text-dim);
  letter-spacing: 3px;
  line-height: 1;
}

.editor-advanced {
  border: none;
  border-radius: 8px;
  padding: 10px;
  background: var(--wb-input-bg);
}

.editor-advanced > summary {
  cursor: pointer;
  font-size: 12px;
  color: var(--wb-text-muted);
}

.editor-advanced[open] > summary {
  margin-bottom: 7px;
}

.editor-side {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: auto;
}

.editor-card {
  border: none;
  border-radius: 12px;
  padding: 12px;
  background: var(--wb-bg-panel);
  display: grid;
  gap: 7px;
}

.editor-card h4 {
  margin: 0;
  font-size: 12px;
  color: var(--wb-primary);
}

.strategy-switch {
  display: grid;
  gap: 6px;
}

.strategy-pill {
  border: none;
  border-radius: 6px;
  background: var(--wb-input-bg);
  color: var(--wb-text-muted);
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
}

.strategy-pill:hover {
  background: var(--wb-primary-hover);
}

.strategy-pill.active.constant {
  background: rgba(59, 130, 246, 0.16);
  color: #93c5fd;
}

.strategy-pill.active.vector {
  background: rgba(168, 85, 247, 0.16);
  color: #d8b4fe;
}

.strategy-pill.active.selective {
  background: rgba(34, 197, 94, 0.16);
  color: #86efac;
}

.editor-grid {
  display: grid;
  gap: 8px;
}

.editor-grid.two-cols {
  grid-template-columns: 1fr 1fr;
}

.editor-grid.three-cols {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field > span {
  color: var(--wb-primary-light);
}

.field.disabled {
  opacity: 0.56;
}

.field-end {
  align-self: end;
}

.field-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.text-input,
.text-area,
.toolbar-select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 8px 10px;
  color: var(--wb-text-main);
  background: var(--wb-input-bg);
  transition: all 0.2s ease;
}

.text-input:hover,
.text-area:hover,
.toolbar-select:hover {
  background: var(--wb-input-bg-hover);
}

.text-input:focus,
.text-area:focus,
.toolbar-select:focus {
  background: var(--wb-input-bg-focus);
  border-color: var(--wb-primary-glow);
  outline: none;
  box-shadow: 0 0 0 3px var(--wb-primary-soft);
}

.text-area {
  min-height: 96px;
  resize: vertical;
}

.text-area.compact {
  min-height: 84px;
}

.text-area.large {
  min-height: 190px;
}

.checkbox-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.wb-tools-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tool-card {
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 170px;
  background: var(--wb-bg-panel);
}

.tool-card h4 {
  margin: 0;
  font-size: 13px;
  color: var(--wb-primary-light);
}

.tool-line.stacked {
  display: grid;
  gap: 6px;
}

.find-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.find-scope-line {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.find-summary-text {
  margin-left: auto;
  color: var(--wb-primary-light);
  font-size: 12px;
}

.find-active-hit {
  border: 1px solid var(--wb-border-main);
  border-radius: 7px;
  padding: 6px 8px;
  display: grid;
  gap: 2px;
  background: var(--wb-bg-panel);
}

.find-active-hit strong {
  color: var(--wb-text-main);
  font-size: 12px;
}

.find-active-hit span {
  color: var(--wb-text-muted);
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.batch-exclude-note {
  color: var(--wb-text-muted);
  font-size: 11px;
}

.batch-exclude-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.exclude-chip {
  border: 1px solid var(--wb-border-subtle);
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  color: var(--wb-text-main);
  background: var(--wb-bg-panel);
}

.tool-details {
  border: 1px solid var(--wb-border-main);
  border-radius: 8px;
  padding: 6px;
  background: var(--wb-bg-panel);
}

.tool-details > summary {
  cursor: pointer;
  color: var(--wb-text-main);
  font-size: 12px;
}

.tool-details[open] > summary {
  margin-bottom: 6px;
}

.history-compare {
  display: grid;
  gap: 6px;
}

.history-preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.history-preview-card {
  border: 1px solid var(--wb-border-main);
  border-radius: 8px;
  padding: 6px;
  display: grid;
  gap: 3px;
  background: var(--wb-bg-panel);
}

.history-preview-card strong {
  color: var(--wb-primary-light);
  font-size: 11px;
}

.history-preview-card span {
  color: var(--wb-text-muted);
  font-size: 11px;
  line-height: 1.35;
}

.history-note {
  border: 1px dashed var(--wb-border-main);
  border-radius: 8px;
  padding: 6px;
  color: var(--wb-text-muted);
  font-size: 11px;
  background: var(--wb-bg-panel);
}

.tool-scroll {
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-list-item {
  border-radius: 8px;
  padding: 8px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  background: var(--wb-input-bg);
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item-main strong,
.activation-main strong {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-main span {
  color: var(--wb-text-muted);
  font-size: 12px;
}

.item-actions {
  display: flex;
  gap: 6px;
}

.activation-item {
  border-radius: 8px;
  padding: 8px;
  display: grid;
  gap: 3px;
  background: var(--wb-input-bg);
}

.activation-main,
.activation-sub {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}

.activation-main span,
.activation-sub {
  color: var(--wb-text-muted);
  font-size: 12px;
}

.activation-sub span:last-child {
  flex: 1;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wb-floating-window {
  position: fixed;
  max-width: calc(100vw - 16px);
  max-height: min(74vh, 760px);
  border: 1px solid var(--wb-border-subtle);
  border-radius: 10px;
  background: var(--wb-bg-root);
  box-shadow: var(--wb-shadow-main);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wb-floating-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid var(--wb-border-subtle);
  background: var(--wb-bg-panel);
  cursor: move;
  user-select: none;
  touch-action: none;
}

.wb-floating-header strong {
  font-size: 12px;
  color: var(--wb-text-main);
}

.wb-floating-header-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.wb-floating-body {
  min-height: 0;
  padding: 8px;
  display: grid;
  gap: 8px;
  overflow: auto;
}

.find-window .wb-floating-body {
  gap: 10px;
}

.activation-window .tool-scroll {
  max-height: min(58vh, 520px);
}

.wb-status {
  border-radius: 10px;
  background: var(--wb-bg-panel);
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--wb-text-main);
  flex-wrap: wrap;
  transition: all 0.3s ease;
}

@keyframes wb-status-pulse {
  0% { opacity: 0.8; box-shadow: 0 0 0 rgba(250, 204, 21, 0); }
  50% { opacity: 1; color: #facc15; box-shadow: 0 0 12px rgba(250, 204, 21, 0.2); }
  100% { opacity: 0.8; box-shadow: 0 0 0 rgba(250, 204, 21, 0); }
}

.wb-status.has-unsaved {
  animation: wb-status-pulse 2s infinite ease-in-out;
  border: 1px solid rgba(250, 204, 21, 0.4);
}

.btn {
  border: 1px solid var(--wb-border-main);
  background: var(--wb-bg-panel);
  color: var(--wb-text-main);
  border-radius: 7px;
  padding: 5px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

@keyframes wb-btn-pulse {
  0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); border-color: rgba(52, 211, 153, 0.6); }
  70% { box-shadow: 0 0 0 4px rgba(52, 211, 153, 0); border-color: rgba(52, 211, 153, 1); }
  100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0); border-color: rgba(52, 211, 153, 0.6); }
}

.btn.glow-pulse {
  animation: wb-btn-pulse 2s infinite ease-out;
  border-color: #34d399;
  color: #34d399;
  font-weight: 500;
}

.btn:hover:not(:disabled) {
  border-color: var(--wb-primary-light);
}

.btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn.primary {
  background: var(--wb-primary-soft);
  border-color: var(--wb-primary);
}

.btn.danger {
  background: rgba(225, 29, 72, 0.12);
  border-color: #e11d48;
  color: #e11d48;
}

.btn.mini {
  padding: 4px 8px;
  font-size: 12px;
}

.empty-note,
.empty-block {
  color: var(--wb-text-muted);
  font-size: 12px;
}

.empty-block {
  padding: 14px;
  border: 1px dashed var(--wb-border-main);
  border-radius: 8px;
}

.hidden-input {
  display: none;
}

.wb-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10020;
  padding: 14px;
  box-sizing: border-box;
}

.wb-history-modal {
  width: min(1260px, 100%);
  max-height: min(88vh, 940px);
  border: 1px solid var(--wb-border-main);
  border-radius: 12px;
  background: var(--wb-bg-root);
  box-shadow: var(--wb-shadow-main);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.wb-history-modal-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--wb-border-main);
  background: var(--wb-bg-panel);
}

.wb-history-modal-header strong {
  display: block;
  font-size: 14px;
}

.wb-history-modal-header span {
  color: var(--wb-text-muted);
  font-size: 11px;
}

.wb-history-modal-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.wb-history-modal-main {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 300px 1fr;
  overflow: hidden;
}

.wb-history-versions {
  border-right: 1px solid var(--wb-border-main);
  background: var(--wb-bg-panel);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.wb-history-versions-title {
  padding: 8px 10px;
  font-size: 11px;
  color: var(--wb-text-muted);
  border-bottom: 1px solid var(--wb-border-main);
}

.wb-history-versions-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.wb-history-version-item {
  border: 1px solid var(--wb-border-main);
  border-radius: 8px;
  padding: 6px;
  display: grid;
  gap: 4px;
  background: var(--wb-bg-panel);
}

.wb-history-version-line {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  align-items: center;
}

.wb-history-version-line strong {
  font-size: 11px;
  color: var(--wb-text-main);
}

.wb-history-version-item span {
  font-size: 11px;
  color: var(--wb-text-muted);
  word-break: break-all;
}

.wb-history-lr {
  display: inline-flex;
  gap: 4px;
}

.mini-lr {
  border: 1px solid var(--wb-border-main);
  background: var(--wb-input-bg);
  color: var(--wb-text-muted);
  border-radius: 6px;
  min-width: 24px;
  font-size: 10px;
  cursor: pointer;
}

.mini-lr.active {
  border-color: #22d3ee;
  color: #67e8f9;
}

.wb-history-diff-wrap {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wb-history-diff-head {
  border-bottom: 1px solid var(--wb-border-main);
  background: var(--wb-bg-panel);
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: var(--wb-text-muted);
}

.wb-history-diff-grid {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.wb-history-diff-grid > div {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.wb-history-diff-grid > div + div {
  border-left: 1px solid var(--wb-border-main);
}

.wb-history-diff-title {
  padding: 8px 10px;
  border-bottom: 1px solid var(--wb-border-main);
  font-size: 11px;
  color: var(--wb-primary-light);
}

.wb-history-diff-body {
  min-height: 0;
  flex: 1;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 11px;
  background: var(--wb-input-bg-focus);
  word-break: break-all;
  overflow-wrap: break-word;
}

.diff-row {
  display: grid;
  grid-template-columns: 54px 1fr;
  align-items: start;
  border-bottom: 1px solid var(--wb-border-subtle);
}

.line-no {
  color: var(--wb-text-muted);
  padding: 2px 8px;
  border-right: 1px solid var(--wb-border-subtle);
  user-select: none;
}

.line-text {
  white-space: pre-wrap;
  word-break: break-word;
  padding: 2px 8px;
  color: var(--wb-text-main);
}

.diff-row.add {
  background: rgba(34, 197, 94, 0.18);
}

.diff-row.del {
  background: rgba(239, 68, 68, 0.18);
}

.diff-row.empty {
  background: rgba(100, 116, 139, 0.08);
}

@media (max-width: 1380px) {
  .wb-editor-shell {
    grid-template-columns: 1fr;
  }

  .editor-side {
    overflow: visible;
    max-height: none;
  }

  .wb-history-modal-main {
    grid-template-columns: 1fr;
  }

  .wb-history-versions {
    border-right: none;
    border-bottom: 1px solid var(--wb-border-main);
    max-height: 120px;
  }

  .wb-modal-backdrop {
    padding: 2px;
  }

  .wb-history-modal {
    width: 100%;
    max-height: calc(100vh - 4px);
    height: calc(100vh - 4px);
    border-radius: 6px;
  }

  .wb-history-modal-header {
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 8px;
    flex-shrink: 0;
  }

  .wb-history-modal-header strong {
    font-size: 12px;
  }

  .wb-history-modal-header > div:first-child span {
    display: none;
  }

  .wb-history-modal-actions {
    gap: 4px;
  }

  .wb-history-modal-actions .btn {
    font-size: 10px;
    padding: 3px 6px;
  }

  .wb-history-modal-main {
    grid-template-columns: 1fr;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .wb-history-diff-wrap {
    overflow-y: auto;
    min-height: 0;
  }

  .wb-history-diff-grid {
    grid-template-columns: 1fr;
    overflow: visible;
  }

  .wb-history-diff-grid > div {
    max-height: 30vh;
    overflow: auto;
  }

  .wb-history-diff-grid > div + div {
    border-left: none;
    border-top: 1px solid var(--wb-border-main);
  }

  .diff-row {
    grid-template-columns: 1fr;
  }

  .line-no {
    display: none;
  }

  .wb-history-diff-body {
    font-size: 10px;
  }

  .wb-history-diff-head {
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 8px;
  }

  .wb-history-diff-head > div {
    font-size: 10px;
  }
}

@media (max-width: 1100px) {
  .global-mode-grid {
    grid-template-columns: 1fr;
  }

  .wb-resize-handle {
    display: none;
  }

  .wb-main-layout {
    grid-template-columns: 1fr;
  }

  .wb-tools-grid {
    grid-template-columns: 1fr;
  }

  .editor-grid.two-cols,
  .editor-grid.three-cols {
    grid-template-columns: 1fr;
  }

  .editor-head {
    flex-direction: column;
    align-items: stretch;
  }

  .editor-badges {
    justify-content: flex-start;
  }

  .history-preview-grid {
    grid-template-columns: 1fr;
  }

  .wb-history-diff-grid {
    grid-template-columns: 1fr;
  }

  .wb-history-diff-grid > div + div {
    border-left: none;
    border-top: 1px solid var(--wb-border-main);
  }

  .wb-status {
    flex-direction: column;
  }


  .wb-floating-window {
    width: calc(100vw - 16px) !important;
    left: 8px !important;
    right: 8px;
  }
}

.editor-back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  margin: 0 0 8px 0;
  background: var(--wb-bg-panel);
  border: none;
  border-radius: 6px;
  color: var(--wb-primary);
  font-weight: 600;
  cursor: pointer;
}

.editor-back-btn:hover {
  background: var(--wb-primary-hover);
}

/* ═══ Mobile Tab View ═══ */
.mobile-tab-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.mobile-tab-content {
  flex: 1;
  min-height: 0;
  position: relative;
}

.mobile-pane {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  padding: 8px;
  -webkit-overflow-scrolling: touch;
}

.mobile-entry-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mobile-ai-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.mobile-ai-panel .ai-chat-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.mobile-danger-zone {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--wb-border);
}

.mobile-danger-zone .btn {
  flex: 1;
}

.mobile-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10100;
  display: flex;
  border-top: 1px solid var(--wb-border);
  background: var(--wb-bg-secondary);
  height: 52px;
}

.mobile-tab-bar button {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  background: transparent;
  color: var(--wb-text-dim);
  font-size: 10px;
  padding: 4px 0;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.mobile-tab-bar button.active {
  color: var(--wb-accent);
  background: color-mix(in srgb, var(--wb-accent) 8%, transparent);
}

.mobile-tab-bar .tab-icon {
  font-size: 20px;
  line-height: 1;
}

.mobile-tab-bar .tab-label {
  font-weight: 500;
}

@media (max-width: 768px) {
  .wb-assistant-root {
    padding: 6px;
    gap: 8px;
  }

  .wb-header,
  .wb-bindings,
  .global-mode-panel,
  .wb-toolbar {
    padding: 6px;
    gap: 6px;
  }

  .toolbar-label {
    min-width: 100%;
  }

  .toolbar-select {
    width: 100%;
  }

  .worldbook-picker-trigger {
    white-space: normal;
  }

  .wb-main-layout {
    display: block !important;
    height: auto !important;
    overflow: visible !important;
  }

  .wb-entry-list,
  .wb-editor,
  .wb-editor-shell,
  .editor-side {
    width: 100% !important;
    height: auto !important;
    max-height: none !important;
    border: none !important;
    padding: 0 !important;
  }

  .wb-entry-list {
    max-height: 80vh !important;
    overflow-y: auto;
  }

  .wb-editor-shell {
    display: block !important;
  }

  .list-scroll {
    max-height: 60vh;
  }

  .wb-floating-window {
    left: 8px !important;
    right: 8px !important;
    width: auto !important;
    max-width: none !important;
  }
}

.list-actions {
  padding: 0 8px;
}

/* ─────────────────────────────────────────────────
   Override: Force theme colors on native form elements
   This beats SillyTavern global dark CSS which sets
   background/color on textarea, input, select, etc.
   ───────────────────────────────────────────────── */
.wb-assistant-root input,
.wb-assistant-root textarea,
.wb-assistant-root select,
.wb-assistant-root option,
.wb-assistant-root button {
  color: var(--wb-text-main) !important;
}

.wb-assistant-root input[type="text"],
.wb-assistant-root input[type="number"],
.wb-assistant-root textarea,
.wb-assistant-root select {
  background: var(--wb-input-bg) !important;
  border-color: transparent !important;
}

.wb-assistant-root input[type="text"]:hover,
.wb-assistant-root input[type="number"]:hover,
.wb-assistant-root textarea:hover,
.wb-assistant-root select:hover {
  background: var(--wb-input-bg-hover) !important;
}

.wb-assistant-root input[type="text"]:focus,
.wb-assistant-root input[type="number"]:focus,
.wb-assistant-root textarea:focus,
.wb-assistant-root select:focus {
  background: var(--wb-input-bg-focus) !important;
  border-color: var(--wb-primary-glow) !important;
  outline: none !important;
  box-shadow: 0 0 0 3px var(--wb-primary-soft) !important;
}
/* ═════════════════════════════════════════════════
   AI Generator Panel
   ═════════════════════════════════════════════════ */
.ai-generator-panel {
  display: flex;
  gap: 0;
  flex: 1;
  min-height: 0;
  border-radius: var(--wb-radius);
  overflow: hidden;
  background: var(--wb-bg-secondary);
}

/* ── Sidebar ── */
.ai-sidebar {
  width: 220px;
  min-width: 180px;
  border-right: 1px solid var(--wb-border);
  display: flex;
  flex-direction: column;
  background: var(--wb-bg-main);
}

.ai-sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--wb-border);
}

.ai-sidebar-title {
  font-weight: 600;
  font-size: 0.9em;
  color: var(--wb-text-main);
}

.ai-session-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.ai-session-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  margin-bottom: 2px;
  border: none;
  border-radius: var(--wb-radius-sm, 6px);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
  position: relative;
}

.ai-session-item:hover {
  background: var(--wb-bg-highlight);
}

.ai-session-item.active {
  background: var(--wb-primary-soft);
}

.ai-session-title {
  flex: 1;
  font-size: 0.85em;
  color: var(--wb-text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ai-session-meta {
  font-size: 0.72em;
  color: var(--wb-text-dim);
  width: 100%;
  margin-top: 2px;
}

.ai-session-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  color: var(--wb-text-dim);
  font-size: 1em;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
}

.ai-session-item:hover .ai-session-delete {
  opacity: 1;
}

.ai-session-delete:hover {
  background: var(--wb-danger, #e74c3c);
  color: #fff;
}

/* ── Chat Area ── */
.ai-chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ai-chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--wb-text-dim);
}

.ai-chat-empty-icon {
  font-size: 3em;
  opacity: 0.5;
}

.ai-chat-empty-text {
  font-size: 0.95em;
}

.ai-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── Chat bubbles ── */
.ai-chat-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-chat-bubble.user {
  align-self: flex-end;
  background: var(--wb-primary-soft);
  border-bottom-right-radius: 4px;
}

.ai-chat-bubble.assistant {
  align-self: flex-start;
  background: var(--wb-bg-main);
  border: 1px solid var(--wb-border);
  border-bottom-left-radius: 4px;
}

.ai-chat-bubble-role {
  font-size: 0.72em;
  font-weight: 600;
  color: var(--wb-text-dim);
  margin-bottom: 4px;
}

.ai-chat-bubble-content {
  font-size: 0.88em;
  color: var(--wb-text-main);
}

.ai-cursor {
  animation: ai-blink 0.7s infinite;
  color: var(--wb-primary);
}

@keyframes ai-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.ai-thinking {
  color: var(--wb-text-dim);
  font-style: italic;
}

/* ── Input bar ── */
.ai-chat-input-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--wb-border);
  background: var(--wb-bg-main);
  align-items: flex-end;
}

.ai-context-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78em;
  color: var(--wb-text-dim);
  cursor: pointer;
  user-select: none;
}

.ai-context-toggle input {
  margin: 0;
}

.ai-context-toggle span {
  white-space: nowrap;
}

.ai-chat-input {
  flex: 1;
  resize: vertical;
  min-height: 40px;
  max-height: 140px;
  font-size: 0.88em;
}

.ai-send-btn,
.ai-stop-btn {
  min-width: 64px;
  height: 40px;
}

/* ═════════════════════════════════════════════════
   Tag Review Modal
   ═════════════════════════════════════════════════ */
.ai-tag-review-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-tag-review-modal {
  background: var(--wb-bg-main);
  border-radius: var(--wb-radius);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  width: 580px;
  max-width: 92vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ai-tag-review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--wb-border);
}

.ai-tag-review-title {
  font-weight: 600;
  font-size: 1em;
  color: var(--wb-text-main);
}

.ai-tag-review-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--wb-text-dim);
  font-size: 1.2em;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-tag-review-close:hover {
  background: var(--wb-bg-highlight);
}

.ai-tag-review-target {
  padding: 12px 18px;
  border-bottom: 1px solid var(--wb-border);
}

.ai-tag-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 18px;
}

.ai-tag-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--wb-border);
  cursor: pointer;
}

.ai-tag-item:last-child {
  border-bottom: none;
}

.ai-tag-item input[type="checkbox"] {
  margin-top: 3px;
}

.ai-tag-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.ai-tag-name {
  font-weight: 600;
  font-size: 0.9em;
  color: var(--wb-primary);
}

.ai-tag-preview {
  font-size: 0.8em;
  color: var(--wb-text-dim);
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.4;
}

.ai-tag-review-actions {
  display: flex;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--wb-border);
  justify-content: flex-end;
}

.btn.primary {
  background: var(--wb-primary);
  color: #fff;
  border-color: var(--wb-primary);
}

.btn.primary:hover {
  filter: brightness(1.1);
}

.btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ═════════════════════════════════════════════════
   Mobile Responsive
   ═════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .wb-assistant-root {
    padding: 6px;
    gap: 6px;
    border-radius: 0;
  }

  /* ── Toolbar ── */
  .toolbar-label {
    min-width: unset;
    width: 100%;
  }

  .toolbar-label select {
    flex: 1;
    min-width: 0;
  }

  .toolbar-btns {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .toolbar-btns .btn {
    font-size: 0.78em;
    padding: 4px 8px;
  }

  /* ── Bindings bar ── */
  .wb-bindings {
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 8px;
    font-size: 0.78em;
  }

  /* ── Main layout ── */
  .wb-main-layout {
    display: block !important;
    overflow: visible;
    flex: none;
  }

  .wb-resize-handle {
    display: none !important;
  }

  .wb-entry-list,
  .wb-editor {
    min-height: 0;
    max-height: none;
  }

  /* ── AI Generator Panel ── */
  .ai-generator-panel {
    flex-direction: column;
  }

  .ai-sidebar {
    width: 100%;
    min-width: unset;
    max-height: 110px;
    border-right: none;
    border-bottom: 1px solid var(--wb-border);
  }

  .ai-sidebar-head {
    padding: 6px 10px;
  }

  .ai-session-list {
    overflow-x: auto;
    overflow-y: hidden;
    display: flex;
    flex-direction: row;
    gap: 4px;
    padding: 4px 8px;
  }

  .ai-session-item {
    flex-shrink: 0;
    min-width: 140px;
    max-width: 200px;
  }

  .ai-chat-messages {
    padding: 10px;
    gap: 8px;
  }

  .ai-chat-bubble {
    max-width: 95%;
  }

  .ai-chat-input-bar {
    padding: 8px 10px;
    gap: 6px;
  }

  .ai-chat-input {
    min-height: 36px;
    font-size: 0.85em;
  }

  /* ── Tag review modal ── */
  .ai-tag-review-modal {
    width: 95vw;
    max-height: 85vh;
  }

  .ai-tag-review-actions {
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 12px;
  }

  .ai-tag-review-actions .btn {
    flex: 1;
    min-width: 0;
    font-size: 0.82em;
  }

  /* ── Status footer ── */
  .wb-status {
    font-size: 0.72em;
    padding: 4px 8px;
    gap: 6px;
  }

  /* ── Editor content area ── */
  .editor-content-area {
    flex: 1;
    min-height: 40vh;
  }

  .content-resize-handle {
    display: flex;
    height: 28px;
  }

  .editor-content-block {
    position: relative;
    z-index: 10;
    background: var(--wb-bg-root);
  }

  .content-top-drag-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 22px;
    cursor: ns-resize;
    background: var(--wb-bg-panel);
    border-radius: 8px 8px 0 0;
    touch-action: none;
    user-select: none;
  }

  .content-top-drag-grip {
    font-size: 12px;
    color: var(--wb-text-dim);
    letter-spacing: 3px;
    line-height: 1;
  }

  .text-area.compact {
    min-height: 60px;
  }

  .editor-center {
    padding: 8px;
  }

  .editor-side {
    padding: 8px;
  }

  .editor-grid.two-cols {
    grid-template-columns: 1fr;
  }
}
</style>

