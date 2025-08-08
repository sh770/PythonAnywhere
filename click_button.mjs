import { chromium } from 'playwright';   // Playwright - שליטה על דפדפן
import { readFileSync } from 'fs';       // קריאת קבצים מקומיים
import axios from 'axios';               // שליחת בקשות HTTP
import dotenv from 'dotenv';             // טעינת משתני סביבה
dotenv.config();

// טעינת טוקן וצ'אט ID מהסביבה
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '...';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '...';

// קריאת רשימת החשבונות מהקובץ accounts.json
const accounts = JSON.parse(readFileSync('accounts.json', 'utf-8'));

// כתובת הלוגאין
const loginUrl = 'https://www.pythonanywhere.com/login/';

// פונקציית שליחת הודעה לטלגרם
async function sendTelegramMessage(message) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message
        });
    } catch (err) {
        console.error("Failed to send Telegram message:", err.message);
    }
}

(async () => {
    const browser = await chromium.launch({ headless: true }); // הפעלת דפדפן במצב מוסתר

    let results = []; // כאן נשמור את כל התוצאות

    for (const account of accounts) {
        const context = await browser.newContext(); // הקשר חדש - session נפרד
        const page = await context.newPage();       // פתיחת טאב חדש
        try {
            console.log(`🔹 Logging into account: ${account.username}`);

            // מעבר למסך לוגאין
            await page.goto(loginUrl);
            await page.fill('input[name="auth-username"]', account.username);
            await page.fill('input[name="auth-password"]', account.password);
            await page.click('button[type="submit"]');
            await page.waitForLoadState('networkidle');

            // מעבר לעמוד ה־Web App
            await page.goto(account.webappUrl);
            await page.waitForLoadState('networkidle');

            // איתור ולחיצה על הכפתור
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
        await context.close(); // סגירת הקשר לפני החשבון הבא
    }

    await browser.close();

    // שליחת סיכום אחד לכל החשבונות
    const summary = `📋 דיווח סופי להרצה:\n\n${results.join('\n')}`;
    await sendTelegramMessage(summary);
})();
