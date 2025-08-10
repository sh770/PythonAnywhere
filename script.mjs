import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import axios from 'axios'; // ייבוא המודול כולו
import 'dotenv/config';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '...';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '...';
const accounts = process.env.GITHUB_ACTIONS
    ? JSON.parse(process.env.ACCOUNTS_JSON)
    : JSON.parse(readFileSync('accounts.json', 'utf-8'));

const loginUrl = 'https://www.pythonanywhere.com/login/';

// פונקציית שליחת הודעה לטלגרם
async function sendTelegramMessage(message) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message });
    } catch (err) {
        console.error("Failed to send Telegram message:", err.message);
    }
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

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
