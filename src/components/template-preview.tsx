import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TEMPLATES, SIZES, type Template } from "@/data";
import { TemplateCard } from "@/components/template-card";
import {
  GENERATED_VIDEOS,
  inSet,
  type CanvasElement,
  type Feed,
} from "@/components/editor/elements";
import { CanvasStage } from "@/components/editor/canvas-stage";
import type { Slide } from "@/components/editor/slides-strip";
import { cn } from "@/lib/utils";

/** Template page: try the Flick live, then Use template. */
export function TemplatePreview({
  t,
  onBack,
  onUse,
  onOpen,
}: {
  t: Template;
  onBack: () => void;
  onUse: (t: Template) => void;
  onOpen: (t: Template) => void;
}) {
  const size = SIZES.find((s) => s.value === t.size);
  const more = TEMPLATES.filter((x) => x.id !== t.id).slice(0, 3);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-10 pt-4 md:px-8">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5 text-muted-foreground"
          onClick={onBack}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
          Templates
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Try it: the Flick as viewers get it */}
        <TryFlick key={t.id} t={t} />

        {/* Details */}
        <aside className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.description}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="secondary" className="font-normal">
                {t.industry}
              </Badge>
              <Badge variant="secondary" className="font-normal tabular-nums">
                {t.size}
                {size && (
                  <span className="text-muted-foreground"> · {size.label}</span>
                )}
              </Badge>
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={() => onUse(t)}>
            Use template
          </Button>
        </aside>
      </div>

      {more.length > 0 && (
        <section className="flex flex-col gap-4 pt-4">
          <h2 className="text-base font-medium">More templates</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((x) => (
              <TemplateCard key={x.id} t={x} onUse={onOpen} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const CYCLE = 4500;

/**
 * A live Flick to try before using the template: the template's videos at its size, its headline
 * and button, and the thumbnail strip. Tap a thumbnail and the video switches; on its own it moves
 * to the next every few seconds, pausing for a while after a tap.
 */
function TryFlick({ t }: { t: Template }) {
  const base = t.video ?? 0;
  // a complete project (brand or saved template): its own videos, design and feeds, as viewers get it
  const snap = t.saved as
    | {
        elements: CanvasElement[];
        slides: Slide[];
        feeds: Feed[];
        includeRef: boolean;
      }
    | undefined;
  const included = snap
    ? snap.includeRef
      ? snap.slides
      : snap.slides.slice(1)
    : [];
  // the reference video and its variations, one per variant the template comes with
  const videos = snap
    ? included.map((s) => s.video ?? base)
    : [...new Set(t.variants.map((_, i) => inSet(base, i)))];
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const id = setTimeout(
      () => setActive((a) => (a + 1) % videos.length),
      CYCLE,
    );
    return () => clearTimeout(id);
  }, [active, auto, videos.length]);
  useEffect(() => {
    if (auto) return;
    const id = setTimeout(() => setAuto(true), 12000);
    return () => clearTimeout(id);
  }, [auto, active]);

  const [w, h] = t.size.split("×").map(Number);
  const wide = w >= h;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl bg-muted p-6 ring-1 ring-foreground/5 lg:h-[min(72vh,640px)]">
        <div
          className={cn(
            "relative overflow-hidden rounded-xl bg-neutral-900 shadow-xl",
            wide ? "w-full" : "h-full",
          )}
          // sized by its shorter side (cqmin), so wide and tall frames look alike
          style={{
            aspectRatio: `${w} / ${h}`,
            maxHeight: "100%",
            maxWidth: "100%",
            containerType: "size",
          }}
        >
          {videos.map((v, i) => {
            const m = GENERATED_VIDEOS[v];
            return (
              <video
                key={v}
                autoPlay
                muted
                loop
                playsInline
                poster={m.poster}
                aria-hidden
                className={cn(
                  "absolute inset-0 size-full object-cover transition-opacity duration-700",
                  i === active ? "opacity-100" : "opacity-0",
                )}
              >
                {m.webm && <source src={m.webm} type="video/webm" />}
                <source src={m.mp4} type="video/mp4" />
              </video>
            );
          })}
          {snap ? (
            <CanvasStage
              elements={snap.elements}
              setElements={() => {}}
              selected={[]}
              setSelected={() => {}}
              editing={null}
              setEditing={() => {}}
              ratio={w / h}
              thumbs={included.map((s) => ({ poster: s.thumb }))}
              activeThumb={active}
              feedOf={(id) => {
                const f = snap.feeds.find((x) => x.id === id);
                return (
                  f && {
                    name: f.name,
                    value: included[active]?.feeds?.[id] ?? "",
                  }
                );
              }}
              readOnly
              onThumb={(i) => (setActive(i), setAuto(false))}
            />
          ) : (
            <>
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50"
              />

              {/* the template's headline and button */}
              <p className="absolute inset-x-[6%] top-[8%] text-balance text-center text-[9cqmin] font-semibold leading-tight text-white drop-shadow">
                {t.headline}
              </p>
              <div className="absolute inset-x-0 bottom-[5%] flex flex-col items-center gap-[5cqmin]">
                <span className="rounded-full bg-white px-[6cqmin] py-[2.5cqmin] text-[4.5cqmin] font-medium text-zinc-950 shadow">
                  {t.cta}
                </span>

                {/* the strip viewers tap */}
                <div
                  role="radiogroup"
                  aria-label="Try the variations"
                  className="flex justify-center gap-[3cqmin]"
                >
                  {videos.map((v, i) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={i === active}
                      aria-label={t.variants[i]?.label ?? `Variation ${i + 1}`}
                      onClick={() => (setActive(i), setAuto(false))}
                      className={cn(
                        "relative aspect-square w-[16cqmin] min-w-8 overflow-hidden rounded-[3cqmin] outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-white",
                        i === active
                          ? "scale-105 ring-2 ring-white"
                          : "opacity-70 hover:opacity-100",
                      )}
                    >
                      <img
                        src={GENERATED_VIDEOS[v].poster}
                        alt=""
                        className="size-full object-cover"
                      />
                      {i === active && auto && (
                        <span
                          key={active}
                          className="showcase-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary"
                          style={{ animationDuration: `${CYCLE}ms` }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Tap a thumbnail to switch the video.
      </p>
    </div>
  );
}
