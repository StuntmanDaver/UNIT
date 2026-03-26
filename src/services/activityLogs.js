import { supabase } from './supabaseClient';

export const activityLogsService = {
  async logPageVisit(pageName) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('activity_logs')
      .insert({ user_id: user.id, page_name: pageName })
      .then(() => {}) // fire and forget
      .catch(() => {}); // silently fail
  }
};
