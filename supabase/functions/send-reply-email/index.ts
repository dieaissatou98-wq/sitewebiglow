// Sends an email to a customer when an iGlow admin replies to their contact message.
// Deploy with: supabase functions deploy send-reply-email
// Requires secrets: RESEND_API_KEY, and the auto-provided SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "iGlow Beauty <onboarding@resend.dev>";

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé." }), { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Session invalide." }), { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Accès refusé." }), { status: 403 });
    }

    const { messageId } = await req.json();
    if (!messageId) {
      return new Response(JSON.stringify({ error: "messageId manquant." }), { status: 400 });
    }

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .select("name, email, admin_reply")
      .eq("id", messageId)
      .single();

    if (messageError || !message || !message.admin_reply) {
      return new Response(JSON.stringify({ error: "Message introuvable ou sans réponse." }), { status: 404 });
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: message.email,
        subject: "Réponse à votre message - iGlow Beauty",
        text: `Bonjour ${message.name},\n\n${message.admin_reply}\n\n— L'équipe iGlow Beauty`,
      }),
    });

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      return new Response(JSON.stringify({ error: `Échec de l'envoi: ${errText}` }), { status: 502 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
