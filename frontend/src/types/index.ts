export interface UserSummary {
  id: number;
  email: string;
  username: string;
  lightning_coins: number;
  daily_bonus_claimed?: boolean;
  last_daily_login?: string | null;
  created_at?: string;
}

export interface ActiveAsset {
  id: number;
  name: string;
  asset_url: string;
}

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  lightning_coins: number;
  active_frame?: ActiveAsset | null;
  active_background?: ActiveAsset | null;
  daily_bonus_claimed?: boolean;
  last_daily_login?: string | null;
  created_at: string;
}

export interface UserSession {
  id: string;
  ip_address?: string | null;
  user_agent?: string | null;
  device_type?: string | null;
  is_current: boolean;
  last_active_at: string;
  created_at: string;
}

export interface Genre {
  id: number;
  name: string;
  slug: string;
}

export interface LatestChapterInfo {
  id: number;
  chapter_number: number;
  created_at: string;
}

export interface WebtoonSummary {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  synopsis?: string | null;
  cover_image_url: string;
  author_name?: string | null;
  status: 'ongoing' | 'completed';
  view_count: number;
  genres: string[];
  latest_chapter?: LatestChapterInfo | null;
}

export interface WebtoonCatalogResponse {
  items: WebtoonSummary[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ChapterSummary {
  id: number;
  chapter_number: number;
  title?: string | null;
  reward_coins: number;
  is_claimed?: boolean;
  created_at: string;
}

export interface WebtoonDetail {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  cover_image_url: string;
  author_name?: string | null;
  status: 'ongoing' | 'completed';
  view_count: number;
  genres: string[];
  chapters: ChapterSummary[];
}

export interface ChapterImage {
  id: number;
  image_url: string;
  order_index: number;
}

export interface ChapterReaderData {
  id: number;
  webtoon_id: number;
  webtoon_title: string;
  chapter_number: number;
  title?: string | null;
  reward_coins: number;
  is_reward_claimed: boolean;
  images: ChapterImage[];
  prev_chapter_id?: number | null;
  next_chapter_id?: number | null;
}

export type BookmarkStatus = 'reading' | 'plan_to_read' | 'completed' | 'dropped';

export interface WebtoonBookmarkInfo {
  id: number;
  title: string;
  slug: string;
  cover_image_url: string;
  status: 'ongoing' | 'completed';
}

export interface BookmarkItem {
  webtoon: WebtoonBookmarkInfo;
  reading_status: BookmarkStatus;
  updated_at: string;
}

export interface ShopItem {
  id: number;
  name: string;
  item_type: 'frame' | 'background';
  price_coins: number;
  asset_url: string;
  is_owned: boolean;
}

export interface CommentAuthor {
  id: number;
  username: string;
  active_frame_url?: string | null;
}

export interface CommentReply {
  id: number;
  parent_id: number;
  user: CommentAuthor;
  content: string;
  created_at: string;
}

export interface CommentItemData {
  id: number;
  user: CommentAuthor;
  content: string;
  created_at: string;
  replies: CommentReply[];
}

export interface CreatorRequest {
  id: number;
  user_id: number;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_feedback?: string | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
