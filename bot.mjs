// bot.mjs
import express from 'express'; // For local server
import fetch from 'node-fetch';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Personal Access Token
const GITHUB_REPO = 'username/repo'; // <-- שנה לשם המשתמש והריפו שלך
const GITHUB_WORKFLOW = 'pythonanywhere.yml'; // שם קובץ ה-Workflow

// ===== פונקציה לשליחת הודעות בטלגרם =====
export async function sendTelegramMessage(text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
        });
        if (!res.ok) throw new Error(await res.text());
    } catch (err) {
        console.error("❌ Failed to send Telegram message:", err.message);
    }
}

// ===== פונקציה להפעלת GitHub Actions =====
async function triggerGitHubWorkflow() {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW}/dispatches`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({ ref: 'main' }),
    });

    if (res.ok) {
        await sendTelegramMessage('🚀 ההרצה הופעלה בהצלחה!');
    } else {
        await sendTelegramMessage(`❌ שגיאה בהפעלה: ${res.status} ${res.statusText}`);
    }
}

// ===== Webhook Listener =====
const app = express();
app.use(express.json());

app.post('/webhook', async (req, res) => {
    const message = req.body?.message?.text?.trim().toLowerCase();

    if (message === '/run') {
        await triggerGitHubWorkflow();
    } else {
        await sendTelegramMessage('🤖 קיבלתי את ההודעה, אבל לא זיהיתי פקודה.');
    }

    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Bot Webhook listening on port ${PORT}`);
});
