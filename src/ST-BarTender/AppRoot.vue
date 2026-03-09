<template>
  <!-- 悬浮球始终渲染 -->
  <FloatingBall />
  <!-- 面板始终渲染（内部用 v-show 控制可见性） -->
  <Panel />
</template>

<script setup lang="ts">
import FloatingBall from './FloatingBall.vue';
import Panel from './Panel.vue';
</script>
