/**
 * The scripted chat: used when no AI server is connected. It follows the same steps Claude would
 * (questions, images, brand, plan, thumbnails) and understands a few edit requests, calling the
 * same tools, so the whole flow can be demoed offline.
 */
import type { Block, ChatResult, Message } from "@/ai/client"
import type { Plan } from "@/ai/design"
import type { ProjectState } from "@/ai/agent"

const SAMPLE_PLANS: Record<string, Omit<Plan, "reference"> & { reference: string }> = {
  sunglasses: {
    title: "Sport lens drop",
    reference: "Athlete in a black tee against a sunlit concrete wall, slow push-in, sport sunglasses catching the light, golden hour, cinematic.",
    variations: [
      { name: "Gold", prompt: "Same scene, gold mirrored lenses.", label: "Gold lenses", price: "$189", link: "https://example.com/gold" },
      { name: "Sapphire", prompt: "Same scene, deep blue sapphire lenses.", label: "Sapphire lenses", price: "$199", link: "https://example.com/sapphire" },
      { name: "White", prompt: "Same scene, white frames with clear lenses.", label: "White frames", price: "$179", link: "https://example.com/white" },
    ],
    design: { headline: "Find your lens", cta: "Shop now", show_price: true, show_label: true },
  },
  boots: {
    title: "Rain-ready boots",
    reference: "Wheat leather 6-inch boot on wet black rock in heavy rain, slow macro push-in, water beading on the leather, moody light.",
    variations: [
      { name: "Wheat", prompt: "Same scene, classic wheat nubuck.", label: "Classic wheat", price: "$210", link: "https://example.com/wheat" },
      { name: "Black", prompt: "Same scene, black waterproof leather.", label: "Black leather", price: "$220", link: "https://example.com/black" },
      { name: "Brown", prompt: "Same scene, brown pro boot with a lug sole.", label: "Brown pro", price: "$230", link: "https://example.com/brown" },
    ],
    design: { headline: "Built for wet days", cta: "Shop boots", show_price: true, show_label: true },
  },
  dress: {
    title: "Occasion edit",
    reference: "Model in a flowing gown walking a sunlit stone alley, slow tracking shot, fabric moving in the breeze, warm evening light.",
    variations: [
      { name: "Rust", prompt: "Same scene, rust tiered halter gown.", label: "Rust tiered", price: "$340", link: "https://example.com/rust" },
      { name: "Ombre", prompt: "Same scene, pink to violet ombre gown.", label: "Ombre gown", price: "$380", link: "https://example.com/ombre" },
    ],
    design: { headline: "Made to move", cta: "Shop the look", show_price: true, show_label: false },
  },
}

/** the colours picked in the palette question ("Sunset ({...colors})") */
function paletteOf(answer?: string) {
  const m = answer?.match(/"colors":\[([^\]]*)\]/)
  const c = m ? JSON.parse(`[${m[1]}]`) as string[] : ["#09090b"]
  return { primary_color: c[0], ...(c[2] ? { text_color: c[2] } : {}) }
}

const tool = (name: string, input: Record<string, unknown>): Block => ({ type: "tool_use", id: `mock_${crypto.randomUUID().slice(0, 12)}`, name, input })
const WAITING = new Set(["ask_user", "request_assets", "propose_plan"])

/** types the text out like a streamed reply */
async function type(text: string, onText: (t: string) => void) {
  const words = text.split(" ")
  await new Promise((r) => setTimeout(r, 450))
  for (let i = 1; i <= words.length; i += 3) {
    onText(words.slice(0, i).join(" "))
    await new Promise((r) => setTimeout(r, 35))
  }
  onText(text)
}

export async function mockReply(messages: Message[], s: ProjectState, onText: (t: string) => void): Promise<ChatResult> {
  const reply = async (text: string, ...tools: Block[]): Promise<ChatResult> => {
    if (text) await type(text, onText)
    else await new Promise((r) => setTimeout(r, 400))
    return { content: [...(text ? [{ type: "text" as const, text }] : []), ...tools], stop: tools.length ? "tool_use" : "end_turn" }
  }
  const uses = messages.flatMap((m) => (m.role === "assistant" ? m.content.filter((b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use") : []))
  const used = (name: string) => uses.filter((u) => u.name === name)
  const last = messages.at(-1)
  const results = last?.content.filter((b): b is Extract<Block, { type: "tool_result" }> => b.type === "tool_result") ?? []
  const typed = last?.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(" ").trim() ?? ""
  const resultOf = (name: string) => {
    const u = used(name).at(-1)
    const r = u && results.find((x) => x.tool_use_id === u.id)
    return r ? (typeof r.content === "string" ? r.content : r.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(" ")) : undefined
  }
  const sample = SAMPLE_PLANS[s.sample_set] ?? SAMPLE_PLANS.sunglasses
  const first = messages.find((m) => m.role === "user")?.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(" ") ?? ""

  // results of tools that didn't wait: just confirm
  if (results.length && !typed && results.every((r) => !WAITING.has(uses.find((u) => u.id === r.tool_use_id)?.name ?? ""))) {
    const plan = used("propose_plan").length > 0
    const thumbs = results.some((r) => uses.find((u) => u.id === r.tool_use_id)?.name === "generate_image")
    if (thumbs) return reply("All set. Every video is generating now, and thumbnails are on their way. Ask me to change the headline, the button, colours, or add a variation.")
    return reply(plan ? "Done. Anything else?" : "Got it.")
  }

  // after the plan
  const planResult = resultOf("propose_plan")
  if (planResult?.startsWith("Approved")) {
    return reply(
      "",
      ...s.videos
        .filter((v) => v.role === "variation")
        .map((v) => tool("generate_image", { prompt: `${v.label ?? v.name}, product close-up on a clean studio background`, purpose: "thumbnail", variation: v.name, aspect_ratio: "1:1" })),
    )
  }
  if (used("propose_plan").length && !s.planned && !typed) return reply("Tell me what to change, or press Generate all when it looks right.")

  if (s.planned || used("propose_plan").length) {
    // a few edits the demo understands
    const t = typed
    let m
    if ((m = t.match(/(?:button|cta)\b.*?(?:to|say|says|read|reads)\s+["“']?([^"”']{1,30})["”']?\s*$/i))) return reply("", tool("update_design", { cta: m[1].trim() }))
    if ((m = t.match(/headline\b.*?(?:to|say|says|read|reads)\s+["“']?([^"”']{1,60})["”']?\s*$/i))) return reply("", tool("update_design", { headline: m[1].trim() }))
    if ((m = t.match(/(?:button)?\s*colou?r\b.*?(#[0-9a-f]{3,6}|red|black|white|blue|green|orange|pink|gold|purple)/i))) {
      const named: Record<string, string> = { red: "#dc2626", black: "#09090b", white: "#ffffff", blue: "#2563eb", green: "#16a34a", orange: "#ea580c", pink: "#db2777", gold: "#ca8a04", purple: "#7c3aed" }
      const c = m[1].startsWith("#") ? m[1] : named[m[1].toLowerCase()]
      return reply("", tool("update_design", { button_color: c, ...(c === "#ffffff" ? { button_text_color: "#09090b" } : {}) }))
    }
    if ((m = t.match(/add (?:a |an |one more |another )?(?:new )?variation(?:\s+(?:in|called|for|with))?\s*([\w\s-]{0,24})/i))) {
      const name = (m[1] || "New").trim().replace(/^\w/, (c) => c.toUpperCase()) || "New"
      return reply("", tool("add_variation", { name, prompt: `Same scene, ${name.toLowerCase()} version.`, label: name, generate: true }))
    }
    return reply("In this demo I can change the headline or the button text, the button colour, or add a variation. Connect Claude in dev tools (State manager, AI) and I can do much more.")
  }

  // the idea
  const asks = used("ask_user").length
  if (asks === 0)
    return reply(
      "Love it. Let's build it together. First, what should viewers switch between?",
      tool("ask_user", { question: "What should change between variations?", options: ["Colours", "Products", "People or models", "Scenes", "Decide for me"], multi_select: true, step: "idea" }),
    )
  if (asks === 1) return reply("", tool("ask_user", { question: "Where will this Flick run?", options: ["Ads", "My website", "Share as a link", "All of these"], step: "idea" }))
  if (!used("request_assets").length)
    return reply("", tool("request_assets", { message: "Add product photos or your logo if you have them. I'll match thumbnails and colours to them.", kinds: ["product", "logo"] }))
  // the look: picked from previews, shown live beside the chat
  if (asks === 2)
    return reply(
      "Now the look. Pick a layout; the preview updates as you choose.",
      tool("ask_user", {
        question: "Which layout fits?",
        display: "layouts",
        step: "look",
        options: [
          { label: "Bold bottom", description: "Big headline low, thumbnails along the bottom", design: { layout: "bottom", align: "center", button_style: "pill", thumbnails: { position: "bottom", shape: "rounded", size: "medium" } } },
          { label: "Editorial", description: "Left aligned, thumbnails down the side", design: { layout: "bottom", align: "left", button_style: "sharp", thumbnails: { position: "right", shape: "square", size: "small" } } },
          { label: "Clean top", description: "Headline up top, round thumbnails", design: { layout: "top", align: "center", button_style: "light", thumbnails: { position: "bottom", shape: "circle", size: "medium" } } },
        ],
      }),
    )
  if (asks === 3)
    return reply(
      "",
      tool("ask_user", {
        question: "And the colours?",
        display: "palettes",
        step: "look",
        options: [
          { label: "Ink", description: "Black button, white text", colors: ["#09090b", "#a1a1aa", "#ffffff"] },
          { label: "Sunset", description: "Warm orange accents", colors: ["#ea580c", "#fdba74", "#ffffff"] },
          { label: "Ocean", description: "Cool blue accents", colors: ["#2563eb", "#93c5fd", "#ffffff"] },
        ],
      }),
    )

  const reference = first.trim().length > 24 ? first.trim() : sample.reference
  return reply(
    "Here's the plan. Edit anything in place, add or remove variations, then generate it all in one go.",
    tool("set_brand", { name: "Your brand", ...paletteOf(resultOf("ask_user")), font: "DM Sans", tone: "Confident, minimal" }),
    tool("propose_plan", { title: sample.title, reference: { prompt: reference }, variations: sample.variations, design: sample.design }),
  )
}
