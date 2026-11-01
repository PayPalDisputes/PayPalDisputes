"use client";

/**
 * One place for AG Grid + AG Charts (both Community, free): module registration and Sira theming.
 * Import from here instead of the AG packages so registration always happens first.
 */
import { AllCommunityModule as GridCommunity, ModuleRegistry as GridModules, themeQuartz } from "ag-grid-community";
import { AllCommunityModule as ChartsCommunity, ModuleRegistry as ChartModules, type AgChartOptions } from "ag-charts-community";

GridModules.registerModules([GridCommunity]);
ChartModules.registerModules(ChartsCommunity);

const FONT = "var(--font-digits), var(--font-inter), system-ui, sans-serif"; // monospaced digits, Inter text

/** Data grid in the dashboard's quiet style: white, ink text, hairline rows, no column lines. */
export const gridTheme = themeQuartz.withParams({
  browserColorScheme: "light",
  fontFamily: FONT,
  fontSize: 13.5,
  headerFontSize: 12.5,
  headerFontWeight: 420,
  backgroundColor: "#ffffff",
  foregroundColor: "#1d2016",
  headerTextColor: "#6f7364",
  headerBackgroundColor: "#ffffff",
  borderColor: "#e9eae3",
  rowBorder: { color: "#f1f2ec" },
  columnBorder: false,
  wrapperBorder: true,
  wrapperBorderRadius: 8,
  accentColor: "#5a6b2e",
  rowHoverColor: "#fafaf7",
  selectedRowBackgroundColor: "rgba(90, 107, 46, 0.07)",
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
  ink: "#5a6b2e", // single-series bars (olive)
  urgent: "#b42318", // status: due within 3 days (always paired with a text label)
  fight: "#3a5fa8",
  settle: "#d0703f",
  refund: "#1a9a7a",
  text: "#1d2016",
  muted: "#6f7364",
  grid: "#e9eae3",
  surface: "#ffffff",
} as const;

export { BLUES } from "@/lib/palette";

/** Charts draw on a canvas, which can't read CSS variables, so resolve the real family names (mono digits, then Inter). */
function chartFont() {
  if (typeof window === "undefined") return "system-ui, sans-serif";
  const root = getComputedStyle(document.documentElement);
  const digits = root.getPropertyValue("--font-digits").trim();
  const inter = root.getPropertyValue("--font-inter").trim();
  return [digits, inter, "system-ui", "sans-serif"].filter(Boolean).join(", ");
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
        tooltipBackgroundColor: "#1d2016",
        tooltipTextColor: "#ffffff",
        tooltipSubtleTextColor: "rgba(255,255,255,0.7)",
        tooltipBorderRadius: 8,
      },
    },
  } as Partial<AgChartOptions>;
}
