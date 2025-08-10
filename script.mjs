import { chromium } from 'playwright';
import dotenv from 'dotenv';
import axios from 'axios'; // ייבוא כל הספרייה



await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message });
dotenv.config(); // טוען משתני סביבה מקובץ .env אם קיים

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === 'true';

// קריאת רשימת חשבונות
let accounts;
try {
    if (process.env.ACCOUNTS_JSON) {
        accounts = JSON.parse(process.env.ACCOUNTS_JSON);
    } else {
        // fallback - לקריאה מקובץ accounts.json להרצה מקומית
        const { readFileSync } = await import('fs');
        accounts = JSON.parse(readFileSync('accounts.json', 'utf-8'));
    }
} catch (err) {
    console.error("❌ לא הצלחנו לקרוא את רשימת החשבונות:", err.message);
    process.exit(1);
}

const loginUrl = 'https://www.pythonanywhere.com/login/';

// פונקציה לשליחת הודעה לטלגרם
async function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error("⚠️ לא הוגדרו פרטי טלגרם");
        return;
    }
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await post(url, { chat_id: TELEGRAM_CHAT_ID, text: message });
    } catch (err) {
        console.error("❌ כשל בשליחת הודעה לטלגרם:", err.message);
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
