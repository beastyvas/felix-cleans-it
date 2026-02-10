import { supabase } from "@/utils/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, phone, address, description, timeline, quoteId } = req.body;

  try {
    // ✅ Input validation
    if (!name || typeof name !== 'string' || name.length > 100) {
      return res.status(400).json({ error: 'Invalid name' });
    }

    if (!phone || typeof phone !== 'string' || phone.length > 20) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    if (!address || typeof address !== 'string' || address.length > 200) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    if (!description || typeof description !== 'string' || description.length > 1000) {
      return res.status(400).json({ error: 'Invalid description' });
    }

    if (!timeline || typeof timeline !== 'string') {
      return res.status(400).json({ error: 'Invalid timeline' });
    }

    // Sanitize inputs (remove potential XSS)
    const sanitizedName = name.replace(/[<>]/g, '');
    const sanitizedAddress = address.replace(/[<>]/g, '');
    const sanitizedDescription = description.replace(/[<>]/g, '');

    // Get Felix's phone number from settings
    const { data: settings } = await supabase
      .from("settings")
      .select("phone")
      .single();

    const felixPhone = settings?.phone || process.env.FELIX_PHONE || "7025831039";

    // Format the SMS message - NO URLS (TextBelt blocks unverified accounts)
    const message = `NEW QUOTE REQUEST

Customer: ${sanitizedName}
Phone: ${phone}
Location: ${sanitizedAddress}

What: ${sanitizedDescription}

When: ${timeline}

Check your dashboard for photos and details`.trim();

    console.log("📱 Sending SMS to:", felixPhone);

    // Send SMS using TextBelt
    const smsResponse = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: felixPhone.replace(/\D/g, ""), // Strip all non-digits
        message: message,
        key: process.env.TEXTBELT_API_KEY || "textbelt",
      }),
    });

    const smsData = await smsResponse.json();

    console.log("📨 TextBelt Response:", JSON.stringify(smsData, null, 2));

    if (!smsData.success) {
      console.error("❌ SMS FAILED:", smsData.error || smsData);
      // Don't crash the quote submission if SMS fails
      return res.status(200).json({ 
        success: true, 
        quoteSaved: true,
        smsError: smsData.error || "SMS delivery failed",
        smsDetails: smsData
      });
    }

    console.log("✅ SMS sent successfully! TextID:", smsData.textId);
    
    return res.status(200).json({ 
      success: true, 
      quoteSaved: true,
      smsSent: true,
      quotaRemaining: smsData.quotaRemaining
    });
  } catch (error) {
    console.error("❌ API Error:", error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}