export const DEFAULT_TEMPLATES = [
  {
    id: 'special-discount',
    title: '🎉 Festive / Flash Sale Offer',
    category: 'Promotions',
    content: `Hello {name}! 👋

🌟 *Exclusive 20% OFF Flash Sale* is now live for our valued patrons!

Use code: *FESTIVE20* at checkout to grab up to 20% discount on all premium items.
👉 Shop now: https://yourstore.example.com/sale

Offer valid until midnight this Sunday. Don't miss out! 🛍️

_Reply STOP to unsubscribe at any time._`
  },
  {
    id: 'welcome-onboarding',
    title: '👋 Welcome & Onboarding Gift',
    category: 'Welcome',
    content: `Hi {name},

Welcome to the *Apex Family*! 🚀 We're thrilled to have you with us.

As a welcome treat, here is a special gift voucher worth *$15* on your first order.
🎟️ Voucher Code: *WELCOME15*

Need help choosing or have questions? Just reply directly to this message. We're here for you! 😊

_Reply STOP to opt-out._`
  },
  {
    id: 'order-update',
    title: '📦 Order Confirmation & Tracking',
    category: 'Updates',
    content: `Hi {name},

Great news! Your order with *{company}* has been confirmed and is being packed with care. 📦✨

🚚 *Status:* In Preparation
📍 *Estimated Delivery:* 2-3 Business Days
🔎 Track your parcel live: https://yourstore.example.com/track

Thank you for choosing us!

_Reply STOP to unsubscribe._`
  },
  {
    id: 'appointment-reminder',
    title: '📅 Appointment / Consultation Reminder',
    category: 'Reminders',
    content: `Dear {name},

This is a friendly reminder for your upcoming consultation with our specialist tomorrow.

⏰ *Time:* Tomorrow at 11:30 AM
📍 *Location:* Virtual / Zoom Meeting Room
🔗 *Meeting Link:* https://meet.example.com/consultation

If you need to reschedule, please let us know by replying to this chat. See you soon! 🤝`
  },
  {
    id: 'feedback-review',
    title: '⭐ Feedback & Google Review Request',
    category: 'Feedback',
    content: `Hello {name}! 🌟

We hope you are loving your recent experience with our team!

Your feedback means the world to us. Could you spare 30 seconds to share your thoughts?
👉 Leave a quick review: https://review.example.com/apex

Thank you for helping us grow! 🙏

_Reply STOP to opt out._`
  },
  {
    id: 'event-invite',
    title: '🎟️ VIP Webinar / Event Invitation',
    category: 'Events',
    content: `Hi {name},

You're invited! Join our upcoming exclusive masterclass: *"Mastering Growth in 2026"* 🚀

🗓️ *Date:* Thursday, October 22
🕒 *Time:* 6:00 PM IST
🎙️ *Guest Speaker:* Industry Leaders

Seats are limited for VIP invitees. Reserve your spot here:
👉 https://webinar.example.com/register

_Reply STOP to unsubscribe._`
  }
];

export const OPT_OUT_SNIPPET = '\n\n_Reply STOP to unsubscribe from marketing updates._';

// Pre-built high-converting marketing image banners (offline SVG Data URIs)
export const MARKETING_BANNERS = [
  {
    id: 'flash-sale',
    title: '🛍️ Flash Sale 50% OFF',
    name: 'Flash_Sale_50_Off.png',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23ff416c"/><stop offset="100%" stop-color="%23ff4b2b"/></linearGradient></defs><rect width="600" height="340" fill="url(%23g1)" rx="16"/><circle cx="530" cy="60" r="120" fill="rgba(255,255,255,0.08)"/><circle cx="50" cy="300" r="90" fill="rgba(255,255,255,0.08)"/><text x="50" y="80" fill="%23FFE600" font-family="Arial, sans-serif" font-weight="900" font-size="20" letter-spacing="3">LIMITED TIME EXCLUSIVE</text><text x="50" y="150" fill="%23FFFFFF" font-family="Arial, sans-serif" font-weight="900" font-size="52">FLASH SALE</text><rect x="50" y="175" width="230" height="58" rx="29" fill="%23FFFFFF"/><text x="165" y="215" fill="%23FF416C" font-family="Arial, sans-serif" font-weight="900" font-size="34" text-anchor="middle">50% OFF</text><text x="50" y="280" fill="%23FFF0F5" font-family="Arial, sans-serif" font-size="18" font-weight="600">Use Code: FESTIVE50 at Checkout</text><text x="50" y="308" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="14">Free Express Delivery on Orders Today</text></svg>'
  },
  {
    id: 'product-launch',
    title: '🚀 New Product Launch',
    name: 'New_Product_Launch.png',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230F2027"/><stop offset="50%" stop-color="%23203A43"/><stop offset="100%" stop-color="%232C5364"/></linearGradient></defs><rect width="600" height="340" fill="url(%23g2)" rx="16"/><circle cx="520" cy="170" r="140" fill="rgba(0,255,200,0.06)"/><text x="50" y="80" fill="%2300F2FE" font-family="Arial, sans-serif" font-weight="900" font-size="18" letter-spacing="4">INTRODUCING THE NEXT GEN</text><text x="50" y="145" fill="%23FFFFFF" font-family="Arial, sans-serif" font-weight="900" font-size="46">NEW ARRIVAL 2026</text><text x="50" y="195" fill="%23D0E8FF" font-family="Arial, sans-serif" font-weight="500" font-size="20">Smarter. Faster. Engineered for Excellence.</text><rect x="50" y="235" width="220" height="50" rx="25" fill="%2300F2FE"/><text x="160" y="267" fill="%230F2027" font-family="Arial, sans-serif" font-weight="800" font-size="18" text-anchor="middle">DISCOVER NOW →</text></svg>'
  },
  {
    id: 'vip-pass',
    title: '👑 VIP Exclusive Pass',
    name: 'VIP_Exclusive_Pass.png',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231a1a2e"/><stop offset="100%" stop-color="%2316213e"/></linearGradient><linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23F7971E"/><stop offset="100%" stop-color="%23FFD200"/></linearGradient></defs><rect width="600" height="340" fill="url(%23g3)" rx="16"/><rect x="25" y="25" width="550" height="290" rx="12" fill="none" stroke="url(%23gold)" stroke-width="2" stroke-dasharray="6,4"/><text x="300" y="85" fill="url(%23gold)" font-family="Arial, sans-serif" font-weight="900" font-size="20" letter-spacing="6" text-anchor="middle">★ VIP EXCLUSIVE INVITATION ★</text><text x="300" y="150" fill="%23FFFFFF" font-family="Arial, sans-serif" font-weight="900" font-size="44" text-anchor="middle">SPECIAL PATRON PASS</text><text x="300" y="195" fill="%23E0E0E0" font-family="Arial, sans-serif" font-size="18" text-anchor="middle">Enjoy priority support and private member discounts.</text><rect x="200" y="225" width="200" height="46" rx="23" fill="url(%23gold)"/><text x="300" y="254" fill="%23111" font-family="Arial, sans-serif" font-weight="900" font-size="17" text-anchor="middle">CLAIM ACCESS</text></svg>'
  },
  {
    id: 'festive-special',
    title: '🎁 Festive Celebration',
    name: 'Festive_Special_Offer.png',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230575E6"/><stop offset="100%" stop-color="%2300F260"/></linearGradient></defs><rect width="600" height="340" fill="url(%23g4)" rx="16"/><circle cx="530" cy="270" r="110" fill="rgba(255,255,255,0.12)"/><text x="50" y="80" fill="%23FFEA79" font-family="Arial, sans-serif" font-weight="900" font-size="18" letter-spacing="3">SEASONAL CELEBRATION</text><text x="50" y="145" fill="%23FFFFFF" font-family="Arial, sans-serif" font-weight="900" font-size="48">FESTIVE DELIGHTS</text><text x="50" y="190" fill="%23FFFFFF" font-family="Arial, sans-serif" font-size="20" font-weight="600">Extra 25% Off Storewide + Gift on Every Order</text><rect x="50" y="230" width="240" height="50" rx="25" fill="%23FFFFFF"/><text x="170" y="262" fill="%230575E6" font-family="Arial, sans-serif" font-weight="900" font-size="18" text-anchor="middle">SHOP THE SALE 🎁</text></svg>'
  }
];
