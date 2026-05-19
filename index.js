// ============================================================
//  ETHIMO Technology — WhatsApp AI Bot (ETHI)
//  Complete Bot with Lead Collection, Google Sheets & Email
// ============================================================

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const nodemailer = require("nodemailer");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const creds = require("./credentials.json");

const app = express();
app.use(express.json());

// ─── CONFIG ────────────────────────────────────────────────
const WA_TOKEN = process.env.WA_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const PORT = process.env.PORT || 3000;

// ─── IN-MEMORY SESSION STORE ────────────────────────────────
// Stores conversation state per user phone number
const sessions = {};

function getSession(phone) {
  if (!sessions[phone]) {
    sessions[phone] = {
      step: "welcome",
      lead: {},
      lastMessage: null,
    };
  }
  return sessions[phone];
}

// ─── WHATSAPP SEND FUNCTIONS ────────────────────────────────
async function sendMessage(to, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`✅ Sent to ${to}: ${text.substring(0, 50)}...`);
  } catch (err) {
    console.error("❌ Send error:", err.response?.data || err.message);
  }
}

async function sendMenu(to) {
  const menu = `🌟 *ETHIMO Technology — Main Menu*

Please choose a service:

1️⃣ Website Development
2️⃣ Mobile App Development
3️⃣ WhatsApp Automation
4️⃣ AI Solutions
5️⃣ Talk to Human Support

_Reply with the number (1-5) to continue_`;
  await sendMessage(to, menu);
}

// ─── BOT REPLY LOGIC ────────────────────────────────────────
async function processMessage(phone, text) {
  const session = getSession(phone);
  const msg = text.trim().toLowerCase();

  // ── LEAD COLLECTION FLOW ──────────────────────────────────
  if (session.step === "collect_name") {
    session.lead.name = text.trim();
    session.step = "collect_phone";
    await sendMessage(phone, `✅ Nice to meet you, *${session.lead.name}*!\n\n📱 Please share your *WhatsApp/contact number* (or type SAME if this is it):`);
    return;
  }

  if (session.step === "collect_phone") {
    session.lead.phone = text.trim() === "same" || text.trim() === "SAME" ? phone : text.trim();
    session.step = "collect_business";
    await sendMessage(phone, `✅ Got it!\n\n🏢 What type of *business* do you have?\n_(e.g. E-commerce, Restaurant, Healthcare, Real Estate, Education, etc.)_`);
    return;
  }

  if (session.step === "collect_business") {
    session.lead.business = text.trim();
    session.step = "collect_requirement";
    await sendMessage(phone, `✅ Great!\n\n📋 Please describe your *project requirement* in a few words:\n_(What do you want to build or automate?)_`);
    return;
  }

  if (session.step === "collect_requirement") {
    session.lead.requirement = text.trim();
    session.step = "collect_budget";
    await sendMessage(
      phone,
      `✅ Perfect!\n\n💰 What is your *estimated budget*?\n\n1️⃣ Under $500\n2️⃣ $500 – $2,000\n3️⃣ $2,000 – $5,000\n4️⃣ $5,000 – $15,000\n5️⃣ $15,000+\n\n_Reply with the number (1-5)_`
    );
    return;
  }

  if (session.step === "collect_budget") {
    const budgetMap = {
      "1": "Under $500",
      "2": "$500 – $2,000",
      "3": "$2,000 – $5,000",
      "4": "$5,000 – $15,000",
      "5": "$15,000+",
    };
    session.lead.budget = budgetMap[msg] || text.trim();
    session.step = "welcome";

    // Save lead
    await saveLead(phone, session.lead);

    // Thank you message
    await sendMessage(
      phone,
      `🎉 *Thank you, ${session.lead.name}!*\n\nYour details have been saved successfully.\n\n✅ Our team will contact you within *2 hours* with a custom proposal.\n\n📎 *What happens next:*\n• You'll receive our portfolio\n• A detailed quote will be prepared\n• Free consultation will be scheduled\n\n🗓️ *Book a consultation now:*\nhttps://calendly.com/ethimotechnology\n\n_Thank you for choosing ETHIMO Technology! 🚀_`
    );

    // Reset lead data
    session.lead = {};
    return;
  }

  // ── GLOBAL COMMANDS ───────────────────────────────────────
  if (msg === "menu" || msg === "hi" || msg === "hello" || msg === "hey" || msg === "start") {
    session.step = "welcome";
    await sendMessage(
      phone,
      `👋 *Hello! Welcome to ETHIMO Technology!*\n\nI'm *ETHI* — your AI assistant 🤖\n\nWe build cutting-edge digital solutions:\n🌐 Websites & Web Apps\n📱 Mobile Applications\n🤖 AI & Automation\n💬 WhatsApp Bots\n💼 CRM Systems\n\n_Let me show you what we can do for you!_`
    );
    await new Promise((r) => setTimeout(r, 1000));
    await sendMenu(phone);
    return;
  }

  if (msg === "quote" || msg === "lead" || msg === "get quote" || msg === "free quote") {
    session.step = "collect_name";
    session.lead = { service: session.lead.service || "General Inquiry" };
    await sendMessage(
      phone,
      `📝 *Let's prepare your FREE custom quote!*\n\nI'll ask you 5 quick questions.\n\n👤 First, what is your *full name*?`
    );
    return;
  }

  if (msg === "pricing" || msg === "price" || msg === "cost" || msg === "how much") {
    await sendMessage(
      phone,
      `💰 *ETHIMO Technology — Pricing*\n\nOur pricing is *project-based* and depends on:\n• Scope & complexity\n• Timeline & urgency\n• Technology stack\n• Post-launch support\n\n*Approximate Ranges:*\n🌐 Website: $500 – $5,000\n📱 Mobile App: $3,000 – $20,000\n💬 WhatsApp Bot: $300 – $2,000\n🤖 AI Solution: $2,000 – $15,000\n💼 CRM System: $1,500 – $10,000\n\n✅ *Get your FREE exact quote now!*\nReply *QUOTE* to get started.`
    );
    return;
  }

  if (msg === "portfolio" || msg === "work" || msg === "projects") {
    await sendMessage(
      phone,
      `🚀 *ETHIMO Technology Portfolio*\n\n✅ 50+ Projects Delivered\n✅ 30+ Happy Clients\n✅ 5+ Countries\n\n*Recent Projects:*\n🌐 E-commerce Platform — Fashion Brand\n📱 Food Delivery App — Restaurant Chain\n💬 WhatsApp Bot — Real Estate Agency\n🤖 AI Chatbot — Healthcare Clinic\n💼 CRM System — Sales Company\n\n📎 View full portfolio:\nhttps://ethimotechnology.com/portfolio\n\n_Interested? Reply *QUOTE* for a free proposal!_`
    );
    return;
  }

  if (msg === "contact" || msg === "support" || msg === "help") {
    await sendMessage(
      phone,
      `📞 *Contact ETHIMO Technology*\n\n👨‍💼 *Business Hours:*\nMon – Sat: 9:00 AM – 7:00 PM IST\n\n📧 Email: info@ethimotechnology.com\n🌐 Website: ethimotechnology.com\n📍 Chennai, Tamil Nadu, India\n\n_Or reply *5* to talk to a human agent now!_`
    );
    return;
  }

  // ── SERVICE MENU SELECTIONS ───────────────────────────────
  if (msg === "1" || msg.includes("website") || msg.includes("web")) {
    session.lead.service = "Website Development";
    await sendMessage(
      phone,
      `🌐 *Website Development by ETHIMO*\n\n*What we build:*\n✅ Business & Corporate Websites\n✅ E-commerce Stores (Shopify, WooCommerce, Custom)\n✅ Landing Pages & Sales Funnels\n✅ Web Applications & Portals\n✅ WordPress & Custom CMS\n\n*What you get:*\n⚡ Lightning-fast performance\n📱 100% Mobile responsive\n🔍 SEO optimized\n🔒 SSL secured\n📊 Analytics integrated\n\n⏱️ *Delivery: 2–4 weeks*\n\n💡 Reply *QUOTE* for a FREE proposal\n🔙 Reply *MENU* to go back`
    );
    return;
  }

  if (msg === "2" || msg.includes("mobile") || msg.includes("app")) {
    session.lead.service = "Mobile App Development";
    await sendMessage(
      phone,
      `📱 *Mobile App Development by ETHIMO*\n\n*Platforms:*\n✅ iOS (iPhone/iPad)\n✅ Android\n✅ Cross-platform (React Native / Flutter)\n\n*Types of Apps:*\n🛒 E-commerce & Shopping\n🍔 Food Delivery & Booking\n🏥 Healthcare & Telemedicine\n🏠 Real Estate & Property\n📚 Education & eLearning\n💼 Business & Productivity\n\n*Included:*\n⚡ Fast & smooth performance\n🔔 Push notifications\n💳 Payment gateway\n📊 Admin dashboard\n\n⏱️ *Delivery: 6–12 weeks*\n\n💡 Reply *QUOTE* for a FREE proposal\n🔙 Reply *MENU* to go back`
    );
    return;
  }

  if (msg === "3" || msg.includes("whatsapp") || msg.includes("automation") || msg.includes("bot")) {
    session.lead.service = "WhatsApp Automation";
    await sendMessage(
      phone,
      `💬 *WhatsApp Automation by ETHIMO*\n\n*What we build:*\n✅ AI-powered Chatbots (like this one!)\n✅ Lead Generation & Collection\n✅ Auto-reply Systems\n✅ Broadcast Campaigns\n✅ Order & Booking Management\n✅ Customer Support Automation\n\n*Integrations:*\n📊 Google Sheets\n💼 CRM Systems\n📧 Email Notifications\n🗓️ Calendar & Booking\n\n⏱️ *Delivery: 1–2 weeks*\n💰 *Starting from $300*\n\n💡 Reply *QUOTE* for a FREE proposal\n🔙 Reply *MENU* to go back`
    );
    return;
  }

  if (msg === "4" || msg.includes("ai") || msg.includes("artificial") || msg.includes("machine")) {
    session.lead.service = "AI Solutions";
    await sendMessage(
      phone,
      `🤖 *AI Solutions by ETHIMO*\n\n*What we offer:*\n✅ Custom AI Chatbots & Assistants\n✅ Business Process Automation\n✅ Data Analytics & Insights\n✅ Natural Language Processing\n✅ Image Recognition & Computer Vision\n✅ Recommendation Systems\n✅ AI-powered CRM & Sales Tools\n\n*Industries we serve:*\n🏥 Healthcare\n🏠 Real Estate\n🛒 E-commerce\n🏦 Finance & Banking\n📚 Education\n\n⏱️ *Delivery: 3–8 weeks*\n\n💡 Reply *QUOTE* for a FREE proposal\n🔙 Reply *MENU* to go back`
    );
    return;
  }

  if (msg === "5" || msg.includes("human") || msg.includes("agent") || msg.includes("person")) {
    await sendMessage(
      phone,
      `👨‍💼 *Connecting to Human Support...*\n\nOur team has been notified and will join this chat shortly.\n\n⏱️ *Expected wait: 5–10 minutes*\n🕐 Available: Mon–Sat, 9AM–7PM IST\n\n_While you wait, feel free to share your requirement and we'll respond as soon as possible!_\n\n📞 For urgent matters:\nCall: +91 98400 55267\n📧 Email: info@ethimotechnology.com`
    );
    // Notify admin of human handoff request
    await sendAdminNotification({
      name: "Unknown",
      phone,
      service: "Human Support Request",
      business: "—",
      requirement: "Customer requested human agent",
      budget: "—",
    });
    return;
  }

  // ── FALLBACK ──────────────────────────────────────────────
  await sendMessage(
    phone,
    `🤔 I didn't quite understand that.\n\nHere's what you can type:\n\n📋 *MENU* — See all services\n💰 *PRICING* — Get pricing info\n📁 *PORTFOLIO* — See our work\n📝 *QUOTE* — Get a free quote\n📞 *CONTACT* — Contact us\n\n_Or reply with a number 1–5 from the menu!_`
  );
}

// ─── GOOGLE SHEETS — SAVE LEAD ───────────────────────────────
async function saveLead(phone, lead) {
  try {
    const serviceAccountAuth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.addRow({
      Timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      Name: lead.name || "—",
      "WhatsApp Number": lead.phone || phone,
      "Business Type": lead.business || "—",
      Service: lead.service || "—",
      Requirement: lead.requirement || "—",
      Budget: lead.budget || "—",
      Status: "New Lead",
    });
    console.log("✅ Lead saved to Google Sheets");
  } catch (err) {
    console.error("❌ Google Sheets error:", err.message);
  }

  // Send admin email notification
  await sendAdminNotification(lead, phone);
}

// ─── EMAIL NOTIFICATION ──────────────────────────────────────
async function sendAdminNotification(lead, phone) {
  try {
    const transporter = nodemailer.createTransporter({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"ETHI Bot 🤖" <${EMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `🔥 New Lead: ${lead.name || "Unknown"} — ${lead.service || "General"}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px;border-radius:10px;">
          <div style="background:#25D366;padding:20px;border-radius:10px;text-align:center;margin-bottom:20px;">
            <h1 style="color:white;margin:0;">🎯 New Lead Alert!</h1>
            <p style="color:white;margin:5px 0;">ETHIMO Technology — WhatsApp Bot</p>
          </div>
          <div style="background:white;padding:20px;border-radius:10px;border-left:4px solid #25D366;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px;color:#666;width:40%;">👤 Name</td><td style="padding:8px;font-weight:bold;">${lead.name || "—"}</td></tr>
              <tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">📱 WhatsApp</td><td style="padding:8px;font-weight:bold;">${lead.phone || phone}</td></tr>
              <tr><td style="padding:8px;color:#666;">🏢 Business Type</td><td style="padding:8px;font-weight:bold;">${lead.business || "—"}</td></tr>
              <tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">🛠️ Service</td><td style="padding:8px;font-weight:bold;">${lead.service || "—"}</td></tr>
              <tr><td style="padding:8px;color:#666;">📋 Requirement</td><td style="padding:8px;font-weight:bold;">${lead.requirement || "—"}</td></tr>
              <tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">💰 Budget</td><td style="padding:8px;font-weight:bold;">${lead.budget || "—"}</td></tr>
              <tr><td style="padding:8px;color:#666;">🕐 Time</td><td style="padding:8px;font-weight:bold;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>
            </table>
          </div>
          <div style="text-align:center;margin-top:20px;">
            <a href="https://wa.me/${lead.phone || phone}" style="background:#25D366;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
              💬 Reply on WhatsApp
            </a>
          </div>
          <p style="text-align:center;color:#999;font-size:12px;margin-top:20px;">
            ETHIMO Technology — WhatsApp Automation System
          </p>
        </div>
      `,
    });
    console.log("✅ Admin notification email sent");
  } catch (err) {
    console.error("❌ Email error:", err.message);
  }
}

// ─── WEBHOOK ROUTES ──────────────────────────────────────────

// Verification (GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
    res.status(200).send(challenge);
  } else {
    console.error("❌ Webhook verification failed");
    res.sendStatus(403);
  }
});

// Incoming messages (POST)
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // Always respond 200 first

  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return;

    const message = messages[0];
    const phone = message.from;
    const type = message.type;

    let text = "";
    if (type === "text") {
      text = message.text.body;
    } else if (type === "interactive") {
      text = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || "";
    } else {
      // Unsupported message type
      await sendMessage(phone, "📝 Please send a text message. Type *MENU* to get started!");
      return;
    }

    console.log(`📨 Message from ${phone}: ${text}`);
    await processMessage(phone, text);
  } catch (err) {
    console.error("❌ Webhook processing error:", err.message);
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "✅ ETHIMO WhatsApp Bot is running!",
    bot: "ETHI — AI Assistant",
    company: "ETHIMO Technology",
    timestamp: new Date().toISOString(),
  });
});

// ─── START SERVER ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   ETHIMO Technology WhatsApp Bot    ║
  ║   ETHI — AI Assistant v1.0          ║
  ╠══════════════════════════════════════╣
  ║   Server running on port ${PORT}       ║
  ║   Webhook: /webhook                 ║
  ║   Health:  /                        ║
  ╚══════════════════════════════════════╝
  `);
});
