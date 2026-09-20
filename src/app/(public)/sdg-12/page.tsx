import Link from "next/link";
import { ArrowRightIcon, CircleDotIcon, InfoIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "SDG 12 Alignment",
  description:
    "How EcoCampus maps to UN Sustainable Development Goal 12 — Responsible Consumption and Production — across targets 12.2, 12.3, 12.5 and 12.8.",
};

const TARGETS = [
  {
    code: "12.2",
    heading: "Sustainable management and efficient use of natural resources",
    official:
      "By 2030, achieve the sustainable management and efficient use of natural resources.",
    how: [
      "Every disposal is recorded against one of eight predefined material categories, so a campus can see which resources dominate its waste stream.",
      "Quantities are captured with an explicit unit, and mass-based entries are summed into a recorded-mass figure.",
      "The administrator console aggregates this by category, by department and over time.",
    ],
  },
  {
    code: "12.3",
    heading: "Halve global food waste",
    official:
      "By 2030, halve per capita global food waste at the retail and consumer levels, and reduce food losses along production and supply chains.",
    how: [
      "Food waste has its own tracker rather than being folded into general waste.",
      "Each entry records the meal, the food category and whether the waste was avoidable — the three things that explain why it happened.",
      "Students see their own 30-day pattern by category and by meal; administrators see the same shape for the whole campus.",
    ],
  },
  {
    code: "12.5",
    heading: "Substantially reduce waste generation",
    official:
      "By 2030, substantially reduce waste generation through prevention, reduction, recycling and reuse.",
    how: [
      "The waste guide answers four questions for every item: how to reduce it, how to reuse it, how to recycle it and how to dispose of it when recovery is not possible.",
      "The points engine pays a segregation bonus when waste is recycled, composted, reused or sent for special disposal, so correct handling is rewarded over mere logging.",
      "Challenges target prevention and recovery behaviour, and their progress is measured from real records.",
    ],
  },
  {
    code: "12.8",
    heading: "Awareness for sustainable development and lifestyles",
    official:
      "By 2030, ensure that people everywhere have the relevant information and awareness for sustainable development and lifestyles in harmony with nature.",
    how: [
      "A learning library publishes short, campus-specific reads on segregation, reuse, recycling and responsible consumption.",
      "Deterministic recommendations respond to what a student has actually been logging, so guidance arrives at the moment it is relevant.",
      "Streaks and a campus leaderboard are there to turn a one-off awareness push into a recorded habit.",
    ],
  },
];

const EXPECTED_IMPACT = [
  {
    title: "Better waste awareness",
    body: "Students who log their own waste for a few weeks can see which material they generate most — a fact almost nobody knows about themselves beforehand.",
  },
  {
    title: "More responsible consumption choices",
    body: "Item-level reduce/reuse guidance is delivered at the point of disposal, where it can influence the next purchase.",
  },
  {
    title: "Higher recycling and reuse participation",
    body: "Recording the disposal route makes correct segregation visible and rewardable, rather than invisible and unrewarded.",
  },
  {
    title: "Sustained student engagement",
    body: "Streaks, challenges and a leaderboard give a reason to return daily rather than during a campaign week.",
  },
  {
    title: "Data-driven campus decisions",
    body: "Institutions gain a factual baseline — by category, department and period — instead of estimates.",
  },
];

export default function Sdg12Page() {
  return (
    <>
      <section className="border-b">
        <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
          <Badge variant="success" className="mb-4 gap-1.5 px-3 py-1">
            <CircleDotIcon className="size-3.5" />
            United Nations Sustainable Development Goal 12
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            Responsible Consumption &amp; Production
          </h1>
          <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
            EcoCampus was designed around four targets of SDG 12. This page sets
            out, target by target, exactly which parts of the product address
            them — and what the platform is expected to achieve, as distinct
            from what it has already measured.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto w-full max-w-4xl space-y-6 px-4 sm:px-6">
          {TARGETS.map((target) => (
            <Card key={target.code}>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-semibold">
                    {target.code}
                  </span>
                  <h2 className="text-lg font-semibold tracking-tight">
                    {target.heading}
                  </h2>
                </div>

                <blockquote className="border-primary/30 text-muted-foreground border-l-2 pl-4 text-sm italic leading-relaxed">
                  {target.official}
                </blockquote>

                <div className="space-y-2">
                  <p className="text-sm font-medium">How EcoCampus addresses it</p>
                  <ul className="space-y-2">
                    {target.how.map((item) => (
                      <li
                        key={item}
                        className="text-muted-foreground flex items-start gap-2.5 text-sm leading-relaxed"
                      >
                        <span
                          aria-hidden="true"
                          className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/35 border-y py-16">
        <div className="mx-auto w-full max-w-4xl space-y-6 px-4 sm:px-6">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight">Expected impact</h2>
          </div>

          <Alert variant="info">
            <InfoIcon />
            <AlertTitle>These are expected outcomes, not measured results</AlertTitle>
            <AlertDescription>
              EcoCampus does not publish impact figures it has not measured. The
              points below describe what the platform is designed to achieve on a
              campus that adopts it. Any real numbers will appear in the
              administrator console, computed from that campus&apos;s own records.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 sm:grid-cols-2">
            {EXPECTED_IMPACT.map((item) => (
              <Card key={item.title}>
                <CardContent className="space-y-2">
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto w-full max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-balance">
            Put SDG 12 into practice on your campus
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-xl leading-relaxed">
            Start by recording one activity. The targets above are addressed by
            what students do every day, not by what the platform claims.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">
                Create an account
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/">Back to overview</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
