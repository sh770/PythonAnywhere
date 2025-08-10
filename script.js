// script.js
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import axios from 'axios';

// טוען dotenv רק אם אנחנו לא ב-GitHub Actions
if (!process.env.GITHUB_ACTIONS) {
  import('dotenv').then(dotenv => dotenv.config());
}

// קבלת משתני סביבה - או מה־Secrets ב-GitHub או מקובץ .env מקומי
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// טעינת accounts.json
// ב-GitHub Actions אנחנו מניחים שיש משתנה סביבה עם תוכן הקובץ (string)
let accounts;
if (process.env.GITHUB_ACTIONS && process.env.ACCOUNTS_JSON) {
  accounts = JSON.parse(process.env.ACCOUNTS_JSON);
} else {
  accounts = JSON.parse(readFileSync('accounts.json', 'utf-8'));
}

const loginUrl = 'https://www.pythonanywhere.com/login/';

async function sendTelegramMessage(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    });
  } catch (err) {
    console.error('Failed to send Telegram message:', err.message);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const account of accounts) {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      console.log(`🔹 Logging into account: ${account.username}`);

      await page.goto(loginUrl);
      await page.fill('input[name="auth-username"]', account.username);
      await page.fill('input[name="auth-password"]', account.password);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');

      await page.goto(account.webappUrl);
      await page.waitForLoadState('networkidle');

      const button = await page.getByRole('button', { name: 'Run until 3 months from today' });
      await button.click();
      await page.waitForTimeout(1000);

      const successMessage = `✅ ${account.username}: הכפתור נלחץ בהצלחה`;
      console.log(successMessage);
      results.push(successMessage);
    } catch (err) {
      const errorMessage = `❌ ${account.username}: שגיאה - ${err.message}`;
      console.error(errorMessage);
      results.push(errorMessage);
    }

    await context.close();
  }

  await browser.close();

  await sendTelegramMessage(`📋 דיווח סופי להרצה:\n\n${results.join('\n')}`);
})();
