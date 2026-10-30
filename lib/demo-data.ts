// Pure: the sample job search a demo visitor lands in. No Firebase, safe on client and server.
// Dates are relative to `now` so the dashboard, analytics, and weekly review always look current.
// The letters' claims must trace to the background and resume below; a test checks that.

import type { LetterClaim } from "@/types/coverLetter";

export interface DemoDoc {
  // Path under users/{uid}; "" is the user doc itself.
  collection: string;
  id: string;
  data: Record<string, unknown>;
}

export const DEMO_RESUME = `Riley Chen
Product Designer · Chicago, IL

EXPERIENCE
Product Designer, Brightpath Health (2022 – Present)
- Redesigned the patient intake flow, cutting average completion time from 11 minutes to 4
- Built and maintain the Figma design system used by 3 product squads
- Run monthly usability sessions with patients and clinic staff

UX Designer, Loop Commerce (2019 – 2022)
- Designed checkout and returns flows for 40+ Shopify merchants
- Partnered with engineers to ship accessible React components (WCAG 2.1 AA)
- Introduced a research repository that cut duplicate studies

SKILLS
Figma, prototyping, usability testing, design systems, HTML/CSS, React basics, accessibility audits

EDUCATION
B.A. Cognitive Science, University of Illinois`;

export const DEMO_BACKGROUNDS = [
  {
    id: "demo-bg-brightpath",
    title: "Product Designer",
    company: "Brightpath Health",
    startDate: "Mar 2022",
    endDate: "Present",
    answers: {
      role: "I own the patient-facing side of the app: intake, appointment booking, and messaging. Most weeks are split between design reviews with my squad, prototyping, and sitting in on clinic calls.",
      team: "Squad of 5 engineers, a PM, and me. I report to the head of design and mentor one junior designer.",
      accomplishments:
        "Rebuilt the intake flow. Average completion time dropped from 11 minutes to 4, and front-desk staff stopped re-entering paper forms.\nStarted the design system that three squads now use.",
      challenge:
        "Older patients were abandoning intake at the insurance step. I watched six sessions in the clinic, saw people hunting for the member ID on their card, and added a photo-of-your-card option. Drop-off at that step fell by half.",
      stories:
        "A patient told me she'd filled out intake on the bus for the first time without calling her daughter for help. That's the reason I like healthcare work.",
      skills: "Figma, FigJam, Maze, usability testing, design tokens",
    },
  },
  {
    id: "demo-bg-loop",
    title: "UX Designer",
    company: "Loop Commerce",
    startDate: "Jun 2019",
    endDate: "Feb 2022",
    answers: {
      role: "Designed checkout and returns flows that merchants embedded in their Shopify stores.",
      accomplishments:
        "Shipped a returns portal used by 40+ merchants. Paired with engineers to build accessible React components.",
      challenge:
        "Merchants kept asking for one-off checkout tweaks. I set up a research repository and a short intake form so we could see which requests repeated, which cut duplicate studies and helped us say no with data.",
      skills: "Figma, HTML/CSS, React basics, accessibility audits",
    },
  },
];

export const DEMO_VOICE_SETTINGS = {
  targetWords: null,
  format: "full",
  alwaysMention: "",
  guidelines: "Open with a real moment, not a summary of my resume. Keep it under 250 words. Sound like a person, not a press release.",
  neverSay: "passionate, leverage, synergy, thrilled, delighted\n* Never use em dashes",
};

export const DEMO_LETTERS: { id: string; jobId: string; daysAgo: number; content: string; claims: LetterClaim[] }[] = [
  {
    id: "demo-letter-northwind",
    jobId: "demo-job-northwind",
    daysAgo: 19,
    content: `Hi Northwind Care team,

A patient once told me she'd filled out her intake forms on the bus, alone, for the first time. That's the kind of moment I design for, and it's why your Senior Product Designer role caught my eye.

At Brightpath Health I rebuilt our patient intake flow. Average completion time dropped from 11 minutes to 4, and front-desk staff stopped re-entering paper forms. When older patients kept abandoning the insurance step, I sat in on clinic sessions, watched people hunt for their member ID, and added a photo-of-your-card option. Drop-off at that step fell by half.

I also started the design system that three squads now use, so I know how to keep a growing product consistent without slowing teams down.

Your focus on making care easier for people managing chronic conditions is exactly where I want to spend the next few years. I'd love to hear what your patients are struggling with right now.

Thanks,
Riley`,
    claims: [
      {
        quote: "A patient once told me she'd filled out her intake forms on the bus, alone, for the first time",
        source: "Product Designer at Brightpath Health · Any stories that show who you are?",
        evidence: "A patient told me she'd filled out intake on the bus for the first time",
      },
      {
        quote: "I rebuilt our patient intake flow",
        source: "Product Designer at Brightpath Health · What are you proudest of?",
        evidence: "Rebuilt the intake flow.",
      },
      {
        quote: "Average completion time dropped from 11 minutes to 4",
        source: "Product Designer at Brightpath Health · What are you proudest of?",
        evidence: "Average completion time dropped from 11 minutes to 4",
      },
      {
        quote: "front-desk staff stopped re-entering paper forms",
        source: "Product Designer at Brightpath Health · What are you proudest of?",
        evidence: "front-desk staff stopped re-entering paper forms",
      },
      {
        quote: "added a photo-of-your-card option",
        source: "Product Designer at Brightpath Health · Tell a hard problem you solved.",
        evidence: "added a photo-of-your-card option",
      },
      {
        quote: "Drop-off at that step fell by half",
        source: "Product Designer at Brightpath Health · Tell a hard problem you solved.",
        evidence: "Drop-off at that step fell by half",
      },
      {
        quote: "I also started the design system that three squads now use",
        source: "Product Designer at Brightpath Health · What are you proudest of?",
        evidence: "Started the design system that three squads now use",
      },
    ],
  },
  {
    id: "demo-letter-fieldnote",
    jobId: "demo-job-fieldnote",
    daysAgo: 13,
    content: `Hi Fieldnote team,

I've spent the last few years building a design system from scratch, so your Design Systems role reads like a description of my favorite part of the job.

At Brightpath Health I started the design system that three squads now use. I maintain it in Figma with design tokens, and I've led workshops teaching engineers how to use them. Before that, at Loop Commerce, I paired with engineers to build accessible React components, which taught me that a system only works if the people shipping code actually like using it.

I also care about the unglamorous part: deciding what not to build. At Loop I set up a research repository so we could see which merchant requests repeated, which helped us say no with data.

I'd love to bring that mix of craft and restraint to Fieldnote.

Thanks,
Riley`,
    claims: [
      {
        quote: "building a design system from scratch",
        source: "Your resume",
        evidence: "Built and maintain the Figma design system",
      },
      {
        quote: "I started the design system that three squads now use",
        source: "Product Designer at Brightpath Health · What are you proudest of?",
        evidence: "Started the design system that three squads now use",
      },
      {
        quote: "I maintain it in Figma with design tokens",
        source: "Product Designer at Brightpath Health · Skills, tools, and methods you used",
        evidence: "Figma, FigJam, Maze, usability testing, design tokens",
      },
      { quote: "I've led workshops teaching engineers how to use them", source: null, evidence: null },
      {
        quote: "I paired with engineers to build accessible React components",
        source: "UX Designer at Loop Commerce · What are you proudest of?",
        evidence: "Paired with engineers to build accessible React components",
      },
      {
        quote: "I set up a research repository so we could see which merchant requests repeated",
        source: "UX Designer at Loop Commerce · Tell a hard problem you solved.",
        evidence: "I set up a research repository and a short intake form so we could see which requests repeated",
      },
      {
        quote: "helped us say no with data",
        source: "UX Designer at Loop Commerce · Tell a hard problem you solved.",
        evidence: "helped us say no with data",
      },
    ],
  },
];

interface DemoJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  source: string;
  stage: string;
  fitScore: number | null;
  fitReasoning: string | null;
  appliedDaysAgo: number | null;
  // Days from now until a booked interview, so Today's "Coming up" has something to show.
  interviewInDays?: number;
  description: string;
}

const JOBS: DemoJob[] = [
  {
    id: "demo-job-northwind",
    title: "Senior Product Designer",
    company: "Northwind Care",
    location: "Chicago, IL (hybrid)",
    salary: "$135k – $155k",
    source: "referral",
    stage: "interview",
    fitScore: 86,
    fitReasoning:
      "Strong match: you've shipped patient intake and booking flows in healthcare and run usability sessions with clinic staff. The gap is the 'senior' scope; show where you set direction for other designers, like mentoring and the design system.",
    appliedDaysAgo: 19,
    description:
      "Northwind Care builds tools that help people manage chronic conditions between doctor visits. We're hiring a Senior Product Designer to own the patient app end to end: research, flows, and visual design. You'll work with a squad of engineers and a PM, mentor other designers, and partner with our clinical team. 5+ years of product design, healthcare experience a plus.",
  },
  {
    id: "demo-job-fieldnote",
    title: "Product Designer, Design Systems",
    company: "Fieldnote",
    location: "Remote (US)",
    salary: "$120k – $140k",
    source: "linkedin",
    stage: "phone_screen",
    fitScore: 78,
    fitReasoning:
      "You built and maintain a Figma design system used by three squads and have paired with engineers on accessible React components. Fieldnote wants token pipelines and documentation experience, which your resume doesn't show yet.",
    appliedDaysAgo: 13,
    interviewInDays: 2,
    description:
      "Fieldnote is a research notes platform for product teams. Our Design Systems designer owns our component library in Figma and partners with front-end engineers on the coded version. You'll define tokens, write usage docs, and help every squad ship consistent UI faster.",
  },
  {
    id: "demo-job-tidepool",
    title: "Product Designer",
    company: "Tidepool Learning",
    location: "Chicago, IL",
    salary: "$118k – $130k",
    source: "referral",
    stage: "offer",
    fitScore: 88,
    fitReasoning:
      "Your research habits and accessibility work line up with an ed-tech product used by teachers and students. Strong overlap on usability testing and design systems.",
    appliedDaysAgo: 34,
    description:
      "Tidepool builds reading tools for middle school classrooms. We need a Product Designer to run research with teachers, design accessible student experiences, and help grow our design system.",
  },
  {
    id: "demo-job-civic",
    title: "UX Designer",
    company: "Civic Forms",
    location: "Remote (US)",
    salary: "$105k – $125k",
    source: "direct",
    stage: "applied",
    fitScore: 81,
    fitReasoning:
      "Civic Forms turns government paperwork into simple online forms, which is close to your intake flow work. Accessibility audits are a big plus here.",
    appliedDaysAgo: 3,
    description:
      "Civic Forms helps cities replace paper forms with accessible online services. You'll design form flows used by residents of all ages and abilities, test them in the field, and meet WCAG 2.1 AA on everything we ship.",
  },
  {
    id: "demo-job-kettle",
    title: "Product Designer",
    company: "Kettle",
    location: "New York, NY",
    salary: "$130k – $150k",
    source: "wellfound",
    stage: "applied",
    fitScore: 64,
    fitReasoning:
      "Solid flow design and checkout experience from Loop Commerce, but no fintech or data-heavy dashboard work yet, which is the core of this role.",
    appliedDaysAgo: 6,
    description:
      "Kettle is a budgeting app for small businesses. We're looking for a Product Designer to own our dashboards and reporting experience, working closely with data engineers.",
  },
  {
    id: "demo-job-brio",
    title: "Product Designer",
    company: "Brio Health",
    location: "Remote (US)",
    salary: null,
    source: "linkedin",
    stage: "rejected",
    fitScore: 58,
    fitReasoning: "Healthcare match, but the role is heavily focused on native iOS design, which isn't in your background.",
    appliedDaysAgo: 30,
    description: "Brio Health is hiring a Product Designer to lead our native iOS app. Deep iOS design experience required.",
  },
  {
    id: "demo-job-panorama",
    title: "UX Researcher",
    company: "Panorama",
    location: "Remote (US)",
    salary: "$110k – $125k",
    source: "recruiter",
    stage: "rejected",
    fitScore: 52,
    fitReasoning:
      "You run usability sessions, but this is a full-time research role asking for survey design and statistics experience.",
    appliedDaysAgo: 26,
    description: "Panorama needs a UX Researcher to lead mixed-methods studies, including large surveys and quantitative analysis.",
  },
  {
    id: "demo-job-oakline",
    title: "Senior Designer",
    company: "Oakline Studio",
    location: "Chicago, IL",
    salary: null,
    source: "otta",
    stage: "saved",
    fitScore: null,
    fitReasoning: null,
    appliedDaysAgo: null,
    description: "Oakline is a small product studio working with health and climate startups. We're hiring a senior designer who can run projects from research to launch.",
  },
];

const COMPANY_RESEARCH: Record<string, Record<string, string>> = {
  "demo-job-northwind": {
    whatTheyDo: "Digital care for people living with chronic conditions like diabetes and hypertension.",
    productSummary: "A patient app for tracking symptoms and medications, plus a dashboard for care teams.",
    targetCustomers: "Health systems and employers, with patients as the daily users.",
    recentNews: "Expanded to two new hospital partners this year.",
    values: "Patients first, small teams with real ownership, write things down.",
    competitors: "Omada, Livongo, Virta",
    whyInterested: "Same patients I design for at Brightpath, with more room to shape the product.",
  },
  "demo-job-fieldnote": {
    whatTheyDo: "A shared notes and insights tool for product and research teams.",
    productSummary: "Tag interview notes, find patterns across studies, and share highlights with the team.",
    targetCustomers: "Product teams at mid-size software companies.",
    values: "Craft, clarity, and shipping small.",
    competitors: "Dovetail, Condens, EnjoyHQ",
    whyInterested: "Design systems full time, for a product built for researchers.",
  },
};

export const DEMO_PROFILE = `## Tone
Warm and direct. Riley sounds like a designer explaining their work to a friend, not pitching.

## Structure
Open with a real moment from their work, then one or two concrete results, then a short line on why this company. Close with a single "Thanks," and their first name.

## Sentences and rhythm
Short to medium sentences. Plain words. Uses contractions.

## Signature moves
Grounds everything in what patients or users actually did. Likes a quiet line about restraint ("deciding what not to build").

## Avoid
Anything on their banned list. Big claims without a number or story behind them.`;

function daysAgo(now: Date, n: number): Date {
  return new Date(now.getTime() - n * 86_400_000);
}

function weekStart(now: Date, weeksBack: number): Date {
  const s = new Date(now);
  s.setDate(now.getDate() - now.getDay() - 7 * weeksBack);
  s.setHours(0, 0, 0, 0);
  return s;
}

export function buildDemoDocs(now: Date): DemoDoc[] {
  const docs: DemoDoc[] = [];
  const add = (collection: string, id: string, data: Record<string, unknown>) => docs.push({ collection, id, data });

  add("", "", {
    apiKey: null,
    activeResumeId: "demo-resume",
    goals: "Senior product design role in healthcare or civic tech. Hybrid in Chicago or remote. $125k+. Want to keep doing research with real users.",
    voiceProfile: DEMO_PROFILE,
    voiceProfileUpdatedAt: daysAgo(now, 20),
    voiceSettings: DEMO_VOICE_SETTINGS,
    demo: true,
    createdAt: daysAgo(now, 40),
  });

  add("resumes", "demo-resume", {
    label: "Product design · healthcare",
    content: DEMO_RESUME,
    fileUrl: null,
    createdAt: daysAgo(now, 40),
  });

  for (const b of DEMO_BACKGROUNDS) {
    const { id, ...rest } = b;
    add("backgrounds", id, { ...rest, included: true, createdAt: daysAgo(now, 38), updatedAt: daysAgo(now, 21) });
  }

  JOBS.forEach((j, i) => {
    const { id, appliedDaysAgo, interviewInDays, ...rest } = j;
    const created = daysAgo(now, (appliedDaysAgo ?? 1) + 1);
    add("jobs", id, {
      ...rest,
      url: null,
      notes: null,
      resumeIdUsed: j.fitScore === null ? null : "demo-resume",
      appliedAt: appliedDaysAgo === null ? null : daysAgo(now, appliedDaysAgo),
      nextInterviewAt:
        interviewInDays === undefined ? null : new Date(now.getFullYear(), now.getMonth(), now.getDate() + interviewInDays),
      lastFollowUpAt: null,
      snoozedUntil: null,
      followUps: 0,
      followUpsOff: false,
      applyBy: null,
      createdAt: created,
      updatedAt: daysAgo(now, Math.max(0, (appliedDaysAgo ?? 1) - 2)),
    });
    const research = COMPANY_RESEARCH[id] ?? {};
    add("companies", `demo-company-${i}`, {
      name: j.company,
      jobId: id,
      logoUrl: null,
      whatTheyDo: research.whatTheyDo ?? null,
      productSummary: research.productSummary ?? null,
      targetCustomers: research.targetCustomers ?? null,
      recentNews: research.recentNews ?? null,
      values: research.values ?? null,
      competitors: research.competitors ?? null,
      whyInterested: research.whyInterested ?? null,
      createdAt: created,
      updatedAt: created,
    });
  });

  for (const l of DEMO_LETTERS)
    add("coverLetters", l.id, {
      jobId: l.jobId,
      resumeId: "demo-resume",
      content: l.content,
      notes: "",
      claims: l.claims,
      edited: false,
      useAsVoiceSample: false,
      createdAt: daysAgo(now, l.daysAgo),
    });

  add("writingSamples", "demo-sample-letter", {
    label: "Letter I wrote for a clinic software job",
    kind: "cover_letter",
    included: true,
    createdAt: daysAgo(now, 39),
    content: `Hi Harbor team,

Last spring I watched a front-desk coordinator re-type a patient's insurance details for the third time that morning. She laughed it off, but it stuck with me, and it's a big part of why I want to work on Harbor's scheduling tools.

At Brightpath I design the patient side of our app, and most of my best ideas come from sitting in the clinic and watching what people actually do. I'd bring that habit with me.

Thanks,
Riley`,
  });

  const answers = [
    {
      id: "demo-answer-research",
      question: "Tell me about a time you used research to change a decision.",
      answer:
        "At Brightpath, older patients kept dropping out of intake at the insurance step, and the team's first idea was to add more help text. I asked to sit in on six clinic sessions first. What I saw was people hunting for the member ID on their card, not misunderstanding the form. So instead of help text we added a photo-of-your-card option. Drop-off at that step fell by half.",
      tags: ["behavioral", "research"],
      jobId: null,
    },
    {
      id: "demo-answer-healthcare",
      question: "Why do you want to work in healthcare?",
      answer:
        "A patient once told me she'd filled out her intake on the bus for the first time without calling her daughter for help. That's the whole reason. Small design decisions in healthcare decide whether someone feels capable or dependent.",
      tags: ["motivation"],
      jobId: null,
    },
    {
      id: "demo-answer-engineers",
      question: "How do you work with engineers?",
      answer:
        "Early and often. At Loop Commerce I paired with engineers to build our accessible React components, so a lot of design decisions happened at their desk instead of in a handoff doc.",
      tags: ["collaboration"],
      jobId: null,
    },
    {
      id: "demo-answer-why-northwind",
      question: "Why Northwind Care?",
      answer: "",
      tags: ["interview-prep"],
      jobId: "demo-job-northwind",
    },
  ];
  answers.forEach(({ id, ...a }, i) =>
    add("answerBank", id, {
      ...a,
      useAsVoiceSample: false,
      createdAt: daysAgo(now, 15 - i),
      updatedAt: daysAgo(now, 15 - i),
    })
  );

  add("interviewPreps", "demo-prep-northwind", {
    jobId: "demo-job-northwind",
    interviewProcess: "45-minute portfolio review with the design lead, then a panel with the PM and a clinician.",
    mockQuestions: [
      "Walk us through a project where research changed your design direction.",
      "How would you design for a patient who is anxious about a new diagnosis?",
      "Tell us about a time you disagreed with a PM. How did you resolve it?",
      "How do you decide what goes into a design system and what stays a one-off?",
      "How would you measure whether a new intake flow is working?",
      "What would you do in your first 90 days on our patient app?",
      "How do you work with clinicians who have very little time?",
      "Tell us about a design you shipped that didn't work. What did you learn?",
    ],
    studyTips:
      "Pick two portfolio projects and practice telling each in under five minutes\nRead Northwind's patient app reviews and note three recurring complaints\nPrepare one story about mentoring the junior designer\nHave numbers ready for the intake flow: 11 minutes to 4, drop-off halved\nPrepare a question about how clinicians give feedback on design",
    createdAt: daysAgo(now, 8),
  });

  add("debriefs", "demo-debrief-northwind", {
    jobId: "demo-job-northwind",
    interviewDate: daysAgo(now, 5),
    whatTheyAsked:
      "Portfolio walkthrough of the intake project. How I'd handle a clinician who hates a change. What I'd measure in the first month.",
    wentWell: "The photo-of-your-card story landed. The design lead asked follow-up questions for ten minutes.",
    feltWeird: "Got vague when they asked about leading other designers. I only had the mentoring example.",
    followUpOpportunities: "Send the design system documentation sample they asked about.",
    answersToImprove: "\"Tell us about leading without authority.\" Use the design system rollout across three squads next time.",
    createdAt: daysAgo(now, 5),
  });

  add("weeklyReviews", "demo-review-1", {
    weekOf: weekStart(now, 1),
    applicationsSent: 2,
    interviewsBooked: 1,
    responsesReceived: 2,
    bestResumeVersion: "Product design · healthcare",
    rolesToDeprioritize: "Pure research roles and native iOS roles. Both rejections came from there.",
    nextWeekFocus: "Prep for the Northwind panel. Apply to two civic tech roles.",
    aiSummary:
      "A strong week: Northwind moved to the panel interview, and Fieldnote booked a phone screen. Referrals are converting best (2 of 2 got responses), while LinkedIn applications have the lowest response rate. Both rejections were for roles outside your core (iOS, quantitative research), so your filters are working.\n\nNext week:\n1. Prepare a leadership story for the Northwind panel, using the design system rollout.\n2. Follow up with Kettle, which has had no response in 6 days.\n3. Ask your network for one more healthcare or civic tech referral.",
    createdAt: weekStart(now, 0),
    updatedAt: weekStart(now, 0),
  });

  return docs;
}
