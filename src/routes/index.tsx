import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Droplets, UserPlus, Check, Trash2, RotateCcw, Trophy, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rodízio da Água — Dupla Justa" },
      { name: "description", content: "Cadastre pessoas e descubra de forma justa qual dupla paga a próxima água mineral." },
    ],
  }),
  component: Index,
});

type Person = { id: string; name: string; payments: number; created_at: string };
type Round = { id: string; person_a: string; person_b: string; paid_at: string };

function Index() {
  const [people, setPeople] = useState<Person[]>([]);
  const [history, setHistory] = useState<Round[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);

  // Load + realtime
  useEffect(() => {
    let active = true;
    (async () => {
      const [p, r] = await Promise.all([
        supabase.from("people").select("*").order("created_at", { ascending: true }),
        supabase.from("rounds").select("*").order("paid_at", { ascending: false }),
      ]);
      if (!active) return;
      if (p.data) setPeople(p.data as Person[]);
      if (r.data) setHistory(r.data as Round[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel("water-rotation")
      .on("postgres_changes", { event: "*", schema: "public", table: "people" }, async () => {
        const { data } = await supabase.from("people").select("*").order("created_at", { ascending: true });
        if (data) setPeople(data as Person[]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds" }, async () => {
        const { data } = await supabase.from("rounds").select("*").order("paid_at", { ascending: false });
        if (data) setHistory(data as Round[]);
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const nextPair = useMemo<[Person, Person] | null>(() => {
    if (people.length < 2) return null;
    const sorted = [...people].sort((a, b) => a.payments - b.payments || a.name.localeCompare(b.name));
    return [sorted[0], sorted[1]];
  }, [people]);

  const addPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (people.some((p) => p.name.toLowerCase() === n.toLowerCase())) {
      toast.error("Essa pessoa já está cadastrada.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("people").insert({ name: n });
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao cadastrar: " + error.message);
      return;
    }
    setName("");
    toast.success(`${n} cadastrado(a)!`);
  };

  const removePerson = async (id: string, pname: string) => {
    const { error } = await supabase.from("people").delete().eq("id", id);
    if (error) toast.error("Erro ao remover: " + error.message);
    else toast.success(`${pname} removido(a).`);
  };

  const markPaid = async () => {
    if (!nextPair || paying) return;
    setPaying(true);
    const [a, b] = nextPair;
    const { error: e1 } = await supabase.from("people").update({ payments: a.payments + 1 }).eq("id", a.id);
    const { error: e2 } = await supabase.from("people").update({ payments: b.payments + 1 }).eq("id", b.id);
    const { error: e3 } = await supabase.from("rounds").insert({ person_a: a.name, person_b: b.name });
    setPaying(false);
    if (e1 || e2 || e3) {
      toast.error("Erro ao registrar pagamento.");
      return;
    }
    toast.success(`Pagamento de ${a.name} & ${b.name} registrado!`);
  };

  const resetRotation = async () => {
    if (!confirm("Zerar todos os contadores e o histórico?")) return;
    const { error: e1 } = await supabase.from("people").update({ payments: 0 }).neq("id", "00000000-0000-0000-0000-000000000000");
    const { error: e2 } = await supabase.from("rounds").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (e1 || e2) toast.error("Erro ao zerar.");
    else toast.success("Rodízio zerado.");
  };

  const ranked = [...people].sort((a, b) => a.payments - b.payments || a.name.localeCompare(b.name));

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24 pt-10 sm:pt-16">
      <header className="mb-10 flex items-center gap-4">
        <div className="relative grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-water)" }}>
          <Droplets className="h-7 w-7" />
          <span className="absolute -inset-1 -z-10 rounded-3xl blur-2xl opacity-60" style={{ background: "var(--gradient-water)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Rodízio da Água</h1>
          <p className="text-sm text-muted-foreground">Quem paga a próxima galão? De forma justa.</p>
        </div>
      </header>

      {/* Próxima dupla */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 text-primary-foreground shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-water)" }}>
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] opacity-80">
            <Trophy className="h-3.5 w-3.5" /> Próxima dupla
          </div>
          {loading ? (
            <div className="mt-4 flex items-center gap-2 opacity-90"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
          ) : nextPair ? (
            <>
              <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-3xl font-semibold sm:text-4xl">{nextPair[0].name}</span>
                <span className="text-xl opacity-70">&</span>
                <span className="text-3xl font-semibold sm:text-4xl">{nextPair[1].name}</span>
              </div>
              <p className="mt-2 text-sm opacity-80">
                {nextPair[0].payments === 0 && nextPair[1].payments === 0
                  ? "Ainda não pagaram nenhuma vez."
                  : `Já pagaram ${nextPair[0].payments} e ${nextPair[1].payments} vez(es).`}
              </p>
              <button
                onClick={markPaid}
                disabled={paying}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--water-deep)] shadow-lg transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
              >
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Marcar como pago
              </button>
            </>
          ) : (
            <p className="mt-4 text-lg opacity-90">Cadastre ao menos 2 pessoas para começar.</p>
          )}
        </div>
      </section>

      {/* Cadastro */}
      <section className="mt-8 rounded-3xl border bg-card p-5 sm:p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cadastrar pessoa</h2>
        </div>
        <form onSubmit={addPerson} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da pessoa"
            className="flex-1 rounded-xl border bg-input/40 px-4 py-3 text-sm outline-none transition focus:border-ring focus:bg-background"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90 active:scale-95 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Adicionar
          </button>
        </form>
      </section>

      {/* Lista pessoas */}
      <section className="mt-6 rounded-3xl border bg-card p-5 sm:p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Participantes · {people.length}
            </h2>
          </div>
          {people.length > 0 && (
            <button
              onClick={resetRotation}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Zerar
            </button>
          )}
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : ranked.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma pessoa cadastrada ainda.</p>
        ) : (
          <ul className="divide-y">
            {ranked.map((p, i) => {
              const isNext = nextPair && (p.id === nextPair[0].id || p.id === nextPair[1].id);
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold ${isNext ? "text-primary-foreground" : "bg-secondary text-secondary-foreground"}`} style={isNext ? { background: "var(--gradient-water)" } : undefined}>
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.payments} pagamento{p.payments === 1 ? "" : "s"}
                        {isNext && <span className="ml-2 font-medium text-[color:var(--water-deep)]">· próximo</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removePerson(p.id, p.name)}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remover ${p.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Histórico */}
      <section className="mt-6 rounded-3xl border bg-card p-5 sm:p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center gap-2">
          <Check className="h-4 w-4 text-[color:var(--success)]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quem já pagou</h2>
        </div>
        {history.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
        ) : (
          <ol className="space-y-2">
            {history.map((r, idx) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground">#{history.length - idx}</span>
                  <span className="font-medium">{r.person_a} & {r.person_b}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.paid_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
