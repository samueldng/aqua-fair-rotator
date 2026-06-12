
CREATE TABLE public.people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  payments INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_a TEXT NOT NULL,
  person_b TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.people TO anon, authenticated;
GRANT ALL ON public.people TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rounds TO anon, authenticated;
GRANT ALL ON public.rounds TO service_role;

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read people" ON public.people FOR SELECT USING (true);
CREATE POLICY "Public insert people" ON public.people FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update people" ON public.people FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete people" ON public.people FOR DELETE USING (true);

CREATE POLICY "Public read rounds" ON public.rounds FOR SELECT USING (true);
CREATE POLICY "Public insert rounds" ON public.rounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete rounds" ON public.rounds FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.people;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;
