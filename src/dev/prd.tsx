import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Bump when the PRD changes. */
export const PRD_UPDATED = "Oct 28, 2026, 6:15 pm"

/* ---------- small writing helpers ---------- */

const P = ({ children }: { children: React.ReactNode }) => <p className="text-sm leading-relaxed text-foreground/90">{children}</p>
const H = ({ children }: { children: React.ReactNode }) => <h4 className="pt-2 text-sm font-semibold">{children}</h4>
const UL = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-foreground/90 marker:text-muted-foreground">
    {items.map((x, i) => (
      <li key={i}>{x}</li>
    ))}
  </ul>
)
const B = ({ children }: { children: React.ReactNode }) => <strong className="font-medium text-foreground">{children}</strong>
function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t align-top">
              {r.map((c, j) => (
                <td key={j} className={cn("px-3 py-2 leading-relaxed", j === 0 && "font-medium")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- the document ---------- */

type Section = { id: string; title: string; body: React.ReactNode }

const SECTIONS: Section[] = [
  {
    id: "overview",
    title: "1. Overview",
    body: (
      <>
        <P>
          Flicks Create is where brands and agencies make <B>Flicks</B>: interactive video ads built from one AI generated reference video and a set of
          variations a viewer can switch between. On top of the video sit text, buttons, images and a thumbnail strip. Everything is designed once and
          shared by every variation; the parts that should differ per variation (a product name, a price, a shop link) come from <B>feeds</B>.
        </P>
        <P>
          Work happens in a <B>project</B>, an editable draft. Exporting a project makes a <B>Flick</B>: fixed once made, with a link that can be shared,
          embedded in a website or app and served in ad campaigns. To change a Flick, remix it into a new project. Projects keep a version
          history that can be restored.
        </P>
        <H>Goals</H>
        <UL
          items={[
            "Go from a prompt or a template to an exported, interactive Flick in minutes.",
            "Make design on a video canvas feel like a standard design tool: select, move, resize, snap, align, layer.",
            "Keep per-variation content (names, prices, links) simple through feeds, without duplicating designs.",
            "Keep what is live stable: Flicks never change after export; projects keep every version and can be exported again as new Flicks.",
          ]}
        />
        <H>Non-goals for this release</H>
        <UL
          items={[
            "Timeline editing of the video itself, audio, or keyframed animation of elements.",
            "Multiplayer editing.",
          ]}
        />
      </>
    ),
  },
  {
    id: "users",
    title: "2. Users",
    body: (
      <Table
        head={["User", "Needs"]}
        rows={[
          ["Brand marketer", "Launch a product with a few colorways or models in one ad; quick turnaround; clear cost per video."],
          ["Agency designer", "Precise layout control, reusable templates, brand fonts and colors, many sizes."],
          ["Performance / media team", "A stable link and embed code, video exports, later ad tags and analytics."],
        ]}
      />
    ),
  },
  {
    id: "glossary",
    title: "3. Glossary",
    body: (
      <Table
        head={["Term", "Meaning"]}
        rows={[
          ["Project", "An editable draft in the editor. Has a name, a size and its content. Saves as you work."],
          ["Flick", "What exporting a project makes: the interactive video ad, fixed once exported. Has a link, embed code and analytics. Change it by remixing."],
          ["Remix", "Starts a new project from a Flick\u2019s exact state, named \u201c<Flick>_copy\u201d. The Flick stays as it is."],
          ["Variation 1", "The first video (internally the reference video, a name the user never sees): the first video, generated from the prompt, and part of the Flick like any other variation (its own name, label, price, link and thumbnail; the Flick starts on it by default). The other variations (2, 3\u2026) are made from it. In a plan, the first variation is the reference video, so N variations means N videos."],
          ["Variation", "One of 2 to 5 videos made from Variation 1 with its own change. Viewers switch between variations."],
          ["Starting variation", "The variation a viewer sees first. In the UI: \u201cStart the Flick here\u201d a solid play button on its thumbnail (\u201cThe Flick starts here\u201d)."],
          ["Element", "Anything placed on the canvas: text, button, icon button, image, thumbnail strip. Elements are shared by all variations."],
          ["Thumbnail strip", "The row (or column, or free arrangement) of thumbnails viewers tap to switch variation. Always present, cannot be deleted."],
          ["Feed", "A named value (text or link) that each variation sets for itself, e.g. price or shop-link. Made from the { } tab on text, a button or its link."],
          ["Template", "A ready-made Flick to look at and use as a reference: Use as reference hands its pattern to the chat. Templates never open in the editor and nothing is saved as a template."],
          ["Version", "A checkpoint of a project, saved a few seconds after changes settle; exports are marked. Can be named and restored."],
          ["Placement", "A fixed-size slot in a campaign with one tag (VAST 4.2, SIMID, MRAID 3.0). Holds one Flick of its size at a time; replacing it keeps the tag."],
          ["Embed", "A fixed-size spot on a website or app with one code snippet (Website, iOS, Android). Holds one Flick of its size at a time; replacing it keeps the code. Free."],
          ["Ad Balance", "Dollars that pay for impressions, per 1,000 at each country\u2019s CPM. Separate from credits."],
          ["Credits", "Spent on video generation. A video\u2019s cost depends on its size and length (see Prompt composer). The only credits the user sees; the AI server\u2019s own limits and keys appear as a \u201cDev\u201d note in the chat, never as the user\u2019s credits."],
          ["Spelling", "US English everywhere the user reads, including what the chat writes (color, center, favorite). Buttons show a cost as a bare number (\u201cMake \u00b7 48\u201d); text and tooltips say \u201c48 credits\u201d."],
        ]}
      />
    ),
  },
  {
    id: "signin",
    title: "4. Signing in",
    body: (
      <>
        <P>Signing in uses any email (work or personal) and a one-time link (no passwords), or Google. Signed-out visitors see only this page.</P>
        <UL
          items={[
            "Layout: on wide screens a live Flick fills the left half and the form sits on the right; on small screens only the form shows. The form stays first in the page order. Mirror it for right-to-left languages.",
            "Copy: \u201cWelcome to Flicks\u201d, then \u201cSign up and get 1,000 free credits.\u201d",
            "Email field (placeholder you@example.com) with the hint \u201cNo password needed. We\u2019ll email you a link to sign in.\u201d, then \u201cEmail me a sign-in link\u201d, \u201cor\u201d, and \u201cContinue with Google\u201d. Terms of Use (flamapp.ai/legal/terms) and Privacy Policy (flamapp.ai/legal/privacy-policy) links sit at the bottom and open in a new tab.",
            "Email checks run on Continue and when leaving the field (not when moving to Google). The message replaces the hint in red: empty (\u201cEnter your email.\u201d), spaces (\u201cEmail addresses can\u2019t have spaces.\u201d), no @ (\u201cAdd the @ and the rest of the address, like you@example.com.\u201d), incomplete (\u201cThat doesn\u2019t look like a full email.\u201d), a domain typo (\u201cCheck the end of the address.\u201d with a one-click \u201cUse you@company.com\u201d for .con, .cmo, .nte and similar). Personal addresses (Gmail, Outlook and so on) are welcome.",
            "Problems after the email is fine show as a red note with a warning icon under the button: the link couldn\u2019t be sent (\u201cWe couldn\u2019t send the link. Check your connection and try again.\u201d), offline (\u201cYou\u2019re offline. Reconnect, then try again.\u201d), too many links (after 4: \u201cYou\u2019ve asked for several links. Wait 10 minutes, or use the most recent one.\u201d). The same notes appear on Check your inbox and the expired screen when resending.",
            "Google failure shows under the Google button: \u201cCouldn\u2019t sign in with Google. Try again, or use your email.\u201d Only one note shows at a time.",
            "Sending shows \u201cSending link\u2026\u201d, then \u201cCheck your inbox\u201d: the address, \u201cOpen it on this device. It works once, for 15 minutes.\u201d, a resend countdown (30s, then \u201csend it again\u201d), and \u201cUse a different email\u201d.",
            "Signing back in with the same email keeps the name; until a name is known, the greeting uses the email\u2019s first part, capitalised.",
            "An expired or used link opens \u201cThis link has expired\u201d with \u201cEmail me a new link\u201d and \u201cUse a different email\u201d.",
            "Google shows \u201cConnecting to Google\u2026\u201d, then signs in.",
            "Live Flick: an 8-second escalator shot, square and shown whole, on a blurred copy of the same scene that fills the panel (no black bars), with four look tiles (Soft pink, Street, Office, Court) in a frosted rail floating on the right and a small \u201cTap a thumbnail to try it\u201d chip top left. Every look has the same person pose, moves and timing; only the person, their drink and the three items on the bottom step change. Tapping a tile swaps the video instantly (no fade) on the same frame, so the move carries on with someone new; on its own it moves to the next every few seconds (a thin bar shows when), pausing for a while after a tap.",
            "A light/dark toggle sits at the top right. Log out on the Account page returns here.",
          ]}
        />
        <H>First sign-in: set up your workspace</H>
        <UL
          items={[
            "New users answer three short steps once, before the app. Same layout as sign-in: the live Flick on the left, questions on the right. A segmented progress bar and \u201c2 of 3\u201d sit on top; Back on every step after the first; Enter continues. Each step starts with its first field focused.",
            "1 \u2014 \u201cLet\u2019s set up your account\u201d: Your name (filled from Google), Company or brand (\u201cWorking for yourself? Use your own name or your studio\u2019s.\u201d), Company website (filled from the email\u2019s domain unless it\u2019s a personal inbox like gmail.com; https:// shown as a prefix).",
            "2 \u2014 \u201cWhat brings you to Flicks?\u201d, pick all that apply, as rows with an icon, title, one-line hint and a checkbox: Run interactive ads, Create product videos, Add Flicks to my website, Make videos for social, Just exploring. At least one is needed (\u201cPick at least one.\u201d).",
            "3 \u2014 \u201cTell us about <Company>\u201d: \u201c<Company> is a\u201d Brand, Agency, Publisher, or Freelancer or creator; \u201cHow many people work there?\u201d Just me, 2\u201310, 11\u201350, 51\u2013200, 200+; Industry.",
            "Every field is required.",
            "Continue checks only the current step: each missing field shows a short red line under it and the first one is focused. A website that doesn\u2019t look right is flagged.",
            "The last button reads \u201cFinish and open Flicks\u201d, then \u201cSetting up your workspace\u2026\u201d. The Create page greets them by first name, a toast says \u201cWelcome to Flicks, Alex\u201d, and the sidebar shows their name and email.",
            "\u201cSigned in as you@company.com. Not you?\u201d at the bottom signs out.",
          ]}
        />
      </>
    ),
  },
  {
    id: "shell",
    title: "5. App shell and navigation",
    body: (
      <>
        <UL
          items={[
            <>
              <B>Sidebar:</B> the Flicks logo (goes to Create, the home page), Create, Projects, Flicks, Assets; Manage: Campaigns, Analytics; and a credits card: a small “Credits” label, the balance as a large number, then “About N videos” (or “Not enough for a video”) with a Get more link. When the balance is low the number and the card’s outline turn amber.
            </>,
            <>
              <B>Projects:</B> clicking a project opens it in the editor as it was left (sample projects open with the reference video and two variations
              already made). Back returns to Projects. <B>Flicks:</B> clicking a Flick opens its page (see Projects and Flicks).
            </>,
            <>
              <B>Sidebar clicks</B> always open the page fresh: Campaigns from inside a campaign or placement goes back to the campaigns list; Embeds from inside an embed goes back to the embeds list.
            </>,
            <>
              <B>Loading:</B> Projects, Flicks, a Flick, Assets, Campaigns (and a placement opened from elsewhere), Embeds (and an embed), Credits and Ad Balance show a skeleton matching their layout while they load (square cards with two lines; table rows; the Flick stage with its cards; numbers, stage and code; stat cards and lists), then the content in place, with no jump.
            </>,
            <>
              <B>Loading everywhere else:</B> anything that would fetch shows a skeleton for the same moment: the workspace setup form (progress, title, fields and Continue) before it appears; the editor while a project opens (rail, canvas, strip and prompts; a project made with the chat that hasn’t generated yet shows the chat instead: the plan steps and the conversation centered, with the message box at the bottom); the templates on Create (on arrival and when filtered); searching or filtering Projects, Flicks and Assets; changing Analytics\u2019 tab, period, country, source or what\u2019s open (a chart and lists); Usage history filters and pages; the editor\u2019s Images, Layouts and Feeds panels and the image picker; Version history; CPM rates; the Flick picker for a placement; embeds in Add to embed. Buttons that save, create, delete, restore or add show a spinner in place of their label (same width, disabled) before they act. All of it follows Page load time; 0 turns it off.
            </>,
            <>
              <B>Addresses:</B> every page has its own: / (Create), /projects, /p/&lt;project&gt;, /flicks, /f/&lt;flick&gt;, /assets, /campaigns and /campaigns/&lt;placement&gt;, /embeds and /embeds/&lt;embed&gt;, /analytics and /analytics/&lt;kind&gt;/&lt;id&gt;, /templates/&lt;id&gt;, /ad-balance, /credits, /account. The address follows the page; Back and Forward work; a reload or a pasted link opens the page it names (a project or Flick that isn’t in this browser yet waits for the saved ones; one that doesn’t exist opens its list). The site is hosted on Cloudflare Pages, so any address serves the app: main is the site, every other branch has its own address (&lt;branch&gt;.flam-flicks.pages.dev).
            </>,
            <>
              <B>Account menu:</B> Account, Credits, Ad Balance, Help Center (opens in a new tab), Theme (light, dark, system), Log out.
            </>,
            <>
              <B>Playing a Flick:</B> wherever a Flick plays (the editor canvas, the Flick page, the shared viewer, the Campaigns and Embeds previews) every variation’s video is loaded and stacked and only the active one shows; switching carries the playhead over, so the next video continues from the same moment with a short cross-fade, as a real Flick does. Muted and looping; a play button appears if the browser blocks autoplay.
            </>,
            <>
              <B>Overlays:</B> menus (dropdown, context, select), popovers and the command palette are all solid popover surfaces, never translucent: they sit over photos and video frames, so a frosted surface would read as a grey wash and cost legibility. Menu rows highlight with the accent token (a step stronger in dark mode).
            </>,
            <>
              <B>Notifications:</B> stacked toasts at the top center (if the AI server can\u2019t be reached when the app opens, one says projects and Flicks are kept in this browser until it is back). Empty states inside a page use the small EmptyState (a dashed box with a title and a line, no drawing); page-level ones have the drawing. Newest in front, older ones peek behind; hover to spread them out. Each closes after 5
              seconds, paused while hovered. A toast can carry a description and one action.
            </>,
          ]}
        />
      </>
    ),
  },
  {
    id: "create",
    title: "6. Create page",
    body: (
      <>
        <H>Prompt composer</H>
        <UL
          items={[
            "A calm warm page with a large greeting by first name and one line under it; the prompt box is the one focal point (no background effects).",
            "The prompt box glows: an amber light slowly travels round its edge and a soft amber glow breathes under it; both quicken a little while typing. With reduced motion it\u2019s a still amber ring and glow.",
            "A large text box (16px text, three lines tall to start): “Describe your video. Type @ to mention a photo or element”. \u2318\u21b5 (Ctrl \u21b5) starts; the Start tooltip shows the shortcut.",
            "Under the box: How Flicks work, then Recipes (\u201cstart from what you have\u201d): five cards in a bento grid (Product Swap large on the left, the other four in a 2 by 2 beside it; where the page is narrower, Product Swap goes wide on top with the four in a row under it), each playing short looping clips of the recipe at work (the original, then its swaps) on one shared timeline like a Flick being tapped through: every clip plays in step and the one that owns the moment shows (three clips over 5 s: the first to 1.6 s, the second to 3.2 s, the third to the end), then all start again together, so the motion carries through each swap. Cards start a beat apart so they don\u2019t cut together, keep playing on hover, play only while on screen, and show their first still with reduced motion. A clear name (no icon) and one line sit at the bottom. No heading above them. The form\u2019s how it works uses the same timeline. Each opens a two-pane form: on the left an animated how it works (add, pick, viewers tap to switch) using the same clips; on the right numbered steps asking only for what it needs, with a sticky footer that says what is still missing, and Start hands everything to the AI chat with the recipe named, so the chat skips what the form answered. The Flick takes the size and length of the uploads (the video, or the image), so where it runs and size aren\u2019t asked. Videos over 15 seconds are trimmed in the form.",
            "Product Swap (\u201cYour video, a new product in every variation.\u201d): your video, plus product photos (optional; one per variation) and notes. The chat names the brand and product it sees, suggests products from the brand\u2019s range as pictures when none are given, and suggests each product\u2019s page as its link. Your video is Variation 1 at no cost; each swap is an edit of it.",
            "Recast (\u201cSame scene and moves, new faces for every audience.\u201d): your video, plus photos of people to cast (optional). The chat describes who\u2019s in it, suggests casts for the audience as pictures, and makes a character sheet per person.",
            "Scene Shift (\u201cTake your video anywhere: new places, seasons or moods.\u201d): your video, plus scene photos (optional). The chat reads the scene and suggests new ones as pictures.",
            "Make It Move (\u201cYour image as a video that starts or ends on it.\u201d): one image, Where it starts or Where it ends, a length (4, 8 or 12 s) and notes. Ends on it: the chat makes an opening frame for the user to approve, and the video runs from it to their image. It offers to lift text out of the image as editable canvas text.",
            "Clips to Flick (\u201cMade videos in Higgsfield or Runway? Turn them into a Flick.\u201d, with both sites\u2019 icons): 2 to 5 finished clips and optional thumbnails. Nothing is generated; the chat matches thumbnails to clips (asking when unsure) or uses a frame of each clip.",
            "Before any video is made from your video, the storyboard card shows your video and a quick sketch of each change on its first frame, with each variation\u2019s name and direction; one action makes them all (the cost shown is for those videos only).",
            "Image references: add images and tag each as Packshot or product photo, Character (model or mascot), or Background or setting. Uploads show progress. No limit: the row scrolls sideways when full (no scrollbar; trackpad, mouse wheel or shift-scroll).",
            "One uploader everywhere (recipe forms, the chat\u2019s asset requests and the picker): a roomy drop area that names what it takes and its limits, then tiles with remove and an Add tile. Upload problems (same in every prompt box and in the image uploader): only JPG, PNG, WebP or GIF up to 20 MB are taken. Anything else is not added and a toast says why (\u201cbrief.pdf can\u2019t be uploaded \u00b7 Use JPG, PNG, WebP or GIF images.\u201d or \u201csofa.png is too large \u00b7 Images can be up to 20 MB.\u201d).",
            "An upload that fails stays in place, grayed with a red tint and a retry button in the middle (\u201cCouldn\u2019t upload. Click to retry.\u201d), with \u00d7 to remove. A toast (\u201cCouldn\u2019t upload sofa.png\u201d, or \u201c3 images didn\u2019t upload\u201d for a batch) has Retry / Retry all. In a prompt box a red line under the images repeats it with Retry, and Generate waits until they\u2019re retried or removed. A failed upload can\u2019t be added to the canvas.",
            "No Size or Length menus: the chat asks where the Flick runs and sets the size (a square, 8 s, until it does). Sizes: Display (250×250, 300×250, 336×280, 320×480, 480×320, 300×600), Social (1080×1080, 1080×1920) and Video (1920×1080); lengths 6, 8, 10, 12 and 15 seconds. The length shows in the editor\u2019s size badge (\u201c1080×1920 · 8s\u201d).",
            "Cost depends on size and length: display ad sizes (250×250 to 300×600) cost 7, 9, 11, 13 or 16 credits for 6, 8, 10, 12 or 15 seconds; social and video sizes (1080×1080, 1080×1920, 1920×1080) cost 36, 48, 59, 71 or 89. The cost shows on the storyboard\u2019s Approve button and on every Make card; nothing is charged before the user presses one.",
            "Start (never Generate) opens the chat, which plans the Flick first. The chat is the only way a video is made: there is no direct prompt-to-video path, no scripted demo and no prompts panel. If the AI server can\u2019t be reached (not set up on this device, refused, or offline) the chat shows one error card, \u201cCouldn\u2019t connect to the AI server.\u201d, with Retry; nothing else happens.",
          ]}
        />
        <H>Plan with the chat</H>
        <UL
          items={[
            "Start opens a planning view, not the editor: just the conversation, centered, like a chat app; no preview and no editor tools until the build (no rail, strip, Design/Preview or Export). The header shows the steps (Idea, Look, Plan, Build). Questions dock above the composer: one at a time, with \u201c1 of 3\u201d and arrows when several are asked together; answers are a numbered list (keys 1 to 9 pick), with a line under each answer when it needs one, \u201cSomething else\u2026\u201d to type your own, You decide (Esc, only while the deck has the focus: it sends \u201cSkipped\u201d and the chat chooses) and Continue. Words typed in the composer while a question is on show answer that question; the others stay open. A question whose answer is typed (the brand name or website) looks the same as the others: its field is the first row of the list, focused and ready to type in (Enter sends), with any other answers (\u201cNo brand, choose for me\u201d) as the rows under it and Skip and Continue in the footer; options like \u201cI\u2019ll type the brand name\u201d never show as buttons. When a question lets you pick several (it says so with \u201cPick any\u201d, and the AI also switches to this whenever the wording asks for more than one, like \u201cpick all that apply\u201d or \u201cpick 2 to 4\u201d), taps tick options on and off, for text, picture and palette options alike, and nothing moves on until Continue. When the wording gives a number, the hint says it (\u201cPick 2 to 4\u201d), Continue waits for the minimum, and a tap past the maximum swaps out the earliest pick. Image requests dock the same way, as a page of their own (drop or add images, or type links or names when the request allows it; Skip). Picking moves to the next one; the answers go back together only once every question and image request is answered or skipped, and show in the conversation. Before the plan, the chat offers up to 3 concepts as cards: a preview image of each concept\u2019s style (made as soon as the cards appear, using the user\u2019s own product or reference images so it shows their real product), side by side with a big preview, just the title and a two-line idea (the variations show over the picture on hover; the question and story beats are read out to screen readers); pick one (or press 1 to 3), or type a mix or a change. The plan appears in the conversation as a card.",
            "Websites: when the prompt or a message has a web address (a product page, a brand\u2019s site), the chat reads it first, through the app\u2019s server; the user never leaves the app. A card shows \u201cReading lumen.co\u2026\u201d with placeholders, then the page title, site, price and the images it found (up to 8). It uses the page\u2019s real product names, prices, colors, links and brand color, sees the first images, keeps all of them as project images (so it skips asking for photos and sets them as thumbnails), and says so if a site blocks it.",
            "Where it runs and size: Create has no Size or Length menus; the chat asks early (unless the prompt says), as cards: In ads; On a website or app banner; As a link (opened on phones or desktops). Then the sizes for that answer, each drawn to its shape with its name and pixels: ads get Flam\u2019s ad sizes (300\u00d7250, 336\u00d7280, 250\u00d7250, 320\u00d7480, 480\u00d7320, 300\u00d7600, 1080\u00d71080, 1920\u00d71080, 1080\u00d71920); banners get the shapes the video model makes (21:9, 16:9, 4:3, 1:1, 3:4, 9:16 at 1080 px on the short side); links get 1:1, 16:9 and 9:16. \u201cSomething else\u2026\u201d takes any size typed as width\u00d7height (50 to 4000 px a side). The answer sets the project\u2019s size straight away (header, preview, plan and credits follow); the chat can also set a size named in a message. Length stays 8 s unless the user asks. Videos are made in the closest shape the model makes and cover the Flick\u2019s frame, centered: no gaps, the edges are cropped when the shapes differ. The brief shows Runs in and the Format.",
            "Idea: one round. The first reply says what it saw, researches the brand when there is any hint of one, and asks everything still missing as one deck of short questions with tappable answers: the brand (only when there is no hint; typed into a field, with \u201cNo brand, choose for me\u201d), what changes between variations (shown as pictures of the real products when the brand\u2019s site gave them), what the Flick is for (options from the context, for example Launch a new product, Drive sales, Get installs, Sell tickets, or their own words), then where it runs and the size, asked together (the size answers follow the \u201cwhere\u201d answer: Flam\u2019s ad sizes, the shapes videos are made in, or link shapes); and, when products swap and it has no images of them, one request for the products (a drop zone for photos, with a field to paste product page links or type the product names instead; Add, Continue or Skip). Links are read; names are searched and the images found are offered as pictures to confirm. With “No brand, choose for me” the chat invents a name, colors and font and never asks for a logo; a logo is asked for only when a named brand has none on its site or in the files, inside the products request. Anything already said or found is not asked. The prompt and any images added on Create are the first message. Skipping a question settles nothing: what changes between variations is asked again before any concept.",
            "Look: visual questions. Layout answers are small Flick previews (headline, price, button and thumbnail strip on a sample frame); palette answers are color swatches; questions judged by eye (setting, mood, light, styling, people) show a picture per answer (up to 4), drawn with the user\u2019s product as soon as the question appears, the name over each picture. Picking one updates the live preview straight away. Concept answers are cards with a preview, the title and the whole idea (never cut short; the variations are not listed on the card); three across when the chat has the room (the planning view), one per row with the picture on the left in the narrow panel beside the canvas (decided by the panel\u2019s own width). Picking a concept drafts the storyboard in the same reply, with nothing asked in between. The brand then shows as a table: logo, colors (swatch, hex and role), font (written in that font), tagline, voice, notes and sources, only the rows it found.",
            "Plan: an outline like Gamma\u2019s, edited in place with no visible fields until hovered: project name, the reference video prompt (R), then numbered variations, each with a name, price, prompt and link; remove (\u00d7 on hover) down to two, Add variation up to five; headline and button text. A bar at the bottom shows the number of videos and the credits, and Generate all. The preview follows every edit and flips through the variations (tabs underneath pick one). Under the preview, a storyboard shows the reference video as 3 or 4 numbered frames, each with a still, what happens and the framing (the stills are drawn together as one picture with a panel per frame, so the product, scene and light match across them and each shows its own moment, then cut into the frames: one request instead of one per frame); then Made from shows exactly what the reference video is made from as numbered thumbnails (Image 1, Image 2, Video 1; in an edit, The video; when animating, Opens on and Ends on). Hovering one shows arrows to move it and \u00d7 to remove it (at least one stays); the prompt\u2019s numbers follow.",
            "The user\u2019s own videos: when the user gives a finished video for each variation, nothing is generated. The chat skips concepts, looks, sheets, the shot and the storyboard, settles only what the design still needs (names, copy, prices, links) and shows the plan with each variation marked \u201cYour video, used as it is\u201d (and \u201cYour thumbnail\u201d when they gave one); the bar says \u201cYour videos \u00b7 nothing to generate\u201d and the button is Build the Flick. Before the plan, the app checks the videos against each other and the Flick: the same frame shape and the same length (half a second either way). If they don\u2019t match, the chat says what differs (each video\u2019s size and length) and asks whether to replace the odd one or go on (videos are cropped to fill the frame; a shorter one ends sooner). Approved, the videos go into the Flick ready, with no credits charged and no review step; thumbnails the user gave are placed, and the chat makes thumbnails only for the rest (none if every variation has one). If only some variations have a video, the rest are made as usual, from Variation 1 (straight away when Variation 1 is the user\u2019s).",
            "Brief: nothing is pinned above the conversation. When answers change the brief, a \u201cBrief updated\u201d card appears in the conversation showing the whole brief as it now stands, as a table: your images, brand, goal, where it runs, concept, each answer, variations, and format (size and length). Several answers given together make one update. Only the newest is open; earlier ones fold to a line. Answers don\u2019t show as a separate question-and-answer table.",
            "Answered questions and used image requests become the \u201cBrief updated\u201d card; the storyboard (what the plan is called everywhere the user looks) shows only the storyboard: its title, how Variation 1 plays as 3 or 4 frames (a quick still and a line each), a note naming the variations that follow once the first video is liked, and \u201cWant something different? Tell me below.\u201d One action at the bottom, \u201cApprove and make the first video\u201d, with the cost of that one video. Prompts are never shown; the variations, copy and links Claude set are applied with it and can be changed later. After the first video arrives, Claude looks at the Flick and fixes the design before asking for a review. The approved storyboard lists each variation with its plain direction. An approved storyboard folds to one row (\u201cStoryboard approved \u00b7 3 variations\u201d, with its frames) that opens to the full card; a finished build folds to \u201cYour Flick is ready \u00b7 3 videos\u201d, opening to the videos. Nothing disabled stays on screen.",
            "Build: Approve on the storyboard charges Variation 1 only and starts it; the variations wait as tiles until the user presses Make the others on the approval bar below the chat (it names Variation 1 and the waiting variations, \u201cWhite is ready. Happy with it?\u201d, with the cost on the button; charged then, one cost for all; a note in the thread says what started), and the editor opens with the chat on the right. The design is placed from the plan and the chosen look: label, headline, price and button stacked at the top, center or bottom; label, price and link as feeds filled per variation (the reference video shows the first variation\u2019s); and the thumbnail strip with its position (bottom, top, left or right), shape (square, rounded, circle), size and highlight color. A Building your Flick card in the chat shows every video in place: its plan still, blurred under the generating look with its progress (percent, or status and time), then the video itself playing once it\u2019s ready; variations waiting for Variation 1 say \u201cWaiting for Variation 1\u201d, then \u201cWaiting for your OK\u201d once it is ready; a queued video says \u201cUp next\u201d (no timer until it runs), one being made \u201cGenerating \u00b7 42%\u201d, a failed one \u201cDidn\u2019t generate\u201d with Try again (the same five words everywhere: tile, canvas, strip and chat) and show their direction under their name, with their change drawn on the first storyboard frame, so the wait for Variation 1 is the time to review them (Remove takes one out). Below, the design and the thumbnail images tick off.",
            "Thumbnails: the chat sets one per variation, from the user\u2019s photos or a generated image (\u201cMaking an image\u2026\u201d, then \u201cThumbnail for Gold, Added to the Flick\u201d). Images also land in the Images panel.",
            "After that, the chat makes changes on request: headline, subheading, button text, colors, button style, font, thumbnails; a variation\u2019s name, label, price, link or prompt (regenerating it); or a new variation. Each change shows a one-line note with a tick. The chat is the only way to ask for a video in a chat project (no per-video prompt box), so a message can never become a prompt by accident. A change to the person, product, setting or shot of the videos regenerates Variation 1 (the user reviews it, the others are remade from it); a storyboard approved after a build only swaps the videos and thumbnails, and the canvas (design, logo, everything placed) stays as it is. \u201cGo back\u201d restores a version with its videos (nothing to remake), and \u201cuse the earlier video\u201d puts a variation\u2019s earlier finished video back, free. A variation whose change comes later in the video (a tour with a shared opening) keeps its first seconds pinned to Variation 1: the app adds the timecodes and Variation 1\u2019s first frame to the edit, and leaves the result to the user. A chat project never makes a prompt-only video: when a video\u2019s reference images or video are missing, it does not start (refunded) and the chat says what to add; the images a storyboard uses are kept on the server at approval, so a revert, a reload or another device still finds them. No video is ever made without the user pressing for it: Approve on the storyboard, Make the variations, Make on a proposal card, or Try again on a failed tile. When the chat wants to remake a video (the user asked for a change) or add one, it proposes it and a card appears, docked above the composer with the Variation 1 review so it can\u2019t scroll out of sight: what will change, Make with the cost, or Not now. A failed video is never retried on its own. Suggestions under the composer come from where the Flick stands: a video that failed (\u201cMake Mango again\u201d), review issues to fix, missing links to set, then the usual tweaks (shorter headline, bolder button, another variation while there are fewer than five).",
            "The chat can see the Flick: it draws a variation as viewers see it (a frame of its video with every element and the thumbnail strip on top, at the Flick\u2019s shape) and looks at it after big design changes, before handing over, and when the user says something looks off; the review includes a look at Variation 1 (and the variations with their own copy). Each look shows in the chat as a small card (\u201cLooked at Night \u00b7 As viewers see it\u201d) that opens the picture. A screenshot the user pastes is read as their canvas.",
            "Feeds with the chat: it sees every feed (including ones the user or a template made), what uses it (headline, button text, button link\u2026) and each video\u2019s value. The plan can give each variation its own headline, subheading or button text as well as label, price and link; whatever differs becomes a feed named plainly (headline, subheading, label, price, button, link) and linked to its element, and the plan card shows a box per variation for it. On request it makes any text differ per variation (adding a label or price line if the design has none), changes one variation\u2019s value, makes text one value again (removing the feed) or renames a feed.",
            "Anything on the canvas: the chat adds text (heading, subheading, body, caption or label style; badges, disclaimers, offers), buttons and images (an uploaded logo or product shot, an image from a website, a generated one), placed by position (top, upper, center, lower, bottom; left, center, right) or exact x and y, with size, color, font and rounding. A new element lands at the nearest free height so it never covers what\u2019s there, and the chat is told where it went. It can also move, resize, restyle, hide or remove any element by its id; the thumbnail strip can\u2019t be removed.",
            "It never silently does nothing: asking to change text that differs per variation says so and offers to set each value or make it one. A variation added later gets a value for every feed (copied from the first variation when not given, and said so). After each change the chat is told about empty values viewers would see (\u201cprice is empty on Black\u201d) and fills them. The text stack re-spaces for its longest values, so wrapped lines never overlap and it stays clear of the thumbnail strip.",
            "Long chats stay quick and cheap: each reply reuses what Claude has already seen (the instructions, tools and earlier conversation come from its cache; the fixed part is kept for an hour, so a wait for a video doesn\u2019t throw it away), the skills for the current step are in the instructions (no turns spent reading them: brand, concepts and categories at the idea step; shots, video, models and design at the storyboard; canvas and design after the build), the canvas tools only join once the storyboard step starts, a look at the Flick is a 768 px picture and \u2018all\u2019 sees every variation in one call, and photos older than a few turns leave the conversation while staying in the project, where the chat can look at them again. The Dev chat metrics show calls, tokens and the cached share per project.",
            "Saved on the server: with the AI server connected, projects, Flicks and the real videos they use are saved there a moment after every change, and so is each AI chat (every message, answer, open question and image request). Opening the prototype loads them, so work survives a reload and follows you to other devices and to anyone using the same AI server. Reopening an AI chat project picks the conversation up where it was left, and real videos still being made keep going. Images that only lived in the page (uploads) are stored on the server so they still show. Without the AI server, everything stays in the page as before.",
            "Reading inputs and the brand first: the chat opens by saying what it sees in each image the user added (one product in several views, several products, a logo, a style reference) and asks the right next question. If there\u2019s any hint of the brand (a name, a logo, packaging text, a website), it researches it on the web itself (official site, guidelines, product pages and the product range), saves the brand kit (colors, font, tone, notes) with its sources on the brand card, and says what it found, before concepts; with no hint, it asks. What changes between variations is always settled before concepts: products seen in the images are named and confirmed; one product in several views gets a question with options from the research (other products in the range by name, or this product with different serves, scenes or moods, or \u201cI\u2019ll add more products\u201d). Picking other products asks for their pack shots or offers the brand\u2019s official images; products are never generated without an image. Concepts and plans wait until this is answered. Websites visited, pages read and searches are steps in the steps list. Before the storyboard, every reply says what it understood and why it asks. Every reply is at most three short sentences, never a list, and never shows an internal id (an image is \u201cimage 2\u201d, never \u201cimg-2\u201d); after uploads it says in a sentence or two what the files are. After the build, replies are short: one sentence after a change, two short lines when the Flick is ready, no recaps or \u201cchecks pass\u201d, and no \u201cdoes this look OK?\u201d after each tweak. While videos are being made it stays quiet (the build card shows progress). It asks for the website or product page link once, with the brand question, and mentions any still missing only in the hand-over. It never remakes a video on its own judgement (that costs credits): it says what it would change and you decide. Variation 1 is approved only by the button or by your own words, never by the chat on its own. Once the Flick is ready and the chat has finished, three suggestions sit above the chat box (\u201cMake the headline shorter\u201d, \u201cTry a bolder button\u201d, \u201cAdd another variation\u201d); tapping one sends it.",
            "Adding references: + in every prompt box (Create, the canvas and the AI chat) opens one picker with the user\u2019s uploads and generated work. Search on the left, then two sets of tabs: All, Images, Videos; and All, Generated, Uploaded. Newest first. Tiles show only the picture, except videos: a dark pill at the bottom left with a play icon and the length (a scissors icon when it will be trimmed to 15 seconds), and they play muted while hovered (uploads keep their original file name, searchable and shown in the viewer); on hover, a full-screen button sits left of the select mark and opens the viewer, which shows the item\u2019s details and, for generated work, the final prompt and references, with Select to pick it. The Upload tile, drops and pastes take photos (up to 20 MB) and videos (up to 100 MB). References carry no Product, Character or Scene tag. Videos over 15 seconds open a trimmer (player, filmstrip, a window of up to 15 seconds, start, end and length); Use clip adds it to the prompt box straight away; the clip is cut in the browser in the background using its video hardware, in a few seconds (much faster than the clip plays; frames are copied untouched when no re-encode is needed) (it shows as uploading till then), is used in that prompt, and the upload stays whole. With the AI server connected, uploaded photos and videos of 15 seconds or less are saved there as soon as they\u2019re added to the picker (a video over 20 MB is saved as a 1280 px copy), and trimmed clips once they\u2019re cut, so they stay under Uploaded after a reload and on other devices; original long videos aren\u2019t saved. Each file is uploaded once, however many prompt boxes or chats use it; picking something already in the library never uploads it again. Images the chat takes from websites, video stills and other working copies are kept for Claude\u2019s reference only and never show in the picker. In the AI chat, a video arrives as three stills (start, middle, end) with its length, and Claude says what happens in it.",
            "The plan shows as the Flick itself: the planned layout, headline, label, price and button over a still for each variation (its own image, or a quick draft made from the reference shot plus that variation\u2019s change, using the user\u2019s images so it\u2019s their product). Switching variations (tabs under it, or clicking a variation) swaps the still and its copy. When the user has product or people images, the reference video always uses them (opening on one, or kept true to them); a plan without them goes back to Claude to fix. Every detail stays editable below: the reference and variation prompts, names, prices, per-variation text, links, headline and button.",
            "@mentions and elements: typing @ in any prompt (Create, the canvas prompt boxes, the AI chat and the plan\u2019s prompts) opens a list: this prompt\u2019s own photos and videos (@Image 1, @Video 1, in the order added), saved elements, the variations by name, and @Brand; it filters as you type, \u2191\u2193 and Enter or Tab pick, Esc closes, and mentions show highlighted. Elements are named, reusable products, characters, logos or styles with one or more images, made from the @ list (\u201cNew element\u201d, named after what you typed) and edited or deleted from it; they\u2019re kept in the browser and on the AI server. A mentioned element\u2019s images go along: to Claude as project images with a line mapping each @name to image ids, to the canvas generation as references, and in a plan to that video\u2019s images (the @ is dropped from the text the video model reads). Claude sees the saved elements and can suggest them.",
            "Phones aren\u2019t supported: under 768 px wide, a full-screen note asks to open Flicks on a laptop or desktop.",
            "The conversation reads as a conversation. Between two things the user does (a message or an answer), the chat\u2019s own work shows as one steps list, placed where the first step happened: \u201cTook 9 steps\u201d opens to a bordered list of steps in plain words (\u201cShaped the brief\u201d, \u201cSearched \u2018Lumen lens prices\u2019\u201d, \u201cVisited lumen.com \u00b7 $129 \u00b7 3 images\u201d with the site icon and a link, \u201cAdded \u2018See it sharper\u2019 as the headline\u201d, \u201cWatched Gold as viewers will\u201d, \u201cChecked every frame\u201d). A step with more to see opens in place (a website\u2019s images, the picture of the Flick). While the chat works, the list stays open and reads \u201cWorking \u00b7 4 steps so far\u201d; once done it folds. All the edits to the Flick in one stretch are one step (\u201cChanged the Flick \u00b7 6 edits\u201d, the edits inside); only the latest check (\u201cChecked every frame\u201d, or what\u2019s left to fix) and the latest look at each variation are listed. A site that refuses automated visits reads \u201csephora.com doesn\u2019t allow automated visits\u201d and isn\u2019t tried again in that chat; a page that doesn\u2019t exist reads \u201cNo such page on \u2026\u201d (the chat only reads addresses you gave or a search returned); an image address, like a logo file, is kept as an image. Reference sheets it makes to keep a product consistent are a step (\u201cMade 4 reference sheets for Killer Cola, Severed Lime\u2026\u201d, pictures inside), not results. Website images are kept by their own address and only uploaded when used. The images it made show as one gallery (each with its purpose, Add to put it on the canvas, Retry if it failed). Pictures still being made or loading show the generating gradient with a passing light band, never a spinner. A review shows on its own only when there\u2019s something to fix. While it works, one line says what it\u2019s doing in creative terms (\u201cDirecting your Flick\u201d, \u201cBlocking out the shots\u201d, \u201cVisiting nike.com\u201d, \u201cWriting the headline\u201d, \u201cGiving it a final once-over\u201d), never naming guides or tools. Its messages stay to a line or two and don\u2019t repeat what the cards show. Errors are said in plain words with the raw message behind Details.",
            "No service or model names anywhere people look: images and videos are made by Flam Forge; messages from the services are reworded before they show.",
            "Library: every image and video made through the AI server is kept on Flam\u2019s side as soon as it finishes, and so is every image the user adds in the chat or with their first prompt (Higgsfield deletes its own copies after 7 days and can\u2019t list past work), with its prompt, project, variation, purpose and date. The chat can search it and bring earlier images in as references, or reuse the prompts behind earlier videos.",
            "Grounded in Flam\u2019s guides: the chat follows written guides kept with the product, built from Flam\u2019s own answers on what a Flick should be: Flicks (what a great Flick is, the words we use, what the app can do), Brief, Categories (15 category playbooks), Concepts (video types and what changes), Brand (building and saving a brand kit), Shots (camera terms and moves), Video (prompts, the avoid list, fixing failures), Images, Design (hierarchy, contrast, starting layouts by size, shapes, rotation and copy), Models (how each step is made, cost and speed) and Review. It reads the right guide before each step; the chat never mentions guides, it says what the step means for the Flick (\u201cShaping the brief\u201d, \u201cLaying out the frame\u201d).",
            "Review: after the build and after big changes, the chat checks the Flick: 2 to 5 variations with short, distinct names; headline length for the size; nothing overlapping or outside the frame; readable buttons that link somewhere; every feed filled; a thumbnail for each variation. It fixes what fails, then shows \u201cReview passed: all n checks\u201d, or a card listing what\u2019s left.",
            "The chat streams its replies. You can send while it works: your message shows at once and it switches to it at the next safe point (a reply being written stops there; a step that\u2019s running, like reading a site, finishes first); the cut-off reply reads \u201cStopped for your new message\u201d. Stop ends a reply: what it had written stays, in the chat and in its memory, with a \u201cStopped\u201d line, and images that haven\u2019t started are canceled (\u201cStopped \u00b7 2 images canceled\u201d); ones already being made finish. The chat saves after your message and after each step, so closing or reloading mid-reply loses nothing; reopening shows \u201cI was in the middle of this when the page closed\u201d with Continue and Dismiss (it never carries on by itself; Dismiss is remembered until something new happens), and images that were being made keep going. A reply that runs out of steps says \u201cThat was a long one; I paused here\u201d with the same Continue. Stop also ends a step that is waiting on an image or a page; what it waited for still arrives in the chat. Approve, Add and answers act once, however many times they are pressed. \u201cYes, but change the color first\u201d asks for the change and does not start the variations. In the build card, a variation waiting for the OK on Variation 1 can be removed, and one still queued can be canceled, both refunded; once a video has started it can\u2019t be stopped, and it says so. A failed reply shows an error with Retry. When today\u2019s image limit is reached, the chat says so once (it resets at midnight UTC) with no Retry, and doesn\u2019t try more images.",
            "In this prototype: with an AI server connected, Claude plans and designs, and Higgsfield makes images and videos. Images come from an ad image model (Marketing Studio Flare): concept previews and suggested looks when the user gave nothing to work from, product and character sheets (the same product or person from several angles, so they stay the same in every video; approved in the chat when it matters), edits of the user\u2019s photo before it\u2019s animated, thumbnails and canvas images; images that must keep the user\u2019s product use their photos as references (shared with Higgsfield through the AI server, kept 7 days); images with readable words use a text-rendering model. Claude can look at any project image, including generated ones, to check them. In projects made with the AI chat, every video started is made for real at 720p; the user always reviews the finished reference video first, in the build card in the chat (\u201cHappy with Variation 1?\u201d with its still, Change it and Make the variations; it scrolls into view once). When Variation 1 finishes, the app wakes the chat: it looks once, fixes only clear clashes and points to the card in one line. While Variation 1 is being made the chat sets the copy and thumbnails once and waits (it can\u2019t look at a stand-in frame). Saying \u201clooks good\u201d in the chat also approves. Variations are made only after approval, from the latest reference video. Once every variation is made, the app wakes the chat: it checks each variation once (text over faces or the product, the strip over the action, a label and link on each), fixes what it can, and hands over in two short lines. A video that fails is refunded and its tile in the build card says \u201cFailed\u201d with Try again (no separate toast in the chat); the chat is told, retries a variation once by itself with a gentler version of the same change, and if that fails too it tells you and suggests a different change. The chat decides from context how the reference is made: by default a new video true to the references (the user\u2019s photos or videos, website images, the picked suggested look, sheets); an edit of the user\u2019s own video when they asked to change it; or the user\u2019s image brought to life as it is (opening on it exactly). There is no video from a prompt alone: with nothing given, the chat suggests looks first. Video prompts are written in parts (subject, action, camera, setting and light, what to keep) and name their inputs by position ([Image 1], [Video 1]). Every variation is an edit of the approved reference with only its change (matching that variation\u2019s images or sheet), so they keep its shot, people, motion, camera and timing (\u201cWaiting for the reference video\u201d until then; if the reference fails, they\u2019re refunded too) in parallel, in a few minutes; the canvas shows \u201cGenerating \u00b7 a few minutes\u201d until it\u2019s ready. A failed video refunds its credits and goes back to empty with a message. Without a server set up on this device (or when it refuses or can\u2019t be reached) the chat shows one error card, \u201cCouldn\u2019t connect to the AI server.\u201d, with Retry; nothing else runs.",
          ]}
        />
        <H>Templates</H>
        <UL
          items={[
            "“Start with templates” gallery below the composer, sitting directly on the page (no card around it), filterable by industry and size (each filter lists only what the templates have). A masonry of cards, 4 columns on wide screens (3 on medium, 2 on small), each in its own shape (square, 4:5, 3:4 or 9:16) like a shopping-app hero card: a bold brand-color image with the product, and the brand and its line set on its clear top. The 16 templates are real Flicks (Coach, Amazon, Gap, Ulta, GEICO, Modelo, Sony, WWE 2K26, Diageo, Lovesac, The Home Depot, Little Caesars, American Express, Paramount+, General Mills, Red Bull), each a complete project with the Flick\u2019s own three videos and tap thumbnails, its logo, and real products with prices and links per variation (title, subtitle, price, button text and link are feeds)",
            "Brand templates come first: GAP (Fashion, 1:1), Diageo, Little Caesars, General Mills (Food & beverage, 1:1) and Modelo (Food & beverage, 9:16). Each is a complete project from real campaign videos: three products with the reference video included in the Flick, product thumbnails in the strip, the brand’s logo, colors and closest editor fonts, and five feeds per product (title, subtitle, price, cta, cta-link) holding real names, prices and links. Alcohol templates carry “Please drink responsibly.”",
            "Your templates (saved by the user) appear first and have their own filter option.",
            "Empty states: no templates yet; no templates match these filters (with Clear filters).",
          ]}
        />
        <H>Template page</H>
        <UL
          items={[
            "Try it: in place of a still thumbnail, a live Flick at the template's size (on a gray stage, as large as fits): its videos, headline and button, and the thumbnail strip. Tapping a thumbnail switches the video; on its own it moves to the next every few seconds (a thin bar shows when), pausing for a while after a tap. Below: \u201cTap a thumbnail to switch the video.\u201d",
            "Beside it: title, description, industry and size badges, and Use as reference (with one line under it: it opens the chat with this pattern; your own brand and product go in). No variation tags, prompt or what\u2019s-included list. More templates below.",
            "Templates are view-only: they never open in the editor and nothing is saved as a template. Use as reference opens the chat on a new project with a From template card (its picture, name, mechanic, variation count, size and length) and tells the chat the pattern: the mechanic and description, how many variations and what changes between them, size and length, where the headline, button and thumbnail strip sit, and the template\u2019s headline and button text as an example of tone and length only. The template\u2019s brand and its video are not inputs: the chat asks for the user\u2019s own brand, product and photos, and nothing is generated until the storyboard is approved.",
            "For a brand or saved template, Try it shows the real design (text, buttons, logo and strip) with each product’s feed values, instead of the generic headline and button.",
          ]}
        />
      </>
    ),
  },
  {
    id: "editor",
    title: "7. Editor layout",
    body: (
      <>
        <Table
          head={["Area", "Contents"]}
          rows={[
            ["Chat panel", "Far right, after the canvas: a shade darker with a thicker left edge, resizable from that edge (drag left to widen, double-click resets). The chat (section 10) with its composer at the bottom; the only place to ask for a video."],
            ["Top bar", "Back (a house icon whose tooltip says Back: it returns to wherever the project was opened from), project name with file menu (\u201cUntitled project\u201d until the chat names it with the storyboard), size badge; on the right the video play/pause, Design/Preview switch and Export."],
            ["Left rail", "Text, Images, Buttons (a finger tapping a button), Shapes, Layouts; a divider; Layers, then Feeds. Each shows its icon with its name underneath, and opens a panel next to the rail."],
            ["Canvas", "The frame at the Flick's exact size, centered, with pan and zoom. Element toolbars float above it."],
            ["Slides strip", "Reference video, a divider, then the variations and Add. Below the canvas."],
          ]}
        />
      </>
    ),
  },
  {
    id: "topbar",
    title: "8. Top bar",
    body: (
      <>
        <H>Name</H>
        <UL
          items={[
            "A new Flick shows “Naming…” briefly, then gets a short name generated from its prompt (e.g. “Red Running Sneaker”).",
            "A Flick from a template is named template name, underscore, a short timestamp: “Maison Living_Oct 8 20:44”.",
            "A duplicate is named “… copy”; a remix “<Flick>_copy”.",
            "Shown truncated after 16 characters; the tooltip always shows the full name. Click to rename inline; Enter saves, Esc cancels.",
          ]}
        />
        <H>File menu</H>
        <UL
          items={[
            "Rename.",
            "Duplicate: opens a copy as a new project (“X copy”) with the whole canvas copied (variations, elements, feeds, settings) and the conversation with it, at its last safe point: everything up to the chat’s last finished reply; an open question, a storyboard waiting for approval or a half-written reply is left out, and a video still being made is left unmade in the copy. The chat is told it is now working on the copy, so new work goes under the copy’s name and the original is untouched. The same happens from Duplicate in Projects (the conversation follows a moment after the row appears).",
            "Version history: a side sheet on the right (see Projects and Flicks).",
            "Delete (with confirmation; Flicks exported from it stay in Flicks).",
          ]}
        />
        <H>Size badge</H>
        <P>Shows the pixel size only (e.g. 300×600). The tooltip adds the full name, e.g. “300×600 px · Half page”.</P>
        <H>Right side</H>
        <UL
          items={[
            "Video play/pause: the canvas video autoplays on loop; pause holds the current frame. Disabled while a video is generating.",
            "Design / Preview: Preview hides every panel and plays the Flick as viewers get it (thumbnails switch videos, buttons open their links).",
            "Export: primary button; opens Export Flick (see Projects and Flicks). All three controls are 36px tall.",
          ]}
        />
      </>
    ),
  },
  {
    id: "leftrail",
    title: "9. Left rail",
    body: (
      <>
        <Table
          head={["Section", "What it adds"]}
          rows={[
            ["Text", "Heading, subheading, body, caption, label styles."],
            ["Images", "Your uploaded photos from the AI server\u2019s library (this project\u2019s first, then the rest), with full screen preview and delete. Upload image keeps the file on the server under this project, so it shows in Assets and survives a reload; the same list serves the thumbnail picker and Replace image, images only. Delete confirms first (\u201cDelete this image?\u201d with the image; anywhere it\u2019s already used on the canvas keeps it) and hides it from the library. Server off or down: \u201cCouldn\u2019t connect to the AI server.\u201d and images added now stay in this browser."],
            ["Buttons", "Pill, rounded, sharp, pill with arrow, light pill, light sharp, outline, outline sharp, glass, block shadow, text link, and Icon (image only)."],
            ["Shapes", "Rectangle, Circle, Triangle, Hexagon, 4-, 5-, 6- and 8-point stars, Heart, Play button (a circle with a white play triangle), Line and Arrow as tiles; a tap adds one in the middle, in gray. On the canvas a shape moves and resizes like an image (corner and side handles; filled shapes keep their proportions until unlocked). Its toolbar uses the same controls as buttons: color (solid, with transparency), border (thickness, color and transparency together; for lines and arrows, the line), corner radius (rectangles), a picture fill (add, Fill or Fit, Replace, Remove; the color shows around a fitted picture) and the aspect-ratio lock. The editor offers solid colors only; the AI chat can also give a shape a linear or radial gradient fill or border (its swatch shows the gradient, and picking a color replaces it), a picture fill and a rotation. The chat decides the layout for each concept and uses as many texts, buttons, images and shapes as it needs; it can draw any other shape (seal badges, ribbons, tags, speech bubbles, bursts, blobs) as a custom shape, turn text, images and shapes, and fill or outline shapes with gradients. It uses shapes for badges, stickers, backdrops behind text (placed behind everything), dividers, frames and pointers, and writes copy for the goal, the brand\u2019s voice and the category. Shapes don\u2019t count as overlaps in the review, since they\u2019re meant to sit behind or around other elements."],
            ["The chat on the canvas", "Once the Flick is built, the chat can do everything the editor can. It sees every element with every property (positions and sizes in % of the frame), its layer and whether it\u2019s hidden, the thumbnail strip\u2019s full style and where each thumbnail sits, and which variation the Flick starts on. It can set any property of text, buttons (all 12 styles, radius, border, size, a picture background), images (fit, crop, lock, height) and shapes; move elements forward or back a layer; restyle the strip (row, column or free; place, size, gap, rounding, highlight, fade) and place each thumbnail on its own, or use a ready arrangement (arc, corner stack, diagonal, grid, scatter) when asked or when the layout needs it; move, align, spread, layer, duplicate or delete several elements at once; set the variation the Flick starts on; and list, restore or save named versions. Its changes show in its steps list and in the version history. A build check fails if an element ever gets a property the chat can\u2019t reach."],
            ["Rotation", "Text, images and shapes turn: hovering just outside a corner of the selected element shows a rotate cursor (a shallow two-headed arc across that corner, as in Figma); dragging turns it around its center, catching every 45\u00b0 (within 5\u00b0; Shift turns in 15\u00b0 steps, Alt turns freely), with the angle shown under it while turning. The outline and handles turn with it, and resizing follows its own sides. Every handle on every element (text, buttons, images, shapes, the thumbnail strip and a group) uses the same drawn cursors: a two-headed arrow for resizing and the arc for turning, white-edged so they read on any background, and they stay on while dragging. On a turned element every cursor turns with it: the rotate arcs stay across their corners and the resize arrows stay square to their side or corner."],

            ["Layouts", "Stacked text and button combinations placed together."],
          ]}
        />
        <UL
          items={[
            "Adding anything closes the panel so the canvas has room. Uploading does not.",
            "The panel's collapse button uses a sidebar icon.",
            "Elements can be added once the video is ready, and on a variation that hasn't been generated yet.",
          ]}
        />
        <H>Layers</H>
        <UL
          items={[
            "Every element front to back, with a type icon and its text as the name (“Shop now”, “Thumbnails”, “Icon button”).",
            "Hover a row: outlines the element on the canvas and shows Hide and Delete.",
            "Click selects; Shift-click adds to the selection. The selected row is gray, like the rest of the rail.",
            "Hidden elements disappear from canvas, preview and the exported Flick, stay grayed in the list, and are ignored by snapping.",
            "Drag a row to move the element forward or back; a line shows where it lands. With two or more layers, a line above the list says so: \u201cDrag layers to reorder them. The top one shows in front.\u201d",
            "The thumbnail strip cannot be hidden or deleted.",
            "Layers stays open while working; it doesn't add or rename.",
          ]}
        />
      </>
    ),
  },
  {
    id: "canvas",
    title: "10. Canvas",
    body: (
      <>
        <H>Pan and zoom</H>
        <Table
          head={["Input", "Pan", "Zoom"]}
          rows={[
            ["Trackpad", "Two-finger scroll", "Pinch"],
            ["Mouse", "Hold middle button and drag", "Wheel"],
            ["Touch screen", "Two fingers", "Pinch"],
            ["Keyboard + scroll", "", "Ctrl or Cmd + scroll"],
          ]}
        />
        <UL
          items={[
            "Zoom keeps the point under the cursor in place. Range: 25% of fit to 8× fit.",
            "Zoom control at the bottom right shows only the percentage; it expands on hover and while zooming to: zoom out, percentage, zoom in, 1:1.",
            "The percentage is true size (100% = one Flick pixel per screen pixel). Tapping it fits to screen. 1:1 shows actual size.",
            "The view resets to fit when the Flick's size changes.",
          ]}
        />
        <H>Elements</H>
        <UL
          items={[
            "One set of elements is shared by every video; a change on any video applies to all.",
            "Elements are clipped to the frame; selection outlines and handles stay visible outside it.",
            "Element toolbars appear above the canvas and can be dragged by their grip; double-click the grip to reset. The position sticks for the session.",
          ]}
        />
        <H>Generating</H>
        <UL
          items={[
            "While a video generates, very light tints of the chart colors drift slowly across the frame, with a soft band of light passing over them. The design stays fully editable on top: select, move, restyle and add elements as usual. Nothing sits over or above the frame.",
            "Thumbnails in the strip and in the chat\u2019s build card show the same gradient with a small spinner.",
            "A Make card pressed for a video that\u2019s still generating starts it again with the new prompt. Variations wait only until Variation 1 exists.",
            "When a video arrives, its thumbnail in the strip fades in with one soft glow.",
            "A variation that hasn't been generated shows the reference video faded underneath its elements.",
            "Switching variations swaps the video instantly, with no fade, everywhere: the canvas, previews, templates and the Flick player.",
            "Wherever a finished Flick or template plays (template pages, the Flick page, campaigns, embeds, the shared viewer), it shows at its exact shape, as large as the space allows by width or height, never stretched; the video fills that shape.",
          ]}
        />
      </>
    ),
  },
  {
    id: "manipulation",
    title: "11. Selecting, moving and resizing",
    body: (
      <>
        <H>Selecting</H>
        <UL
          items={[
            "Click to select; Shift-click to add or remove. Several selected show a group toolbar (count, duplicate, delete) and a group box.",
            "Click a selected text or button again to edit its text in place. The outline follows the text instantly as it wraps.",
            "Delete or Backspace removes the selection (never the thumbnail strip). Esc clears it. Switching variations keeps the selection.",
          ]}
        />
        <H>Moving</H>
        <UL
          items={[
            "Snapping: the dragged box's edges and center snap to other elements' edges and centers and to the frame's edges and center, within 6px on screen. Red guides show what it lines up with.",
            "Axis lock: a drag that's clearly horizontal or vertical stays on that axis. Decided once about 16px in; it can release if the drag turns diagonal but never re-locks, so nothing jumps. Shift locks fully.",
            "Alt (Option) moves freely without snapping.",
          ]}
        />
        <H>Resizing</H>
        <Table
          head={["Element", "Corner handles", "Side handles (on hover)"]}
          rows={[
            ["Text", "Scale the text from the center; a set box width scales with it", "Left and right set the box width; text wraps; font size stays"],
            ["Button", "Resize freely from the center; never smaller than the label; Shift keeps shape", "Move only that edge; the opposite edge stays fixed"],
            ["Icon button", "Resize from the center", "Move only that edge"],
            ["Image and shape", "Resize from the dragged corner; the opposite corner stays fixed (Alt resizes from the center); aspect lock or Shift keeps shape", "Move only that edge; a locked one keeps its shape"],
            ["Thumbnail strip", "Scale all thumbnails together from the top-left; stops at the frame’s edge, so the gap and position never change", "None"],
          ]}
        />
        <UL
          items={[
            "Shape snap: images and image buttons snap to the image's own aspect ratio when within 6px, and release past 10px, so it never flickers at the edge. Alt turns it off.",
            "Corner drags use the same axis lock as moving, so a mostly sideways pull changes only the width.",
            "Edges snap while resizing too: the edge being dragged lands on other elements' edges and centers, or the frame's edges and center, within 6px, with the same red guides. Text snaps its width only. Alt resizes freely.",
            "Corner radius updates in the same frame as the size, with no lag.",
          ]}
        />
        <H>Text alignment</H>
        <P>Changing alignment keeps the box where it is; the lines align inside it. The box width becomes fixed at that point.</P>
      </>
    ),
  },
  {
    id: "toolbars",
    title: "12. Element toolbars",
    body: (
      <>
        <Table
          head={["Element", "Controls"]}
          rows={[
            ["Layout", "Canva-style: one 44px row; text controls show their value (the font name in its own font with a chevron; the size between \u2212 and +), the rest are icons with tooltips; dividers group them. No style, duplicate or delete: Delete/Backspace deletes and Cmd/Ctrl+D duplicates."],
            ["Text", "Font (name in its own font \u2304; 100+, searchable, grouped by type, incl. Japanese, Korean, Chinese, Arabic, Devanagari and Thai; loaded on demand), size, color, align (cycles), bold, italic and underline as three toggles"],
            ["Button", "Font, size, text color, bold / italic / underline, background color (incl. transparent), border, radius, background image"],
            ["Icon button", "Replace (text button) (the link floats under it). No text, no feed for a label."],
            ["Image", "Replace (text button), radius, aspect lock (lock icon), fit or fill"],
            ["Thumbnail strip", "Layout (horizontal → vertical → free), size, gap, highlight color and width, background, radius"],
          ]}
        />
        <UL
          items={[
            "Bold, italic and underline sit behind one button that shows whichever is on; the three options open on hover or click.",
            "Any change on top of a style marks it Custom; picking a style starts it fresh.",
            "The color picker has a saturation area, hue and opacity sliders, hex and opacity fields, an eyedropper and swatches. While the eyedropper is picking, the panel hides; it returns with the picked color. The picking click doesn't deselect the element.",
            "Labels: the button's fill is “Background color”.",
          ]}
        />
        <H>Thumbnail strip</H>
        <UL
          items={[
            "Thumbnails are always square, whatever the Flick's shape.",
            "The canvas strip shows uploaded thumbnails only; a thumbnail without an upload shows the strip's background color. (The bottom slides strip shows a frame from each video.)",
            "With the strip selected, each thumbnail outlines on hover. Clicking one (without dragging) picks it: it stays outlined, the editor switches to that variation, and the toolbar adds Add thumbnail / Change thumbnail (with a preview) and Remove thumbnail. Add or change opens the uploads panel on the left titled \u201cThumbnail \u00b7 <name>\u201d.",
            "Thumbnails are set only on the canvas. An included reference video needs one to export.",
            "Free layout: each thumbnail can be dragged on its own. Switching to horizontal or vertical and back to free restores the free arrangement exactly.",
            "The strip is kept fully inside the frame, shrinking if needed.",
          ]}
        />
        <H>Icon button</H>
        <UL
          items={[
            "Image only, round, about 12% of the frame width when added.",
            "Default image is a generic social icon (PNG); the user replaces it with their own (e.g. their Facebook icon) via Replace icon image.",
          ]}
        />
      </>
    ),
  },
  {
    id: "links",
    title: "13. Button links",
    body: (
      <UL
        items={[
          "A button\u2019s link floats just under it while it\u2019s selected; it isn\u2019t in the toolbar.",
          "No link yet: a link box opens on its own, the cursor in it (\u201cPaste or type a link\u201d), with a tick to finish. Enter (or Esc) finishes too.",
          "With a link: a slim dark chip showing where it goes (e.g. shop.example.com/boots, opens in a new tab) and a pencil that turns it back into the link box.",
          "A link that comes from a feed edits this variation\u2019s value.",
          "In Preview and the exported Flick, buttons open their link (or this variation's feed value).",
        ]}
      />
    ),
  },
  {
    id: "feeds",
    title: "14. Feeds",
    body: (
      <>
        <P>
          A feed is a value that\u2019s different in each variation, like a price or a product page. There are no kinds: any feed can fill text, a button label or a button link.
          The idea is to change things where they are: switch variations below the canvas and type in place. The side panel opens only when asked.
        </P>
        <H>On the canvas</H>
        <UL
          items={[
            "Feeds aren\u2019t in the element toolbars. A selected text or button has a dark tab on the top-left edge of its outline (under the corner handle), and the button\u2019s link box has one on its top edge. The feeds icon is { }.",
            "No feeds in the project yet: the tab is a small { } (tip: \u201cMake a feed: a different text in each variation\u201d, or label, link). One click makes a feed named text, label or link (then text-2\u2026), fills every variation with what\u2019s there now and links it. The panel doesn\u2019t open.",
            "Feeds already exist: the { } opens a menu: New feed, then Link to and the existing feeds.",
            "Linked: the tab shows only the feed\u2019s name (tip: \u201cDifferent for each variation\u201d). Its menu: Open Feeds panel, New feed, Link to another Feed, Unlink (keeps what\u2019s on screen). Deleting is only in the Feeds panel.",
            "Linked text is edited in place like normal text; the edit is this variation's value. An empty value shows {name}. Hovering an unselected linked element shows its name on a small tab.",
          ]}
        />
        <H>Feeds (left panel)</H>
        <UL
          items={[
            "A list; feeds can\u2019t be made here. Each row: { }, the name and a \u22ef menu: Rename (in place) and Delete (asks first; anything using it keeps the value of the variation in view).",
            "Clicking a feed selects what uses it on the canvas and opens it in the panel, titled \u201cFeeds \u203a price\u201d (Feeds goes back). Inside: the feed\u2019s name large, with \u2197 (select on canvas) and \u22ee (Rename, Delete); Rename (or double-clicking the name) makes the name editable in place. Then \u201cType what each variation shows.\u201d and a card per variation: a round image and the variation\u2019s name on top, a full-width value field below. The variation on the canvas has an outlined card and \u201cOn canvas\u201d; focusing a value or clicking the name switches the canvas to it.",
            "Selecting a linked element while the panel is open opens its feed. Open Feeds panel (from the canvas) opens it with the cursor in the value for the variation in view.",
            "Empty: \u201cDifferent content for each variation. Show a different price, label or link in each variation. Select text or a button and click { }. Then pick a variation and type.\u201d",
            "The reference video has values only once it is included in the Flick. Empty values are flagged before export.",
          ]}
        />
      </>
    ),
  },
  {
    id: "prompts",
    title: "15. The chat panel",
    body: (
      <>
        <P>Every prompt goes through the chat, in one panel on the far right, set apart from the editor by a slightly darker background and a thicker edge. There is no separate prompts panel or per-video prompt box.</P>
        <UL
          items={[
            "History is the chat itself (section 10): the user\u2019s messages, the chat\u2019s steps, the storyboard, the build card and every Make card, oldest at the top. The newest message stays in view, also when the bottom area grows (a question deck, an approval bar, suggestion chips). Every card keeps the same right margin.",
            "The composer at the bottom asks for a change (\u201cAsk for a change. @ picks a photo or variation\u201d). @ mentions photos, videos, elements and variations. Suggestion chips above it (one scrolling row) name the next useful thing, including a review issue by name (\u201cFix: the \u2018Find yours\u2019 button has no link\u201d); a chip disappears once sent, and none show while an approval is waiting.",
            "A video is only ever started by the user: Approve on the storyboard, Make the others on the approval bar below the chat, Make on a proposal card, Try again on a failed tile. The chat describes a change and proposes it; it never starts one.",
            "The build card lays its videos out by the panel\u2019s width: side by side when there is room, one per row with the still on the left in a narrow panel. The Make card shows the whole change with the buttons under it; a Variation 1 remake says which variations are remade from it after approval and what that costs then. After Stop, a Continue link picks up where the chat stopped. A reply the chat starts with a single step shows that step by name instead of \u201cTook 1 step\u201d.",
            "When something else sends you to the chat (adding a variation, \u201cGenerate this variation\u201d or \u201cNeeds regenerating\u201d), the panel opens if hidden and the cursor lands in the composer.",
            "The panel has a header, Chat, with a hide button at its right. While hidden, a Chat button (chat icon) at the canvas\u2019s top-right brings it back, with a small spinner on it while the chat works.",
            "Drag the panel\u2019s left edge to resize it between 280 and 560px (default 380); double-click the edge to reset. Arrow keys work when the edge is focused. The width is remembered on this device.",
          ]}
        />
      </>
    ),
  },
  {
    id: "variations",
    title: "16. Variations and the slides strip",
    body: (
      <>
        <UL
          items={[
            "Reference video, then 2 to 5 variations, centered and scrollable, then Add.",
            "A variation with no video yet shows its elements over the faded reference video, and a tip just outside the frame\u2019s top-right corner: \u201cGenerate this variation\u201d (small). Clicking it opens the chat (if hidden) and puts the cursor in its composer; the chat proposes the video as a Make card.",
            "Each variation keeps the number it got when added; numbers are never reused or renumbered (removing Variation 3 leaves 1, 2, 4; the next is 5). A typed name replaces it everywhere.",
            "Rename the reference video or a variation by clicking its label under the thumbnail: type, then Enter or click away; Esc cancels; clearing it goes back to the default name (\u201cVariation 3\u201d, \u201cReference video\u201d). The reference video can be renamed the same way.",
            "Thumbnails are at least 48px wide; tall sizes get taller thumbnails.",
            "Drag a variation to reorder it; the order is the order viewers get. Variation 1 stays first. A small move starts the drag, so clicks and double-clicks still work.",
            "Keys (outside text boxes): [ and ] step through the variations, P switches Design and Preview (shown in their tooltips), \u2318\\ (Ctrl \\) shows or hides the chat panel.",
            "States: ready (frame), generating (animated), not generated (dashed with sparkle), needs regenerating (faded, red dot before the name), starting variation (solid play button in the corner).",
            "Thumbnail corner (top-right): where the Flick starts, a solid play button always shows, in a soft orange highlight (\u201cThe Flick starts here: viewers see this first\u201d). Hovering any thumbnail shows the play toggle (\u201cStart the Flick here\u201d) and options (\u2026) to its right. On a reference video left out of the Flick the toggle is disabled: \u201cInclude it in the Flick to start here\u201d. A red dot before the name marks needs regenerating. Double-click a ready thumbnail for full screen.",
            "Options menu (also on right-click): Full screen (ready videos; lightbox with prompt and reference details), Include in Flick (reference video only, a checkmark toggle; turning it off moves the start to the first variation), and Delete (variations, with confirmation; disabled with a reason when only 2 are left). Dividers only appear between groups, never above a lone Delete.",
          ]}
        />
        <H>Needs regenerating</H>
        <UL
          items={[
            "A variation made from an older reference video keeps its video, shown faded on the canvas; its elements stay at full strength.",
            "Just outside the frame's top-right corner (where \u201cGenerating\u201d shows) a pill reads \u201cNeeds regenerating\u201d with a red dot. Clicking it opens the chat (if hidden) and puts the cursor in the prompt box.",
            "In the slides strip its thumbnail is faded with a red dot before its name.",
          ]}
        />
        <H>Regenerating Variation 1</H>
        <P>Only through the chat: a change to Variation 1 is proposed as a Make card (one video, its cost on the button). When the remade Variation 1 lands, the approval bar below the chat asks the user to keep it and offers Make the others again for every variation now marked \u201cNeeds regenerating\u201d, as one approval with one cost. Nothing regenerates on its own.</P>
      </>
    ),
  },
  {
    id: "publish",
    title: "17. Projects and Flicks",
    body: (
      <>
        <P>Projects are editable drafts; Flicks are what exporting a project makes, fixed once made. A project can be exported any number of times; each export is a new Flick.</P>
        <H>Projects</H>
        <UL
          items={[
            "Title and description (\u201cDrafts you\u2019re working on.\u201d), then search, a last-edited date filter (see Assets) and a size filter.",
            "Cards: a square (1:1) thumbnail (the starting variation), the name, last edited and size. 4 to a row on wide screens (3 on medium). Hovering a card shows its saved versions and how many times it was exported over the thumbnail.",
            "A project saves as you work, from the first real change: an element edited, moved, added or removed, a feed value, a variation, a video made, an export. A template opened and left untouched never becomes a project, and a saved project reopened and only looked at keeps its place and its edited time; a chat project and a new generation from Create are work from the start. Anything started from Create, a template, Assets or Remix shows up here once it has been worked on, and reopens as it was left. Saving adds to what other tabs and devices saved rather than replacing it: every project from both, the newer copy where both have one, and deletions remembered so another tab can\u2019t bring a deleted project back.",
            "A project\u2019s picture is its own: the start variation\u2019s thumbnail or a finished video\u2019s still. A project made with the AI chat that has neither yet shows a plain tint of the theme\u2019s brand color (never a sample image); the same placeholder shows in search.",
            "\u22ef and right-click: Duplicate and Delete. Both happen at once with Undo in the toast (\u201c\u2018Name\u2019 deleted \u00b7 Its Flicks stay.\u201d). Flicks still confirm before deleting, as they may be live in ads.",
            "Empty: \u201cNo projects yet\u201d with Create; no match, with Clear filters.",
          ]}
        />
        <H>Export Flick</H>
        <UL
          items={[
            "Export (top right of the editor) opens a dialog: what it does (\u201cMakes a Flick from this project, ready to share, embed in websites or serve in ads.\u201d), the starting variation\u2019s frame with the number of variations and size, and Flick name, prefilled with the project name.",
            "When the project was exported before: \u201cLast exported 2 hr ago as \u201cX\u201d.\u201d",
            "Checks, one line each: \u201cCreate at least two variations to export.\u201d or \u201cGenerate videos for every variation before export.\u201d, and a reference video thumbnail when it\u2019s included (these block); feeds empty on some variations or variations made from an old reference video (warnings). A button without a link is a warning too (\u201cThe \u2018Shop now\u2019 button has no link, so tapping it goes nowhere.\u201d); with only warnings the button reads Export anyway.",
            "Export closes the dialog and opens the new Flick\u2019s page right away; it prepares there in the background (about 5 seconds here). The project stays as it was; going back to it, the Export button shows a spinner while one prepares (it can export again).",
            "While preparing: the header says \u201cPreparing\u2026 n%\u201d (no Remix or \u22ef); the preview plays; the right side is one card, \u201cPreparing\u2026 n%\u201d with a bar and \u201cYou can share the link, serve it in ads or embed it on your website when it\u2019s ready.\u201d; Analytics is hidden. In Flicks it\u2019s first, its card faded with \u201cPreparing\u2026 n%\u201d and a bar. It isn\u2019t offered in placement or embed pickers yet.",
            "When it finishes, wherever the user is: the toast \u201c\u201cX\u201d is ready\u201d (\u201cShare it, embed it or serve it in ads.\u201d) with View Flick.",
            "Real Flicks (the AI server set up and Sample videos off): the export goes to Flam\u2019s Flicks API through the server (the key stays there). It sends the included variations\u2019 videos (public addresses; a video Higgsfield no longer serves is swapped for the server\u2019s kept copy), their thumbnails, the videos\u2019 aspect ratio and Loop on, and the API bakes them into one Flick, one variant each, in order (about 90 s on dev). The app asks about it every 10 s; the bar nears the end and waits. When it\u2019s completed the Flick keeps the API\u2019s share page as its link (flicks-dev.flamapp.live/s/\u2026), used everywhere the link shows (page, cards, embeds, share), and the Flick page, Embeds and Campaigns previews play that page itself (framed at the Flick\u2019s size) instead of the prototype\u2019s player, so what\u2019s shown is what viewers get. A Flick costs no credits.",
            "The API takes 2 to 4 videos of the same length and shape: with more than four variations in the Flick the dialog blocks (\u201cA Flick holds up to four variations; this has 5. Leave some out of the Flick to export.\u201d). Layout (text, buttons, logo, links) isn\u2019t sent yet: the share page is the video switcher only.",
            "If the bake fails (the API says so, or the export couldn\u2019t be sent): the toast \u201c\u201cX\u201d couldn\u2019t be exported\u201d with the reason and View Flick; the card is dimmed with \u201cExport failed \u00b7 open to try again\u201d; the page says Export failed, with the reason, Try again (the same videos sent again, only on that press; nothing is re-sent on its own) and Delete Flick. A failed Flick can\u2019t go in a placement. Without a Flicks API key the dialog export fails with the dev note \u201cDev: the AI server has no Flicks API key yet, so Export isn\u2019t connected.\u201d",
          ]}
        />
        <H>Version history</H>
        <UL
          items={[
            "From the file menu, as a side sheet on the right. A checkpoint saves on open and then a few seconds after changes settle.",
            "Each row: v-number, name (tap to rename), time; Current on the one matching the canvas; Restore on the others (restoring saves a new checkpoint after).",
            "Exports are marked Exported with \u201cAs \u201cX\u201d\u201d and View Flick.",
          ]}
        />
        <H>Flicks</H>
        <UL
          items={[
            "Title and description (\u201cFlicks ready to share, embed in website or serve in ads.\u201d), then search, a created-date filter and a size filter.",
            "Cards like Projects, with \u201cCreated 2h ago\u201d. \u22ef and right-click: Remix, Copy link, Delete.",
            "Delete confirms (its link and embeds stop working). Not while a placement serves it: \u201cIt\u2019s serving in 2 placements. Replace it there first.\u201d",
            "Empty: \u201cNo Flicks yet. Export a project to make a Flick.\u201d with Go to Projects.",
          ]}
        />
        <H>Flick page</H>
        <UL
          items={[
            "Header: breadcrumb (Flicks \u203a name) with the size; Remix (primary) and \u22ef (Copy link, Delete Flick). Under it: \u201cCreated <date> from <project>\u201d (opens the project).",
            "Left: the Flick playing as viewers get it (its variations, the starting one first, and the thumbnail strip to tap) in a fixed-height stage like the template page (up to 520px, shorter on small screens); the frame keeps its exact ratio and fits the stage, wide, square or tall. Placements and embeds show their Flick the same way. Then Analytics.",
            "Analytics: total views, then each variation with its views, share and a bar; the starting variation marked \u201cStarts here\u201d. Full analytics opens this Flick in Analytics. Campaign pages have a Full analytics link above their numbers. Placement and embed pages have the same Analytics card as a Flick page, below the Flick: views of the Flick on now (or the last one) in that placement or embed, all time, split by variation with the starting one marked, and Full analytics opening that placement or embed. No views yet: \u201cShare the link, embed it or serve it in ads to start.\u201d",
            "Right, as cards: Link, Serve in ads, Embed. Stacks under the Flick on narrow screens.",
            "Visit link opens the Flick as viewers get it, on any screen including phones: the video at its size, the variations to tap under it, the name, and \u201cMade with Flicks\u201d. An old or removed link says \u201cThis Flick isn\u2019t available\u201d.",
            "Link: the Flick\u2019s share page on the Flicks API when it has one, else flamapp.ai/f/<ending>; with copy and visit; how it unfurls (image, title, description); Edit link.",
            "Edit link (dialog): link preview (1200\u00d7630 image with add / replace / remove, title, description); link ending with a live availability check; preview title and description. It changes the link only, never the Flick.",
            "Serve in ads: the placements this Flick is in (name, campaign, impressions; each opens its placement), or \u201cNot in any placement yet.\u201d Add to placement (top right) opens a dialog: placements in the Flick\u2019s size with Add or Replace (View when it\u2019s there), and New placement for this Flick.",
            "Embed: the embeds this Flick is in (name, views; each opens its embed), or \u201cNot embedded anywhere yet.\u201d Add to embed opens the same kind of dialog for embeds (\u201cCreate an embed to show Flicks on your website. You can replace Flick later.\u201d). Below: Download Flick (.ifl) (the Flick as one file for the Flicks player SDK: name, size, variations, starting variation, link).",
            
            "Remix: a new project from the Flick\u2019s exact state, named \u201c<Flick>_copy\u201d; the editor opens with \u201cRemix created\u201d. Back returns to the Flick.",
          ]}
        />
      </>
    ),
  },
  {
    id: "library",
    title: "18. Credits",
    body: (
      <>
        <UL
          items={[
            "Shares one frame with Account and Ad Balance: title, description and the main action (Get credits) top right, four stat cards (Balance, Auto-reload, Used, Added), then Usage history (spent, added, refunded, granted; filter by type and the shared date filter, default Last 30 days; 10 at a time) beside Invoices (each downloadable).",
            "Get credits: One panel shows the exchange side by side: You pay ($500) and You get (5,000 credits, about 104 videos). Under it: four equal quick amounts ($200, $500, $1,000, $2,500), a slider ($100 to $10,000), and one amber bonus strip with a gift: below $1,000 it says how much more unlocks it (“Add $500 for 10% bonus credits”, Make it $1,000); from $1,000 it reads “+1,000 bonus credits included”. Then Auto-reload (On/Off), and Pay $500. Amber marks only the bonus. A typical video (1080×1920, 8 seconds) is 48 credits.",
            "Auto-reload: a dialog with two credit amounts, \u201cWhen your balance is under\u201d (with about how many videos that is) and \u201cAdd\u201d (with its price and about how many videos), both 1,000 to 10,000 credits in steps of 10; 10 credits are $1. The Credits page card reads \u201cUnder 1,000 credits, add 5,000 ($500)\u201d.",
          ]}
        />
      </>
    ),
  },
  {
    id: "assets",
    title: "19. Assets",
    body: (
      <>
        <P>Every video made for you and every photo or clip you added, newest first, from Assets in the sidebar. All of it comes from the AI server’s library: nothing here is sample data.</P>
        <UL
          items={[
            "What shows: finished videos (Variation 1 and the variations, including remakes), the thumbnails made for the variations, and your uploads (photos and clips added in the chat, on Create or in the editor’s Images panel). What the chat makes on the way stays out: concept previews, looks, storyboard frames, plan previews, stills and the images it took from websites.",
            "Grouped by day: Today, Yesterday, then the date (“Wed, Oct 7”; the year only when it isn’t this year). The count (“47 videos”, “12 images” or “59 items”) sits next to the title and follows the filters. No text under the cards.",
            "Filters at the top right: Date, Type (All, Videos, Images) and Source (All, Generated, Uploaded). When nothing matches: “Nothing matches these filters”, “Try another date, type or source.” and Clear filters.",
            "Date filter (shared by Assets, Projects, Flicks and Replace Flick): a pill showing the choice (“Last 7 days”, or a range like “Oct 3 – Oct 9”) that opens a short list: All period, Today, Last 7 days, Last 30 days and Custom range (the current one ticked). The calendar appears beside the list only after choosing Custom range (or when a custom range is already set); it closes on Done or outside.",
            "Each card: a square (1:1) tile with the media filling it; a video shows its first frame, plays on hover and carries the same length badge as the media picker (play icon and “0:08”, bottom-left; “Video” until its metadata has loaded). On hover the prompt (uploads: the file name) slides up and Download shows top-right. Size is read from the video’s metadata and shown in the viewer’s details.",
            "Click a card to open it in the viewer (below), with previous/next arrows and arrow keys across everything shown. The references a video was made from are real: each is looked up in the library (our own copy, or the model output it came from), so a variation shows the reference video and its own product photo.",
            "Delete asks first (“Delete this video? It’s removed from Assets. Flicks using it won’t be affected.”), then shows “Video deleted” (or “Image deleted”). The server marks the item hidden and keeps the file, so it stays gone from Assets and the pickers after a reload and across devices, Flicks using it keep working, and a video made from it still shows it (picture and name) under its prompt.",
            "Empty: “No videos yet”, “Every video you make and every photo or clip you add shows up here, with the prompt and references it was made from.” and Create.",
            "Server off or unreachable: “Couldn’t connect to the AI server.” with Try again, instead of the list (no sample fallback). Dev: the Assets empty switch still forces the empty state.",
            "Use in Flicks (in the viewer): starts a new chat project with that video attached as a reference (“Make a Flick from this video. Use it as it is for Variation 1.”); from an image, the image is attached as the product reference. Back returns to Assets.",
          ]}
        />
        <H>The viewer (everywhere media opens)</H>
        <P>The same full-screen viewer opens from Assets, the slides strip (full screen), uploads in the Images panel, image references in prompt boxes and the prompt history.</P>
        <UL
          items={[
            "Always dark, in either theme, so colors read true: the media on the left (videos play muted and loop; the video sits in the middle of its column and a custom player bar stays fixed at the bottom, full width: the scrubber across the top, play/pause and mute (volume on hover) on the left, the time on the right; it never fades; click the video or press Space to pause, M to mute), a details panel on the right. Previous/next arrows when there\u2019s more than one.",
            "Panel title: \u201cVideo\u201d or \u201cImage\u201d (generated videos have no name), and Close.",
            "Prompt block (generated videos): the references as thumbnails (a reference video with no poster shows its first frame), then the prompt, up to six lines with the last line fading out and See more (opens the rest in a scroll area with no scrollbar) and a Copy button (shows \u201cCopied\u201d).",
            "Details block: Source, Type, Project, Size, Length, Created for videos in Assets (size and length once the video\u2019s metadata has loaded); Type, Size, Created for other generated videos; Source, Type, Format for uploads.",
            "References open in place of the video: a Back pill at the top left (Esc also goes back), and the panel shows that reference\u2019s Source (Uploaded or Generated), Type and Format.",
            "Actions at the bottom: in Assets, Use in Flicks is the primary button (starts a new chat project with this video or image attached as a reference; Back returns to Assets), then Download and Delete as icons. Elsewhere, Download is primary; images also have Copy image (a toast explains if the browser blocks the clipboard). Videos have no copy action.",
          ]}
        />
      </>
    ),
  },
  {
    id: "account",
    title: "20. Account",
    body: (
      <>
        <P>Opened from Account in the profile menu. It holds what can change over time; what onboarding asks once (company type, size, industry, what you use Flicks for) isn\u2019t shown.</P>
        <UL
          items={[
            "Same frame as Credits and Ad Balance (title and description at the top). Each section is a card with its title and a one-line description on the left: Profile (photo, full name, email), Company (company or brand, website), and Log out (\u201cSigned in as \u2026\u201d with a Log out button; this is the only place to log out).",
            "Photo: Upload photo or Change photo, and Remove; JPG, PNG or WebP up to 5 MB (others get an error toast). Shows in the sidebar too; initials when there\u2019s none.",
            "Email is read-only: grayed with a lock and the tooltip \u201cYour sign-in email can\u2019t be changed\u201d.",
            "Edits collect until saved: a bar appears at the bottom right, \u201cYou have unsaved changes\u201d with Discard and Save changes. It stays in view while scrolling.",
            "Validation matches onboarding: fields are checked when left and on Save; the first problem is focused. Saving shows \u201cSaving\u2026\u201d, then a \u201cChanges saved\u201d toast; the new name shows in the sidebar and the Create page greeting.",
          ]}
        />
      </>
    ),
  },
  {
    id: "ads",
    title: "21. Ads",
    body: (
      <>
        <P>Campaigns hold placements. A placement is a fixed-size slot with one tag that runs in the customer\u2019s DSP; the Flick inside it can be replaced and every Flick it has held is kept. Serving is charged per 1,000 impressions (any ad that loads) from the Ad Balance, at the CPM of the country the impressions came from.</P>
        <H>Campaigns</H>
        <UL
          items={[
            "Header: the page title (or breadcrumb: Campaigns \u203a campaign \u203a placement). On the list: the Ad Balance chip (opens Ad Balance; red when negative) and New campaign.",
            "Banners: before any funds, \u201cAdd at least $100 to your Ad Balance to get your tags and start serving.\u201d with Add funds; when negative, \u201cYour Ad Balance is \u2212$42.50. Your ads keep running; your next top-up settles this first.\u201d",
            "List: a table of campaigns with placements, impressions, spend and created date. Empty: \u201cNo campaigns yet\u201d with New campaign.",
            "Campaign: New placement and \u22ef (Rename, Delete campaign; confirms, its tags stop serving) at the top right, in place of the Ad Balance chip. Then placements, impressions and spend, and the placement cards: the Flick (square), size, status (Serving, Waiting for funds, No Flick), impressions and spend.",
          ]}
        />
        <H>Placements</H>
        <UL
          items={[
            "New placement asks only for the campaign (when made from the editor; or New campaign), a name and the size (all sizes; can\u2019t change later). From the editor\u2019s Serve in ads, the size is the Flick\u2019s and the Flick goes straight in.",
            "A new, empty placement shows one step: \u201cAdd a Flick to this placement\u201d, \u201cPick a Flick in {size}. Then you\u2019ll get the tag to run in your DSP.\u201d and Choose a Flick. Nothing else shows until it has a Flick.",
            "Header: the breadcrumb ending in the placement\u2019s name with its locked size badge (\u201cFixed when the placement was made\u201d), and on the right \u201cCreated {date}\u201d, the status (Serving, Waiting for funds, No Flick) and \u22ef (Rename, Delete placement; confirms). No Ad Balance chip and no details card.",
            "With a Flick: impressions, spend, average CPM and CTR (clicks \u00f7 impressions) across the top (four in a row on wide screens, two by two below). Below, the Flick and its History on the left, and the tag generator on the right; under 1280px wide they stack (Flick, History, then the tag). History rows show their numbers in columns when the list is wide enough, otherwise under the name.",
            "Flick card: the live Flick\u2019s name (opens its Flick page) and \u201cLive since\u201d, Replace and Remix (\u201cStart a new project from this Flick\u201d; Flicks can\u2019t be edited), and the Flick playing as viewers get it.",
            "Tag generator (\u201cCopy it into your ad platform. It stays the same when you replace the Flick.\u201d): the ad platform (The Trade Desk, DV360, Campaign Manager 360, Google Ad Manager, Amazon DSP, Microsoft Invest (Xandr), Yahoo DSP, StackAdapt, or Other, which asks for the platform\u2019s name), the format (VAST 4.2, SIMID, MRAID 3.0; all offered for every size), the tag in a fixed-height code box that scrolls when it\u2019s longer, and \u201cCopy {format} tag\u201d (\u201cCopied\u201d after). Tags carry the platform\u2019s click and cache-busting macros where known, otherwise [CLICK_URL] and [CACHEBUSTER]. The tag never changes when the Flick does.",
            "Ad Balance at $0 or below (or never funded): no tag is shown at all. In place of the code and the copy button: a lock with \u201cAdd funds to your Ad Balance to get your tag.\u201d ($0) or \u201cYour Ad Balance is \u2212$X. Add funds to get your tag.\u201d (negative, in red), and Add funds. The platform and format can still be set.",
            "Learn more about running ads (under the tag): Run your tag in a DSP, Choose a tag format, How Ad Balance is charged. Placeholders until the docs exist.",
            "History: every Flick it has held, newest first, with dates, impressions, spend, average CPM and CTR (on phones, under the name). Clicking a row\u2019s thumbnail opens the Flick playing with Back and Restore this Flick. The live row is marked Live. Restore (confirms) shows once per Flick, on its newest row, and never for the Flick that\u2019s live; restoring adds a new row, so older rows of the same Flick show no Restore.",
            "Replace Flick (Add a Flick when empty): a large picker for hundreds of Flicks, with search by name, a created-date filter (the shared date filter, see Assets), square tiles (name, created date; the live one marked Live), a Preview button on each tile (on hover) that opens the Flick in its own window, playing as viewers get it (its videos at its size and the thumbnail strip to tap), with Back (returns to the list) and Replace with this Flick / Add this Flick (off for the live one), \u201cN of M Flicks\u201d, and Replace / Add Flick. Only Flicks (never projects) of the placement\u2019s size are listed.",
          ]}
        />
        <H>Ad Balance</H>
        <UL
          items={[
            "In dollars, separate from credits. Opened from the Ad Balance chip on Campaigns or Ad Balance in the profile menu. Same frame as Credits (title and description). Two cards: Balance (big, with its status: start serving, serving, running low, negative in red; and Add funds) and Your CPM (the rate where you\u2019re signed in from, with See all rates). Then Spend by day beside Invoices.",
            "Your CPM: the rate for the country you\u2019re signed in from (production: IP country at sign-in; prototype: device time zone), with See all rates (the rate card, your country highlighted).",
            "Add funds: amount from $100 to $10,000 with quick picks ($100, $500, $1,000, $5,000), no discounts and no auto-reload. Shows what\u2019s owed being settled first and the new balance. Errors: under $100, over $10,000, declined card. Success toast: \u201c$500.00 added to your Ad Balance\u201d.",
            "Placements start serving once funds have been added (the first top-up is at least $100). After that they keep serving with no limit: the balance can go negative, and the next top-up settles it first.",
            "Charging: each 1,000 impressions is charged at the CPM of the country they came from.",
            "Spend by day (a card): grouped by day (Today, Yesterday, then the date), each day with its impressions and spend, then a row per placement (\u201cCampaign \u203a Placement\u201d, impressions, spend; opens Campaigns), biggest first. The total for the period sits on the left; on the right the shared date filter and Export CSV (Date, Campaign, Placement, Placement ID, Impressions, Spend (USD), one row per placement per day, for the filtered period). 7 days at a time with Show more days. Empty: \u201cNo spend yet\u201d with no filter; \u201cNo spend in this period. Try another date.\u201d with Clear filters when a date is set.",
            "Invoices (a card, the same as on Credits): every top-up (Funds added, date, amount) with Download invoice (its number, like FLM-AD-1003, is on the invoice) (an invoice from Flam to the signed-in email: Ad Balance funds, total paid, paid by card).",
          ]}
        />
        <Table
          head={["Sample CPM", "Countries"]}
          rows={[
            ["$12.00", "United States"],
            ["$10.00", "United Kingdom"],
            ["$9.00", "Canada, Australia, Japan"],
            ["$8.00", "Germany"],
            ["$7.00", "France, United Arab Emirates, Singapore"],
            ["$3.00", "Malaysia; all other countries"],
            ["$2.50", "India, Thailand"],
            ["$2.00", "Indonesia, Philippines, Vietnam"],
          ]}
        />
      </>
    ),
  },
  {
    id: "embeds",
    title: "22. Embeds",
    body: (
      <>
        <P>Embeds work like placements without the charges: a fixed-size spot on a website or app with one code snippet. The Flick in it can be replaced any time and the site shows the new one from the next view; the code never changes. Under Manage in the sidebar.</P>
        <UL
          items={[
            "List: title, \u201cCreate an embed to show Flick on your website. You can replace the Flick in embed any time.\u201d, New embed; cards with the Flick (square), size, name, the Flick\u2019s name and views. Empty: \u201cNo embeds yet\u201d with New embed.",
            "New embed: name and size (can\u2019t change later; locked to the Flick\u2019s size when made from a Flick page).",
            "A new, empty embed: \u201cAdd a Flick to this embed\u201d, \u201cPick a Flick in {size}. Then you\u2019ll get the code for your website or app.\u201d and Choose a Flick.",
            "Header: breadcrumb (Embeds \u203a name) with the locked size; Created date and \u22ef (Rename, Delete embed; confirms, its code stops working).",
            "Numbers: views, clicks, CTR. Left: the Flick (name opens its page; Live since), Replace (the same picker as placements) and Remix, and the Flick playing. History: every Flick it has held with dates, views, clicks and CTR; the thumbnail opens a preview; Live, and Restore (once per Flick, never the live one).",
            "Right: Code, with Where (Website, iOS, Android), the snippet in a fixed-height box that scrolls, and Copy code. Then Learn more about embeds (placeholders until the docs exist).",
          ]}
        />
      </>
    ),
  },
  {
    id: "onboarding",
    title: "23. Onboarding",
    body: (
      <>
        <P>New users learn in place: a short tour in the editor, one-time tips at tricky moments, and a Help Center with a sample project. Only new users see them: a returning user (the default) has seen everything. All of it can be skipped; the tour and the sample come back from the Help Center.</P>
        <H>Sample project</H>
        <P>\u201cSample: Sport lens switch\u201d (1080\u00d71920): a reference video, three colorways named Gold, Sapphire and White with thumbnails, a heading, a price from the price feed, a Shop now button whose link comes from the shop-link feed, and the strip. Opened from the Help Center; it saves to Projects like any other.</P>
        <H>Search and keys</H>
        <UL
          items={[
            "\u2318K (Ctrl K), or Search at the top of the sidebar, opens one search box for everything: actions (New video, Switch to light or dark, How Flicks work, Help Center), every page, and projects and Flicks by name (the 4 latest of each until something is typed). Enter opens the highlighted one.",
            "N starts a new video from anywhere outside a text box (Create, with the box focused).",
          ]}
        />
        <H>Feel</H>
        <UL
          items={[
            "Pages switch instantly (after their short loading skeleton); new chat messages and prompts ease in. All motion stops when the device asks for less motion.",
            "The AI shows \u201cThinking\u2026\u201d (or what it\u2019s doing) with a soft shimmer; its replies fade in a paragraph at a time.",
            "Buttons press in slightly when clicked (not the sidebar navigation or search). Pictures fade in as they load, over a muted frame.",
            "Light, Dark or Auto (the default: follows the system) is remembered in the browser, applied before the page shows, and switching it cross-fades the page. The browser tab names the page: \u201cProjects \u00b7 Flicks\u201d, the project or Flick name in the editor and on a Flick page, plain \u201cFlicks\u201d on Create.",
            "Empty lists show a small drawing, one line and one action. Highlighted text and the text cursor use the brand orange.",
            "Color: surfaces are warm stone: a warm-white page on a stone shell, with white cards and popovers that lift off the page; dark mode uses the same warm hue. Buttons are neutral (near-black in light mode, near-white in dark). The brand orange marks only what\u2019s selected, in progress, AI or the brand itself. One filled button per screen; everything else is outline or ghost.",
            "Dark mode is a soft charcoal in steps: the sidebar darkest, then the page, then cards and menus. In the editor the panels sit on the page color and the workspace behind the canvas is a step deeper.",
            "Every page has the same header: a small trail back when it\u2019s a detail page, the title (with a count or size beside it), its actions on the right, then one row of search and filters. Lists show \u22ef on every card; rows and cards share one hover.",
            "Numbers and dates read the same everywhere: 9,500 · 656K · 1.2M, $4,212.00, 2.4%, Oct 21 (the year only when it isn\u2019t this year), and 5m / 3h ago.",
          ]}
        />
        <H>How Flicks work</H>
        <UL
          items={[
            "A feature intro popup on Create, shown once to new users right after workspace setup (the welcome gift follows it), and any time from \u201c? How Flicks work\u201d under the prompt box, or from search (\u2318K).",
            "Four steps, each with a short scene built from the escalator Flick (real clips and stills) above the copy: Start with one video (a prompt types, three reference images drop in, Generate, and the video plays); Create variations (Streetwear, Office and Tennis slide out of the Original: same motion, new person and outfit); Export as one Flick (they fly into one Flick with its thumbnail rail; a tap switches who is in it, instantly); Run it anywhere (the Flick branches to Ads, Website and Link, playing inside each).",
            "Progress bars that also jump to a step, Skip (first step) or Back, Next, and Start creating at the end. Each step stays 8 to 10 seconds; it plays on its own until the viewer clicks. Esc or the close button dismisses it. Reduced motion: scenes show their end state.",
          ]}
        />
        <H>Welcome gift</H>
        <UL
          items={[
            "Once per account, as a popup card on Create right after How Flicks work closes. New accounts start at 0 until it\u2019s claimed.",
            "The top is the gift itself: a full-bleed orange panel with the Flicks logo, a big 1,000 that sharpens into focus out of a soft blur, character by character, then glows once, \u201ccredits\u201d, a breathing glow, a slow sheen and sparkles drifting up.",
            "Below: \u201c{Name}, your first 1,000 credits are on us\u201d, \u201cThat\u2019s about 20 videos. Go make something great.\u201d and one button, Claim and start creating.",
            "One step: the button\u2019s label turns into a tick with \u201cCredits added\u201d, then it closes into Create (about a second) and shows the welcome toast.",
            "Closing it without claiming still adds the credits: it\u2019s free. Reduced motion: no float, confetti or count-up.",
          ]}
        />
        <H>Editor tour</H>
        <UL
          items={[
            "Starts once, the first time a project\u2019s video is ready (or from the Help Center); never while the chat is still planning or in Preview. Switching to Preview ends it, and leaving the editor closes it (a tour left half way counts as seen), so it never follows into another project. The page dims, with a soft cut-out around what each stop is about; the cut-out and card glide from stop to stop.",
            "Each card: a small looping illustration made from the escalator Flick\u2019s stills, a title, one line, step dots, Skip, Back and Next (Done on the last). Esc skips.",
            "1 Your reference video (the canvas): every variation is made from it; change it and they need regenerating. 2 Add variations (the strip and the chat): add one in the strip, describe it in the chat, it generates in the strip. 3 Design once (Text, Images, Buttons and Layouts, lit as one rectangle): what you add shows on every variation. 4 Preview, then export (the Design/Preview switch and Export, lit as one rectangle): an exported Flick can\u2019t be changed; to make edits, export again.",
          ]}
        />
        <H>One-time tips</H>
        <UL
          items={[
            "Shown once each, by the thing they\u2019re about (beside it, so it isn\u2019t covered), with Got it; never over the tour.",
            "Feeds: the first time text, a button or a layout is added, by its { } tab: \u201cDifferent content for each variation\u201d, with an illustration of a price changing per variation.",
            "Needs regenerating: by the red dot after the reference changes, with an illustration of the reference changing and its variation regenerating.",
            "Thumbnails: the first time the thumbnail strip is selected: \u201cThumbnails\u201d, with an illustration: the thumbnails start empty; picking one shows its variation and the strip toolbar, and Add thumbnail fills it (twice, one per variation).",
          ]}
        />
        <H>Help Center</H>
        <UL
          items={[
            "Opened from the account menu (Help Center), in a new tab. Its own page: search, Open Flicks, and guides grouped Basics, Editor, Share, Ads, Account.",
            "Home: How can we help? with search; Open the sample project and Take the editor tour (each opens Flicks in a new tab, ready); a card per guide with its first screen and step count.",
            "19 guides: Make your first video, Start from a template, Start from Assets, Create variations, Choose where the Flick starts, Add text, images and buttons, Link a button, Dynamic content with feeds, Thumbnails, Preview, Version history, Export a Flick, Change a Flick with Remix, Share a link, Embed on your site or app, Campaigns and placements, Get an ad tag, Ad Balance, Credits.",
            "Each guide: a walkthrough of real screens. It plays on its own: what to click is outlined in the primary color (the rest dims slightly), a cursor glides to it and clicks it, zooming in a little, then the next screen shows what happened. Pause, step back and forward, or pick a step from the numbered list beside it. Arrow keys and Space work when it has focus. Reduced motion: it starts paused.",
            "Below: Good to know (tips), Try it (opens Flicks in a new tab: the sample project, the tour, or Create), Related guides, and Previous / Next.",
            "Search matches titles first, then summaries, tips and steps.",
          ]}
        />
      </>
    ),
  },
  {
    id: "analytics",
    title: "24. Analytics",
    body: (
      <>
        <P>
          Analytics shows how Flicks perform across their link, embeds and ads. Every number is a sum of three player events: an <B>impression</B> (one
          per session, shown as a view everywhere, ads included), an <B>interaction</B> (a switch between variations or a click, tagged with the
          variation) and a <B>heartbeat</B> every 2 seconds while it plays (watch time). Events carry the Flick, campaign, placement or embed, template
          and country. Numbers refresh every 5 minutes; the page shows when they were last updated.
        </P>
        <Table
          head={["Page", "What it shows", "Filters"]}
          rows={[
            ["Overview", "Tiles and chart for everything, By source (hollow pie), Top countries, then the Flicks list (top 10, See all for the rest)", "Period, country, source"],
            ["Campaigns", "Tiles with Spend, and the Campaigns list; each campaign expands to its top 5 placements", "Period, country"],
            ["Embeds", "Tiles and the Embeds list", "Period, country"],
            ["A Flick", "Tiles, Variations, Distribution (its link, each embed and placement, with a type badge and Live), Top countries", "Period, country"],
            ["A campaign", "Tiles with Spend, Placements, Top countries; Flicks and variations are on each placement", "Period, country"],
            ["A placement or embed", "Tiles (Spend on placements), every Flick it has run, newest first, Variations, Top countries; opened from a Flick, only that Flick, with a chip to clear it", "Period, country"],
          ]}
        />
        <UL
          items={[
            "One vocabulary and one tile strip everywhere: Views, Interactions (switches plus clicks), Clicks and Avg watch time, always in that order; ad pages add Spend. Each tile has its own color from the chart palette (Views blue, Interactions orange, Clicks green, Avg watch time amber, Spend pink): a dot by its label, and a tint and top bar when chosen; the chart draws in the chosen tile\u2019s color. Each tile has an info tooltip with its definition and one useful detail under the number: views a day (an hour for one day), interactions per view, clicks as a share of views, total watch time, and CPM. Impressions is said only inside CPM.",
            "Period: the app\u2019s date filter (All period, Today, Last 7 days, Last 30 days, or a custom range). Analytics opens on Last 7 days; Full analytics from a Flick, campaign, placement or embed opens on All period, so the numbers match that page. All period charts from the first day with numbers. One day charts by hour, longer periods by day. No comparison with an earlier period.",
            "Breadcrumbs on every detail page (for example Campaigns › Holiday 2026 › Camera bundle MREC), each one clickable, plus a back arrow.",
            "Compare: each tile chooses the chart. Up to 5 things go on the chart at once, from a row (its chart icon shows on hover; once added it shows its color) or from Compare above the chart, a searchable picker of every Flick, campaign, placement and embed with views here. Added items show as chips with a remove button and Clear; a line under the chart gives each one\u2019s number for the chosen tile. The chart can show as a table.",
            "Lists hold hundreds of rows: search by name, filters (Flicks: runs in and size; campaigns: status; placements and embeds: status Live, Ended or No Flick, and size), Hide no views (on by default), sort by any column, 25 a page with \u201c1\u201325 of 248\u201d. The name column stays put while numbers scroll on small screens.",
            "Variations: per variation, views (sessions that saw it), interactions (switches to it plus clicks on it), clicks, click rate and average watch time, each column header with a tooltip; the best click rate is marked as a clear lead, likely or too early.",
            "Spend shows only on ad pages (Campaigns, a campaign, a placement): each impression is charged at its country\u2019s CPM. Large amounts shorten in tiles and tables ($188K, $1.2M); under $10,000 shows in full.",
            "Top countries: the five with the most views, as a share of the total, whatever the country filter, so the split stays visible. Only countries with views count; Show all lists them all with search. Click a country to filter by it (click again to clear); the selected one is highlighted, the rest fade, and if it is outside the top 5 it is pinned below them with its rank. The line under the title reads, for example, \u201cJapan: 4% of views, #9 of 42 countries\u201d.",
            "Export CSV exports the page\u2019s main list with its search and filters, every page of it.",
            "Early numbers note under 100 views in the period; an empty state until a Flick has been shared.",
          ]}
        />
      </>
    ),
  },
  {
    id: "emails",
    title: "25. Emails",
    body: (
      <>
        <P>
          Flicks sends 25 emails: 10 for launch (P0), 6 soon after (P1) and 9 later (P2). Sign-in is a magic link (Google sends nothing), so there are
          no password emails; there are no teams, so no invites. Each email has an HTML part and a plain-text part, and is built for Gmail, Apple Mail,
          Outlook and Yahoo: 600px wide and fluid, one column on phones, full-width 48px buttons, light and dark mode, and mostly text.
        </P>
        <Table
          head={["Stream", "Emails", "Opt-out"]}
          rows={[
            ["Transactional", "Sign-in link, welcome, generation and export failures, receipts, auto-reload failed, Ad Balance low and below zero", "Always sent"],
            ["Notification", "Video and Flick ready, onboarding nudges, credits low, ad live, tag not serving, embed live, insights", "Turned off in email preferences"],
            ["Marketing", "We miss you, product updates", "Opt-in; unsubscribe link and one-click unsubscribe header"],
          ]}
        />
        <UL
          items={[
            "Sign-in link: works once, expires in 15 minutes, shows the link as text too, and has no tracking.",
            "Generation emails only go out when the user has left the editor; otherwise they see it on screen.",
            "Ad Balance emails say ads keep running; below zero, the next top-up settles what is owed first.",
            "Footer: why they got it, Help Center, email preferences (not on transactional), unsubscribe (marketing), and Flicks by Flam with the postal address.",
            "Subjects in sentence case, under 50 characters, no \u201cfree\u201d, all caps or exclamation marks.",
            "Sending: SPF, DKIM and DMARC; transactional and marketing from separate subdomains; From \u201cFlicks\u201d with a reply-to someone reads.",
          ]}
        />
      </>
    ),
  },
  {
    id: "writing",
    title: "26. Writing and interaction principles",
    body: (
      <UL
        items={[
          "Short, plain copy. One idea per line. No repeated headings.",
          "Primary color only for the main action on a surface (Generate, Export, Remix). Everything else is secondary or ghost.",
          "Icon-only controls always carry a tooltip with their label.",
          "Deleting something that is only yours (a project, from Projects or the editor; a saved element; a video in Assets) happens at once with Undo in the toast. Deleting or replacing something that is live somewhere (a Flick, a placement, an embed, a campaign, the Flick in a live placement) confirms first, with the name in the title and what stops working in one line. Toast titles name the thing: \u201c\u2018Holiday 2026\u2019 deleted\u201d.",
          "Snapping and locks always have an escape: Alt turns snapping off, Shift locks fully.",
          "Nothing should flicker: snaps and locks use hysteresis; outlines and radii update in the same frame as the change.",
          "Preset rules (checked by scripts/check-ui.sh): black, white and token opacities only on the ladder 10, 20, 30, 50, 70, 90; keyboard focus on custom controls is the one focus-ring utility (ring-3 ring-ring/30, the same as Button and Input), menu-style rows use focus-visible:bg-muted instead; status and count chips are Badge subtle (never a hand-made span); floating panels on bg-popover are rounded-2xl, panels and sections rounded-2xl, media tiles rounded-xl, thumbnails at or under 48px rounded-lg, tiny swatches rounded-sm or rounded-md; Buttons use their preset sizes (lg, default, sm, xs) with no h-* override; icons inside Buttons take the preset size (size-4, size-3 in icon-xs); strokeWidth is the default, 2 for emphasis, 3 only on tick marks under 16px; section headings are h2 text-sm font-medium and pages have one h1 through PageHeader; rows hover with bg-muted, already tinted surfaces with bg-muted/50; disabled is opacity-50 (the Start button keeps its own flat look); snap guides use the --guide token; scrims are black at 20% or 50%.",
        ]}
      />
    ),
  },
  {
    id: "open",
    title: "27. Open questions and next",
    body: (
      <UL
        items={[
          "Ads: real CPM rate card; payments; approving \u201cOther\u201d ad platforms; reporting by day.",
          "Analytics: watch time per variation from heartbeats, and whether to add a play event, video position on switches, from/to variation and user agent (for a funnel, switch moments, a switch matrix and devices).",
          "Real model-based naming from the prompt (currently a stand-in).",
          "Eyedropper sampling the video frame where the browser has no native eyedropper.",
          "Scrubbing the canvas video to a chosen frame (removed for now, play/pause only).",
          "Snapping for single thumbnails in a free strip.",
        ]}
      />
    ),
  },
  {
    id: "dev",
    title: "28. Dev tools",
    body: (
      <UL
        items={[
          <>
            <B>The pill:</B> one small DEV pill floats on every screen (sign-in, onboarding, the app, the editor); drag its grip to move it, double-click the grip to put it back. Two dots show whether Sample videos and Managed agent are on; a flash shows when the screen has a shortcut. Click the pill, or press ⌘., for the menu.
          </>,
          <>
            <B>The menu:</B> Switches (Sample videos, off by default: on, videos come back as sample clips, nothing is generated and exports use the prototype timer; Managed agent (on by default): new chats run through the agent on the AI side; off, the browser runs the chat loop itself; Page load time: pages show their skeletons for a moment), This screen (the shortcuts the screen offers, such as opening the emailed sign-in link or resetting onboarding), and Open: State, AI, Docs. The footer shows today’s chat replies, images and videos against the server’s caps.
          </>,
          <>
            <B>State:</B> the UI states by tab (Account, Credits, History, Create, Flicks, Ads), with New user and Reset all. <B>AI:</B> Connection (server address, passcode, model, the managed agent’s setup and skills), Requests (every job sent to the media server, and every Flick baked on the Flicks API; Test connection says whether the Flicks API key is set), Chat metrics (how far each chat got and what it cost) and Library (the server’s saved work). <B>Docs:</B> the PRD, the Components gallery and the Emails.
          </>,
          <>
            <B>Where:</B> dev tools are in every build except captures; they never ship with a production build.
          </>,
          <>
            <B>Checks:</B> scripts/check-ui.sh keeps classes on the preset (static, quick); scripts/check-contrast.sh measures every page’s text against its background in light and dark (WCAG 4.5:1, 3:1 for large text) on the deployed site, to run after any token change. Page load time is off by default.
          </>,
        ]}
      />
    ),
  },
]

/** In-app product requirements document. */
export function PrdPanel() {
  const [current, setCurrent] = useState(SECTIONS[0].id)
  const scroller = useRef<HTMLDivElement>(null)
  // highlight the section in view
  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const top = el.getBoundingClientRect().top + 24
    let id = SECTIONS[0].id
    for (const s of SECTIONS) {
      const node = el.querySelector(`#prd-${s.id}`)
      if (node && node.getBoundingClientRect().top <= top) id = s.id
    }
    setCurrent(id)
  }

  return (
    <div className="flex h-full min-h-0 w-full">
        <aside className="flex w-60 shrink-0 flex-col border-r bg-muted/40 p-3">
          <div className="flex flex-col gap-1 px-2 pb-3 pt-1 text-left">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              PRD
            </h3>
            <p className="text-xs">Flicks Create · updated {PRD_UPDATED}</p>
          </div>
          <nav aria-label="Sections" className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
            {SECTIONS.map((s) => (
              <Button
                key={s.id}
                variant="ghost"
                aria-current={current === s.id}
                onClick={() => scroller.current?.querySelector(`#prd-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className={cn("h-8 justify-start rounded-lg px-2 font-normal text-muted-foreground", current === s.id && "bg-background font-medium text-foreground shadow-sm hover:bg-background")}
              >
                <span className="truncate">{s.title}</span>
              </Button>
            ))}
          </nav>
        </aside>
        <div ref={scroller} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
          <article className="mx-auto flex max-w-3xl flex-col gap-10 px-8 py-8">
            <header className="flex flex-col gap-1">
              <h2 className="text-2xl font-medium tracking-tight">Flicks Create</h2>
              <p className="text-sm text-muted-foreground">Product requirements · updated {PRD_UPDATED}</p>
            </header>
            {SECTIONS.map((s) => (
              <section key={s.id} id={`prd-${s.id}`} className="flex scroll-mt-6 flex-col gap-3">
                <h3 className="text-lg font-medium">{s.title}</h3>
                {s.body}
              </section>
            ))}
          </article>
        </div>
      </div>
  )
}
