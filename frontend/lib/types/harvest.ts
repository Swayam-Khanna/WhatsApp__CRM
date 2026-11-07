export type StageStatus = "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "DELAYED" | "upcoming" | "current" | "done";

export type DbStageStatus = "upcoming" | "current" | "done";

export type IconType = "preset" | "library" | "upload";

export interface HarvestStageType {
  id: string;
  name: string;
  icon_type: IconType;
  icon_value: string; // Preset key ("sun", "sprout", etc.) OR Lucide icon name ("Flame", "Coffee") OR data URL / image URL
  is_custom: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface HarvestStageModel {
  id: string;
  journey_id: string;
  label: string;
  icon?: string | null;
  icon_type?: IconType | null;
  icon_value?: string | null;
  stage_type_id?: string | null;
  status: DbStageStatus;
  stage_date?: string | null;
  description?: string | null;
  image_url?: string | null;
  images?: string[];
  media?: string[];
  transformation_photo_id?: string | null;
  show_in_transformation?: boolean;
  position?: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface HarvestUpdateModel {
  id: string;
  journey_id: string;
  text: string;
  author?: string | null;
  created_at: string;
}

export interface HarvestJourneyModel {
  id: string;
  product_id: string;
  batch_number?: string | null;
  current_stage_id?: string | null;
  final_pack_photo_url?: string | null;
  final_pack_caption?: string | null;
  transformation_order?: string[] | null;
  created_at: string;
  updated_at: string;
  stages?: HarvestStageModel[];
  updates?: HarvestUpdateModel[];
}

export interface HarvestStage {
  id: string;
  name: string;
  label?: string;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  dateLabel?: string;
  stage_date?: string | null;
  location?: string;
  shortSummary?: string;
  description?: string;
  farmNote?: string;
  media?: string[];
  publicMessage?: string;
  icon?: string;
  icon_type?: IconType;
  icon_value?: string;
  stage_type_id?: string;
  image_url?: string;
  images?: string[];
  transformation_photo_id?: string | null;
  show_in_transformation?: boolean;
  position?: number;
  sort_order?: number;
  created_at?: string;
}

export interface HarvestJournalUpdate {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  location?: string;
  quote?: string;
  author?: string;
  images?: string[];
}

export interface HarvestBatchInfo {
  batchNumber: string;
  region?: string;
  farmerName?: string;
  harvestYear?: string;
  processingMethod?: string;
  currentStatusLabel?: string;
  expectedDispatch?: string;
  final_pack_photo_url?: string | null;
  final_pack_caption?: string | null;
}

export interface TransformationItem {
  id?: string;
  label: string;
  image: string;
}

export interface PreOrderConfig {
  enabled: boolean;
  status?: "OPEN" | "LIMITED" | "CLOSED";
  reservationNote?: string;
}

export interface HarvestJourneyData {
  id: string;
  harvestName: string;
  batch_number?: string | null;
  batchNumber?: string | null;
  publicVisibility: boolean;
  isPaused?: boolean;
  pausedMessage?: string;
  headline?: string;
  subheadline?: string;
  stages: HarvestStage[];
  currentStageId?: string;
  current_stage_id?: string | null;
  latestUpdate?: HarvestJournalUpdate;
  historyUpdates?: HarvestJournalUpdate[];
  transformationGallery?: TransformationItem[];
  final_pack_photo_url?: string | null;
  final_pack_caption?: string | null;
  transformation_order?: string[];
  batchInfo: HarvestBatchInfo;
  preOrder?: PreOrderConfig;
  updates?: HarvestUpdateModel[];
}
