# ETHIMO Technology — WhatsApp Bot
## Complete Deployment Guide

---

## STEP 1: Install Node.js
Download from: https://nodejs.org (choose LTS version)
After install, verify in terminal:
```
node --version
npm --version
```

---

## STEP 2: Set Up Project Files
1. Create a folder called `ethimo-wa-bot` on your Desktop
2. Copy these files into it:
   - index.js
   - package.json
   - .env.example
   - credentials.json (from Google Cloud — see Step 4)

---

## STEP 3: Install Dependencies
Open terminal/command prompt in the project folder and run:
```
npm install
```

---

## STEP 4: Set Up Google Sheets

### A) Create Your Leads Sheet
1. Go to sheets.google.com
2. Create a new sheet called "ETHIMO Leads"
3. Add these headers in Row 1:
   - A1: Timestamp
   - B1: Name
   - C1: WhatsApp Number
   - D1: Business Type
   - E1: Service
   - F1: Requirement
   - G1: Budget
   - H1: Status
4. Copy the Sheet ID from the URL:
   https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_SHEET_ID/edit

### B) Create Google Service Account
1. Go to: console.cloud.google.com
2. Create new project → name it "ETHIMO Bot"
3. Enable APIs:
   - Search "Google Sheets API" → Enable
   - Search "Google Drive API" → Enable
4. Go to: Credentials → Create Credentials → Service Account
   - Name: ethimo-bot-service
   - Click Done
5. Click the service account → Keys tab → Add Key → JSON
6. Download the JSON file → rename to `credentials.json`
7. Put credentials.json in your project folder

### C) Share Your Sheet
1. Open your Google Sheet
2. Click Share
3. Add the service account email (from credentials.json — "client_email" field)
4. Give Editor access

---

## STEP 5: Set Up Gmail App Password
1. Go to: myaccount.google.com
2. Security → 2-Step Verification (enable if not already)
3. Search "App passwords"
4. Generate password for: Mail → Other → "ETHIMO Bot"
5. Copy the 16-character password

---

## STEP 6: Configure Environment Variables
1. Copy `.env.example` to `.env`
2. Fill in all values:

```
WA_TOKEN=          ← From Meta Developer Console (after Meta approves)
PHONE_NUMBER_ID=   ← From Meta Developer Console
VERIFY_TOKEN=ethimo_secure_webhook_2024
GOOGLE_SHEET_ID=   ← From your Google Sheet URL
ADMIN_EMAIL=admin@ethimotechnology.com
EMAIL_USER=ethimopvtltd@gmail.com
EMAIL_PASS=        ← Gmail App Password (16 characters)
PORT=3000
```

---

## STEP 7: Test Locally
```
npm start
```
You should see:
```
╔══════════════════════════════════════╗
║   ETHIMO Technology WhatsApp Bot    ║
║   ETHI — AI Assistant v1.0          ║
╠══════════════════════════════════════╣
║   Server running on port 3000       ║
╚══════════════════════════════════════╝
```

Test in browser: http://localhost:3000
You should see: "✅ ETHIMO WhatsApp Bot is running!"

---

## STEP 8: Deploy to Railway (Free Hosting)
1. Go to: railway.app
2. Sign up with GitHub
3. New Project → Deploy from GitHub repo
   OR
   New Project → Deploy from template → Node.js
4. Upload your project files
5. Add Environment Variables (same as .env)
6. Railway gives you a URL like: https://ethimo-bot.up.railway.app
7. Copy this URL — you need it for the webhook!

---

## STEP 9: Connect Webhook to Meta (After Approval)
1. Go to: developers.facebook.com → Your App → WhatsApp → Configuration
2. Webhook section → Edit
3. Callback URL: https://your-railway-url.up.railway.app/webhook
4. Verify Token: ethimo_secure_webhook_2024
5. Click "Verify and Save"
6. Subscribe to: messages

---

## STEP 10: Go Live! 🚀
Send "Hi" to your WhatsApp number.
ETHI should reply instantly!

---

## TROUBLESHOOTING

**Bot not responding?**
- Check Railway logs for errors
- Verify WA_TOKEN is correct
- Make sure webhook is verified

**Google Sheets not saving?**
- Check credentials.json is in project folder
- Verify sheet is shared with service account email
- Check GOOGLE_SHEET_ID is correct

**Emails not sending?**
- Make sure 2FA is enabled on Gmail
- Use App Password, not regular password
- Check EMAIL_USER and EMAIL_PASS in .env

---

## SUPPORT
Email: info@ethimotechnology.com
WhatsApp: +91 98400 55267
