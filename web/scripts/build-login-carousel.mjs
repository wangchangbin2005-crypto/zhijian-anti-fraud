import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const htmlPath = path.join(root, '初始前后端', 'frontend.html')
const h = fs.readFileSync(htmlPath, 'utf8')
const start = h.indexOf('<div class="login-carousel">')
const end = h.indexOf('<!-- 登录卡片 -->', start)
let inner = h.slice(start, end)
inner = inner.replace(/\s+id="loginCarouselTrack"/, '')
inner = inner.replace(
  /<div class="login-carousel-track"([^>]*)>/,
  '<div class="login-carousel-track" :style="{ transform: `translateX(-${current * 25}%)` }">',
)
inner = inner.replace(
  /\s*<!-- 轮播指示器 -->\s*<div class="carousel-dots">[\s\S]*?<\/div>\s*\n\s*<\/div>\s*$/m,
  '',
)
const arrows = `      <button
        type="button"
        class="carousel-arrow carousel-arrow--prev"
        aria-label="上一张"
        @click.stop="prev"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        class="carousel-arrow carousel-arrow--next"
        aria-label="下一张"
        @click.stop="next"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9 18l6-6-6-6"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
`

const dots = `      <div class="carousel-dots">
        <span
          v-for="i in 4"
          :key="i"
          class="carousel-dot"
          :class="{ active: current === i - 1 }"
          @click="go(i - 1)"
        ></span>
      </div>
    </div>`

const scopedStyle = `<style scoped>
.carousel-arrow {
  position: absolute;
  top: 50%;
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 50%;
  color: #fff;
  background: rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(6px);
  cursor: pointer;
  transform: translateY(-50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.28s ease, background 0.2s ease;
}

.carousel-arrow:hover {
  background: rgba(0, 0, 0, 0.52);
}

.carousel-arrow:focus-visible {
  opacity: 1;
  pointer-events: auto;
  outline: 2px solid rgba(255, 255, 255, 0.6);
  outline-offset: 2px;
}

.carousel-arrow--prev {
  left: 16px;
}

.carousel-arrow--next {
  right: 16px;
}

.login-carousel:hover .carousel-arrow {
  opacity: 1;
  pointer-events: auto;
}
</style>
`

const vue = `<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const SLIDE_COUNT = 4
const current = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function restartAutoplay() {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    current.value = (current.value + 1) % SLIDE_COUNT
  }, 4000)
}

function go(i: number) {
  current.value = i
  restartAutoplay()
}

function prev() {
  current.value = (current.value + SLIDE_COUNT - 1) % SLIDE_COUNT
  restartAutoplay()
}

function next() {
  current.value = (current.value + 1) % SLIDE_COUNT
  restartAutoplay()
}

onMounted(() => {
  restartAutoplay()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
${inner.trim()}
${arrows}
${dots}
</template>

${scopedStyle}
`

const out = path.join(root, 'src', 'components', 'login', 'LoginHeroCarousel.vue')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, vue)
console.log('wrote', out)
