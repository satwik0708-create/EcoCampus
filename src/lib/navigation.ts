import {
  Apple,
  BarChart3,
  BookOpen,
  Building2,
  Coins,
  FileText,
  LayoutDashboard,
  Leaf,
  Recycle,
  Settings,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

/**
 * Student and administrator navigation are defined separately and never
 * merged — the two roles get genuinely different products, not one dashboard
 * with a few hidden buttons.
 */
export const STUDENT_NAV: NavSection[] = [
  {
    title: "Track",
    items: [
      {
        href: "/student",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Your points, streak and progress at a glance.",
      },
      {
        href: "/student/waste",
        label: "Waste Tracker",
        icon: Trash2,
        description: "Record what you threw away and how you disposed of it.",
      },
      {
        href: "/student/food-waste",
        label: "Food Waste",
        icon: Apple,
        description: "Log leftovers and spot your own patterns.",
      },
    ],
  },
  {
    title: "Learn",
    items: [
      {
        href: "/student/guide",
        label: "Waste Guide",
        icon: Recycle,
        description: "Reduce, reuse, recycle and dispose — item by item.",
      },
      {
        href: "/student/learn",
        label: "Learn",
        icon: BookOpen,
        description: "Short reads on responsible consumption.",
      },
    ],
  },
  {
    title: "Participate",
    items: [
      {
        href: "/student/challenges",
        label: "Challenges",
        icon: Target,
        description: "Join campus challenges and track real progress.",
      },
      {
        href: "/student/leaderboard",
        label: "Leaderboard",
        icon: Trophy,
        description: "See how the campus is doing.",
      },
      {
        href: "/student/points",
        label: "Points History",
        icon: Coins,
        description: "Every point you have earned, and why.",
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        href: "/student/profile",
        label: "Profile",
        icon: UserCog,
        description: "Your details and password.",
      },
    ],
  },
];

export const ADMIN_NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        description: "Institutional overview of participation and activity.",
      },
      {
        href: "/admin/trends",
        label: "Trends",
        icon: BarChart3,
        description: "Campus waste and engagement over time.",
      },
    ],
  },
  {
    title: "Data",
    items: [
      {
        href: "/admin/waste-data",
        label: "Waste Data",
        icon: Trash2,
        description: "Browse and filter every waste record.",
      },
      {
        href: "/admin/food-waste-data",
        label: "Food Waste Data",
        icon: Apple,
        description: "Browse and filter every food waste record.",
      },
      {
        href: "/admin/users",
        label: "Users",
        icon: Users,
        description: "Accounts, roles and access.",
      },
    ],
  },
  {
    title: "Manage",
    items: [
      {
        href: "/admin/challenges",
        label: "Challenges",
        icon: Target,
        description: "Create and run campus challenges.",
      },
      {
        href: "/admin/guide",
        label: "Waste Guide",
        icon: Recycle,
        description: "Maintain disposal guidance.",
      },
      {
        href: "/admin/content",
        label: "Educational Content",
        icon: FileText,
        description: "Publish learning material.",
      },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: Settings,
        description: "Points rules, recommendation rules and configuration.",
      },
    ],
  },
];

export const PUBLIC_NAV: NavItem[] = [
  {
    href: "/#how-it-works",
    label: "How it works",
    icon: Sparkles,
    description: "The student and institutional workflow.",
  },
  {
    href: "/#features",
    label: "Features",
    icon: Leaf,
    description: "What EcoCampus actually does.",
  },
  {
    href: "/#institutions",
    label: "For institutions",
    icon: Building2,
    description: "Campus-wide oversight.",
  },
  {
    href: "/sdg-12",
    label: "SDG 12",
    icon: Target,
    description: "How EcoCampus maps to the global goal.",
  },
];
