/**
 * Cleans a phone number by stripping whitespace, hyphens, parentheses, and '+'.
 * Optionally prepends default country dial code if missing.
 */
export function cleanPhoneNumber(rawInput, defaultDialCode = '91') {
  if (!rawInput) return '';

  let str = String(rawInput).trim();

  // If user entered full international number with + e.g. +91 9876543210
  const hadPlus = str.startsWith('+');

  // Remove everything except digits
  let digitsOnly = str.replace(/\D/g, '');

  if (!digitsOnly) return '';

  // If input started with +, use the digits directly (country code was already included)
  if (hadPlus) {
    return digitsOnly;
  }

  // If user included 00 international prefix (e.g. 00919876543210)
  if (digitsOnly.startsWith('00') && digitsOnly.length > 10) {
    return digitsOnly.slice(2);
  }

  const cleanDefault = defaultDialCode.replace(/\D/g, '');

  // If the number already starts with the default dial code and has appropriate length
  if (cleanDefault && digitsOnly.startsWith(cleanDefault) && digitsOnly.length >= 11) {
    return digitsOnly;
  }

  // If number is a national 10-digit number (common in IN, US, etc.) and default country code exists
  if (digitsOnly.length === 10 && cleanDefault) {
    return `${cleanDefault}${digitsOnly}`;
  }

  // If leading 0 is present for national dialing (e.g. 09876543210 in India or 07911... in UK)
  if (digitsOnly.startsWith('0') && digitsOnly.length === 11 && cleanDefault) {
    return `${cleanDefault}${digitsOnly.slice(1)}`;
  }

  return digitsOnly;
}

/**
 * Validates whether a phone number is valid for WhatsApp Click-to-Chat.
 */
export function validatePhoneNumber(rawInput, defaultDialCode = '91') {
  if (!rawInput || !String(rawInput).trim()) {
    return {
      isValid: false,
      error: 'Phone number cannot be empty.',
      cleaned: ''
    };
  }

  const cleaned = cleanPhoneNumber(rawInput, defaultDialCode);

  if (!cleaned) {
    return {
      isValid: false,
      error: 'Please enter a valid phone number containing digits.',
      cleaned: ''
    };
  }

  // E.164 standard: numbers must be between 7 and 15 digits
  if (cleaned.length < 8) {
    return {
      isValid: false,
      error: `Phone number is too short (${cleaned.length} digits). Please include country code (e.g. 919876543210).`,
      cleaned
    };
  }

  if (cleaned.length > 15) {
    return {
      isValid: false,
      error: `Phone number is too long (${cleaned.length} digits). Max standard length is 15 digits.`,
      cleaned
    };
  }

  return {
    isValid: true,
    error: null,
    cleaned
  };
}

/**
 * Generates the WhatsApp URL based on preferred dispatch engine:
 * - 'web': Direct WhatsApp Web (bypasses intermediate landing page)
 * - 'app': Native WhatsApp Windows/Mac App (whatsapp:// protocol)
 * - 'universal': Standard wa.me click-to-chat
 */
export function generateWhatsAppUrl(phoneNumber, message, engine = 'web') {
  const cleanedNumber = cleanPhoneNumber(phoneNumber);
  const encodedMessage = encodeURIComponent(message || '');

  if (engine === 'app') {
    // Native Windows WhatsApp application protocol
    return `whatsapp://send?phone=${cleanedNumber}&text=${encodedMessage}`;
  }

  if (engine === 'web') {
    // Direct WhatsApp Web (bypasses intermediate landing page)
    return `https://web.whatsapp.com/send/?phone=${cleanedNumber}&text=${encodedMessage}&type=phone_number&app_absent=0`;
  }

  // Universal wa.me router
  return `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;
}

/**
 * Replaces dynamic variables in message text like {name}, {phone}, {company}
 */
export function parseMessageWithVariables(template, contact = {}) {
  if (!template) return '';

  const name = contact.name || contact.fullName || '';
  const firstName = name ? name.split(' ')[0] : 'there';
  const phone = contact.phone || contact.mobile || '';
  const company = contact.company || contact.organization || 'Customer';

  return template
    .replace(/\{name\}/gi, name || firstName || 'there')
    .replace(/\{firstname\}/gi, firstName)
    .replace(/\{phone\}/gi, phone)
    .replace(/\{company\}/gi, company);
}

/**
 * Creates sample CSV content for download
 */
export function getSampleCSV() {
  return `Full Name,Mobile Number,Company,Notes
Aarav Sharma,+91 9876543210,Apex Retail,Interested in Diwali offer
Priya Patel,+91 9823456789,Design Studio,VIP Client
Rahul Verma,+91 9712345678,Verma Logistics,Pending demo
Sneha Kulkarni,+91 9988776655,Tech Innovators,Requested brochure
Michael Scott,+1 555-019-2834,Dunder Mifflin,Prefers WhatsApp in AM`;
}
