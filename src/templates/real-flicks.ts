import { CreditCardIcon, EnergyIcon, GameController01Icon, HandbagIcon, HeadphonesIcon, PackageIcon, PerfumeIcon, Shield01Icon, Sofa01Icon, Tv01Icon, Home01Icon } from "@hugeicons/core-free-icons"
import { newStrip, type CanvasElement } from "@/components/editor/elements"
import type { Template } from "@/data"
import { brandTemplate, image, scrim, SQUARE, type Ids, type Product } from "@/templates/brands"
import { realBase, realFile, REAL_BRANDS, type RealSlug } from "@/templates/real-media"

/**
 * Templates from the real Flicks (OMD demo set): each opens as a complete project with the Flick's
 * own three videos, its tap thumbnails and logo, and copy for real products (prices and links as of
 * Nov 2026; estimates are marked "est."). Five feeds change per variation: title, subtitle, price,
 * button text and button link. Gap, Diageo, Little Caesars, General Mills and Modelo are the
 * hand-built brand templates in brands.ts.
 */

type Style = {
  /** heading and body fonts (editor fonts) */
  heading: string
  body: string
  /** button colors and shape */
  button: { bg: string; ink: string; variant: "pill" | "rounded" | "sharp" | "outline" }
  /** the brand-level line above the title, and its color */
  label: string
  labelColor: string
  /** the tap thumbnails: a row bottom right, or a column on the right */
  strip: "row" | "column"
  highlight: string
  /** logo file (in public/real/<slug>/) and its width (% of the frame) and shape (width ÷ height) */
  logo: { file: string; w: number; ar: number }
  headingUpper?: boolean
  /** display faces already heavy (Anton, Bebas Neue, DM Serif Display): no added bold */
  headingRegular?: boolean
}

type Real = {
  slug: RealSlug
  title: string
  brand: string
  /** as written, for the card */
  name: string
  description: string
  industry: string
  icon: Template["icon"]
  bg: [string, string]
  prompt: string
  cardRatio: string
  cardInk: "light" | "dark"
  style: Style
  products: Omit<Product, "thumb">[]
}

const layoutFor =
  (slug: RealSlug, st: Style) =>
  (f: Ids, p: Product, n: number): CanvasElement[] => {
    const id = (x: string) => `${slug}-${x}`
    const column = st.strip === "column"
    // text sits bottom left: full width beside a column of thumbnails, or above a row of them
    const w = column ? 68 : 56
    const y = column ? { label: 58, title: 65, subtitle: 72.5, price: 80, cta: 90 } : { label: 51, title: 58, subtitle: 65.5, price: 73, cta: 86 }
    const text = (x: Partial<Extract<CanvasElement, { kind: "text" }>>) => ({ kind: "text", align: "left", x: 5, ...x }) as CanvasElement
    return [
      scrim(id("shade-top"), "scrim-top-sq.png", true, 30, SQUARE),
      scrim(id("shade"), column ? "scrim-bottom-sq.png" : "scrim-bottom-sq-55.png", false, column ? 48 : 62, SQUARE),
      image(id("logo"), realFile(slug, st.logo.file), 5 + st.logo.w / 2, 4 + st.logo.w / st.logo.ar / 2, st.logo.w, st.logo.ar, SQUARE),
      text({ id: id("label"), variant: "label", text: st.label, y: y.label, w, font: st.body, size: 2.2, color: st.labelColor }),
      text({ id: id("title"), variant: "heading", text: st.headingUpper ? p.title.toUpperCase() : p.title, feed: f.title, y: y.title, w, font: st.heading, size: st.headingRegular ? 5.6 : 5, color: "#ffffff", bold: !st.headingRegular }),
      text({ id: id("subtitle"), variant: "body", text: p.subtitle, feed: f.subtitle, y: y.subtitle, w, font: st.body, size: 2.6, color: "#f5f5f4" }),
      text({ id: id("price"), variant: "subheading", text: p.price, feed: f.price, y: y.price, w, font: st.body, size: 3.4, color: "#ffffff", bold: true }),
      { id: id("cta"), kind: "button", variant: st.button.variant, text: p.cta, feed: f.cta, linkFeed: f.link, x: 5, y: y.cta, align: "left", font: st.body, size: 2.6, bg: st.button.bg, color: st.button.ink, bold: true },
      column
        ? { ...newStrip(n, "vertical", SQUARE), id: id("strip"), x: 83, y: 34, size: 12, gap: 14, radius: 100, highlight: st.highlight, highlightWidth: 6, bg: "#ffffffb3" }
        : { ...newStrip(n, "horizontal", SQUARE), id: id("strip"), x: 56, y: 79, size: 12, gap: 14, radius: 100, highlight: st.highlight, highlightWidth: 6, bg: "#ffffffb3" },
    ]
  }

const build = (r: Real): Template => {
  const meta = REAL_BRANDS.find((b) => b.slug === r.slug)!
  return { ...brandTemplate({
    id: `real-${r.slug}`,
    base: realBase(r.slug),
    title: r.title,
    description: r.description,
    industry: r.industry,
    brand: r.brand,
    headline: r.style.label,
    size: meta.size,
    ratio: SQUARE,
    icon: r.icon,
    bg: r.bg,
    prompt: r.prompt,
    card: realFile(r.slug, "thumb.webp"),
    cardRatio: r.cardRatio,
    cardInk: r.cardInk,
    duration: meta.seconds,
    products: r.products.map((p, i) => ({ ...p, thumb: realFile(r.slug, `swatch-${i + 1}.webp`) })),
    layout: layoutFor(r.slug, r.style),
  }), brandName: r.name }
}

const REAL: Real[] = [
  {
    slug: "coach",
    name: "Coach",
    title: "Coach Carry the City",
    brand: "COACH",
    description: "A red Tabby, a Signature Ergo or a black Empire carryall: one New York street, three bags.",
    industry: "Luxury",
    icon: HandbagIcon,
    bg: ["#1c1917", "#b91c1c"],
    prompt: "A woman in a worn leather jacket on a New York street holds a red leather shoulder bag, then walks across the crosswalk",
    cardRatio: "3/4",
    cardInk: "dark",
    style: { heading: "Playfair Display", body: "Inter", button: { bg: "#ffffff", ink: "#000000", variant: "sharp" }, label: "Carry the city", labelColor: "#e7e5e4", strip: "row", highlight: "#ffffff", logo: { file: "logo.webp", w: 30, ar: 443 / 50 } },
    products: [
      { name: "Red", title: "Tabby 26 in red", subtitle: "Polished leather, Signature C hardware", price: "$475", cta: "Shop the Tabby", link: "https://www.coach.com/products/tabby-shoulder-bag-26/73995+LHTAU.html", color: "#b91c1c" },
      { name: "Signature", title: "Belted Ergo 26", subtitle: "Signature jacquard with brass clip hardware", price: "$295", cta: "Shop the Ergo", link: "https://www.coach.com/products/belted-ergo-shoulder-bag-26-in-signature-jacquard/CEN87.html", color: "#a8865a" },
      { name: "Black", title: "Empire Carryall 34", subtitle: "Black leather, brass, built for workdays", price: "$475 est.", cta: "Shop the Empire", link: "https://www.coach.com/products/empire-carryall-bag-34/CCM57-B4%2FBK.html", color: "#1c1917" },
    ],
  },
  {
    slug: "wwe2k",
    name: "WWE 2K26",
    title: "WWE 2K26 Your Ring",
    brand: "WWE 2K",
    description: "WrestleMania, Hell in a Cell or Inferno: one superstar, three matches, each with its edition.",
    industry: "Entertainment",
    icon: GameController01Icon,
    bg: ["#1c0a0a", "#e02020"],
    prompt: "A wrestler raises his arms on an arena ramp as pyro erupts, then the camera cuts into the cage",
    cardRatio: "4/5",
    cardInk: "light",
    style: { headingRegular: true, heading: "Anton", body: "Inter", button: { bg: "#e02020", ink: "#ffffff", variant: "sharp" }, label: "Your ring. Your rules.", labelColor: "#ffffff", strip: "row", highlight: "#e02020", logo: { file: "logo.webp", w: 13, ar: 1 }, headingUpper: true },
    products: [
      { name: "Mania", title: "Main event Mania", subtitle: "Includes the WrestleMania 42 Pack", price: "$149.99", cta: "Buy the edition", link: "https://2k.com/games/wwe-2k/wwe-2k26/buy/", color: "#e02020" },
      { name: "Cell", title: "Enter Hell in a Cell", subtitle: "Triple H ’98 and Season 1 Premium Pass", price: "$99.99", cta: "Buy the edition", link: "https://2k.com/games/wwe-2k/wwe-2k26/buy/", color: "#57534e" },
      { name: "Inferno", title: "Light up the Inferno", subtitle: "Kane ’98, The Rock ’99 and Chyna ’97", price: "$129.99", cta: "Buy the edition", link: "https://2k.com/games/wwe-2k/wwe-2k26/buy/", color: "#ea580c" },
    ],
  },
  {
    slug: "ulta",
    name: "Ulta Beauty",
    title: "Ulta Find Your Lip",
    brand: "ULTA BEAUTY",
    description: "A bold matte, a sheer berry or the iconic nude: one swipe, three lipsticks.",
    industry: "Beauty",
    icon: PerfumeIcon,
    bg: ["#3f0d12", "#f26b1d"],
    prompt: "Macro on a lipstick bullet twisting up, then a woman applies it in a mirror, close-up on her lips",
    cardRatio: "3/4",
    cardInk: "light",
    style: { heading: "Poppins", body: "Poppins", button: { bg: "#f26b1d", ink: "#ffffff", variant: "pill" }, label: "Find your lip", labelColor: "#fdba74", strip: "column", highlight: "#f26b1d", logo: { file: "logo.webp", w: 20, ar: 600 / 242 } },
    products: [
      { name: "Bold", title: "MAC Silky Matte", subtitle: "Bold color, one swipe, full matte", price: "$25", cta: "Shop MAC", link: "https://ulta.com/p/macximal-silky-matte-lipstick-pimprod2043558", color: "#be123c" },
      { name: "Berry", title: "Black Honey", subtitle: "The sheer berry that suits everyone", price: "$25", cta: "Shop Black Honey", link: "https://www.ulta.com/p/almost-lipstick-in-black-honey-xlsImpprod10792007", color: "#7f1d1d" },
      { name: "Nude", title: "Pillow Talk", subtitle: "The iconic nude-pink matte", price: "$37", cta: "Shop Pillow Talk", link: "https://www.ulta.com/p/matte-revolution-hydrating-lipstick-pimprod2043355", color: "#d4a29c" },
    ],
  },
  {
    slug: "homedepot",
    name: "The Home Depot",
    title: "The Home Depot Living Room",
    brand: "THE HOME DEPOT",
    description: "Warm leather, dark modern or light and airy: one living room, styled three ways.",
    industry: "Home & living",
    icon: Home01Icon,
    bg: ["#1c1917", "#f96302"],
    prompt: "A woman walks into a Home Depot at dusk, then into a living room that restyles around her",
    cardRatio: "3/4",
    cardInk: "light",
    style: { heading: "Oswald", body: "Inter", button: { bg: "#f96302", ink: "#ffffff", variant: "sharp" }, label: "Your living room, styled", labelColor: "#fdba74", strip: "column", highlight: "#f96302", logo: { file: "logo.webp", w: 14, ar: 370 / 247 }, headingUpper: true },
    products: [
      { name: "Leather", title: "Warm leather lounge", subtitle: "Mid-century leather sofa and chair set", price: "$1,023.95", cta: "Shop the look", link: "https://homedepot.com/p/HOMESTOCK-74-5-in-W-Square-Arm-Leather-Straight-Leather-Mid-Century-2-Piece-Sofa-Chair-in-Tan-Brown-for-Living-Room-Set-89452HD/324675215", color: "#92400e" },
      { name: "Modern", title: "Dark modern den", subtitle: "102 in. charcoal sectional for movie night", price: "$2,162.10", cta: "Shop the look", link: "https://www.homedepot.com/p/Simpli-Home-Morrison-Mid-Century-102-in-Straight-Arm-Woven-Blend-Fabric-Rectangle-Left-Sectional-Sofa-in-Charcoal-Gray-AXCSECMOL-CG/330780902", color: "#3f3f46" },
      { name: "Light", title: "Light and airy", subtitle: "Soft boucle sofa in a sunny beige", price: "$721.70", cta: "Shop the look", link: "https://www.homedepot.com/p/CHRISTOPHER-KNIGHT-HOME-Orinthal-82-in-Modern-Boucle-Fabric-Upholstered-Round-Arm-Rectangle-3-seater-Sofa-Beige-118762/333947747", color: "#e7dccb" },
    ],
  },
  {
    slug: "lovesac",
    name: "Lovesac",
    title: "Lovesac MovieSac",
    brand: "LOVESAC",
    description: "Olive, oatmeal or brown: the same MovieSac, three covers, three ways to sink in.",
    industry: "Home & living",
    icon: Sofa01Icon,
    bg: ["#2b2b2b", "#78716c"],
    prompt: "A woman works on a laptop on a huge bean bag in a concrete loft, then curls up with a book",
    cardRatio: "4/5",
    cardInk: "dark",
    style: { headingRegular: true, heading: "DM Serif Display", body: "Inter", button: { bg: "#ffffff", ink: "#2b2b2b", variant: "pill" }, label: "Sink into the Sac", labelColor: "#e7e5e4", strip: "row", highlight: "#ffffff", logo: { file: "logo.webp", w: 26, ar: 457 / 137 } },
    products: [
      { name: "Olive", title: "MovieSac in olive", subtitle: "Work from the comfiest seat in the house", price: "$690", cta: "Build your Sac", link: "https://www.lovesac.com/sacs/build/moviesac-insert-and-cover-dove-channeled-phur", color: "#4d5b3a" },
      { name: "Oatmeal", title: "MovieSac in oatmeal", subtitle: "Plush Phur made for long reads", price: "$690", cta: "Build your Sac", link: "https://www.lovesac.com/sacs/build/moviesac-insert-and-cover-dove-channeled-phur", color: "#d6c7ad" },
      { name: "Brown", title: "MovieSac in brown", subtitle: "Room for you and the dog", price: "$690", cta: "Build your Sac", link: "https://www.lovesac.com/sacs/build/moviesac-insert-and-cover-dove-channeled-phur", color: "#5b3a29" },
    ],
  },
  {
    slug: "amazon",
    name: "Amazon",
    title: "Amazon Everything Delivered",
    brand: "AMAZON",
    description: "Tech, essentials or groceries: one box on the doorstep, three things inside.",
    industry: "Retail",
    icon: PackageIcon,
    bg: ["#131921", "#ff9900"],
    prompt: "Hands open an Amazon box on a wooden table, unpacking what's inside",
    cardRatio: "3/4",
    cardInk: "dark",
    style: { heading: "Inter", body: "Inter", button: { bg: "#ffd814", ink: "#0f1111", variant: "pill" }, label: "Everything, delivered", labelColor: "#fed7aa", strip: "row", highlight: "#ff9900", logo: { file: "logo-chip.webp", w: 20, ar: 356 / 143 } },
    products: [
      { name: "Tech", title: "Your setup, leveled up", subtitle: "Headphones, laptops and watches on Prime", price: "Prime $14.99/mo", cta: "Shop electronics", link: "https://www.amazon.com/electronics-store/b?node=172282", color: "#232f3e" },
      { name: "Essentials", title: "Adulting, delivered", subtitle: "Auto-deliver the basics and save up to 15%", price: "Save up to 15%", cta: "Start saving", link: "https://www.amazon.com/Subscribe/b?ref=sns_main&node=5856181011", color: "#0ea5e9" },
      { name: "Groceries", title: "Snack run, minus the run", subtitle: "Fresh groceries at your door today", price: "Free on $25+ with Prime", cta: "Shop groceries", link: "https://www.amazon.com/fmc/ssd-storefront", color: "#16a34a" },
    ],
  },
  {
    slug: "geico",
    name: "GEICO",
    title: "GEICO Life Happens",
    brand: "GEICO",
    description: "Car, home or renters: one gecko, three policies, each with its quote.",
    industry: "Insurance",
    icon: Shield01Icon,
    bg: ["#0b2a5b", "#0848a8"],
    prompt: "The gecko stands beside a parked car, then a storm cloud rolls over a house and an umbrella opens over a sofa",
    cardRatio: "3/4",
    cardInk: "light",
    style: { heading: "Montserrat", body: "Montserrat", button: { bg: "#ffffff", ink: "#0848a8", variant: "pill" }, label: "Life happens. Get GEICO", labelColor: "#bfdbfe", strip: "column", highlight: "#ffffff", logo: { file: "logo.webp", w: 22, ar: 300 / 53 } },
    products: [
      { name: "Car", title: "Car insurance, sorted", subtitle: "Get a fast quote and see what you could save", price: "From $60/mo est.", cta: "Get a quote", link: "https://www.geico.com/auto-insurance/", color: "#0848a8" },
      { name: "Home", title: "Cover your home", subtitle: "Protection for when the weather turns", price: "From $100/mo est.", cta: "Quote my home", link: "https://www.geico.com/homeowners-insurance/", color: "#475569" },
      { name: "Renters", title: "Your stuff’s covered", subtitle: "Protect your laptop, guitar and more", price: "From $14/mo est.", cta: "Quote renters", link: "https://www.geico.com/renters-insurance/", color: "#dc2626" },
    ],
  },
  {
    slug: "amex",
    name: "American Express",
    title: "American Express Pick Your Card",
    brand: "AMERICAN EXPRESS",
    description: "Green, Gold or Platinum: the same moment, three cards, each with its rewards.",
    industry: "Finance",
    icon: CreditCardIcon,
    bg: ["#00175a", "#006fcf"],
    prompt: "A woman holds up a card in a café window, taps a gold card on a terminal, then toasts on a rooftop at sunset",
    cardRatio: "4/5",
    cardInk: "light",
    style: { heading: "Inter", body: "Inter", button: { bg: "#006fcf", ink: "#ffffff", variant: "rounded" }, label: "Pick your card", labelColor: "#bfdbfe", strip: "row", highlight: "#ffffff", logo: { file: "logo.svg", w: 10, ar: 1 } },
    products: [
      { name: "Green", title: "Everyday, rewarded", subtitle: "3X points on travel, transit and dining", price: "$150 annual fee", cta: "Compare cards", link: "https://www.americanexpress.com/us/credit-cards/", color: "#2f6b4f" },
      { name: "Gold", title: "Dine on Gold", subtitle: "4X points at restaurants and U.S. supermarkets", price: "$325 annual fee", cta: "Get the Gold", link: "https://www.americanexpress.com/us/credit-cards/card/gold-card/", color: "#c9a14a" },
      { name: "Platinum", title: "Lounge in Platinum", subtitle: "1,550+ airport lounges worldwide", price: "$895 annual fee", cta: "Get Platinum", link: "https://americanexpress.com/us/credit-cards/card/platinum/", color: "#a1a1aa" },
    ],
  },
  {
    slug: "paramount",
    name: "Paramount+",
    title: "Paramount+ Stream It All",
    brand: "PARAMOUNT+",
    description: "Kids, sports or movies: the same couch, three nights in, each with its plan.",
    industry: "Entertainment",
    icon: Tv01Icon,
    bg: ["#00112e", "#0064ff"],
    prompt: "A family settles on a couch in front of a big TV in a warm living room, the room glowing with what's on",
    cardRatio: "3/4",
    cardInk: "light",
    style: { heading: "Montserrat", body: "Montserrat", button: { bg: "#0064ff", ink: "#ffffff", variant: "pill" }, label: "Stream it all", labelColor: "#bfdbfe", strip: "row", highlight: "#0064ff", logo: { file: "logo.webp", w: 15, ar: 256 / 185 } },
    products: [
      { name: "Kids", title: "Family night, sorted", subtitle: "Nickelodeon favorites and kid-friendly profiles", price: "$8.99/mo", cta: "Start streaming", link: "https://www.paramountplus.com/", color: "#f97316" },
      { name: "Sports", title: "Game day, every week", subtitle: "NFL on CBS and UEFA Champions League", price: "$8.99/mo", cta: "Catch the game", link: "https://www.paramountplus.com/", color: "#16a34a" },
      { name: "Movies", title: "Movie night, ad free", subtitle: "Hit movies and all of SHOWTIME", price: "$13.99/mo", cta: "Go Premium", link: "https://www.paramountplus.com/", color: "#1e3a8a" },
    ],
  },
  {
    slug: "sony",
    name: "Sony",
    title: "Sony Made for Creators",
    brand: "SONY",
    description: "Camera, headphones or speaker: one store visit, three Sony products picked up.",
    industry: "Electronics",
    icon: HeadphonesIcon,
    bg: ["#0a0a0a", "#3f3f46"],
    prompt: "First-person walk into a bright Sony store, hands pick up a product from a wooden table",
    cardRatio: "1/1",
    cardInk: "light",
    style: { heading: "Inter", body: "Inter", button: { bg: "#ffffff", ink: "#000000", variant: "sharp" }, label: "Made for creators", labelColor: "#d4d4d8", strip: "column", highlight: "#ffffff", logo: { file: "logo.webp", w: 18, ar: 354 / 102 } },
    products: [
      { name: "Camera", title: "Alpha 7 IV", subtitle: "33MP full-frame stills and 4K video", price: "$1,999.99", cta: "Shop Alpha", link: "https://www.bestbuy.com/site/6486182.p", color: "#18181b" },
      { name: "Headphones", title: "WH-1000XM6", subtitle: "Noise canceling that tunes out the world", price: "$378", cta: "Shop XM6", link: "https://www.walmart.com/ip/16504921979", color: "#27272a" },
      { name: "Speaker", title: "ULT FIELD 3", subtitle: "Deep bass in a speaker you can carry", price: "$209.99", cta: "Shop the ULT", link: "https://www.bestbuy.com/site/6620180.p", color: "#3f3f46" },
    ],
  },
  {
    slug: "redbull",
    name: "Red Bull",
    title: "Red Bull Wings",
    brand: "RED BULL",
    description: "Original, Peach or Zero: one sprint start, three cans.",
    industry: "Food & beverage",
    icon: EnergyIcon,
    bg: ["#0b1d4a", "#d3003c"],
    prompt: "A sprinter explodes out of the blocks on a stadium track at night, a can stands on the track",
    cardRatio: "4/5",
    cardInk: "light",
    style: { headingRegular: true, heading: "Bebas Neue", body: "Inter", button: { bg: "#d3003c", ink: "#ffffff", variant: "sharp" }, label: "Red Bull gives you wings", labelColor: "#fecaca", strip: "row", highlight: "#ffd200", logo: { file: "logo.webp", w: 30, ar: 639 / 105 }, headingUpper: true },
    products: [
      { name: "Original", title: "The Original", subtitle: "Vitalizes body and mind, 8.4 fl oz", price: "$2.59", cta: "Buy now", link: "https://target.com/p/red-bull-energy-drink-8-4-fl-oz-can/-/A-13426756", color: "#1d4ed8" },
      { name: "Peach", title: "The Peach Edition", subtitle: "White peach flavor, 12 fl oz", price: "$2.99", cta: "Buy now", link: "https://target.com/p/red-bull-peach-energy-drink-12-fl-oz-can/-/A-54352872", color: "#fdba74" },
      { name: "Zero", title: "Red Bull Zero", subtitle: "Zero sugar, same wings, 8.4 fl oz", price: "$2.79", cta: "Buy now", link: "https://www.kroger.com/p/red-bull-zero-energy-drink-can/0061126962372", color: "#94a3b8" },
    ],
  },
]

export const REAL_TEMPLATES: Template[] = REAL.map(build)

/** the bundled brand templates' cards: the Higgsfield cards made for the real Flicks */
export const REAL_CARDS: Record<string, { card: string; cardRatio: string; cardInk: "light" | "dark"; name: string; line?: string }> = {
  "brand-gap": { name: "Gap", card: realFile("gap", "thumb.webp"), cardRatio: "1/1", cardInk: "light" },
  "brand-diageo": { line: "Raise a glass", name: "Diageo", card: realFile("diageo", "thumb.webp"), cardRatio: "4/5", cardInk: "light" },
  "brand-little-caesars": { name: "Little Caesars", card: realFile("littlecaesars", "thumb.webp"), cardRatio: "1/1", cardInk: "light" },
  "brand-general-mills": { line: "Breakfast, your way", name: "General Mills", card: realFile("generalmills", "thumb.webp"), cardRatio: "4/5", cardInk: "dark" },
  "brand-modelo": { line: "Three legacies, one taste", name: "Modelo", card: realFile("modelo", "thumb.webp"), cardRatio: "9/16", cardInk: "light" },
}
