"use client";

/**
 * One place for AG Grid + AG Charts (both Community, free): module registration and Kaleshi theming.
 * Import from here instead of the AG packages so registration always happens first.
 */
import { AllCommunityModule as GridCommunity, ModuleRegistry as GridModules, themeQuartz } from "ag-grid-community";
import { AllCommunityModule as ChartsCommunity, ModuleRegistry as ChartModules, type AgChartOptions } from "ag-charts-community";

GridModules.registerModules([GridCommunity]);
ChartModules.registerModules(ChartsCommunity);

const FONT = "var(--font-geist-sans), system-ui, sans-serif";

/** Data grid styled with the app's tokens: cream header, brown ink, hairline rows, no column lines. */
export const gridTheme = themeQuartz.withParams({
  browserColorScheme: "light",
  fontFamily: FONT,
  fontSize: 13.5,
  headerFontSize: 12.5,
  headerFontWeight: 500,
  backgroundColor: "#fdfcfb",
  foregroundColor: "#2a2522",
  headerTextColor: "#605a57",
  headerBackgroundColor: "#f7f5f3",
  borderColor: "rgba(55, 50, 47, 0.12)",
  rowBorder: { color: "rgba(55, 50, 47, 0.07)" },
  columnBorder: false,
  wrapperBorder: true,
  wrapperBorderRadius: 16,
  accentColor: "#37322f",
  rowHoverColor: "rgba(247, 245, 243, 0.8)",
  selectedRowBackgroundColor: "rgba(55, 50, 47, 0.05)",
  oddRowBackgroundColor: "#fdfcfb",
  spacing: 7,
  cellHorizontalPadding: 18,
  headerHeight: 44,
  rowHeight: 58,
});

/**
 * Chart colours. The categorical trio was checked with the dataviz palette validator
 * (light surface #fdfcfb, all pairs: CVD ΔE ≥ 8.3, normal-vision ΔE ≥ 20.9, contrast ≥ 3:1).
 * Recommendation colours follow the entity, never its rank.
 */
export const COLORS = {
  ink: "#4a4340", // single-series bars
  urgent: "#b4372f", // status: due within 3 days (always paired with a text label)
  fight: "#3a5fa8",
  settle: "#d0703f",
  refund: "#1a9a7a",
  text: "#37322f",
  muted: "#8f8681",
  grid: "rgba(55, 50, 47, 0.08)",
  surface: "#fdfcfb",
} as const;

/** Charts draw on a canvas, which can't read CSS variables, so resolve the real Geist family name. */
function chartFont() {
  if (typeof window === "undefined") return "system-ui, sans-serif";
  const geist = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-sans").trim();
  return geist ? `${geist}, system-ui, sans-serif` : "system-ui, sans-serif";
}

/** Shared base for every chart: transparent background, Geist type, recessive axes. */
export function baseChart(): Partial<AgChartOptions> {
  return {
    background: { visible: false },
    padding: { top: 8, right: 8, bottom: 8, left: 4 },
    theme: {
      params: {
        fontFamily: chartFont(),
        fontSize: 12,
        foregroundColor: COLORS.text,
        textColor: COLORS.text,
        subtleTextColor: COLORS.muted,
        axisLineColor: COLORS.grid,
        gridLineColor: COLORS.grid,
        backgroundColor: "transparent",
        chartBackgroundColor: "transparent",
        tooltipBackgroundColor: "#2a2522",
        tooltipTextColor: "#ffffff",
        tooltipSubtleTextColor: "rgba(255,255,255,0.7)",
        tooltipBorderRadius: 8,
      },
    },
  } as Partial<AgChartOptions>;
}
