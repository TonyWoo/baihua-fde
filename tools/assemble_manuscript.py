#!/usr/bin/env python3
"""把 chapters/ 下前言 + 31 章装配成单文件 manuscript.md（供 Pandoc 构建 PDF/EPUB）。

装配规则（对齐《一个人出海》的 export 管线）：
- 开头生成扉页：书名（Pandoc 不编号标记 {-}）+ 作者 + 副标题题引。
- 8 篇分隔页以 H1（不编号）插入；每章已是 H1（`# 第 N 章`），章内小节（##）保持不动，
  使目录里篇、章、小节分层（--toc-depth=2）；EPUB 用 --split-level=1 按 H1 切分。
- 本书章节无 frontmatter，直接拼接正文；图片路径从 `../images/` 改写为 `images/`，
  以适配 manuscript.md 位于仓库根。
- SVG 配图在 EPUB 里原生嵌入；PDF 构建前由 CI 把 SVG 转 PNG（XeLaTeX 不认 SVG）。

用法：python3 tools/assemble_manuscript.py [输出文件]
默认输出仓库根 manuscript.md。
"""
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHAPTERS = ROOT / "chapters"
IMAGES = ROOT / "images"
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "manuscript.md"

TITLE = "白话 FDE"
SUBTITLE = "写给开发者、企业和 AI 从业者的前线部署课"
AUTHOR = "Tony Wu"

# （篇分隔标题，章节文件名区间闭区间）
PARTS = [
    (None, ["ch00-preface.md"]),  # 前言
    ("第一篇　先说清：FDE 到底是什么", ["ch01.md", "ch02.md", "ch03.md"]),
    ("第二篇　为什么偏偏是现在爆发", ["ch04.md", "ch05.md", "ch06.md", "ch07.md"]),
    ("第三篇　一个项目是怎么跑完的", ["ch08.md", "ch09.md", "ch10.md", "ch11.md"]),
    ("第四篇　FDE 的功夫清单", ["ch12.md", "ch13.md", "ch14.md", "ch15.md"]),
    ("第五篇　把现场变成产品：组织与商业", ["ch16.md", "ch17.md", "ch18.md", "ch19.md"]),
    ("第六篇　企业内部成立 FDE：方法论", ["ch20.md", "ch21.md", "ch22.md", "ch23.md", "ch24.md"]),
    ("第七篇　争议与未来", ["ch25.md", "ch26.md", "ch27.md"]),
    ("第八篇　入行手册", ["ch28.md", "ch29.md", "ch30.md", "ch31.md"]),
]


def main():
    parts = []
    parts.append(f"# {TITLE} {{-}}\n\n{AUTHOR}\n\n> {SUBTITLE}\n")
    missing_imgs = []

    for part_title, files in PARTS:
        if part_title:
            parts.append(f"# {part_title} {{-}}\n")
        for name in files:
            path = CHAPTERS / name
            if not path.exists():
                raise SystemExit(f"missing chapter: {path}")
            body = path.read_text(encoding="utf-8").strip("\n")
            # 图片路径改写：chapters/../images/x -> images/x
            body = body.replace("](../images/", "](images/")
            for img in re.findall(r"\]\(images/([^)]+)\)", body):
                if not (IMAGES / img).exists():
                    missing_imgs.append(f"{name}: {img}")
            parts.append(f"{body}\n")

    if missing_imgs:
        raise SystemExit("missing images:\n" + "\n".join(missing_imgs))

    OUT.write_text("\n".join(parts), encoding="utf-8")
    han = len(re.findall(r"[一-鿿]", OUT.read_text(encoding="utf-8")))
    n_ch = sum(len(f) for _, f in PARTS)
    print(f"assembled -> {OUT} （{n_ch} 章，汉字约 {han}）")


if __name__ == "__main__":
    main()
