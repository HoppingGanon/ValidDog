#!/bin/bash

# 簡易的なアイコンを作成するスクリプト
# ImageMagickが必要です

if ! command -v convert &> /dev/null; then
    echo "ImageMagickがインストールされていません。"
    echo "macOSの場合: brew install imagemagick"
    echo "手動でアイコンを作成してください。"
    exit 1
fi

mkdir -p icons

# SVGベースのアイコンを作成
cat > icons/icon.svg << 'EOF'
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="20" fill="#667eea"/>
  <text x="64" y="85" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle">V</text>
</svg>
EOF

# PNGに変換
convert -background none icons/icon.svg -resize 16x16 icons/icon16.png
convert -background none icons/icon.svg -resize 48x48 icons/icon48.png
convert -background none icons/icon.svg -resize 128x128 icons/icon128.png

echo "アイコンを作成しました"

