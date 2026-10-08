<template>
  <router-view />
  <ToastContainer />
  <ChapterImportQueue />
</template>

<script setup>
import ToastContainer from './components/common/ToastContainer.vue'
import ChapterImportQueue from './components/webtoons/ChapterImportQueue.vue'
</script>
