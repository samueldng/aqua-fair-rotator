import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Droplets, UserPlus, Check, Trash2, RotateCcw, Trophy, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rodízio da Água — Dupla Justa" },
      { name: "description", content: "Cadastre pessoas e descubra de forma justa qual dupla paga a próxima água mineral." },
    ],
  }),
  component: Index,
});

type Person = { id: string; name: string; payments: number };
type Round = { id: string; pair: [string, string]; at: number };

const STORAGE = "water-rotation-v1";

function loadState(): { people: Person[]; history: Round[] } {
  if (typeof window === "undefined") return { people: [], history: [] };
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { people: [], history: [] };
}

function Index() {
  const [people, setPeople] = useState<Person[]>([]);
  const [history, setHistory] = useState<Round[]>([]);
  const [name, setName] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = loadState();
    setPeople(s.people);
    setHistory(s.history);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE, JSON.stringify({ people, history }));
  }, [people, history, hydrated]);

  const nextPair = useMemo<[Person, Person] | null>(() => {
    if (people.length < 2) return null;
    const sorted = [...people].sort((a, b) => a.payments - b.payments || a.name.localeCompare(b.name));
    return [sorted[0], sorted[1]];
  }, [people]);

  const addPerson = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (people.some((p) => p.name.toLowerCase() === n.toLowerCase())) {
      setName("");
      return;
    }
    setPeople([...people, { id: crypto.randomUUID(), name: n, payments: 0 }]);
    setName("");
  };

  const removePerson = (id: string) => setPeople(people.filter((p) => p.id !== id));

  const markPaid = () => {
    if (!nextPair) return;
    const [a, b] = nextPair;
    setPeople(people.map((p) => (p.id === a.id || p.id === b.id ? { ...p, payments: p.payments + 1 } : p)));
    setHistory([{ id: crypto.randomUUID(), pair: [a.name, b.name], at: Date.now() }, ...history]);
  };

  const resetRotation = () => {
    setPeople(people.map((p) => ({ ...p, payments: 0 })));
    setHistory([]);
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
          {nextPair ? (
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
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[color:var(--water-deep)] shadow-lg transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <Check className="h-4 w-4" /> Marcar como pago
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
            className="rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90 active:scale-95"
          >
            Adicionar
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

        {ranked.length === 0 ? (
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
                    onClick={() => removePerson(p.id)}
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
                  <span className="font-medium">{r.pair[0]} & {r.pair[1]}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
