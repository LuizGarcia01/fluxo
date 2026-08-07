import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const TRIAL_DAYS = 15;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const user = data.user;

    const { data: settings } = await supabase
      .from("user_settings")
      .select("trial_expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    // null trial_expires_at = permanent access (no expiry)
    let trialExpiresAt: Date | null = null;
    if (settings?.trial_expires_at) {
      trialExpiresAt = new Date(settings.trial_expires_at);
    } else if (!settings) {
      // No settings row yet — fall back to account creation + TRIAL_DAYS
      const createdAt = new Date(user.created_at ?? Date.now());
      trialExpiresAt = new Date(createdAt.getTime() + TRIAL_DAYS * 86400000);
    }

    if (trialExpiresAt && trialExpiresAt < new Date()) {
      throw redirect({ to: "/trial-expired" });
    }

    const daysLeft = trialExpiresAt
      ? Math.ceil((trialExpiresAt.getTime() - Date.now()) / 86400000)
      : null;

    return { user, daysLeft };
  },
  component: () => <Outlet />,
});
