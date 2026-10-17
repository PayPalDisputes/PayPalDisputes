/**
 * Brand, navigation and footer for the marketing site.
 * Rename the product here: `name` is used in the navbar, footer, metadata and code samples.
 */
export const site = {
  name: "Kaleshi",
  /** The wordmark as shown in the logo: Kaleshi in Devanagari. */
  wordmark: "कलेशी",
  tagline: "Your disputes settled in seconds.",
  description:
    "Kaleshi reads every PayPal dispute, recommends whether to fight, refund or settle, and drafts the response for you to approve.",
  appHref: "/dashboard",
  sdkPackage: "@kaleshi/sdk",
  announcement: {
    enabled: true,
    label: "New",
    text: "Approve or reject the agent's drafts straight from the dashboard",
    href: "/dashboard",
  },
};

export type NavLink = { label: string; href: string; description?: string; icon?: NavIcon };
export type NavIcon =
  | "scale"
  | "file-check"
  | "handshake"
  | "store"
  | "code"
  | "webhook"
  | "flask"
  | "book"
  | "list"
  | "history";
export type NavItem =
  | { label: string; href: string }
  | { label: string; groups: { title: string; links: NavLink[] }[] };

export const nav: NavItem[] = [
  {
    label: "Product",
    groups: [
      {
        title: "Product",
        links: [
          { label: "Assessment", href: "/#assessment", description: "Fight, refund or settle, with reasons", icon: "scale" },
          { label: "Evidence", href: "/#evidence", description: "Order data matched to the claim", icon: "file-check" },
          { label: "Settlements", href: "/#settle", description: "Partial refund offers that make sense", icon: "handshake" },
          { label: "Multi-seller", href: "/#sellers", description: "Every storefront in one queue", icon: "store" },
        ],
      },
    ],
  },
  {
    label: "Developers",
    groups: [
      {
        title: "Developers",
        links: [
          { label: "API overview", href: "/#developers", description: "Assess and respond from your code", icon: "code" },
          { label: "Webhooks", href: "/#developers", description: "React to PayPal dispute events", icon: "webhook" },
          { label: "Demo mode", href: "/dashboard", description: "Try approvals without touching PayPal", icon: "flask" },
        ],
      },
    ],
  },
  {
    label: "Resources",
    groups: [
      {
        title: "Resources",
        links: [
          { label: "Dispute reasons", href: "/#capabilities", description: "The ten PayPal claim types, explained", icon: "list" },
          { label: "Seller Protection", href: "/#assessment", description: "What PayPal covers and what it doesn't", icon: "book" },
          { label: "Changelog", href: "#", description: "What shipped recently", icon: "history" },
        ],
      },
    ],
  },
  { label: "Pricing", href: "/pricing" },
];

export const footer = {
  columns: [
    {
      title: "Product",
      links: [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Assessment", href: "/#assessment" },
        { label: "Evidence", href: "/#evidence" },
        { label: "Pricing", href: "/pricing" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Dispute reasons", href: "/#capabilities" },
        { label: "Seller Protection", href: "/#assessment" },
        { label: "Guides", href: "#" },
      ],
    },
    {
      title: "Developers",
      links: [
        { label: "API overview", href: "/#developers" },
        { label: "Webhooks", href: "/#developers" },
        { label: "Changelog", href: "#" },
        { label: "Status", href: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#" },
        { label: "Contact", href: "#" },
        { label: "Security", href: "#" },
      ],
    },
  ],
  legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
  ],
  disclaimer:
    "Kaleshi is an independent tool and is not affiliated with or endorsed by PayPal. PayPal is a trademark of PayPal, Inc.",
};
