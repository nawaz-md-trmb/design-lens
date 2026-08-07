export interface Viewport {
  name: string;
  slug: string;
  width: number;
  height: number;
  category: 'desktop' | 'tablet' | 'mobile';
}

export interface FixSuggestion {
  category: 'color' | 'spacing' | 'size' | 'position' | 'layout' | 'typography';
  title: string;
  detail: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DiffRegion {
  id: number;
  label: string;
  severity: 'high' | 'medium' | 'low';
  x: number;
  y: number;
  width: number;
  height: number;
  diffPercentage: number;
  /** Crop thumbnail paths relative to the report directory (optional, generated at compare time) */
  cropDesignImage?: string;
  cropActualImage?: string;
  /** Actionable dev fixes generated at compare time */
  fixes?: FixSuggestion[];
  /** When set, this region represents a layout component (sidebar, header, etc.) */
  componentType?: LayoutZoneType;
  designerNote?: string;
  checklist?: string[];
  /** component = layout zone; detail = additional pixel-level difference */
  issueKind?: 'component' | 'detail';
  /** If this detail sits inside a layout zone, name that component */
  withinComponent?: string;
}

export type LayoutZoneType =
  | 'side-navigation'
  | 'top-header'
  | 'page-toolbar'
  | 'main-content'
  | 'footer';

export interface LayoutZone {
  id: number;
  type: LayoutZoneType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  mismatchPercentage: number;
  matchPercentage: number;
  severity: 'high' | 'medium' | 'low';
  designerNote: string;
  devAction: string;
  checklist: string[];
  cropDesignImage: string;
  cropActualImage: string;
}

export interface ViewportResult {
  viewport: Viewport;
  designImage: string;
  actualImage: string;
  diffImage: string;
  annotatedImage: string;
  mismatchPercentage: number;
  diffPixels: number;
  totalPixels: number;
  dimensions: { width: number; height: number };
  regions: DiffRegion[];
  /** Component-level layout zone issues */
  layoutZones?: LayoutZone[];
  /** Additional pixel-level differences beyond layout zones */
  detailRegions?: DiffRegion[];
  designAlignment?: {
    originalWidth: number;
    originalHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    scale: number;
    method: 'exact' | 'width-scale' | 'retina-2x';
    warnings: string[];
  };
}

export interface Report {
  id: string;
  url: string;
  createdAt: string;
  figmaSource?: string;
  ticketId?: string;
  results: ViewportResult[];
}
