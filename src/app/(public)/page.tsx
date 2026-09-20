import Link from "next/link";
import {
  ArrowRightIcon,
  BarChart3Icon,
  BookOpenIcon,
  CheckIcon,
  CoinsIcon,
  DatabaseIcon,
  FlameIcon,
  LeafIcon,
  ListChecksIcon,
  RecycleIcon,
  ShieldCheckIcon,
  TargetIcon,
  TrashIcon,
  TrophyIcon,
  UtensilsIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TAGLINE } from "@/components/brand";

/**
 * Public landing page.
 *
 * Everything described here is a feature that exists in the running
 * application. There are no invented usage statistics and no claimed
 * capabilities (AI, image recognition, third-party data) that the product
 * does not have.
 */

export const metadata = {
  title: "EcoCampus — Small Actions. Sustainable Campus.",
  description:
    "Track campus waste, learn how to dispose of it properly, join sustainability challenges and give your institution real data on responsible consumption.",
};

const PROBLEMS = [
  {
    title: "Waste leaves no trace",
    body: "Bins are emptied and the data disappears with them. Nobody can say which materials dominate campus waste, or whether that is changing.",
  },
  {
    title: "Nobody is sure what goes where",
    body: "Segregation rules differ by material and by campus. When the right bin is a guess, recyclable material ends up in landfill.",
  },
  {
    title: "Food waste is invisible",
    body: "Uneaten meals are scraped away individually, so the pattern behind them — the meal, the portion, the day — is never seen.",
  },
  {
    title: "Awareness campaigns stop at posters",
    body: "One-off drives create a spike of interest and no lasting habit, because nothing records whether behaviour actually shifted.",
  },
];

const STEPS = [
  {
    icon: ListChecksIcon,
    title: "Record an activity",
    body: "Pick a predefined category, describe the item, enter a quantity and say how you disposed of it. Takes about fifteen seconds.",
  },
  {
    icon: DatabaseIcon,
    title: "The server does the work",
    body: "One transaction saves the record, awards points from configured rules, recalculates your streak from your real activity dates and updates every challenge you have joined.",
  },
  {
    icon: LeafIcon,
    title: "Get concrete guidance",
    body: "A rule-based recommendation responds to what you just logged — a reusable bottle if plastic keeps appearing, smaller portions if food waste does.",
  },
  {
    icon: BarChart3Icon,
    title: "Institutions see the pattern",
    body: "Administrators get aggregated campus trends by category, department and time, computed from the same records.",
  },
];

const STUDENT_FEATURES = [
  {
    icon: TrashIcon,
    title: "Waste tracker",
    body: "Eight predefined categories, five disposal routes, validated quantities and optional notes. Your history is private to you.",
  },
  {
    icon: UtensilsIcon,
    title: "Food waste tracker",
    body: "Log by meal and food category, mark whether the waste was avoidable, and see your own pattern across the last 30 days.",
  },
  {
    icon: RecycleIcon,
    title: "Searchable waste guide",
    body: "Every item carries four answers: reduce, reuse, recycle, dispose. Searchable, filterable, and maintained by your campus team.",
  },
  {
    icon: TargetIcon,
    title: "Challenges with honest progress",
    body: "Progress is measured from your actual records. There is no button to mark a challenge complete — you either did it or you didn't.",
  },
  {
    icon: CoinsIcon,
    title: "Auditable points",
    body: "Every point is a ledger entry with a reason and a timestamp. Your balance is the sum of that ledger, and you can read all of it.",
  },
  {
    icon: FlameIcon,
    title: "Streaks that survive reality",
    body: "Your streak is derived from the days you actually recorded something, in your campus timezone — not a counter that ticks up on page load.",
  },
  {
    icon: TrophyIcon,
    title: "Campus leaderboard",
    body: "Ranked on real point totals, showing display names only. No email addresses, no personal details.",
  },
  {
    icon: BookOpenIcon,
    title: "Learning library",
    body: "Short reads on segregation, reuse, recycling and responsible consumption, published from the admin console.",
  },
];

const INSTITUTION_FEATURES = [
  "Total students, records, activities and points awarded — all live counts.",
  "Waste distribution by category and disposal route across the whole campus.",
  "Daily activity and participation trends over a rolling window.",
  "Department-level breakdown of students, records and points.",
  "Challenge engagement with real completion rates.",
  "Filterable tables of every waste and food waste record.",
  "Full CRUD for challenges, waste guide entries and learning content.",
  "Configurable points values and recommendation rules, no redeploy needed.",
];

const SDG_TARGETS = [
  {
    code: "12.2",
    title: "Sustainable management of natural resources",
    body: "Consumption and disposal are recorded per item and per category, giving a campus a factual basis for resource decisions.",
  },
  {
    code: "12.3",
    title: "Halve food waste",
    body: "A dedicated tracker records food waste by meal, category and avoidability, so the pattern behind it becomes visible.",
  },
  {
    code: "12.5",
    title: "Reduce waste through prevention and recycling",
    body: "Item-level guidance and challenges are pointed at prevention, reuse and correct recycling — and participation is measured.",
  },
  {
    code: "12.8",
    title: "Awareness for sustainable lifestyles",
    body: "A learning library, deterministic recommendations and streaks turn one-off awareness into a recorded daily habit.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b">
        <div
          aria-hidden="true"
          className="from-primary/8 pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent"
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-3xl space-y-6">
            <Badge variant="success" className="gap-1.5 px-3 py-1">
              <LeafIcon className="size-3.5" />
              UN SDG 12 · Responsible Consumption &amp; Production
            </Badge>

            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {TAGLINE}
            </h1>

            <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
              EcoCampus is a campus sustainability platform where students record
              the waste they produce, learn exactly how to deal with it, and take
              part in challenges that are scored from real activity — while their
              institution gets the aggregated picture it has never had.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register">
                  Get started
                  <ArrowRightIcon />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#how-it-works">Explore EcoCampus</Link>
              </Button>
            </div>

            <p className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheckIcon className="text-success size-4" />
                Your records stay private to you
              </span>
              <span className="inline-flex items-center gap-1.5">
                <DatabaseIcon className="text-success size-4" />
                Every figure comes from the database
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="text-success size-4" />
                No AI, no external data feeds
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Problem */}
      <section className="border-b py-20" id="problem">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              The problem
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              A campus produces waste all day and remembers none of it
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {PROBLEMS.map((problem) => (
              <Card key={problem.title}>
                <CardContent className="space-y-2">
                  <h3 className="font-medium">{problem.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {problem.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- How it works */}
      <section className="bg-muted/35 border-b py-20" id="how-it-works">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              How it works
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Four steps, and the whole loop is server-side
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Nothing is simulated in the browser. Points, streaks and challenge
              progress are computed in one database transaction, so a page
              refresh always shows the same numbers.
            </p>
          </div>

          <ol className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <Card className="h-full">
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                        <step.icon className="size-[18px]" aria-hidden="true" />
                      </span>
                      <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                        Step {index + 1}
                      </span>
                    </div>
                    <h3 className="font-medium">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.body}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ Features */}
      <section className="border-b py-20" id="features">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              For students
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Everything a student needs, and nothing that pretends
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {STUDENT_FEATURES.map((feature) => (
              <Card key={feature.title} className="h-full">
                <CardContent className="space-y-3">
                  <span className="bg-accent text-accent-foreground flex size-9 items-center justify-center rounded-lg">
                    <feature.icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- Institutions */}
      <section className="bg-muted/35 border-b py-20" id="institutions">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              For institutions
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              A separate console, not a student dashboard with extra buttons
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Administrators sign in to their own experience. They see aggregated
              campus data and manage the content students rely on — but student
              records stay private, and the admin console never exposes a
              student&apos;s email address.
            </p>
            <Button asChild>
              <Link href="/login">
                Sign in to the console
                <ArrowRightIcon />
              </Link>
            </Button>
          </div>

          <Card>
            <CardContent className="space-y-3">
              <h3 className="text-sm font-semibold tracking-wide uppercase">
                What the console shows
              </h3>
              <ul className="space-y-2.5">
                {INSTITUTION_FEATURES.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <CheckIcon className="text-success mt-0.5 size-4 shrink-0" />
                    <span className="text-muted-foreground leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* --------------------------------------------------------------- SDG 12 */}
      <section className="border-b py-20" id="sdg-12">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              SDG 12 alignment
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-balance">
              Mapped to four targets of Responsible Consumption and Production
            </h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {SDG_TARGETS.map((target) => (
              <Card key={target.code}>
                <CardContent className="space-y-2">
                  <Badge variant="outline" className="font-mono">
                    Target {target.code}
                  </Badge>
                  <h3 className="font-medium">{target.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {target.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6">
            <Button variant="outline" asChild>
              <Link href="/sdg-12">
                Read the full SDG 12 breakdown
                <ArrowRightIcon />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ CTA */}
      <section className="py-20">
        <div className="mx-auto w-full max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Start with one record today
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl leading-relaxed text-balance">
            Create a student account, log the next thing you throw away, and
            watch the guidance, points and streak follow from it. Your campus
            gets the data it needs as a by-product.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">
                Create your account
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">I already have one</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
