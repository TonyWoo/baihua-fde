// ============================================================
// import-fde.mjs —— 把 chapters/ 的书稿导入为 nimbus 站点页面
// 用法：site/ 目录下 node scripts/import-fde.mjs
// 由 `prebuild` 自动调用，保证构建永远用最新书稿
// 输出 41 页：落地页 1 + 前言 1 + 篇页 8 + 31 章（每章一页）
// 章节按篇分文件夹（part1…part7），Nimbus 侧边栏按文件夹分组，
// 分组名取篇文件夹 index 页（篇页）的标题——没有篇页时组名会是文件夹名（Part1…）。
// 图片：仓库根 images/ → site/public/images/，正文 ../images/ 改写为 <base>images/
// ============================================================
import { readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHAPTERS_DIR = join(ROOT, '..', 'chapters');
const OUT_DIR = join(ROOT, 'src', 'content', 'docs');
const IMAGES_DIR = join(ROOT, '..', 'images');
const PUBLIC_IMAGES_DIR = join(ROOT, 'public', 'images');

// 站点 base 路径（astro.config.ts 里的 base: "..."），图片引用要带上它，
// 否则部署到 GitHub Pages 项目路径下时图片 404
function readBase() {
  const cfg = readFileSync(join(ROOT, 'astro.config.ts'), 'utf8');
  const m = cfg.match(/base:\s*["']([^"']+)["']/);
  let b = m ? m[1] : '/';
  if (!b.endsWith('/')) b += '/';
  return b;
}
const SITE_BASE = readBase();

// 正文图片：仓库根 images/ → site/public/images/（public 映射到站点根，
// 构建后位于 <base>/images/，与 fixImagePaths 改写的路径对应）
function copyImages() {
  if (!existsSync(IMAGES_DIR)) return;
  mkdirSync(PUBLIC_IMAGES_DIR, { recursive: true });
  let n = 0;
  for (const f of readdirSync(IMAGES_DIR)) {
    if (/\.(svg|png|jpe?g|webp|gif)$/i.test(f)) {
      copyFileSync(join(IMAGES_DIR, f), join(PUBLIC_IMAGES_DIR, f));
      n++;
    }
  }
  console.log(`import-fde: 拷贝图片 ${n} 张`);
}

// 正文标题处理：书稿第一行 `# 第 X 章 ……` 与 frontmatter 标题重复，导入时去掉；
// 其余一级标题降为二级，避免一页两个 H1
const stripTitleH1 = (body) => body.replace(/^\s*# .*\r?\n/, '');
const demoteH1 = (body) => body.replace(/^# /gm, '## ');
// 正文里的 ../images/xxx 改写为 <base>/images/xxx（Astro 不会自动给
// markdown 里的根绝对路径加 base，必须手动带上）
const fixImagePaths = (body) => body.replace(/\.\.\/images\//g, `${SITE_BASE}images/`);

function frontmatter({ title, description, order, label, group }) {
  const esc = (s) => `"${String(s ?? '').replace(/"/g, '\\"')}"`;
  return [
    '---',
    `title: ${esc(title)}`,
    `description: ${esc(description)}`,
    'sidebar:',
    `  order: ${order}`,
    `  label: ${esc(label || title)}`,
    '  group:',
    `    label: ${esc(group)}`,
    '---',
    '',
  ].join('\n');
}

// 篇定义：文件夹、分组名、章号范围、一句话导读（标题以 outline/OUTLINE.md 为准）
const PARTS = [
  { dir: 'part1', label: '第一篇 先说清：FDE 到底是什么', lo: 1, hi: 3, intro: '先把这个岗位说清：它不是驻场外包，也不是售前顾问。三个硬标准、一张岗位地图，再加上发明它的 Palantir 到底做对了什么。' },
  { dir: 'part2', label: '第二篇 为什么偏偏是现在爆发', lo: 4, hi: 7, intro: '一个岗位被大厂用几十亿美元集体下注，背后是同一件事：AI 卡在了最后一公里。这一篇讲爆发的原因、大厂的时间线、钱与人的账，还有中国语境。' },
  { dir: 'part3', label: '第三篇 一个项目是怎么跑完的', lo: 8, hi: 11, intro: '跟着贯穿案例走完一个完整的 FDE 项目：入场、拆题、两周出第一版、45 天上生产，最后干净撤场。' },
  { dir: 'part4', label: '第四篇 FDE 的功夫清单', lo: 12, hi: 15, intro: 'FDE 的本事分四样：技术底盘、业务嗅觉、现场能力、小队编制。这一篇逐样拆开，顺带说清哪些能练、哪些是天赋。' },
  { dir: 'part5', label: '第五篇 把现场变成产品：组织与商业', lo: 16, hi: 19, intro: '站在厂商一侧看：现场经验怎么回流成产品、这门生意怎么收费、什么时候该建队、企业买的时候怎么防锁定。' },
  { dir: 'part6', label: '第六篇 企业内部成立 FDE：方法论', lo: 20, hi: 24, intro: '站在企业一侧看：要不要自建、队放在哪里、第一批人从哪来、怎么运转、经验怎么沉淀成资产而不是长在个人身上。' },
  { dir: 'part7', label: '第七篇 争议与未来', lo: 25, hi: 27, intro: '热闹之外有冷水：是不是咨询换皮、锁定与 IP 风险、Agent 会不会把这个岗位吃掉。' },
  { dir: 'part8', label: '第八篇 入行手册', lo: 28, hi: 31, intro: '想干这一行的人看这里：谁适合谁别来、面试在考什么、90 天补课表、五类雇主分别投哪种。' },
];
const partOf = (n) => PARTS.find((p) => n >= p.lo && n <= p.hi);

// 章名（outline/OUTLINE.md 的短标题）
const TITLES = {
  1: '不是驻场外包',
  2: '一张岗位地图',
  3: 'Palantir 发明了什么',
  4: 'AI 的最后一公里',
  5: '2026 大厂军备竞赛',
  6: '钱与人',
  7: '中国语境',
  8: '入场 72 小时',
  9: '把含糊问题拆成目标',
  10: '两周出第一版',
  11: '撤场与留守物',
  12: '技术底盘',
  13: '业务嗅觉',
  14: '现场能力',
  15: '小队编制',
  16: '现场变产品',
  17: '怎么收费',
  18: '该不该建队',
  19: '买方指南',
  20: '自建还是外购',
  21: '组织设计：放在哪里',
  22: '组队与选人',
  23: '运转方法论：四个关口',
  24: '沉淀与度量',
  25: '是不是换皮',
  26: '风险清单',
  27: '会被 Agent 吃掉吗',
  28: '谁适合，谁别来',
  29: '面试拆解',
  30: '90 天转型计划',
  31: '去哪投，投哪种',
};
const chapterTitle = (n) => `第 ${n} 章 ${TITLES[n]}`;

function main() {
  copyImages();
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  let pages = 0;
  const write = (relPath, fm, body) => {
    const full = join(OUT_DIR, relPath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, fm + demoteH1(stripTitleH1(fixImagePaths(body))).replace(/\s+$/, '') + '\n');
    pages++;
  };
  const readChapter = (name) => readFileSync(join(CHAPTERS_DIR, name), 'utf8');

  // 前言
  write(
    'preface/index.md',
    frontmatter({
      title: '前言',
      description: '《白话 FDE》前言：模型已经够强了，为什么 AI 还是落不了地',
      order: 5,
      group: '开篇',
    }),
    readChapter('ch00-preface.md'),
  );

  // 篇页：文件夹 index 即侧边栏分组头（标题即分组名），正文列本篇章节
  for (const [i, part] of PARTS.entries()) {
    const items = [];
    for (let n = part.lo; n <= part.hi; n++) {
      items.push(`- [${chapterTitle(n)}](./ch${String(n).padStart(2, '0')}/)`);
    }
    write(
      `${part.dir}/index.md`,
      frontmatter({
        title: part.label,
        description: `《白话 FDE》${part.label}`,
        order: (i + 1) * 100,
        label: part.label,
        group: part.label,
      }),
      [part.intro, '', ...items, ''].join('\n'),
    );
  }

  // 31 章
  for (let n = 1; n <= 31; n++) {
    const part = partOf(n);
    const file = `ch${String(n).padStart(2, '0')}.md`;
    write(
      `${part.dir}/ch${String(n).padStart(2, '0')}/index.md`,
      frontmatter({
        title: chapterTitle(n),
        description: `《白话 FDE》${chapterTitle(n)}`,
        order: n * 10,
        group: part.label,
      }),
      readChapter(file),
    );
  }

  // 落地页 index.md（order 最小，排最前），按篇分组列出全部章节
  const partList = (part) => {
    const items = [];
    for (let n = part.lo; n <= part.hi; n++) {
      items.push(`- [${chapterTitle(n)}](./${part.dir}/ch${String(n).padStart(2, '0')}/)`);
    }
    return [`## ${part.label}`, '', ...items, ''].join('\n');
  };
  write(
    'index.md',
    frontmatter({
      title: '白话 FDE',
      description: '写给开发者、企业和 AI 从业者的前线部署课',
      order: -100,
      label: '全书导读',
      group: '开篇',
    }),
    [
      '写给开发者、企业和 AI 从业者的前线部署课。作者：Tony Wu。',
      '',
      'FDE（Forward Deployed Engineer，前线部署工程师）是 Palantir 发明、2026 年被微软、OpenAI、Anthropic、AWS 集体下注的岗位：把工程师派进客户现场，写生产代码，对业务结果负责。这本书文字精简、多用图，把这个岗位是什么、为什么爆发、项目怎么跑、企业内部怎么建队、个人怎么入行，一次说清。',
      '',
      '全书跟着一个贯穿案例走：工程师陆远被派到制造企业临江精工，把一个停在演示阶段的 AI 项目在 45 天里推上真实产线，后半程再看着这家企业组起自己的内部 FDE 队。每章都是短讲解、陆远的现场、一张主图、要点清单，再加练手题。',
      '',
      '## 开篇',
      '',
      '- [前言](./preface/)',
      '',
      ...PARTS.map(partList),
    ].join('\n'),
  );

  console.log(`import-fde: 导入完成，31 章，共 ${pages} 页`);
  // 落地页 1 + 前言 1 + 篇页 8 + 31 章 = 41
  if (pages !== 41) {
    console.error(`页数不对：期望 41，实际 ${pages}`);
    process.exit(1);
  }
}

main();
