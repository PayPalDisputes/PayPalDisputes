"use client";

/**
 * One place for AG Grid + AG Charts (both Community, free): module registration and Sira theming.
 * Import from here instead of the AG packages so registration always happens first.
 */
import { AllCommunityModule as GridCommunity, ModuleRegistry as GridModules, themeQuartz } from "ag-grid-community";
import { AllCommunityModule as ChartsCommunity, ModuleRegistry as ChartModules, type AgChartOptions } from "ag-charts-community";

GridModules.registerModules([GridCommunity]);
ChartModules.registerModules(ChartsCommunity);

const FONT = "var(--font-geist-sans), system-ui, sans-serif";

/** Data grid styled with the app's tokens: cool white, slate ink, hairline rows, no column lines. */
export const gridTheme = themeQuartz.withParams({
  browserColorScheme: "light",
  fontFamily: FONT,
  fontSize: 13.5,
  headerFontSize: 12.5,
  headerFontWeight: 500,
  backgroundColor: "#ffffff",
  foregroundColor: "#0f1419",
  headerTextColor: "#7c8595",
  headerBackgroundColor: "#f6f8fb",
  borderColor: "rgba(15, 23, 42, 0.1)",
  rowBorder: { color: "rgba(15, 23, 42, 0.06)" },
  columnBorder: false,
  wrapperBorder: true,
  wrapperBorderRadius: 16,
  accentColor: "#0070e0",
  rowHoverColor: "rgba(0, 112, 224, 0.035)",
  selectedRowBackgroundColor: "rgba(0, 112, 224, 0.06)",
  oddRowBackgroundColor: "#ffffff",
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
  ink: "#003087", // single-series bars (PayPal navy)
  urgent: "#b4372f", // status: due within 3 days (always paired with a text label)
  fight: "#3a5fa8",
  settle: "#d0703f",
  refund: "#1a9a7a",
  text: "#141a22",
  muted: "#7c8595",
  grid: "rgba(15, 23, 42, 0.07)",
  surface: "#ffffff",
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
        tooltipBackgroundColor: "#0f1419",
        tooltipTextColor: "#ffffff",
        tooltipSubtleTextColor: "rgba(255,255,255,0.7)",
        tooltipBorderRadius: 8,
      },
    },
  } as Partial<AgChartOptions>;
}
