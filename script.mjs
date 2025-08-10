// script.mjs

import { chromium } from 'playwright';  // Playwright for browser automation
import fs from 'fs';                    // File system access
import axios from 'axios';              // HTTP requests
import 'dotenv/config';                 // Load env variables from .env

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '...';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '...';
const loginUrl = 'https://www.pythonanywhere.com/login/';

// Load accounts from either ACCOUNTS_JSON env (GitHub Actions) or local file
let accounts = [];
if (process.env.GITHUB_ACTIONS && process.env.ACCOUNTS_JSON) {
  accounts = JSON.parse(process.env.ACCOUNTS_JSON);
} else {
  accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
}

// Function: Send Telegram message
async function sendTelegramMessage(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const res = await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    });
    if (res.data?.ok !== true) {
      console.error("⚠️ Telegram API error:", res.data);
    }
  } catch (err) {
    if (err.response) {
      console.error("❌ Telegram request failed:", err.response.status, err.response.data);
    } else {
      console.error("❌ Failed to send Telegram message:", err.message);
    }
  }
}

(async () => {
  for (const account of accounts) {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      console.log(`🔹 Logging into account: ${account.username}`);

      // Go to login page
      await page.goto(loginUrl);
      await page.fill('input[name="auth-username"]', account.username);
      await page.fill('input[name="auth-password"]', account.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');

      // Go to webapp page and click the button
      await page.goto(account.webappUrl);
      await page.waitForLoadState('networkidle');

      const button = await page.getByRole('button', { name: 'Run until 3 months from today' });
      await button.click();
      await page.waitForTimeout(1000);

      const successMessage = `✅ ${account.username}: הכפתור נלחץ בהצלחה`;
      console.log(successMessage);
      await sendTelegramMessage(successMessage);
    } catch (err) {
      const errorMessage = `❌ ${account.username}: שגיאה - ${err.message}`;
      console.error(errorMessage);
      await sendTelegramMessage(errorMessage);
    } finally {
      await browser.close(); // Close browser for this account
    }
  }
})();
