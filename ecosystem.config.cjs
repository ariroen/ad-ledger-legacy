module.exports = {
  apps: [
    {
      name: "ad-ledger",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3000",
      cwd: process.env.ADS_REMOTE_DIR || "/home/gioshio/ad-ledger/app",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: process.env.DATABASE_URL || "file:/home/gioshio/ad-ledger/data/prod.sqlite",
        ADS_DATA_DIR: process.env.ADS_DATA_DIR || "/home/gioshio/ad-ledger/data",
        ADS_UPLOAD_DIR: process.env.ADS_UPLOAD_DIR || "/home/gioshio/ad-ledger/uploads",
        ADS_SOURCE_WORKBOOK: process.env.ADS_SOURCE_WORKBOOK || "",
        ADS_TELEGRAM_JSONL: process.env.ADS_TELEGRAM_JSONL || "/home/gioshio/ad-ledger/telegram/messages.jsonl",
        ADS_SESSION_SECRET: process.env.ADS_SESSION_SECRET || "replace-on-server",
      },
    },
  ],
};
