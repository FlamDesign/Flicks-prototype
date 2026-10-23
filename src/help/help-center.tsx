import { useEffect, useMemo, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  Search01Icon,
  SparklesIcon,
  LinkSquare02Icon,
  Navigation03Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FlicksLogo } from "@/components/brand";
import { cn } from "@/lib/utils";
import {
  GROUPS,
  GUIDES,
  guideById,
  searchGuides,
  type Frame,
  type Guide,
} from "./guides";
import { openInNewTab } from "./open";

const STEP_MS = 4200;
/** how far the walkthrough zooms in on what to click */
const ZOOM = 1.25;
const reduced = () =>
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;
const guideFromHash = () => {
  const m = location.hash.match(/^#help\/([\w-]+)/);
  return m && guideById(m[1]) ? m[1] : null;
};
const TRY = {
  sample: { label: "Try it in the sample project", hash: "#start=sample" },
  tour: { label: "Take the editor tour", hash: "#start=tour" },
  app: { label: "Try it in Flicks", hash: "" },
} as const;

/**
 * The Help Center, in its own tab (#help, #help/<guide>). Each guide is a walkthrough of real
 * screens: a cursor moves to what to click, with the step written alongside, plus tips and a link
 * that opens the app ready to try it.
 */
export function HelpCenter() {
  const [id, setId] = useState(guideFromHash);
  const [query, setQuery] = useState("");
  const main = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Flicks Help Center";
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const theme = () =>
      document.documentElement.classList.toggle("dark", mq.matches);
    theme();
    mq.addEventListener("change", theme);
    const onHash = () => {
      setId(guideFromHash());
      setQuery("");
      main.current?.scrollTo({ top: 0 });
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => (
      mq.removeEventListener("change", theme),
      window.removeEventListener("hashchange", onHash)
    );
  }, []);

  const guide = id ? guideById(id) : undefined;
  const results = useMemo(() => searchGuides(query), [query]);

  return (
    <TooltipProvider>
      <div className="min-h-svh bg-background text-foreground">
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
            <a
              href="#help"
              className="flex shrink-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FlicksLogo className="h-6" />
              <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
                Help Center
              </span>
            </a>
            <SearchBox
              value={query}
              onChange={setQuery}
              className="ml-auto w-full max-w-xs max-sm:hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 max-sm:ml-auto"
              onClick={() => openInNewTab("")}
            >
              Open Flicks
              <HugeiconsIcon icon={LinkSquare02Icon} className="size-3.5" />
            </Button>
          </div>
        </header>

        {query.trim() ? (
          <Results
            query={query}
            results={results}
            onClear={() => setQuery("")}
          />
        ) : guide ? (
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <GuideNav current={guide.id} />
            <div ref={main} className="min-w-0">
              <GuidePage key={guide.id} guide={guide} />
            </div>
          </div>
        ) : (
          <Home onSearch={setQuery} />
        )}
      </div>
    </TooltipProvider>
  );
}

function SearchBox({
  value,
  onChange,
  className,
  big,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  big?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <HugeiconsIcon
        icon={Search01Icon}
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
          big ? "left-4 size-5" : "left-3 size-4",
        )}
      />
      <Input
        aria-label="Search help"
        placeholder={
          big ? "Search for feeds, thumbnails, tags…" : "Search help"
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(big ? "h-12 rounded-2xl pl-11 text-base" : "h-9 pl-9")}
      />
    </div>
  );
}

function Home({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState("");
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-12 px-4 pb-16 sm:px-6">
      <section className="flex flex-col items-center gap-5 pt-14 text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          How can we help?
        </h1>
        <p className="max-w-lg text-muted-foreground">
          Short walkthroughs of real screens, from your first video to serving
          Flicks in ads.
        </p>
        <form
          className="w-full max-w-xl"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(q);
          }}
        >
          <SearchBox big value={q} onChange={(v) => (setQ(v), onSearch(v))} />
        </form>
      </section>

      <section aria-label="Get going" className="grid gap-3 sm:grid-cols-2">
        <QuickStart
          icon={SparklesIcon}
          title="Open the sample project"
          text="A finished Flick with variations, feeds and thumbnails to look around and change."
          onClick={() => openInNewTab(TRY.sample.hash)}
        />
        <QuickStart
          icon={Navigation03Icon}
          title="Take the editor tour"
          text="Six stops through the editor, in the sample project."
          onClick={() => openInNewTab(TRY.tour.hash)}
        />
      </section>

      {GROUPS.map((group) => (
        <section
          key={group}
          aria-labelledby={`g-${group}`}
          className="flex flex-col gap-4"
        >
          <h2 id={`g-${group}`} className="text-lg font-semibold">
            {group}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDES.filter((g) => g.group === group).map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

function QuickStart({
  icon,
  title,
  text,
  onClick,
}: {
  icon: typeof SparklesIcon;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-3 rounded-2xl bg-muted/60 p-4 text-left outline-none ring-1 ring-foreground/5 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <HugeiconsIcon icon={icon} className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 font-medium">
          {title}
          <HugeiconsIcon
            icon={LinkSquare02Icon}
            className="size-3.5 text-muted-foreground"
          />
        </span>
        <span className="text-sm text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}

function GuideCard({ guide }: { guide: Guide }) {
  const cover = guide.frames[0];
  return (
    <a
      href={`#help/${guide.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-card outline-none ring-1 ring-foreground/10 transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="relative aspect-[16/10] overflow-hidden bg-muted">
        {cover && (
          <img
            src={cover.src}
            alt=""
            loading="lazy"
            className="size-full object-cover object-left-top transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
        <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium shadow-sm">
          <HugeiconsIcon icon={PlayIcon} className="size-3" />
          {guide.frames.length} step{guide.frames.length === 1 ? "" : "s"}
        </span>
      </span>
      <span className="flex flex-col gap-1 p-4">
        <span className="font-medium">{guide.title}</span>
        <span className="line-clamp-2 text-sm text-muted-foreground">
          {guide.summary}
        </span>
      </span>
    </a>
  );
}

function Results({
  query,
  results,
  onClear,
}: {
  query: string;
  results: Guide[];
  onClear: () => void;
}) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">
          {results.length
            ? `${results.length} result${results.length === 1 ? "" : "s"}`
            : "No results"}{" "}
          for “{query.trim()}”
        </h1>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto gap-1"
          onClick={onClear}
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
          Clear
        </Button>
      </div>
      {results.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Try another word, like “price”, “link” or “tag”.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {results.map((g) => (
          <li key={g.id}>
            <a
              href={`#help/${g.id}`}
              className="flex items-center gap-4 rounded-2xl p-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img
                src={g.frames[0]?.src}
                alt=""
                className="aspect-[16/10] w-32 shrink-0 rounded-lg object-cover object-left-top ring-1 ring-foreground/10"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{g.group}</span>
                <span className="font-medium">{g.title}</span>
                <span className="line-clamp-2 text-sm text-muted-foreground">
                  {g.summary}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}

function GuideNav({ current }: { current: string }) {
  return (
    <nav
      aria-label="Guides"
      className="flex flex-col gap-5 max-lg:hidden lg:sticky lg:top-22 lg:max-h-[calc(100svh-7rem)] lg:self-start lg:overflow-y-auto [scrollbar-width:thin]"
    >
      <a
        href="#help"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
        All guides
      </a>
      {GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-0.5">
          <p className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">
            {group}
          </p>
          {GUIDES.filter((g) => g.group === group).map((g) => (
            <a
              key={g.id}
              href={`#help/${g.id}`}
              aria-current={g.id === current ? "page" : undefined}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                g.id === current
                  ? "bg-muted font-medium"
                  : "text-muted-foreground",
              )}
            >
              {g.title}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}

function GuidePage({ guide }: { guide: Guide }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(() => !reduced());
  const i = GUIDES.indexOf(guide);
  const prev = GUIDES[i - 1];
  const next = GUIDES[i + 1];
  const tryIt = guide.tryIt ? TRY[guide.tryIt] : null;

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <a
          href="#help"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground lg:hidden"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
          All guides
        </a>
        <p className="text-sm text-primary">{guide.group}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {guide.title}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{guide.summary}</p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Player
          frames={guide.frames}
          step={step}
          onStep={setStep}
          playing={playing}
          onPlaying={setPlaying}
        />
        <ol className="flex flex-col gap-1" aria-label="Steps">
          {guide.frames.map((f, k) => (
            <li key={f.src}>
              <button
                type="button"
                onClick={() => (setStep(k), setPlaying(false))}
                aria-current={k === step ? "step" : undefined}
                className={cn(
                  "flex w-full gap-3 rounded-xl p-2.5 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                  k === step ? "bg-muted" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium tabular-nums transition-colors",
                    k === step
                      ? "bg-primary text-primary-foreground"
                      : k < step
                        ? "bg-primary/15 text-primary"
                        : "bg-muted-foreground/15",
                  )}
                >
                  {k + 1}
                </span>
                <span className="pt-0.5">{f.caption}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      {guide.tips.length > 0 && (
        <section
          aria-labelledby="tips"
          className="flex max-w-3xl flex-col gap-3 rounded-2xl bg-muted/60 p-5"
        >
          <h2 id="tips" className="font-medium">
            Good to know
          </h2>
          <ul className="flex flex-col gap-2.5">
            {guide.tips.map((t) => (
              <li key={t} className="flex gap-2.5 text-sm">
                <span
                  aria-hidden
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                />
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tryIt && (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => openInNewTab(tryIt.hash)} className="gap-1.5">
            {tryIt.label}
            <HugeiconsIcon icon={LinkSquare02Icon} className="size-3.5" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Opens Flicks in a new tab.
          </span>
        </div>
      )}

      {guide.related && guide.related.length > 0 && (
        <section aria-labelledby="related" className="flex flex-col gap-3">
          <h2 id="related" className="font-medium">
            Related
          </h2>
          <div className="flex flex-wrap gap-2">
            {guide.related.map((r) => {
              const g = guideById(r);
              return (
                g && (
                  <a
                    key={r}
                    href={`#help/${r}`}
                    className="rounded-full px-3 py-1.5 text-sm outline-none ring-1 ring-foreground/10 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {g.title}
                  </a>
                )
              );
            })}
          </div>
        </section>
      )}

      <nav
        aria-label="More guides"
        className="grid gap-3 border-t pt-6 sm:grid-cols-2"
      >
        {prev ? (
          <a
            href={`#help/${prev.id}`}
            className="flex flex-col gap-0.5 rounded-xl p-3 outline-none ring-1 ring-foreground/10 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
              Previous
            </span>
            <span className="text-sm font-medium">{prev.title}</span>
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a
            href={`#help/${next.id}`}
            className="flex flex-col items-end gap-0.5 rounded-xl p-3 text-right outline-none ring-1 ring-foreground/10 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              Next
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
            </span>
            <span className="text-sm font-medium">{next.title}</span>
          </a>
        )}
      </nav>
    </article>
  );
}

/**
 * The walkthrough: real screens crossfade, a cursor glides to what to click and clicks it, then
 * the next screen shows what happened. Plays on its own; pause, step through, or pick a step.
 */
function Player({
  frames,
  step,
  onStep,
  playing,
  onPlaying,
}: {
  frames: Frame[];
  step: number;
  onStep: (n: number) => void;
  playing: boolean;
  onPlaying: (p: boolean) => void;
}) {
  const last = step === frames.length - 1;
  const ended = last && !playing;
  const [run, setRun] = useState(0);
  // the cursor stays where the last click was until this step has somewhere to go
  const target = frames[step];
  const lastPoint = useRef({ x: 50, y: 55 });
  if (target?.x !== undefined)
    lastPoint.current = { x: target.x, y: target.y! };
  const point = lastPoint.current;

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(
      () => (last ? onPlaying(false) : onStep(step + 1)),
      STEP_MS,
    );
    return () => clearTimeout(t);
  }, [playing, step, last, run, onStep, onPlaying]);

  const go = (n: number) => {
    onStep(Math.max(0, Math.min(frames.length - 1, n)));
    onPlaying(false);
  };
  const toggle = () => {
    if (ended) {
      onStep(0);
      setRun((r) => r + 1);
      onPlaying(true);
    } else onPlaying(!playing);
  };

  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <div
        className="group relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-foreground/10"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(step + 1);
          if (e.key === "ArrowLeft") go(step - 1);
          if (e.key === " ") (e.preventDefault(), toggle());
        }}
        tabIndex={0}
        aria-label={`Step ${step + 1} of ${frames.length}: ${target?.caption ?? ""}`}
      >
        <div
          className="absolute inset-0 transition-[transform,transform-origin] duration-[900ms] ease-[cubic-bezier(.45,0,.2,1)]"
          style={{
            transformOrigin: `${point.x}% ${point.y}%`,
            transform: `scale(${target?.x !== undefined ? ZOOM : 1})`,
          }}
        >
          {frames.map((f, k) => (
            <img
              key={f.src}
              src={f.src}
              alt={k === step ? f.caption : ""}
              aria-hidden={k !== step}
              className={cn(
                "absolute inset-0 size-full object-cover transition-opacity duration-500",
                k === step ? "opacity-100" : "opacity-0",
              )}
            />
          ))}

          {/* what this step is about, outlined in the primary colour (the rest dims a little) */}
          {target?.x !== undefined && target.w !== undefined && (
            <div
              key={`ring-${step}-${run}`}
              aria-hidden
              className="pointer-events-none absolute z-[5] rounded-lg border-2 border-primary animate-in fade-in-0 zoom-in-95 duration-300 fill-mode-both delay-300"
              style={{
                left: `calc(${target.x - target.w / 2}% - 4px)`,
                top: `calc(${target.y! - target.h! / 2}% - 4px)`,
                width: `calc(${target.w}% + 8px)`,
                height: `calc(${target.h}% + 8px)`,
                boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.18), 0 0 0 4px color-mix(in oklch, var(--primary) 20%, transparent)",
              }}
            />
          )}
          {/* the cursor */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute z-10 transition-[left,top,opacity] duration-[900ms] ease-[cubic-bezier(.45,0,.2,1)]",
              target?.x === undefined && "opacity-0",
            )}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            {target?.x !== undefined && (
              <span
                key={`${step}-${run}`}
                className="absolute size-10 rounded-full bg-primary/40 ring-2 ring-primary"
                style={{ animation: "help-click 700ms ease-out 1000ms both" }}
              />
            )}
            <svg
              key={`c${step}-${run}`}
              viewBox="0 0 24 24"
              className="relative size-7 -translate-x-[3px] -translate-y-[2px] drop-shadow-[0_2px_3px_rgb(0_0_0/0.35)]"
              style={{
                animation:
                  target?.x !== undefined
                    ? "help-press 260ms ease-in-out 950ms"
                    : undefined,
                transformOrigin: "4px 3px",
              }}
            >
              <path
                d="M4 2.5v17.2l4.7-4.4 2.9 6.6 3-1.3-2.9-6.5h6.6z"
                fill="white"
                stroke="black"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {ended && (
          <button
            type="button"
            onClick={toggle}
            className="absolute inset-0 z-20 grid place-items-center bg-black/30 text-white outline-none animate-in fade-in-0"
          >
            <span className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-medium">
              <HugeiconsIcon icon={RepeatIcon} className="size-4" />
              Watch again
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-full"
              onClick={toggle}
              aria-label={ended ? "Watch again" : playing ? "Pause" : "Play"}
            >
              <HugeiconsIcon
                icon={ended ? RepeatIcon : playing ? PauseIcon : PlayIcon}
                className="size-4"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {ended ? "Watch again" : playing ? "Pause" : "Play"}
          </TooltipContent>
        </Tooltip>
        <div className="flex flex-1 gap-1" role="group" aria-label="Steps">
          {frames.map((f, k) => (
            <button
              key={f.src}
              type="button"
              onClick={() => go(k)}
              aria-label={`Step ${k + 1}`}
              className="group/seg flex h-6 flex-1 items-center outline-none"
            >
              <span className="relative h-1 w-full overflow-hidden rounded-full bg-foreground/10 group-hover/seg:bg-foreground/20 group-focus-visible/seg:ring-2 group-focus-visible/seg:ring-ring">
                <span
                  key={k === step ? `${step}-${run}-${playing}` : k}
                  className={cn(
                    "absolute inset-0 origin-left rounded-full bg-primary",
                    k > step && "scale-x-0",
                    k === step && !playing && "scale-x-100",
                  )}
                  style={
                    k === step && playing
                      ? { animation: `help-timer ${STEP_MS}ms linear both` }
                      : undefined
                  }
                />
              </span>
            </button>
          ))}
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {step + 1} / {frames.length}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            disabled={step === 0}
            onClick={() => go(step - 1)}
            aria-label="Previous step"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            disabled={last}
            onClick={() => go(step + 1)}
            aria-label="Next step"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          </Button>
        </div>
      </div>
    </figure>
  );
}

/** A guide's walkthrough on its own (for the Components gallery). */
export function WalkthroughDemo({ id }: { id: string }) {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const g = guideById(id)
  return g ? <Player frames={g.frames} step={step} onStep={setStep} playing={playing} onPlaying={setPlaying} /> : null
}
