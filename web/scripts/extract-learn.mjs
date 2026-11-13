import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const htmlPath = path.join(root, '初始前后端', 'frontend.html')
let h = fs.readFileSync(htmlPath, 'utf8')

function sliceBetween(start, end) {
  const i = h.indexOf(start)
  if (i < 0) throw new Error('no ' + start)
  const j = h.indexOf(end, i)
  if (j < 0) throw new Error('no ' + end)
  return h.slice(i + start.length, j).trim()
}

const pairs = [
  ['learnCategories', 'const learnCategories =', 'const learnCases ='],
  ['learnCases', 'const learnCases =', 'const learnImageCards ='],
  ['learnImageCards', 'const learnImageCards =', 'const learnVideos ='],
  ['learnVideos', 'const learnVideos =', 'const quizQuestions ='],
  ['quizQuestions', 'const quizQuestions =', '// 个性化视频排序'],
]

let out =
  '// Auto-extracted from 初始前后端/frontend.html\n/* eslint-disable */\n// @ts-nocheck\n'

for (const [name, s, e] of pairs) {
  const body = sliceBetween(s, e)
  out += `export const ${name} = ${body}\n\n`
}

const outPath = path.join(root, 'src', 'data', 'learnHall.ts')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, out)
console.log('wrote', outPath, out.length)
