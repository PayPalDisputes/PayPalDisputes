/**
 * Fictional data for the product mockups on the marketing site.
 * None of this is real customer data; edit freely.
 */

export type Decision = "fight" | "refund" | "settle";
export type CaseStatus = "drafted" | "awaiting" | "sent" | "won" | "refunded" | "review";

export type MockDispute = {
  id: string;
  opened: string;
  buyer: string;
  reason: string;
  amount: string;
  currency: "USD" | "EUR" | "GBP" | "CAD" | "AUD";
  decision: Decision;
  confidence: number;
  status: CaseStatus;
  daysLeft: number;
};

export const mockDisputes: MockDispute[] = [
  { id: "PP-D-48213", opened: "9:42 AM", buyer: "Alex Morgan", reason: "Item not received", amount: "184.00", currency: "USD", decision: "fight", confidence: 0.91, status: "drafted", daysLeft: 3 },
  { id: "PP-D-48207", opened: "8:15 AM", buyer: "Priya Natarajan", reason: "Not as described", amount: "62.50", currency: "GBP", decision: "settle", confidence: 0.74, status: "awaiting", daysLeft: 6 },
  { id: "PP-D-48199", opened: "Yesterday", buyer: "Nova Labs", reason: "Unauthorized", amount: "1,240.00", currency: "USD", decision: "fight", confidence: 0.83, status: "review", daysLeft: 2 },
  { id: "PP-D-48188", opened: "Yesterday", buyer: "Jordan Lee", reason: "Duplicate transaction", amount: "39.00", currency: "EUR", decision: "refund", confidence: 0.96, status: "refunded", daysLeft: 9 },
  { id: "PP-D-48176", opened: "Mon", buyer: "Vertex LLC", reason: "Item not received", amount: "512.80", currency: "CAD", decision: "fight", confidence: 0.88, status: "sent", daysLeft: 11 },
  { id: "PP-D-48170", opened: "Mon", buyer: "Sam Okafor", reason: "Credit not processed", amount: "24.99", currency: "USD", decision: "refund", confidence: 0.93, status: "refunded", daysLeft: 12 },
  { id: "PP-D-48161", opened: "Sun", buyer: "Arc Systems", reason: "Not as described", amount: "309.00", currency: "AUD", decision: "settle", confidence: 0.69, status: "awaiting", daysLeft: 14 },
  { id: "PP-D-48152", opened: "Sun", buyer: "Mei Tanaka", reason: "Item not received", amount: "78.40", currency: "USD", decision: "fight", confidence: 0.9, status: "won", daysLeft: 0 },
  { id: "PP-D-48149", opened: "Sat", buyer: "Lucas Ferreira", reason: "Canceled subscription", amount: "15.00", currency: "EUR", decision: "refund", confidence: 0.97, status: "refunded", daysLeft: 0 },
  { id: "PP-D-48140", opened: "Sat", buyer: "Hannah Weiss", reason: "Incorrect amount", amount: "120.00", currency: "USD", decision: "settle", confidence: 0.77, status: "sent", daysLeft: 15 },
];

export const currencySymbol: Record<MockDispute["currency"], string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
};

export const sidebarNav = [
  { label: "Home", icon: "home" },
  { label: "Disputes", icon: "inbox", badge: "12" },
  { label: "Orders", icon: "package" },
  { label: "Evidence", icon: "file" },
  { label: "Sellers", icon: "store" },
  { label: "API Keys", icon: "key" },
  { label: "Webhooks", icon: "webhook" },
  { label: "Team", icon: "users" },
] as const;

/** The case shown in the hero's detail panel. */
export const featuredCase = {
  id: "PP-D-48213",
  buyer: "Alex Morgan",
  reason: "Item not received",
  amount: "$184.00",
  order: "#NW-20931",
  carrier: "UPS",
  tracking: "1Z 8A4 •••• 2210",
  delivered: "Delivered Oct 2, 2:14 PM",
  deadline: "Oct 14",
  daysLeft: 3,
  decision: "fight" as Decision,
  confidence: 0.91,
  facts: [
    { label: "Seller Protection", value: "Met", tone: "ok" as const },
    { label: "Tracking", value: "Delivered", tone: "ok" as const },
    { label: "Signature", value: "Not required", tone: "neutral" as const },
    { label: "Urgency", value: "High · 3 days", tone: "warn" as const },
  ],
  timeline: [
    { title: "Dispute received from PayPal", meta: "Webhook · 9:42 AM" },
    { title: "Matched order #NW-20931", meta: "Tracking found · UPS" },
    { title: "Recommended: fight", meta: "91% confidence" },
    { title: "Evidence response drafted", meta: "Waiting for your approval" },
  ],
  draft:
    "The order was shipped via UPS on Sep 28 and delivered to the address on the PayPal transaction on Oct 2 at 2:14 PM. Tracking 1Z8A4…2210 and the carrier's proof of delivery are attached.",
};

export const upcomingDeadlines = [
  { buyer: "Nova Labs", reason: "Unauthorized", daysLeft: 2, stage: "Chargeback" },
  { buyer: "Alex Morgan", reason: "Item not received", daysLeft: 3, stage: "Inquiry" },
  { buyer: "Priya Natarajan", reason: "Not as described", daysLeft: 6, stage: "Inquiry" },
  { buyer: "Jordan Lee", reason: "Duplicate transaction", daysLeft: 9, stage: "Inquiry" },
  { buyer: "Vertex LLC", reason: "Item not received", daysLeft: 11, stage: "Claim" },
];

export const sellerAccounts = [
  { name: "Northwind Goods", merchant: "•••• 4F2K", open: 4, atRisk: "$1,982.40", currency: "USD", tone: "#d9d4c7" },
  { name: "Juniper & Co", merchant: "•••• 8Q1M", open: 2, atRisk: "€362.10", currency: "EUR", tone: "#c9d3cf" },
  { name: "Kestrel Outdoor", merchant: "•••• 0J7R", open: 5, atRisk: "CA$2,140.00", currency: "CAD", tone: "#d6cfd8" },
  { name: "Paper Moon Prints", merchant: "•••• 3T9W", open: 1, atRisk: "£48.00", currency: "GBP", tone: "#d3d7e0" },
  { name: "Halcyon Supply", merchant: "•••• 6B5N", open: 3, atRisk: "A$770.25", currency: "AUD", tone: "#e0d6c8" },
];

export const evidenceFiles = [
  { name: "tracking-1Z8A4.pdf", size: "112 KB", task: "Matching tracking number to the order", done: "Tracking matches order #NW-20931" },
  { name: "invoice-NW-20931.pdf", size: "64 KB", task: "Checking item and amount", done: "Amount and item match the claim" },
  { name: "proof-of-delivery.png", size: "380 KB", task: "Checking delivery address", done: "Delivered to the PayPal shipping address" },
];

export const caseProfile = {
  buyer: "Jordan Lee",
  email: "j•••@example.com",
  since: "Buyer since 2021",
  tabs: [
    {
      label: "Case",
      rows: [
        { label: "Reason", value: "Duplicate transaction" },
        { label: "Lifecycle stage", value: "Inquiry" },
        { label: "Seller Protection", value: "Not applicable" },
        { label: "Recommendation", value: "Refund · 96%" },
      ],
    },
    {
      label: "Order",
      rows: [
        { label: "Order", value: "#JN-11804" },
        { label: "Item", value: "Linen tote, natural" },
        { label: "Charged", value: "€39.00 × 2" },
        { label: "Shipped", value: "Once, Sep 30" },
      ],
    },
    {
      label: "Messages",
      rows: [
        { label: "Buyer", value: "“I was charged twice”" },
        { label: "Posted", value: "Oct 9, 4:12 PM" },
        { label: "Your replies", value: "None yet" },
        { label: "Draft", value: "Refund + apology" },
      ],
    },
    {
      label: "History",
      rows: [
        { label: "Country", value: "Canada" },
        { label: "Prior orders", value: "6" },
        { label: "Prior disputes", value: "None" },
        { label: "Risk", value: "Low" },
      ],
    },
  ],
};

export const webhookEvents = [
  { type: "CUSTOMER.DISPUTE.CREATED", id: "PP-D-48213", time: "9:42:07" },
  { type: "CUSTOMER.DISPUTE.UPDATED", id: "PP-D-48199", time: "9:31:55" },
  { type: "CUSTOMER.DISPUTE.CREATED", id: "PP-D-48207", time: "8:15:12" },
  { type: "CUSTOMER.DISPUTE.RESOLVED", id: "PP-D-48152", time: "7:58:40" },
];
