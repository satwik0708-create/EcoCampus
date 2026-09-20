import {
  ContentCategory,
  DisposalAction,
  PointReason,
  RecommendationTrigger,
  WasteCategory,
} from "@prisma/client";

/**
 * Static seed content: the configuration and editorial material a campus
 * would start from. This is *reference data*, not fabricated statistics —
 * every number the product displays is still derived from records.
 */

export const DEPARTMENTS = [
  { name: "Computer Science & Engineering", code: "CSE" },
  { name: "Mechanical Engineering", code: "MECH" },
  { name: "Electronics & Communication", code: "ECE" },
  { name: "Civil Engineering", code: "CIVIL" },
  { name: "Business Administration", code: "BBA" },
  { name: "Life Sciences", code: "LIFE" },
];

export const POINTS_RULES: Array<{
  code: PointReason;
  label: string;
  description: string;
  points: number;
}> = [
  {
    code: PointReason.WASTE_RECORD,
    label: "Waste logged",
    description: "Awarded for each waste record a student adds.",
    points: 5,
  },
  {
    code: PointReason.FOOD_WASTE_RECORD,
    label: "Food waste logged",
    description: "Awarded for each food waste record a student adds.",
    points: 5,
  },
  {
    code: PointReason.DAILY_FIRST_ACTIVITY,
    label: "Daily check-in",
    description:
      "Awarded once per campus day, for the first activity of that day.",
    points: 3,
  },
  {
    code: PointReason.SEGREGATION_BONUS,
    label: "Correct segregation",
    description:
      "Awarded when waste is recycled, composted, reused or sent for special disposal rather than landfilled.",
    points: 2,
  },
  {
    code: PointReason.STREAK_MILESTONE,
    label: "Streak milestone",
    description:
      "Value for a 7-day streak; longer milestones scale proportionally (14, 30 and 60 days).",
    points: 10,
  },
  {
    code: PointReason.CHALLENGE_COMPLETION,
    label: "Challenge completion",
    description:
      "Each challenge carries its own reward, set when the challenge is created. This row exists for completeness.",
    points: 0,
  },
  {
    code: PointReason.ADMIN_ADJUSTMENT,
    label: "Administrative adjustment",
    description: "Reserved for manual corrections recorded by an administrator.",
    points: 0,
  },
];

export const RECOMMENDATION_RULES = [
  {
    code: "STREAK_AT_RISK",
    trigger: RecommendationTrigger.STREAK_AT_RISK,
    priority: 10,
    title: "Keep your streak alive",
    message:
      "You have an active streak but nothing recorded today. A single entry — even one wrapper — keeps it going.",
    actionLabel: "Log an activity",
    actionHref: "/student/waste",
    threshold: null,
    windowDays: null,
    matchWasteCategory: null,
    matchFoodCategory: null,
  },
  {
    code: "FREQUENT_PLASTIC",
    trigger: RecommendationTrigger.FREQUENT_WASTE_CATEGORY,
    priority: 20,
    matchWasteCategory: WasteCategory.PLASTIC,
    threshold: 3,
    windowDays: 7,
    title: "Plastic is dominating your week",
    message:
      "Try carrying a reusable bottle and a cloth bag. Most single-use plastic on campus comes from drinks and takeaway packaging, and both are avoidable with one item you already own.",
    actionLabel: "See plastic guidance",
    actionHref: "/student/guide",
    matchFoodCategory: null,
  },
  {
    code: "HIGH_FOOD_WASTE",
    trigger: RecommendationTrigger.HIGH_FOOD_WASTE,
    priority: 25,
    threshold: 4,
    windowDays: 7,
    title: "Food waste is adding up",
    message:
      "Consider taking smaller portions and going back for seconds, and store edible leftovers safely instead of discarding them. Most avoidable food waste is decided at the serving counter.",
    actionLabel: "Review your pattern",
    actionHref: "/student/food-waste",
    matchWasteCategory: null,
    matchFoodCategory: null,
  },
  {
    code: "FREQUENT_PAPER",
    trigger: RecommendationTrigger.FREQUENT_WASTE_CATEGORY,
    priority: 30,
    matchWasteCategory: WasteCategory.PAPER,
    threshold: 3,
    windowDays: 7,
    title: "Paper adds up quickly",
    message:
      "Print double-sided, reuse single-sided sheets as rough paper, and keep clean paper dry so it stays recyclable. Wet or greasy paper cannot be recovered.",
    actionLabel: "See paper guidance",
    actionHref: "/student/guide",
    matchFoodCategory: null,
  },
  {
    code: "LATEST_EWASTE",
    trigger: RecommendationTrigger.LATEST_WASTE_CATEGORY,
    priority: 35,
    matchWasteCategory: WasteCategory.EWASTE,
    title: "E-waste needs a separate route",
    message:
      "Batteries, cables and small electronics must never go in a normal bin — they leak heavy metals and can start fires in collection trucks. Use the designated campus e-waste point.",
    actionLabel: "Find the right route",
    actionHref: "/student/guide",
    threshold: null,
    windowDays: null,
    matchFoodCategory: null,
  },
  {
    code: "LATEST_PLASTIC",
    trigger: RecommendationTrigger.LATEST_WASTE_CATEGORY,
    priority: 40,
    matchWasteCategory: WasteCategory.PLASTIC,
    title: "Prefer a reusable bottle",
    message:
      "Prefer a reusable bottle to reduce single-use plastic. If you do end up with a disposable one, empty and rinse it before recycling — contaminated plastic is rejected at sorting.",
    actionLabel: "Read the plastic guide",
    actionHref: "/student/guide",
    threshold: null,
    windowDays: null,
    matchFoodCategory: null,
  },
  {
    code: "LATEST_COOKED_FOOD",
    trigger: RecommendationTrigger.LATEST_FOOD_CATEGORY,
    priority: 45,
    matchFoodCategory: "COOKED_FOOD" as const,
    title: "Smaller portions, fewer leftovers",
    message:
      "Consider taking smaller portions and storing edible leftovers safely. Cooked food is the single largest avoidable category in most campus canteens.",
    actionLabel: "Learn about food waste",
    actionHref: "/student/learn",
    threshold: null,
    windowDays: null,
    matchWasteCategory: null,
  },
  {
    code: "NO_RECENT_ACTIVITY",
    trigger: RecommendationTrigger.NO_RECENT_ACTIVITY,
    priority: 50,
    threshold: 3,
    windowDays: null,
    title: "It has been a few days",
    message:
      "Your last record was a while ago. Tracking works because it is frequent, not because it is perfect — log the next thing you throw away and you are back on track.",
    actionLabel: "Log an activity",
    actionHref: "/student/waste",
    matchWasteCategory: null,
    matchFoodCategory: null,
  },
  {
    code: "NO_ACTIVE_CHALLENGE",
    trigger: RecommendationTrigger.NO_ACTIVE_CHALLENGE,
    priority: 60,
    title: "Join a campus challenge",
    message:
      "Challenges give your everyday habits a target and a deadline, and progress is measured from the records you are already logging.",
    actionLabel: "Browse challenges",
    actionHref: "/student/challenges",
    threshold: null,
    windowDays: null,
    matchWasteCategory: null,
    matchFoodCategory: null,
  },
  {
    code: "GENERAL_SEGREGATION",
    trigger: RecommendationTrigger.GENERAL,
    priority: 900,
    title: "Segregate at the source",
    message:
      "Make sure recyclable materials are clean, dry and placed in the correct stream. Sorting at the bin is the single highest-leverage habit on campus — once materials mix, most of them can no longer be recovered.",
    actionLabel: "Open the waste guide",
    actionHref: "/student/guide",
    threshold: null,
    windowDays: null,
    matchWasteCategory: null,
    matchFoodCategory: null,
  },
];

export const DISPOSAL_GUIDES = [
  {
    item: "Plastic water bottle",
    category: WasteCategory.PLASTIC,
    recommendedAction: DisposalAction.RECYCLE,
    summary:
      "PET bottles are widely recyclable, but only when they are empty, rinsed and kept out of the wet waste stream.",
    reduceGuidance:
      "Carry a refillable bottle. A single reusable bottle replaces several hundred disposable ones over one academic year, and campus refill points are free.",
    reuseGuidance:
      "A PET bottle can be refilled a few times for cold water, but it is not designed for repeated use — replace it once it becomes scratched, cloudy or smells. Do not use it for hot liquids.",
    recycleGuidance:
      "Empty it completely, give it a quick rinse, squash it to save space and put the cap back on. Place it in the dry recyclables bin. Caps left loose are too small to be sorted and are lost.",
    disposeGuidance:
      "If no recycling stream is available, place it in general waste — but ask your campus sustainability team first, as most institutions do collect PET separately.",
    keywords: ["bottle", "pet", "water", "plastic", "drink"],
  },
  {
    item: "Snack wrapper / chip packet",
    category: WasteCategory.PLASTIC,
    recommendedAction: DisposalAction.GENERAL_WASTE,
    summary:
      "Multi-layer foil wrappers cannot currently be recycled through standard campus streams.",
    reduceGuidance:
      "Buy snacks in bulk and decant into a reusable container, or choose items sold in single-material packaging such as paper or card.",
    reuseGuidance:
      "Clean wrappers are sometimes collected by craft or upcycling groups. Unless there is an active collection, treat reuse as unrealistic for this item.",
    recycleGuidance:
      "Not recyclable in standard streams: the foil and plastic layers are bonded and cannot be separated. Putting them in the recycling bin contaminates the whole batch.",
    disposeGuidance:
      "Shake out crumbs and place in general waste. Keeping them out of the recycling bin is the genuinely useful action here.",
    keywords: ["wrapper", "chips", "packet", "snack", "foil"],
  },
  {
    item: "Notebook and printed paper",
    category: WasteCategory.PAPER,
    recommendedAction: DisposalAction.RECYCLE,
    summary:
      "Clean, dry paper is one of the easiest materials to recover — as long as it never gets wet or greasy.",
    reduceGuidance:
      "Print double-sided and at two pages per sheet for drafts. Keep reading material digital where you can annotate it.",
    reuseGuidance:
      "Single-sided printouts make excellent rough paper. Bind leftover blank pages from old notebooks into a new one rather than buying another.",
    recycleGuidance:
      "Remove spiral bindings, plastic covers and sticky notes, then place clean paper in the paper recycling bin. Staples are fine — they are removed magnetically at the mill.",
    disposeGuidance:
      "Paper contaminated with food or oil cannot be recycled. Compost it if it is only food-soiled, otherwise general waste.",
    keywords: ["paper", "notebook", "printout", "notes", "card"],
  },
  {
    item: "Cardboard box",
    category: WasteCategory.PAPER,
    recommendedAction: DisposalAction.RECYCLE,
    summary:
      "Corrugated cardboard is highly recyclable and takes up far less space once flattened.",
    reduceGuidance:
      "Consolidate online orders and choose collection points over individual deliveries where your campus offers them.",
    reuseGuidance:
      "Keep sturdy boxes for storage, moving between hostels or student society events. A box reused once has already halved its footprint.",
    recycleGuidance:
      "Remove tape and any plastic liner, flatten the box completely and place it in the paper or card stream.",
    disposeGuidance:
      "Grease-stained cardboard — pizza boxes in particular — cannot be recycled. Tear off the clean parts to recycle and compost or bin the rest.",
    keywords: ["cardboard", "box", "carton", "packaging", "delivery"],
  },
  {
    item: "Glass bottle or jar",
    category: WasteCategory.GLASS,
    recommendedAction: DisposalAction.RECYCLE,
    summary:
      "Glass can be recycled indefinitely without losing quality — but broken glass is a safety hazard and needs care.",
    reduceGuidance:
      "Choose refillable or returnable glass where available; many local suppliers still operate a deposit system.",
    reuseGuidance:
      "Jars are excellent for storing dry food, stationery or lab samples. Sterilise with boiling water before food use.",
    recycleGuidance:
      "Rinse, remove metal or plastic lids and recycle those separately. Place the glass in the designated glass stream — never in general waste, where it endangers handlers.",
    disposeGuidance:
      "Wrap broken glass in thick paper or card, label it clearly, and hand it to campus housekeeping rather than dropping it into a bin.",
    keywords: ["glass", "bottle", "jar", "container"],
  },
  {
    item: "Aluminium can",
    category: WasteCategory.METAL,
    recommendedAction: DisposalAction.RECYCLE,
    summary:
      "Recycling aluminium uses a fraction of the energy of making it from ore, and the loop is genuinely closed.",
    reduceGuidance:
      "A refillable bottle covers most drink occasions. Where cans are the only option, buying larger sizes reduces the packaging per litre.",
    reuseGuidance:
      "Cut-and-file cans are used in some workshops as small containers, but the sharp edges make this a poor everyday reuse. Recycling is the better route.",
    recycleGuidance:
      "Empty, rinse and crush the can, then place it in the metal or mixed dry recyclables stream.",
    disposeGuidance:
      "Aluminium in landfill is a waste of a valuable, infinitely recyclable material — find the metal stream before defaulting to general waste.",
    keywords: ["can", "aluminium", "aluminum", "metal", "tin", "soda"],
  },
  {
    item: "Used battery",
    category: WasteCategory.EWASTE,
    recommendedAction: DisposalAction.SPECIAL_DISPOSAL,
    summary:
      "Batteries must never enter a normal bin — they leak heavy metals and start fires in collection vehicles.",
    reduceGuidance:
      "Use rechargeable cells for anything you replace more than twice a year, and mains power for desk equipment.",
    reuseGuidance:
      "Cells that are too weak for a camera often still run a clock or remote for months. Test before discarding.",
    recycleGuidance:
      "Battery recycling is specialised and cannot happen through the standard dry recyclables stream.",
    disposeGuidance:
      "Tape over the terminals and take the battery to the campus e-waste collection point. Never put a battery in general waste or recycling.",
    keywords: ["battery", "cell", "aa", "lithium", "ewaste", "e-waste"],
  },
  {
    item: "Charger, cable or old electronics",
    category: WasteCategory.EWASTE,
    recommendedAction: DisposalAction.SPECIAL_DISPOSAL,
    summary:
      "Electronics contain recoverable metals and hazardous components, so they need the designated e-waste route.",
    reduceGuidance:
      "Repair before replacing, and standardise on one cable type so a single charger serves several devices.",
    reuseGuidance:
      "Working chargers and cables are always in demand. Offer them to your department, a student society or a campus swap point before discarding.",
    recycleGuidance:
      "Certified e-waste recyclers recover copper, gold and rare earths. This cannot be done through general recycling bins.",
    disposeGuidance:
      "Wipe any storage device, then take the item to the campus e-waste collection point. Never bin electronics.",
    keywords: ["charger", "cable", "electronics", "laptop", "phone", "ewaste"],
  },
  {
    item: "Food container / takeaway box",
    category: WasteCategory.PLASTIC,
    recommendedAction: DisposalAction.RECYCLE,
    summary:
      "Rigid plastic containers are usually recyclable, but only once the food residue is gone.",
    reduceGuidance:
      "Carry your own container to the canteen. Many campus outlets will fill a clean personal container, and some discount it.",
    reuseGuidance:
      "Sturdy containers work well for lunch, lab samples and storage. Replace any that become stained or warped.",
    recycleGuidance:
      "Scrape out food, wash with the last of your washing-up water and dry before placing in the dry recyclables bin.",
    disposeGuidance:
      "Heavily soiled or black plastic containers are often not recoverable — black plastic is invisible to optical sorters. Use general waste for those.",
    keywords: ["container", "takeaway", "box", "tiffin", "lunch"],
  },
  {
    item: "Uneaten cooked food",
    category: WasteCategory.ORGANIC,
    recommendedAction: DisposalAction.COMPOST,
    summary:
      "Cooked food is the largest avoidable waste stream in most canteens, and the easiest to reduce at the serving counter.",
    reduceGuidance:
      "Take a smaller portion and go back for more. Tell the counter if you do not want an item — food refused before it is served is food that is never wasted.",
    reuseGuidance:
      "Cool leftovers quickly, refrigerate in a sealed container and eat within a day. Never leave cooked food at room temperature for more than two hours.",
    recycleGuidance:
      "Food cannot be recycled, but it can be composted. Keep it out of the dry recyclables bin, where it contaminates paper and card.",
    disposeGuidance:
      "Place in the organic or compost collection. Where no composting exists, use the wet waste bin — never the recycling.",
    keywords: ["food", "leftover", "cooked", "rice", "meal", "compost"],
  },
  {
    item: "Fruit and vegetable peel",
    category: WasteCategory.ORGANIC,
    recommendedAction: DisposalAction.COMPOST,
    summary:
      "Peels are unavoidable waste, but they are a resource rather than rubbish when composted.",
    reduceGuidance:
      "Some peel is edible — potato, carrot and apple skins are nutritious when washed well. Scrub rather than peel where you can.",
    reuseGuidance:
      "Citrus peel makes a usable household cleaner steeped in vinegar; vegetable trimmings make stock.",
    recycleGuidance:
      "Not recyclable in the conventional sense — composting is the recovery route for organic matter.",
    disposeGuidance:
      "Place in the organic or compost bin. Keep it out of dry recycling, which it spoils.",
    keywords: ["peel", "fruit", "vegetable", "organic", "compost", "skin"],
  },
  {
    item: "Disposable cup",
    category: WasteCategory.GENERAL,
    recommendedAction: DisposalAction.GENERAL_WASTE,
    summary:
      "Most paper cups carry a thin plastic lining, which makes them far harder to recycle than they look.",
    reduceGuidance:
      "Keep a reusable cup in your bag. It pays for itself quickly where outlets offer a discount, and it is the single easiest habit on this list.",
    reuseGuidance:
      "A disposable cup is not built for reuse. Use a proper reusable cup instead — it is safer and lasts years.",
    recycleGuidance:
      "Only facilities with specialist equipment can separate the plastic lining from the paper. Standard campus recycling cannot.",
    disposeGuidance:
      "Empty any liquid first, then place in general waste. Recycle the cardboard sleeve separately if there is one.",
    keywords: ["cup", "coffee", "tea", "disposable", "paper cup"],
  },
];

export const ARTICLES = [
  {
    title: "Segregation at source: the habit that makes everything else work",
    category: ContentCategory.SEGREGATION,
    readMinutes: 4,
    description:
      "Why sorting waste at the bin matters more than anything that happens downstream, and how to get it right in five seconds.",
    content: `Recycling does not begin at a recycling plant. It begins at the moment you decide which bin something goes into — and almost everything that goes wrong in a waste system goes wrong at that moment.

## Why mixing is so costly

Once materials mix, most of them stop being recoverable. A single wet teabag in a bag of paper can spoil the lot. Oil from a food container soaks into cardboard and makes it unusable. Broken glass in general waste injures the people who handle it.

This is why "sorting it later" is not a real option. There is no later.

## The five-second rule

Before you drop something, ask three questions:

- Is it clean and dry? If not, it belongs in wet waste or general waste, whatever it is made of.
- Is it one material or several bonded together? Single materials recycle; laminated wrappers usually do not.
- Is it hazardous? Batteries, electronics and chemicals always need a separate route.

## What good looks like on campus

- Empty and rinse containers before they go in the dry bin.
- Keep paper away from anything wet.
- Squash bottles and flatten boxes — collection is limited by volume, not weight.
- Take batteries and cables to the e-waste point, not the nearest bin.

None of this takes real effort. It takes a decision, repeated.`,
  },
  {
    title: "Reduce first: the part of the hierarchy everyone skips",
    category: ContentCategory.REDUCE,
    readMinutes: 3,
    description:
      "Recycling is the third option, not the first. What reducing actually looks like in student life.",
    content: `The waste hierarchy is ordered for a reason: reduce, then reuse, then recycle, then dispose. Recycling gets the attention because it feels productive — you put something in a bin and a system takes over. But recycling still consumes energy, water and transport. The waste you never generate costs nothing.

## Where student waste actually comes from

Across most campuses the largest avoidable streams are drinks packaging, takeaway containers, printed paper and food. All four are decided by a handful of repeated daily choices.

## Four changes worth making

- One reusable bottle. It removes the largest single source of plastic in student life.
- One reusable container. Many canteens will fill it, and some charge less for it.
- Print double-sided by default. Change the setting once; save paper every term.
- Take a smaller portion. You can always go back.

## Why habits beat campaigns

An awareness week produces a spike and then nothing. A habit produces a small reduction every single day, which is a much larger number by the end of the year. That is the whole argument for tracking: it turns an intention into something you can see.`,
  },
  {
    title: "Reuse: getting a second life out of what you already own",
    category: ContentCategory.REUSE,
    readMinutes: 3,
    description:
      "Practical reuse that holds up in a hostel room — and the reuse advice that is worth ignoring.",
    content: `Reuse sits above recycling in the hierarchy because it keeps an object's full value intact. Recycling melts a glass jar down to make another one; reuse just keeps the jar.

## Reuse that actually works

- Glass jars for dry storage, stationery or lab samples.
- Sturdy cardboard boxes for hostel moves and society events.
- Single-sided printouts as rough paper.
- Cloth bags — keep one folded in every bag you own.

## Reuse advice that is not worth following

Not every reuse suggestion survives contact with reality. Refilling a thin PET bottle indefinitely is not a good idea; it scratches, harbours bacteria and was never designed for it. Cutting cans into containers leaves sharp edges. Craft reuse of foil wrappers only helps if someone is actually collecting them.

Be honest about which reuse you will really do. A realistic habit beats an aspirational one.

## Pass it on

The highest form of reuse is giving something to someone who needs it. Working chargers, textbooks, lab coats and furniture all find takers instantly on a campus. Check whether yours has a swap point before you discard anything that still works.`,
  },
  {
    title: "Recycling that does not get rejected",
    category: ContentCategory.RECYCLING,
    readMinutes: 4,
    description:
      "Contamination is the reason recyclable material ends up in landfill. Here is how to avoid causing it.",
    content: `A surprising share of collected recycling is rejected before it is ever processed. Not because the materials were wrong, but because they were dirty, wet, or mixed with something that should not have been there.

## The three contamination culprits

- Food residue. Grease and sauce ruin paper and card permanently.
- Liquid. Half-full bottles leak over everything else in the bag.
- Wishful recycling. Putting something in the recycling because you hope it is recyclable is worse than binning it — it risks the whole batch.

## Material by material

- PET bottles: empty, rinse, squash, cap back on.
- Paper and card: clean and dry, bindings removed, boxes flattened.
- Glass: rinsed, lids removed and recycled separately.
- Metal cans: emptied and rinsed; crushing saves space.
- Multi-layer wrappers and black plastic: general waste, not recycling.

## The counter-intuitive rule

When you genuinely do not know, general waste is the safer choice. One wrong item in general waste is one wrong item. One wrong item in recycling can cost an entire collection.

Check the waste guide in EcoCampus before you guess — that is exactly what it is there for.`,
  },
  {
    title: "Food waste: the biggest lever on any campus",
    category: ContentCategory.FOOD_WASTE,
    readMinutes: 4,
    description:
      "Why food waste matters more than its weight suggests, and the small decisions that reduce it.",
    content: `Food waste is uniquely wasteful because everything that went into producing the food is wasted along with it: the water, the land, the fertiliser, the transport, the cooking. A plate of rice scraped into a bin represents far more than the rice.

## Avoidable versus unavoidable

Peels, bones and shells are unavoidable — they were never going to be eaten. Cooked food, bread, fruit and untouched servings are avoidable. EcoCampus asks you to mark the difference because only one of those categories can actually be reduced, and mixing them hides the signal.

## Where it happens

For most students, avoidable food waste is created at the serving counter, not at the table. The portion is decided before the first bite. That is the moment worth changing.

## Four things that work

- Take less and go back for seconds. Nothing is lost by returning to the counter.
- Say no to items you know you will not eat. Refused food is not wasted food.
- Cool and refrigerate leftovers within two hours, in a sealed container.
- Log it. Patterns you can see — a particular meal, a particular day — are patterns you can change.

## The target behind this

UN SDG target 12.3 calls for halving per-capita food waste at the consumer level by 2030. Campuses are a realistic place to make progress on that, because the same people eat the same meals in the same place every day. Small changes compound fast.`,
  },
  {
    title: "Responsible consumption beyond the bin",
    category: ContentCategory.RESPONSIBLE_CONSUMPTION,
    readMinutes: 3,
    description:
      "Most of a product's footprint is decided before you buy it. What that means for everyday choices.",
    content: `By the time something reaches your bin, almost all of its environmental cost has already been incurred — in extraction, manufacturing and transport. Disposal is the last and smallest chapter.

## Buy less, choose better, make it last

That phrase, from designer Vivienne Westwood, is a workable summary. The most sustainable item is usually the one you already own.

- Repair before replacing. Most electronics failures are a cable, a battery or a fan.
- Buy for durability where you will use something for years.
- Share infrequently used items rather than each owning one.
- Prefer single-material products — they are simpler to recover at end of life.

## Reading a product honestly

Packaging claims are often vague. "Eco-friendly" means nothing specific. What is meaningful:

- What material is it, and is it one material or several?
- Can it be repaired, and are parts available?
- Is there a take-back or refill scheme?

## Why this is on a waste platform

Tracking waste reveals consumption. If your log is full of disposable cups, the useful change is not better cup recycling — it is a reusable cup. The bin is where you find out what to buy differently.`,
  },
  {
    title: "Habits that stick on a campus",
    category: ContentCategory.CAMPUS_HABITS,
    readMinutes: 3,
    description:
      "Why streaks and challenges are in EcoCampus, and how to use them without gaming them.",
    content: `Sustainability on a campus fails for a predictable reason: enthusiasm is easy to generate and hard to sustain. A poster campaign creates a week of interest. A habit creates a year of behaviour.

## What makes a habit stick

- It is small enough to do on a bad day.
- It is attached to something you already do.
- You can see that you did it.

EcoCampus is built around those three. Logging one item takes fifteen seconds. It attaches to a moment you already have — standing at a bin. And your streak makes it visible.

## Use the streak honestly

A streak is only useful if it reflects something real. Logging a fictional entry to protect a number defeats the point and pollutes your own data, which is the thing that was supposed to help you.

If you miss a day, the streak resets. That is fine. The longest streak is kept as a record, and the useful measure was never the number — it was the weeks of attention behind it.

## Challenges are for direction

A streak makes you consistent. A challenge makes you consistent about something specific: cutting plastic, cutting food waste, segregating correctly. Join one that matches something you already suspect about your own habits.`,
  },
  {
    title: "SDG 12 in plain language",
    category: ContentCategory.SDG,
    readMinutes: 4,
    description:
      "What Sustainable Development Goal 12 actually asks for, and where a campus fits into it.",
    content: `Sustainable Development Goal 12 is "Responsible Consumption and Production". It is the goal about the relationship between what we make, what we use and what we throw away.

## The four targets that matter here

- 12.2 — sustainable management and efficient use of natural resources. You cannot manage what you do not measure, which is why recording matters.
- 12.3 — halve per-capita food waste by 2030. Canteens and hostels are exactly the setting this target describes.
- 12.5 — substantially reduce waste generation through prevention, reduction, recycling and reuse. Note the order: prevention comes first.
- 12.8 — ensure people have the information and awareness for sustainable lifestyles. A waste guide and a learning library are a direct response to this.

## Why campuses are a good unit

A campus is large enough for the numbers to mean something and small enough to change. The same people eat the same meals and use the same bins every day. A shift in habit shows up in the data within weeks.

## What EcoCampus contributes

It does not solve SDG 12. What it does is remove the excuse of not knowing: what you throw away, what should happen to it, and whether the campus as a whole is moving in the right direction. The actions are still yours.`,
  },
];
