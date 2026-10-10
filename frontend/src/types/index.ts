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
  asset_preview_url?: string | null;
  asset_animated?: boolean;
}

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  lightning_coins: number;
  avatar_url?: string | null;
  bio?: string | null;
  clan?: {
    id: number;
    name: string;
    tag: string;
    avatar_url?: string | null;
    level: number;
    role: string;
    contribution_points: number;
  } | null;
  active_frame?: ActiveAsset | null;
  active_background?: ActiveAsset | null;
  daily_bonus_claimed?: boolean;
  last_daily_login?: string | null;
  created_at: string;
  card_collection?: CardCollectionSummary;
}

export interface ClanSummary {
  id: number;
  name: string;
  tag: string;
  description?: string | null;
  avatar_url?: string | null;
  frame_url?: string | null;
  banner_url?: string | null;
  level: number;
  xp: number;
  member_count: number;
  max_members: number;
  is_recruiting: boolean;
  leader_id: number;
  leader_username: string;
  created_at: string;
}

export interface ClanDetail {
  id: number;
  name: string;
  tag: string;
  description?: string | null;
  avatar_url?: string | null;
  frame_url?: string | null;
  banner_url?: string | null;
  leader_id: number;
  leader_username: string;
  level: number;
  xp: number;
  required_xp: number;
  upgrade_cost_coins: number;
  can_upgrade: boolean;
  has_next_level?: boolean;
  next_level_max_members?: number;
  next_level_perks?: string;
  max_members: number;
  member_count: number;
  is_recruiting: boolean;
  my_role?: 'leader' | 'co_leader' | 'elder' | 'member' | null;
  created_at: string;
}

export interface ClanMemberItem {
  id: number;
  user_id: number;
  username: string;
  avatar_url?: string | null;
  active_frame?: { asset_url: string } | null;
  role: 'leader' | 'co_leader' | 'elder' | 'member';
  contribution_points: number;
  joined_at: string;
}

export interface ClanMessageItem {
  id: number;
  clan_id: number;
  user_id?: number | null;
  username?: string | null;
  avatar_url?: string | null;
  active_frame_svg?: string | null;
  role?: string | null;
  message_type: 'text' | 'system';
  content: string;
  created_at: string;
}

export interface FriendUserSummary {
  id: number;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  active_frame?: ActiveAsset | null;
  active_background?: ActiveAsset | null;
  clan?: {
    id: number;
    name: string;
    tag: string;
    avatar_url?: string | null;
    level: number;
    role: string;
  } | null;
  friendship_id: number;
  friends_since: string;
}

export interface FriendRequestItem {
  id: number;
  sender_id: number;
  receiver_id: number;
  username: string;
  avatar_url?: string | null;
  active_frame?: ActiveAsset | null;
  clan_tag?: string | null;
  created_at: string;
}

export interface PublicProfileData {
  id: number;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
  active_frame?: ActiveAsset | null;
  active_background?: ActiveAsset | null;
  card_collection?: CardCollectionSummary;
  clan?: {
    id: number;
    name: string;
    tag: string;
    avatar_url?: string | null;
    banner_url?: string | null;
    level: number;
    role: string;
  } | null;
  friendship: {
    status: 'self' | 'friends' | 'pending_sent' | 'pending_received' | 'none';
    friendship_id?: number | null;
  };
  stats: {
    bookmarks_count: number;
    read_chapters_count: number;
    comments_count: number;
    clan_contribution: number;
  };
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
  published_at?: string | null;
}

export type ContentType = 'manhwa' | 'manga' | 'novel';

export interface WebtoonSummary {
  id: number;
  title: string;
  slug: string;
  type?: ContentType;
  description?: string | null;
  synopsis?: string | null;
  cover_image_url: string;
  author_name?: string | null;
  status: 'ongoing' | 'completed';
  view_count: number;
  genres: string[];
  latest_chapter?: LatestChapterInfo | null;
  first_chapter?: LatestChapterInfo | null;
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
  content_text?: string | null;
  created_at: string;
  published_at?: string | null;
}

export interface WebtoonDetail {
  id: number;
  title: string;
  slug: string;
  type?: ContentType;
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
  width?: number | null;
  height?: number | null;
}

export interface ReadingProgress {
  webtoon_id: number;
  chapter_id: number;
  page_index: number;
  anchor?: string | null;
  progress_percent: number;
  completed: boolean;
  updated_at?: string;
  reward_eligible_at?: string | null;
  webtoon_title?: string;
  webtoon_slug?: string;
  webtoon_type?: ContentType;
  chapter_number?: number;
  cover_image_url?: string;
  webtoon?: WebtoonSummary;
}

export interface ChapterReaderData {
  id: number;
  webtoon_id: number;
  webtoon_title: string;
  webtoon_type?: ContentType;
  chapter_number: number;
  title?: string | null;
  reward_coins: number;
  is_reward_claimed: boolean;
  content_text?: string | null;
  images: ChapterImage[];
  prev_chapter_id?: number | null;
  next_chapter_id?: number | null;
  reading_progress?: ReadingProgress | null;
  reward_eligible_at?: string | null;
  minimum_read_seconds?: number;
}

export type BookmarkStatus = 'reading' | 'plan_to_read' | 'completed' | 'dropped';

export interface WebtoonBookmarkInfo {
  id: number;
  title: string;
  slug: string;
  cover_image_url: string;
  status: 'ongoing' | 'completed';
  first_chapter?: LatestChapterInfo | null;
}

export interface BookmarkItem {
  webtoon: WebtoonBookmarkInfo;
  reading_status: BookmarkStatus;
  updated_at: string;
  reading_progress?: ReadingProgress | null;
}

export type CardRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ShopItemType = 'frame' | 'background' | 'card';

export interface CardMetadata {
  rarity?: CardRarity | null;
  character_name?: string | null;
  series_title?: string | null;
  webtoon_id?: number | null;
  asset_preview_url?: string | null;
  asset_animated?: boolean;
}

export interface ShopItem extends CardMetadata {
  id: number;
  name: string;
  item_type: ShopItemType;
  price_coins: number;
  asset_url: string;
  is_owned: boolean;
}

export interface InventoryItem extends CardMetadata {
  id: number;
  name: string;
  item_type: ShopItemType;
  price_coins: number;
  asset_url: string;
  is_active: boolean;
  purchased_at: string;
}

export interface CardCollectionSummary {
  total_cards: number;
  rarity_counts: Record<CardRarity, number>;
  featured_cards: ShopItem[];
}

export interface CardCollection extends CardCollectionSummary {
  cards: InventoryItem[];
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
  reply_count?: number;
  has_more_replies?: boolean;
  next_reply_offset?: number;
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
