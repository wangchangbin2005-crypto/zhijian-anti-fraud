本目录为静态数据源说明
========================

1. 小程序运行时通过 require 加载同名的 .json 文件（微信基础库要求）。
2. 若你希望用「纯文本」维护数据，请编辑本目录下对应的 .txt 文件（内容为 UTF-8 编码的 JSON），
   然后将其完整内容复制覆盖到同名 .json 文件后，重新编译小程序即可生效。

3. 页面 JS 里请使用顶层 require('../../data/xxx.json') 加载 JSON；不要放在 try/catch 里，
   否则部分构建结果不会把 JSON 打进包，界面上会表现为列表条数为 0、指南无正文等。

文件对应关系：
- kb_seed.txt      ↔ kb_seed.json      （知识库种子案例）
- learn_seed.txt   ↔ learn_seed.json   （学习：精选案例、文本案例、图解、测验等）
- learn_hall.txt   ↔ learn_hall.json    （学习大厅：B站/资讯卡片、分类与搜索数据源）
- guide_seed.txt   ↔ guide_seed.json   （使用指南文案）
- eval_tests.txt   ↔ eval_tests.json   （评估用 25 条测试句）
