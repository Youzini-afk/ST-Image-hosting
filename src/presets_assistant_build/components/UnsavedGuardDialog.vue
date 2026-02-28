<template>
  <div v-if="visible" class="guard-mask" role="dialog" aria-modal="true">
    <div class="guard-dialog">
      <h3>存在未保存改动</h3>
      <p>{{ reason || '继续操作前需要处理当前未保存内容。' }}</p>
      <div class="guard-actions">
        <button class="btn primary" type="button" @click="$emit('save')">保存并继续</button>
        <button class="btn" type="button" @click="$emit('discard')">丢弃并继续</button>
        <button class="btn danger" type="button" @click="$emit('cancel')">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  reason: string;
}>();

defineEmits<{
  save: [];
  discard: [];
  cancel: [];
}>();
</script>

<style scoped>
.guard-mask {
  position: fixed;
  inset: 0;
  z-index: 10090;
  background: rgba(6, 12, 24, 0.74);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
}

.guard-dialog {
  width: min(520px, 100%);
  border: 1px solid rgba(84, 109, 150, 0.92);
  border-radius: 12px;
  background: linear-gradient(160deg, #0c162c, #071022);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.5);
  padding: 16px;
  display: grid;
  gap: 12px;
}

h3 {
  margin: 0;
  font-size: 16px;
  color: #f5f9ff;
}

p {
  margin: 0;
  color: #bfd4f2;
  font-size: 13px;
  line-height: 1.5;
}

.guard-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.btn {
  border: 1px solid rgba(89, 121, 172, 0.62);
  border-radius: 8px;
  background: #1e2d4e;
  color: #f5f8ff;
  padding: 6px 12px;
  cursor: pointer;
}

.btn.primary {
  background: #2a61c7;
  border-color: #3f7df0;
}

.btn.danger {
  background: #442330;
  border-color: #db6072;
}
</style>
