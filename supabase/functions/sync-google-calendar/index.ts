import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  updated: string;
  status?: string;
}

// Helper function to refresh access token using refresh token
async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<GoogleTokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh access token");
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const serviceRoleClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");

    // Get all active integrations for the user
    const { data: integrations, error: fetchError } = await serviceRoleClient
      .from("calendar_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .eq("is_active", true);

    if (fetchError) throw fetchError;

    if (!integrations || integrations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No Google Calendar integrations found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    let syncedCount = 0;
    let errorCount = 0;

    for (const integration of integrations) {
      try {
        let accessToken = integration.access_token;

        // Check if token is expired and refresh if needed
        if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
          if (!integration.refresh_token) {
            throw new Error("Token expired and no refresh token available");
          }

          const newTokenData = await refreshAccessToken(
            integration.refresh_token,
            clientId || "",
            clientSecret || ""
          );

          accessToken = newTokenData.access_token;
          const newExpiresAt = new Date(Date.now() + newTokenData.expires_in * 1000).toISOString();

          // Update the token in database
          await serviceRoleClient
            .from("calendar_integrations")
            .update({
              access_token: accessToken,
              expires_at: newExpiresAt,
            })
            .eq("id", integration.id);
        }

        // Fetch events from Google Calendar
        const eventsResponse = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=250&showDeleted=false&singleEvents=true&orderBy=startTime",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!eventsResponse.ok) {
          console.error(
            `Failed to fetch events for integration ${integration.id}: ${eventsResponse.statusText}`
          );
          errorCount++;
          continue;
        }

        const eventsData = await eventsResponse.json();
        const events: GoogleCalendarEvent[] = eventsData.items || [];

        // Prepare synced events
        const syncedEvents = events.map((event: GoogleCalendarEvent) => ({
          user_id: user.id,
          integration_id: integration.id,
          google_event_id: event.id,
          title: event.summary,
          description: event.description || null,
          location: event.location || null,
          start_date: event.start.dateTime || event.start.date,
          end_date: event.end.dateTime || event.end.date,
          all_day: !event.start.dateTime,
          google_last_modified: event.updated,
          is_active: event.status !== "cancelled",
        }));

        if (syncedEvents.length > 0) {
          const { error: syncError } = await serviceRoleClient
            .from("synced_calendar_events")
            .upsert(syncedEvents, { onConflict: "user_id,google_event_id" });

          if (syncError) {
            console.error(`Sync error for integration ${integration.id}:`, syncError);
            errorCount++;
            continue;
          }
        }

        // Update last_synced_at
        await serviceRoleClient
          .from("calendar_integrations")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", integration.id);

        syncedCount++;
      } catch (error) {
        console.error(`Error syncing integration ${integration.id}:`, error);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Sync completed",
        synced: syncedCount,
        errors: errorCount,
        total: integrations.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in sync function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Sync failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
