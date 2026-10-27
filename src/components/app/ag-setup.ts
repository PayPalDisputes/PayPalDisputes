"use client";

/**
 * One place for AG Grid + AG Charts (both Community, free): module registration and Sira theming.
 * Import from here instead of the AG packages so registration always happens first.
 */
import { AllCommunityModule as GridCommunity, ModuleRegistry as GridModules, themeQuartz } from "ag-grid-community";
import { AllCommunityModule as ChartsCommunity, ModuleRegistry as ChartModules, type AgChartOptions } from "ag-charts-community";

GridModules.registerModules([GridCommunity]);
ChartModules.registerModules(ChartsCommunity);

const FONT = "var(--font-inter), system-ui, sans-serif";

/** Data grid in the dashboard's quiet style: white, ink text, hairline rows, no column lines. */
export const gridTheme = themeQuartz.withParams({
  browserColorScheme: "light",
  fontFamily: FONT,
  fontSize: 13.5,
  headerFontSize: 12.5,
  headerFontWeight: 420,
  backgroundColor: "#ffffff",
  foregroundColor: "#1e1e2a",
  headerTextColor: "#70707d",
  headerBackgroundColor: "#ffffff",
  borderColor: "#ececf1",
  rowBorder: { color: "#f2f2f5" },
  columnBorder: false,
  wrapperBorder: true,
  wrapperBorderRadius: 12,
  accentColor: "#0070e0",
  rowHoverColor: "#fafafc",
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
  ink: "#0070e0", // single-series bars (PayPal blue)
  urgent: "#b42318", // status: due within 3 days (always paired with a text label)
  fight: "#3a5fa8",
  settle: "#d0703f",
  refund: "#1a9a7a",
  text: "#1e1e2a",
  muted: "#70707d",
  grid: "#ececf1",
  surface: "#ffffff",
} as const;

export { BLUES } from "@/lib/palette";

/** Charts draw on a canvas, which can't read CSS variables, so resolve the real Inter family name. */
function chartFont() {
  if (typeof window === "undefined") return "system-ui, sans-serif";
  const inter = getComputedStyle(document.documentElement).getPropertyValue("--font-inter").trim();
  return inter ? `${inter}, system-ui, sans-serif` : "system-ui, sans-serif";
}

/** Shared base for every chart: transparent background, Inter type, recessive axes. */
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
        tooltipBackgroundColor: "#1e1e2a",
        tooltipTextColor: "#ffffff",
        tooltipSubtleTextColor: "rgba(255,255,255,0.7)",
        tooltipBorderRadius: 8,
      },
    },
  } as Partial<AgChartOptions>;
}
