import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const htmlPath = path.join(root, '初始前后端', 'frontend.html')
const h = fs.readFileSync(htmlPath, 'utf8')
const lines = h.split(/\r?\n/)

const si = lines.findIndex((l) => l.includes("page==='learn'") && l.includes('v-else-if'))
const commentLine = lines.findIndex((l, i) => i > si && l.includes('<!-- 追问分析页 -->'))
if (si < 0 || commentLine < 0) throw new Error('markers not found')

let endExclusive = commentLine
while (endExclusive > si && lines[endExclusive - 1]?.trim() === '') endExclusive--
if (lines[endExclusive - 1]?.trim() === '</div>') endExclusive--

let block = lines.slice(si + 1, endExclusive).join('\n')
block = block.replace(/^ {8}/gm, '')

const reps = [
  [/currentUser/g, 'auth.currentUser'],
  [/\blearnTab\b/g, 'lh.learnTab'],
  [/\blearnActiveCat\b/g, 'lh.learnActiveCat'],
  [/\blearnSelectedCase\b/g, 'lh.learnSelectedCase'],
  [/\blearnImageModal\b/g, 'lh.learnImageModal'],
  [/\blearnCategories\b/g, 'lh.learnCategories'],
  [/\blearnCasesFiltered\b/g, 'lh.learnCasesFiltered'],
  [/\blearnImageCards\b/g, 'lh.learnImageCards'],
  [/\bsortedLearnVideos\b/g, 'lh.sortedLearnVideos'],
  [/\bquizStarted\b/g, 'lh.quizStarted'],
  [/\bquizFinished\b/g, 'lh.quizFinished'],
  [/\bquizCurrent\b/g, 'lh.quizCurrent'],
  [/\bquizScore\b/g, 'lh.quizScore'],
  [/\bquizQuestions\b/g, 'lh.quizQuestions'],
  [/\bquizAnswered\b/g, 'lh.quizAnswered'],
  [/\bquizAnswerLog\b/g, 'lh.quizAnswerLog'],
  [/\bquizStart\(\)/g, 'lh.quizStart()'],
  [/\bquizAnswer\(/g, 'lh.quizAnswer('],
  [/\bquizGetStyle\(/g, 'lh.quizGetStyle('],
  [/\bquizNext\(\)/g, 'lh.quizNext()'],
]
for (const [re, s] of reps) block = block.replace(re, s)

const vue = `<script setup lang="ts">
import { useLearnHall } from '@/composables/useLearnHall'
const lh = useLearnHall()
</script>

<template>
  <div>
${block}
  </div>
</template>
`

const out = path.join(root, 'src', 'views', 'LearnView.vue')
fs.writeFileSync(out, vue)
console.log('wrote', out, vue.length)
