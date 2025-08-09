import { chromium } from 'playwright';
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// === Load environment variables ===
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const GITHUB_MODE = process.env.GITHUB_ACTIONS === 'true';

// === Load accounts data ===
let accounts = [];

if (GITHUB_MODE) {
    if (!process.env.ACCOUNTS_JSON) {
        console.error("❌ Missing ACCOUNTS_JSON secret in GitHub Actions");
        process.exit(1);
    }
    try {
        accounts = JSON.parse(process.env.ACCOUNTS_JSON);
    } catch (err) {
        console.error("❌ ACCOUNTS_JSON secret is not valid JSON");
        process.exit(1);
    }
} else {
    if (!fs.existsSync('accounts.json')) {
        console.error("❌ Missing accounts.json file for local run");
        process.exit(1);
    }
    accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf-8'));
}

// === Telegram sender ===
async function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn("⚠️ Telegram bot token or chat ID not set — skipping notification");
        return;
    }
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message
        });
    } catch (err) {
        console.error("❌ Failed to send Telegram message:", err.message);
    }
}

// === Main automation ===
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const loginUrl = 'https://www.pythonanywhere.com/login/';

    for (const account of accounts) {
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
            await sendTelegramMessage(successMessage);
        } catch (err) {
            const errorMessage = `❌ ${account.username}: שגיאה - ${err.message}`;
            console.error(errorMessage);
            await sendTelegramMessage(errorMessage);
        }
    }

    await browser.close();
})();