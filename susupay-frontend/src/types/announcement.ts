export interface Announcement {
  id: string;
  collector_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
}

export interface AnnouncementCreate {
  title: string;
  body: string;
  is_pinned?: boolean;
}

export interface AnnouncementUpdate {
  title?: string;
  body?: string;
  is_pinned?: boolean;
}

export interface Rating {
  id: string;
  collector_id: string;
  client_id: string;
  score: number;
  comment: string | null;
  created_at: string;
}

export interface RatingCreate {
  score: number;
  comment?: string;
}

export interface CollectorRatingSummary {
  average_score: number;
  total_ratings: number;
  ratings: Rating[];
}

export interface ClientGroupOption {
  client_id: string;
  collector_name: string;
  group_invite_code: string;
}

export interface MultiGroupResponse {
  requires_group_selection: boolean;
  groups: ClientGroupOption[];
  selection_token: string;
}
