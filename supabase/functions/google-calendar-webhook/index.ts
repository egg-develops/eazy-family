import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-goog-resource-state, x-goog-resource-id, x-goog-message-number, x-goog-resource-uri",
};

interface GoogleWebhookNotification {
  message?: {
    data?: string;
    attributes?: {
      "x-goog-resource-state"?: string;
      "x-goog-resource-id"?: string;
      "x-goog-message-number"?: string;
      "x-goog-resource-uri"?: string;
    };
  };
}

interface CalendarSyncRecord {
  resource_id: string;
  sync_token: string;
  user_id: string;
  calendar_id: string;
  last_synced: string;
}

// Google Pub/Sub push notifications include resource state and ID
// States: 'exists' (change) or 'not_exists' (delete)
// Resource ID identifies which calendar has changes

async function handleWebhookNotification(
  notification: GoogleWebhookNotification
): Promise<{
  status: string;
  message: string;
  resourceId?: string;
  resourceState?: string;
}> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract Google Pub/Sub attributes
    const resourceState =
      notification.message?.attributes?.["x-goog-resource-state"];
    const resourceId =
      notification.message?.attributes?.["x-goog-resource-id"];
    const messageNumber =
      notification.message?.attributes?.["x-goog-message-number"];
    const resourceUri =
      notification.message?.attributes?.["x-goog-resource-uri"];

    console.log("Webhook notification received:", {
      resourceState,
      resourceId,
      messageNumber,
      resourceUri,
    });

    // Resource state 'exists' means changes to calendar
    // Resource state 'not_exists' means permission revoked
    if (resourceState === "not_exists") {
      console.log("Calendar permission revoked for resource:", resourceId);
      // Mark sync as needing re-auth
      await supabase
        .from("google_calendar_sync")
        .update({ sync_token: null, last_synced: new Date().toISOString() })
        .eq("resource_id", resourceId);

      return {
        status: "success",
        message: "Permission revoked notification processed",
        resourceId,
        resourceState,
      };
    }

    // For 'exists' state, mark calendar for sync
    // The actual sync will be triggered by a background job or next user request
    if (resourceState === "exists") {
      console.log("Calendar change detected for resource:", resourceId);

      // Find the sync record by resource ID
      const { data: syncRecord, error: fetchError } = await supabase
        .from("google_calendar_sync")
        .select("*")
        .eq("resource_id", resourceId)
        .single();

      if (fetchError) {
        console.log("Sync record not found for resource:", resourceId);
        return {
          status: "queued",
          message: "Webhook noted, sync record not found (will sync on next user request)",
          resourceId,
          resourceState,
        };
      }

      // Update the sync record to indicate changes pending
      // Set sync_token to null to force full sync on next attempt
      const { error: updateError } = await supabase
        .from("google_calendar_sync")
        .update({
          sync_token: null,
          last_synced: new Date().toISOString(),
          needs_sync: true,
        })
        .eq("resource_id", resourceId);

      if (updateError) {
        console.error("Error updating sync record:", updateError);
        return {
          status: "error",
          message: "Failed to update sync record",
          resourceId,
          resourceState,
        };
      }

      return {
        status: "success",
        message: "Webhook processed, sync queued for next user request",
        resourceId,
        resourceState,
      };
    }

    return {
      status: "skipped",
      message: "Unknown resource state",
      resourceId,
      resourceState,
    };
  } catch (error) {
    console.error("Error processing webhook:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only accept POST requests for webhook notifications
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "Method not allowed. Use POST for webhook notifications.",
      }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();
    const result = await handleWebhookNotification(body);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process webhook",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
