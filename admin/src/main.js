import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import i18n from './i18n'
import App from './App.vue'

import './assets/styles/main.css'
import { useSystemStore } from './stores/system'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

// Apply stored theme on mount
const systemStore = useSystemStore(pinia)
systemStore.applyTheme()

watch(i18n.global.locale, locale => { document.documentElement.lang = locale }, { immediate: true })
app.mount('#app')
