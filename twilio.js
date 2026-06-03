const twilio = require('twilio');
const { queries } = require('./db');

/**
 * Sends a WhatsApp notification to all registered contacts in the database.
 * @param {string} textContent The message content to send.
 */
async function sendWhatsAppBroadcast(textContent) {
  const isEnabled = queries.getSetting('enable_whatsapp') === 'true';
  if (!isEnabled) {
    console.log('[WhatsApp Notification] Disabled in settings.');
    return { success: false, reason: 'Disabled in settings' };
  }

  // Load credentials from database settings (falls back to process.env)
  const accountSid = queries.getSetting('twilio_sid') || process.env.TWILIO_ACCOUNT_SID;
  const authToken = queries.getSetting('twilio_auth_token') || process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = queries.getSetting('twilio_from_number') || process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber || accountSid.includes('XXXXX')) {
    console.warn('[WhatsApp Notification] Twilio configuration is missing or invalid.');
    return { success: false, reason: 'Missing credentials' };
  }

  // Fetch contacts
  const contacts = queries.getContacts();
  if (contacts.length === 0) {
    console.log('[WhatsApp Notification] No registered contacts to send to.');
    return { success: false, reason: 'No contacts found' };
  }

  try {
    const client = twilio(accountSid, authToken);
    const sendPromises = contacts.map(contact => {
      // Format number to make sure it has whatsapp: prefix
      let to = contact.phone_number;
      if (!to.startsWith('whatsapp:')) {
        to = `whatsapp:${to}`;
      }
      
      let from = fromNumber;
      if (!from.startsWith('whatsapp:')) {
        from = `whatsapp:${from}`;
      }

      console.log(`[WhatsApp Notification] Sending to ${contact.name} (${to})...`);
      return client.messages.create({
        body: textContent,
        from: from,
        to: to
      });
    });

    const results = await Promise.allSettled(sendPromises);
    
    // Log success/failure counts
    let successCount = 0;
    let failCount = 0;
    results.forEach((res, i) => {
      if (res.status === 'fulfilled') {
        successCount++;
      } else {
        failCount++;
        console.error(`[WhatsApp Notification] Failed sending to ${contacts[i].name}:`, res.reason.message || res.reason);
      }
    });

    console.log(`[WhatsApp Notification] Broadcast finished. Success: ${successCount}, Failures: ${failCount}`);
    return { success: true, successCount, failCount };
  } catch (err) {
    console.error('[WhatsApp Notification] Global error in broadcast:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendWhatsAppBroadcast
};
