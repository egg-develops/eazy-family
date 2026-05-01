import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, inviterName, inviteLink, role } = await req.json();

    if (!to || !inviteLink) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      // No Resend key configured — return success so invite still saves
      console.warn('RESEND_API_KEY not set, skipping email send');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member';
    const fromName = inviterName || 'Your family';

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0a1a;font-family:system-ui,-apple-system,sans-serif">
  <div style="max-width:560px;margin:40px auto;padding:0 20px">
    <div style="text-align:center;margin-bottom:32px">
      <img src="https://eazy.family/logo.png" alt="Eazy.Family" style="width:56px;height:56px;border-radius:14px">
      <h1 style="color:#d4b8ff;font-size:24px;margin:16px 0 4px">Eazy.Family</h1>
    </div>
    <div style="background:#1a0f2e;border:1px solid #3d2a5c;border-radius:20px;padding:32px">
      <h2 style="color:#f0e8ff;font-size:20px;margin:0 0 12px">You've been invited!</h2>
      <p style="color:#a080c8;font-size:15px;line-height:1.6;margin:0 0 24px">
        <strong style="color:#d4b8ff">${fromName}</strong> has invited you to join their family on Eazy.Family as a <strong style="color:#d4b8ff">${roleLabel}</strong>.
      </p>
      <p style="color:#a080c8;font-size:14px;line-height:1.6;margin:0 0 28px">
        Eazy.Family is a private space to organize your family's calendar, tasks, shopping lists, and more — all in one place.
      </p>
      <div style="text-align:center">
        <a href="${inviteLink}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;font-weight:600;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none">
          Accept Invitation →
        </a>
      </div>
      <p style="color:#6b4d8a;font-size:12px;text-align:center;margin:24px 0 0">
        This invitation expires in 7 days. If you didn't expect this email, you can ignore it.
      </p>
    </div>
    <p style="color:#4a3368;font-size:12px;text-align:center;margin-top:24px">
      © ${new Date().getFullYear()} Eazy.Family · <a href="https://eazy.family/privacy" style="color:#6b4d8a">Privacy</a>
    </p>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Eazy.Family <noreply@eazy.family>',
        to: [to],
        bcc: ['ermiasgiovanni@gmail.com'],
        subject: `${fromName} invited you to Eazy.Family`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      // Don't fail the invite — log the error but return success
      return new Response(JSON.stringify({ success: true, emailError: err }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-invite-email error:', err);
    return new Response(JSON.stringify({ success: true, emailError: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
