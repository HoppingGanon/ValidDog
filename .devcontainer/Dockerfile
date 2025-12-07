FROM node:24.11.1-bookworm

# 初期化スクリプト追加
COPY init.sh /init.sh

# 初期化スクリプト追加に実行権限を付与
RUN chmod +x /init.sh

ENTRYPOINT ["bash", "/init.sh"]
