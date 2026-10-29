import { useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DevBadge } from "@/dev/state-manager"
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
          ["Brand marketer", "Launch a product with a few colourways or models in one ad; quick turnaround; clear cost per video."],
          ["Agency designer", "Precise layout control, reusable templates, brand fonts and colours, many sizes."],
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
          ["Reference video", "The first video, generated from the prompt. Variations are made from it. Shown to viewers only if included as a variation."],
          ["Variation", "One of 2 to 5 videos made from the reference video with its own prompt. Viewers switch between variations."],
          ["Starting variation", "The variation a viewer sees first. In the UI: \u201cStart the Flick here\u201d a solid play button on its thumbnail (\u201cThe Flick starts here\u201d)."],
          ["Element", "Anything placed on the canvas: text, button, icon button, image, thumbnail strip. Elements are shared by all variations."],
          ["Thumbnail strip", "The row (or column, or free arrangement) of thumbnails viewers tap to switch variation. Always present, cannot be deleted."],
          ["Feed", "A named value (text or link) that each variation sets for itself, e.g. price or shop-link. Made from the { } tab on text, a button or its link."],
          ["Template", "A ready-made Flick (built-in) or a saved copy of a user's project (Your templates)."],
          ["Version", "A checkpoint of a project, saved a few seconds after changes settle; exports are marked. Can be named and restored."],
          ["Placement", "A fixed-size slot in a campaign with one tag (VAST 4.2, SIMID, MRAID 3.0). Holds one Flick of its size at a time; replacing it keeps the tag."],
          ["Embed", "A fixed-size spot on a website or app with one code snippet (Website, iOS, Android). Holds one Flick of its size at a time; replacing it keeps the code. Free."],
          ["Ad Balance", "Dollars that pay for impressions, per 1,000 at each country\u2019s CPM. Separate from credits."],
          ["Credits", "Spent on video generation. A video\u2019s cost depends on its size and length (see Prompt composer)."],
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
              <B>Sidebar:</B> the Flicks logo (goes to Create, the home page), Create, Projects, Flicks, Assets; Manage: Campaigns, Analytics; and the credits balance with Get credits.
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
              <B>Loading everywhere else:</B> anything that would fetch shows a skeleton for the same moment: the workspace setup form (progress, title, fields and Continue) before it appears; the editor while a project opens (rail, canvas, strip and prompts); the templates on Create (on arrival and when filtered); searching or filtering Projects, Flicks and Assets; changing Analytics\u2019 tab, period, country, source or what\u2019s open (a chart and lists); Usage history filters and pages; the editor\u2019s Images, Layouts and Feeds panels and the image picker; Version history; CPM rates; the Flick picker for a placement; embeds in Add to embed. Buttons that save, create, delete, restore or add show a spinner in place of their label (same width, disabled) before they act. All of it follows Page load time; 0 turns it off.
            </>,
            <>
              <B>Account menu:</B> Account, Credits, Ad Balance, Help Center (opens in a new tab), Theme (light, dark, system), Log out.
            </>,
            <>
              <B>Notifications:</B> stacked toasts at the top centre. Newest in front, older ones peek behind; hover to spread them out. Each closes after 5
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
            "A text box: “Describe the video you want to create”.",
            "Image references: add images and tag each as Packshot or product photo, Character (model or mascot), or Background or setting. Uploads show progress. No limit: the row scrolls sideways when full (no scrollbar; trackpad, mouse wheel or shift-scroll).",
            "Upload problems (same in every prompt box and in the image uploader): only JPG, PNG, WebP or GIF up to 20 MB are taken. Anything else is not added and a toast says why (\u201cbrief.pdf can\u2019t be uploaded \u00b7 Use JPG, PNG, WebP or GIF images.\u201d or \u201csofa.png is too large \u00b7 Images can be up to 20 MB.\u201d).",
            "An upload that fails stays in place, greyed with a red tint and a retry button in the middle (\u201cCouldn\u2019t upload. Click to retry.\u201d), with \u00d7 to remove. A toast (\u201cCouldn\u2019t upload sofa.png\u201d, or \u201c3 images didn\u2019t upload\u201d for a batch) has Retry / Retry all. In a prompt box a red line under the images repeats it with Retry, and Generate waits until they\u2019re retried or removed. A failed upload can\u2019t be added to the canvas.",
            "Size picker: Display (250×250, 300×250, 336×280, 320×480, 480×320, 300×600), Social (1080×1080, 1080×1920) and Video (1920×1080).",
            "Length picker, left of Size: \u201cLength 8s\u201d opens Video length with 6, 8, 10, 12 and 15 seconds (default 8). The length carries into the editor, shown in the size badge (\u201c1080×1920 · 8s\u201d). Credits per video don\u2019t change with length.",
            "Generate shows the video\u2019s credit cost in a small badge once there\u2019s a prompt (or a template); an empty box shows just Generate. Cost depends on size and length: display ad sizes (250×250 to 300×600) cost 7, 9, 11, 13 or 16 credits for 6, 8, 10, 12 or 15 seconds; social and video sizes (1080×1080, 1080×1920, 1920×1080) cost 36, 48, 59, 71 or 89. Changing size or length updates it live. Without enough credits, Get credits opens instead.",
            "In this prototype a video generates in about a second (real generation takes longer).",
            "Generating opens the editor straight away with the reference video generating. Until that first video is ready, only the prompts panel, the left rail and the canvas show; the slides strip appears once it's ready.",
            "With the chat on (off by default; templates always open ready-made), the button says Start instead of Generate and shows no cost: nothing is charged until the plan is approved.",
          ]}
        />
        <H>Plan with the chat</H>
        <UL
          items={[
            "Start opens a planning view, not the editor: the chat in a wide centred column on the left and a live preview of the Flick on the right. No editor tools show until the build (no rail, strip, Design/Preview or Export). The header shows the steps Idea, Look, Plan, Build: done steps have a tick, the current one is dark.",
            "Websites: when the prompt or a message has a web address (a product page, a brand\u2019s site), the chat reads it first, through the app\u2019s server; the user never leaves the app. A card shows \u201cReading lumen.co\u2026\u201d with placeholders, then the page title, site, price and the images it found (up to 8). It uses the page\u2019s real product names, prices, colours, links and brand colour, sees the first images, keeps all of them as project images (so it skips asking for photos and sets them as thumbnails), and says so if a site blocks it.",
            "Idea: up to two short questions with tappable answers (what changes between variations, where it runs), and a card asking for product photos or a logo (drop zone, Add images or Skip). The prompt and any images added on Create are the first message.",
            "Look: visual questions. Layout answers are small Flick previews (headline, price, button and thumbnail strip on a sample frame); palette answers are colour swatches. Picking one updates the live preview straight away. A brand card then shows the colours, font and tone.",
            "Plan: an outline like Gamma\u2019s, edited in place with no visible fields until hovered: project name, the reference video prompt (R), then numbered variations, each with a name, price, prompt and link; remove (\u00d7 on hover) down to two, Add variation up to five; headline and button text. A bar at the bottom shows the number of videos and the credits, and Generate all. The preview follows every edit and flips through the variations (tabs underneath pick one).",
            "Answered questions shrink to the question and the answer, with a tick; a used image card shrinks to its images or \u201cSkipped\u201d; an approved plan shrinks to one line (name, number of variations) that opens to read. Nothing disabled stays on screen.",
            "Build: Generate all charges every video, starts the reference video, queues the variations right after it, and opens the editor with the chat on the right. The design is placed from the plan and the chosen look: label, headline, price and button stacked at the top, centre or bottom; label, price and link as feeds filled per variation (the reference video shows the first variation\u2019s); and the thumbnail strip with its position (bottom, top, left or right), shape (square, rounded, circle), size and highlight colour. A Building your Flick card ticks off the reference video, the variations, the design and the thumbnail images.",
            "Thumbnails: the chat sets one per variation, from the user\u2019s photos or a generated image (\u201cMaking an image\u2026\u201d, then \u201cThumbnail for Gold, Added to the Flick\u201d). Images also land in the Images panel.",
            "After that, the chat makes changes on request: headline, subheading, button text, colours, button style, font, thumbnails; a variation\u2019s name, label, price, link or prompt (regenerating it); or a new variation. Each change shows a one-line note with a tick. A switch above the message box offers Chat or Prompt a video (the per-video prompt box).",
            "Feeds with the chat: it sees every feed (including ones the user or a template made), what uses it (headline, button text, button link\u2026) and each video\u2019s value. The plan can give each variation its own headline, subheading or button text as well as label, price and link; whatever differs becomes a feed named plainly (headline, subheading, label, price, button, link) and linked to its element, and the plan card shows a box per variation for it. On request it makes any text differ per variation (adding a label or price line if the design has none), changes one variation\u2019s value, makes text one value again (removing the feed) or renames a feed.",
            "It never silently does nothing: asking to change text that differs per variation says so and offers to set each value or make it one. A variation added later gets a value for every feed (copied from the first variation when not given, and said so). After each change the chat is told about empty values viewers would see (\u201cprice is empty on Black\u201d) and fills them. The text stack re-spaces for its longest values, so wrapped lines never overlap and it stays clear of the thumbnail strip.",
            "The chat streams its replies; Stop ends a reply. A failed reply shows an error with Retry. A header badge says Claude (live) or Demo (scripted).",
            "In this prototype: with an AI server connected, Claude plans and designs and Higgsfield makes the images; videos are always simulated. Without one, a scripted demo follows the same steps with sample images and understands a few edits (button text, headline, button colour, add a variation). The chat isn\u2019t kept when leaving the project.",
          ]}
        />
        <H>Templates</H>
        <UL
          items={[
            "“Start with templates” gallery below the composer, filterable by industry and size. Square (1:1) cards, 4 to a row on wide screens (3 on medium, 2 on small). 13 sample templates cover every size and nine industries (Home & living, Travel, Fashion, Footwear, Luxury, Sports & fitness, Electronics, Retail, Food & beverage); using one opens the editor with the matching product\u2019s sample videos.",
            "Brand templates come first: GAP (Fashion, 1:1), Diageo, Little Caesars, General Mills (Food & beverage, 1:1) and Modelo (Food & beverage, 9:16). Each is a complete project from real campaign videos: three products with the reference video included in the Flick, product thumbnails in the strip, the brand’s logo, colours and closest editor fonts, and five feeds per product (title, subtitle, price, cta, cta-link) holding real names, prices and links. Alcohol templates carry “Please drink responsibly.”",
            "Your templates (saved by the user) appear first and have their own filter option.",
            "Empty states: no templates yet; no templates match these filters (with Clear filters).",
          ]}
        />
        <H>Template page</H>
        <UL
          items={[
            "Try it: in place of a still thumbnail, a live Flick at the template's size (on a grey stage, as large as fits): its videos, headline and button, and the thumbnail strip. Tapping a thumbnail switches the video; on its own it moves to the next every few seconds (a thin bar shows when), pausing for a while after a tap. Below: \u201cTap a thumbnail to switch the video.\u201d",
            "Beside it: title, description, industry and size badges, and Use template. No variation tags, prompt or what\u2019s-included list. More templates below.",
            "Use template opens the editor with everything generated: the reference video plus 3 variations, with the template's headline and call to action placed. The reference video of a built-in template is fixed (no prompt box). A saved template or a brand template opens exactly as it was built, at its videos’ length, and stays fully editable.",
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
            ["Prompts panel", "Far right, after the canvas: a shade darker with a thicker left edge, resizable from that edge (drag left to widen, double-click resets). Generation history as a chat, with the prompt box at the bottom."],
            ["Top bar", "Back, project name with file menu, size badge; on the right the video play/pause, Design/Preview switch and Export."],
            ["Left rail", "Text, Images, Buttons (a finger tapping a button), Layouts; a divider; Layers, then Feeds. Each shows its icon with its name underneath, and opens a panel next to the rail."],
            ["Canvas", "The frame at the Flick's exact size, centred, with pan and zoom. Element toolbars float above it."],
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
            "Duplicate: opens a copy as a new project with the whole canvas copied (variations, elements, feeds, settings) and shows a “Duplicated” toast.",
            "Save as template: a dialog with name, description (with counter) and thumbnail (frames or upload). Saved templates appear first in Your templates and open fully editable.",
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
            ["Images", "Uploads (drag in or browse), with full screen preview and delete. Delete confirms first (\u201cDelete this image?\u201d with the image; anywhere it\u2019s already used on the canvas keeps it)."],
            ["Buttons", "Pill, rounded, sharp, pill with arrow, light pill, light sharp, outline, outline sharp, glass, block shadow, text link, and Icon (image only)."],
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
            "Click selects; Shift-click adds to the selection. The selected row is grey, like the rest of the rail.",
            "Hidden elements disappear from canvas, preview and the exported Flick, stay greyed in the list, and are ignored by snapping.",
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
            "While a video generates, an animated gradient fills the frame, a “Generating” pill sits just above the frame's top-right corner, and the elements stay visible (read-only).",
            "A variation that hasn't been generated shows the reference video faded underneath its elements.",
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
            "Snapping: the dragged box's edges and centre snap to other elements' edges and centres and to the frame's edges and centre, within 6px on screen. Red guides show what it lines up with.",
            "Axis lock: a drag that's clearly horizontal or vertical stays on that axis. Decided once about 16px in; it can release if the drag turns diagonal but never re-locks, so nothing jumps. Shift locks fully.",
            "Alt (Option) moves freely without snapping.",
          ]}
        />
        <H>Resizing</H>
        <Table
          head={["Element", "Corner handles", "Side handles (on hover)"]}
          rows={[
            ["Text", "Scale the text from the centre; a set box width scales with it", "Left and right set the box width; text wraps; font size stays"],
            ["Button", "Resize freely from the centre; never smaller than the label; Shift keeps shape", "Move only that edge; the opposite edge stays fixed"],
            ["Icon button", "Resize from the centre", "Move only that edge"],
            ["Image", "Resize from the centre; aspect lock or Shift keeps shape", "Move only that edge; a locked image keeps its shape"],
            ["Thumbnail strip", "Scale all thumbnails together", "None"],
          ]}
        />
        <UL
          items={[
            "Shape snap: images and image buttons snap to the image's own aspect ratio when within 6px, and release past 10px, so it never flickers at the edge. Alt turns it off.",
            "Corner drags use the same axis lock as moving, so a mostly sideways pull changes only the width.",
            "Edges snap while resizing too: the edge being dragged lands on other elements' edges and centres, or the frame's edges and centre, within 6px, with the same red guides. Text snaps its width only. Alt resizes freely.",
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
            ["Text", "Font (name in its own font \u2304; 100+, searchable, grouped by type, incl. Japanese, Korean, Chinese, Arabic, Devanagari and Thai; loaded on demand), size, colour, align (cycles), bold, italic and underline as three toggles"],
            ["Button", "Font, size, text colour, bold / italic / underline, background colour (incl. transparent), border, radius, background image"],
            ["Icon button", "Replace (text button) (the link floats under it). No text, no feed for a label."],
            ["Image", "Replace (text button), radius, aspect lock (lock icon), fit or fill"],
            ["Thumbnail strip", "Layout (horizontal → vertical → free), size, gap, highlight colour and width, background, radius"],
          ]}
        />
        <UL
          items={[
            "Bold, italic and underline sit behind one button that shows whichever is on; the three options open on hover or click.",
            "Any change on top of a style marks it Custom; picking a style starts it fresh.",
            "The colour picker has a saturation area, hue and opacity sliders, hex and opacity fields, an eyedropper and swatches. While the eyedropper is picking, the panel hides; it returns with the picked colour. The picking click doesn't deselect the element.",
            "Labels: the button's fill is “Background colour”.",
          ]}
        />
        <H>Thumbnail strip</H>
        <UL
          items={[
            "Thumbnails are always square, whatever the Flick's shape.",
            "The canvas strip shows uploaded thumbnails only; a thumbnail without an upload shows the strip's background colour. (The bottom slides strip shows a frame from each video.)",
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
    title: "15. Prompts and history",
    body: (
      <>
        <P>Every prompt lives in one panel on the far left, set apart from the editor by a slightly darker background and a thicker edge.</P>
        <UL
          items={[
            "History as a chat, oldest at the top: each prompt is a message with a chip naming the video it was for (Reference video, Variation 2), its image references, and \u201cFrom the reference video\u201d for variations.",
            "Under each prompt, its result: a spinner while generating, then the video's frame and \u201cVideo ready · Showing on Variation 2\u201d. A result later replaced by a newer generation turns grey and reads \u201cReplaced\u201d.",
            "Clicking a chip or a result selects that video. A removed variation shows as \u201cRemoved variation\u201d.",
            "Regenerate all adds one entry per video; variations read \u201cafter the reference video\u201d while they wait.",
            "The prompt box at the bottom says \u201cCreating for\u201d and the video in view (with its frame). It writes for whichever video is selected.",
            "Variations can generate at the same time: write and send the next variation while another is still generating. A video\u2019s own prompt box is dimmed while that video generates. The reference video can\u2019t be regenerated while any variation is generating (they\u2019re made from it); its box stays dimmed until they finish. Variations wait for the reference video while it generates.",
            "A template's reference video is fixed: the box explains that and asks to pick a variation.",
            "The newest message stays in view.",
            "When something else sends you to the prompt box (adding a variation, the \u201cGenerate this variation\u201d or \u201cNeeds regenerating\u201d tip), the prompts panel opens if hidden, the cursor lands in the box, and it\u2019s cued briefly, the rest of the page dims a little: a primary ring on the box and a small primary label above it saying what to write (\u201cDescribe Variation 3 here\u201d, or \u201cRegenerate Variation 1 here\u201d). It fades after about a second, or as soon as you type or click.",
            "The prompts panel has a header, Prompts, with a hide button at its right. While hidden, a Prompts button (chat icon) at the canvas\u2019s top-right brings it back. While hidden, a small spinner on the Prompts button shows something is generating. Clicking a video in the slides strip opens the panel again. Adding a variation opens it too and puts the cursor in the prompt box. Remembered on this device.",
            "Drag the panel's right edge to resize it between 280 and 560px (default 340); double-click the edge to reset. Arrow keys work when the edge is focused. The width is remembered on this device.",
            "A variation\u2019s prompt box shows the reference video it is made from; clicking it opens the reference video full screen. Sending clears the prompt box; the prompt is kept only in the history. Regenerating a video marked \u201cNeeds regenerating\u201d without typing reuses its last prompt.",
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
            "Reference video, then 2 to 5 variations, centred and scrollable, then Add.",
            "A variation with no video yet shows its elements over the faded reference video, and a tip just outside the frame\u2019s top-right corner: \u201cGenerate this variation\u201d (small). Clicking it opens the prompts panel (if hidden) and puts the cursor in the prompt box.",
            "Each variation keeps the number it got when added; numbers are never reused or renumbered (removing Variation 3 leaves 1, 2, 4; the next is 5). A typed name replaces it everywhere.",
            "Rename the reference video or a variation by clicking its label under the thumbnail: type, then Enter or click away; Esc cancels; clearing it goes back to the default name (\u201cVariation 3\u201d, \u201cReference video\u201d). The reference video can be renamed the same way.",
            "Thumbnails are at least 48px wide; tall sizes get taller thumbnails.",
            "States: ready (frame), generating (animated), not generated (dashed with sparkle), needs regenerating (faded, red dot before the name), starting variation (solid play button in the corner).",
            "Thumbnail corner (top-right): where the Flick starts, a solid play button always shows, in a soft orange highlight (\u201cThe Flick starts here: viewers see this first\u201d). Hovering any thumbnail shows the play toggle (\u201cStart the Flick here\u201d) and options (\u2026) to its right. On a reference video left out of the Flick the toggle is disabled: \u201cInclude it in the Flick to start here\u201d. A red dot before the name marks needs regenerating. Double-click a ready thumbnail for full screen.",
            "Options menu (also on right-click): Full screen (ready videos; lightbox with prompt and reference details), Include in Flick (reference video only, a checkmark toggle; turning it off moves the start to the first variation), and Delete (variations, with confirmation; disabled with a reason when only 2 are left). Dividers only appear between groups, never above a lone Delete.",
          ]}
        />
        <H>Needs regenerating</H>
        <UL
          items={[
            "A variation made from an older reference video keeps its video, shown faded on the canvas; its elements stay at full strength.",
            "Just outside the frame's top-right corner (where \u201cGenerating\u201d shows) a pill reads \u201cNeeds regenerating\u201d with a red dot. Clicking it opens the prompts panel (if hidden) and puts the cursor in the prompt box.",
            "In the slides strip its thumbnail is faded with a red dot before its name.",
          ]}
        />
        <H>Regenerating the reference video</H>
        <P>When variations already exist, a dialog asks first:</P>
        <Table
          head={["Option", "Result"]}
          rows={[
            ["Reference and N variations (secondary)", "Reference and every generated variation regenerate; variations finish after the new reference, so none are marked."],
            ["Reference video only (primary)", "Variations keep their videos and are marked “Needs regenerating” (see above)."],
          ]}
        />
        <P>Copy: “Your N variations were made from this video. Regenerate them too so they match.” Regenerating only the reference marks them “Needs regenerating”. No Cancel button; close with ✕ or Esc. Credits for all videos are checked before starting.</P>
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
            "Cards: a square (1:1) thumbnail (the starting variation), the name, last edited and size. 4 to a row on wide screens (3 on medium, 2 on phones).",
            "A project saves as you work: anything started from Create, a template, Assets or Remix shows up here, and reopens as it was left.",
            "\u22ef and right-click: Duplicate, Delete (confirms; its Flicks stay).",
            "Empty: \u201cNo projects yet\u201d with Create; no match, with Clear filters.",
          ]}
        />
        <H>Export Flick</H>
        <UL
          items={[
            "Export (top right of the editor) opens a dialog: what it does (\u201cMakes a Flick from this project, ready to share, embed in websites or serve in ads.\u201d), the starting variation\u2019s frame with the number of variations and size, and Flick name, prefilled with the project name.",
            "When the project was exported before: \u201cLast exported 2 hr ago as \u201cX\u201d.\u201d",
            "Checks, one line each: \u201cCreate at least two variations to export.\u201d or \u201cGenerate videos for every variation before export.\u201d, and a reference video thumbnail when it\u2019s included (these block); feeds empty on some variations or variations made from an old reference video (warnings).",
            "Export closes the dialog and opens the new Flick\u2019s page right away; it prepares there in the background (about 5 seconds here). The project stays as it was; going back to it, the Export button shows a spinner while one prepares (it can export again).",
            "While preparing: the header says \u201cPreparing\u2026 n%\u201d (no Remix or \u22ef); the preview plays; the right side is one card, \u201cPreparing\u2026 n%\u201d with a bar and \u201cYou can share the link, serve it in ads or embed it on your website when it\u2019s ready.\u201d; Analytics is hidden. In Flicks it\u2019s first, its card faded with \u201cPreparing\u2026 n%\u201d and a bar. It isn\u2019t offered in placement or embed pickers yet.",
            "When it finishes, wherever the user is: the toast \u201c\u201cX\u201d is ready\u201d (\u201cShare it, embed it or serve it in ads.\u201d) with View Flick.",
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
            "Link: flamapp.ai/f/<ending> with copy and visit; how it unfurls (image, title, description); Edit link.",
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
            "Get credits: choose an amount; continue to payment. A typical video (1080×1920, 8 seconds) is 48 credits.",
            "Auto-reload: top up when credits drop below a chosen amount.",
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
        <P>Every generated video, newest first, from Assets in the sidebar.</P>
        <UL
          items={[
            "Sample data: 20 videos today, 15 yesterday and 12 a few days ago, across three products: sunglasses (9:16), boots (16:9 and 1:1) and dresses (1:1).",
            "Grouped by day: Today, Yesterday, then the date (\u201cWed, Oct 7\u201d; the year only when it isn\u2019t this year). The count (\u201c47 videos\u201d) sits next to the title and follows the filters.",
            "Filters at the top right: Date and Size (All sizes, then only the sizes there are videos in). When nothing matches: \u201cNo videos match these filters\u201d, \u201cTry another date or size.\u201d and Clear filters.",
            "Date filter (shared by Assets, Projects, Flicks and Replace Flick): a pill showing the choice (\u201cLast 7 days\u201d, or a range like \u201cOct 3 \u2013 Oct 9\u201d) that opens a short list: All period, Today, Last 7 days, Last 30 days and Custom range (the current one ticked). The calendar appears beside the list only after choosing Custom range (or when a custom range is already set): pick a start and end, future days disabled; a full range closes it. It stays within the window.",
            "Each card: a square (1:1) tile with the video filling it; it plays on hover. On hover, the length (\u201c0:09\u201d) and size show bottom-right, and Download top-right. No text below the tile.",
            "Click a card to open it in the viewer (below), with previous/next arrows and arrow keys across all videos.",
            "Delete asks first (\u201cDelete this video? It\u2019s removed from Assets. Flicks using this video won\u2019t be affected.\u201d), then shows \u201cVideo deleted\u201d.",
            "Empty: \u201cNo videos yet\u201d, \u201cEvery video you generate shows up here, with the prompt and references it was made from.\u201d and Create a video.",
          ]}
        />
        <H>The viewer (everywhere media opens)</H>
        <P>The same full-screen viewer opens from Assets, the slides strip (full screen), uploads in the Images panel, image references in prompt boxes and the prompt history.</P>
        <UL
          items={[
            "Always dark, in either theme, so colours read true: the media on the left (videos play muted and loop; a custom player with play/pause and mute (volume on hover) on the left, the time on the right, a scrubber above; controls fade while playing and stay when paused; click the video or press Space to pause, M to mute), a details panel on the right. Previous/next arrows when there\u2019s more than one.",
            "Panel title: \u201cVideo\u201d or \u201cImage\u201d (generated videos have no name), and Close.",
            "Prompt block (generated videos): the references as thumbnails, then the prompt, up to six lines with See more (opens the rest in a scroll area with no scrollbar) and a Copy button (shows \u201cCopied\u201d).",
            "Details block: Type, Size, Length, Created for videos in Assets; Type, Size, Created for other generated videos; Source, Type, Format for uploads.",
            "References open in place of the video: a Back pill at the top left (Esc also goes back), and the panel shows that reference\u2019s Source (Uploaded or Generated), Type and Format.",
            "Actions at the bottom: in Assets, Use in Flicks is the primary button (starts a new project with this video as its reference video, already made, at its size and length; the editor says \u201cNew project created\u201d, and Back returns to Assets), then Download and Delete as icons. Elsewhere, Download is primary; images also have Copy image (a toast explains if the browser blocks the clipboard). Videos have no copy action.",
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
            "Email is read-only: greyed with a lock and the tooltip \u201cYour sign-in email can\u2019t be changed\u201d.",
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
        <P>New users learn in place: a short tour in the editor, one-time tips at tricky moments, a Help Center with a sample project, and a first-run explainer on Campaigns. All of it can be skipped; the tour and the sample come back from the Help Center.</P>
        <H>Sample project</H>
        <P>\u201cSample: Sport lens switch\u201d (1080\u00d71920): a reference video, three colourways named Gold, Sapphire and White with thumbnails, a heading, a price from the price feed, a Shop now button whose link comes from the shop-link feed, and the strip. Opened from the Help Center; it saves to Projects like any other.</P>
        <H>How Flicks work</H>
        <UL
          items={[
            "A feature intro popup on Create, shown once to new users right after workspace setup (the welcome gift follows it), and any time from the outlined \u201c? How Flicks work\u201d button under the prompt box.",
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
            "Starts once, the first time a project\u2019s video is ready (or from the Help Center). The page dims, with a soft cut-out around what each stop is about; the cut-out and card glide from stop to stop.",
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
            "Also: the first Preview, the first ready Flick page (Remix).",
          ]}
        />
        <H>Help Center</H>
        <UL
          items={[
            "Opened from the account menu (Help Center), in a new tab. Its own page: search, Open Flicks, and guides grouped Basics, Editor, Share, Ads, Account.",
            "Home: How can we help? with search; Open the sample project and Take the editor tour (each opens Flicks in a new tab, ready); a card per guide with its first screen and step count.",
            "19 guides: Make your first video, Start from a template, Start from Assets, Create variations, Choose where the Flick starts, Add text, images and buttons, Link a button, Dynamic content with feeds, Thumbnails, Preview, Version history, Export a Flick, Change a Flick with Remix, Share a link, Embed on your site or app, Campaigns and placements, Get an ad tag, Ad Balance, Credits.",
            "Each guide: a walkthrough of real screens. It plays on its own: what to click is outlined in the primary colour (the rest dims slightly), a cursor glides to it and clicks it, zooming in a little, then the next screen shows what happened. Pause, step back and forward, or pick a step from the numbered list beside it. Arrow keys and Space work when it has focus. Reduced motion: it starts paused.",
            "Below: Good to know (tips), Try it (opens Flicks in a new tab: the sample project, the tour, or Create), Related guides, and Previous / Next.",
            "Search matches titles first, then summaries, tips and steps.",
          ]}
        />
        <P>Dev tools: Reset onboarding (in the dev bar) starts all of it over.</P>
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
            "One vocabulary and one tile strip everywhere: Views, Interactions (switches plus clicks), Clicks and Avg watch time, always in that order; ad pages add Spend. Each tile has its own colour from the chart palette (Views blue, Interactions orange, Clicks green, Avg watch time amber, Spend pink): a dot by its label, and a tint and top bar when chosen; the chart draws in the chosen tile\u2019s colour. Each tile has an info tooltip with its definition and one useful detail under the number: views a day (an hour for one day), interactions per view, clicks as a share of views, total watch time, and CPM. Impressions is said only inside CPM.",
            "Period: the app\u2019s date filter (All period, Today, Last 7 days, Last 30 days, or a custom range). Analytics opens on Last 7 days; Full analytics from a Flick, campaign, placement or embed opens on All period, so the numbers match that page. All period charts from the first day with numbers. One day charts by hour, longer periods by day. No comparison with an earlier period.",
            "Breadcrumbs on every detail page (for example Campaigns › Holiday 2026 › Camera bundle MREC), each one clickable, plus a back arrow.",
            "Compare: each tile chooses the chart. Up to 5 things go on the chart at once, from a row (its chart icon shows on hover; once added it shows its colour) or from Compare above the chart, a searchable picker of every Flick, campaign, placement and embed with views here. Added items show as chips with a remove button and Clear; a line under the chart gives each one\u2019s number for the chosen tile. The chart can show as a table.",
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
          "Primary colour only for the main action on a surface (Generate, Export, Remix). Everything else is secondary or ghost.",
          "Icon-only controls always carry a tooltip with their label.",
          "Destructive actions confirm (delete project or Flick, delete variation). Quick, reversible ones don't (delete an element, hide a layer).",
          "Snapping and locks always have an escape: Alt turns snapping off, Shift locks fully.",
          "Nothing should flicker: snaps and locks use hysteresis; outlines and radii update in the same frame as the change.",
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
]

/** In-app product requirements document. */
export function PrdDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(820px,92vh)] gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <aside className="flex w-60 shrink-0 flex-col border-r bg-muted/40 p-3">
          <DialogHeader className="gap-1 px-2 pb-3 pt-1 text-left">
            <DialogTitle className="flex items-center gap-2 text-base">
              PRD <DevBadge />
            </DialogTitle>
            <DialogDescription className="text-xs">Flicks Create · updated {PRD_UPDATED}</DialogDescription>
          </DialogHeader>
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
      </DialogContent>
    </Dialog>
  )
}
