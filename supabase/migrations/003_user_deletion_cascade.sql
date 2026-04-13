-- Cascade user deletion from auth.users to public tables.
-- Covers: Supabase dashboard deletion, API deletion, and GDPR right to erasure.

CREATE OR REPLACE FUNCTION public.handle_user_deleted()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.user_activity WHERE user_id = OLD.id;
  DELETE FROM public.workspaces WHERE user_id = OLD.id;
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_deleted();
