
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "icon": string,"id": number,"is_active": boolean,"name_en": string,"name_fr": string,"parent_id": number | null,"slug": string,"sort": number,"tint": string
                  }
                  ComputedFields: never
                  Insert: {
                    "icon"?: string,"id"?: never,"is_active"?: boolean,"name_en": string,"name_fr": string,"parent_id"?: number | null,"slug": string,"sort"?: number,"tint"?: string
                  }
                  Update: {
                    "icon"?: string,"id"?: never,"is_active"?: boolean,"name_en"?: string,"name_fr"?: string,"parent_id"?: number | null,"slug"?: string,"sort"?: number,"tint"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"cities": {
                  Row: {
                    "country": string,"created_at": string,"id": number,"is_active": boolean,"location": unknown,"name": string,"region": string,"slug": string,"timezone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "country"?: string,"created_at"?: string,"id"?: never,"is_active"?: boolean,"location": unknown,"name": string,"region": string,"slug": string,"timezone"?: string
                  }
                  Update: {
                    "country"?: string,"created_at"?: string,"id"?: never,"is_active"?: boolean,"location"?: unknown,"name"?: string,"region"?: string,"slug"?: string,"timezone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"follows": {
                  Row: {
                    "created_at": string,"follower_id": string,"group_id": string | null,"host_id": string | null,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"follower_id": string,"group_id"?: string | null,"host_id"?: string | null,"id"?: never
                  }
                  Update: {
                    "created_at"?: string,"follower_id"?: string,"group_id"?: string | null,"host_id"?: string | null,"id"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "follows_follower_id_fkey"
      columns: ["follower_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"group_members": {
                  Row: {
                    "group_id": string,"joined_at": string,"role": Database["public"]['Enums']["group_role"],"trusted": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "group_id": string,"joined_at"?: string,"role"?: Database["public"]['Enums']["group_role"],"trusted"?: boolean,"user_id": string
                  }
                  Update: {
                    "group_id"?: string,"joined_at"?: string,"role"?: Database["public"]['Enums']["group_role"],"trusted"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "category_id": number,"city_id": number,"cover_url": string | null,"created_at": string,"description": string | null,"id": string,"invite_code": string,"name": string,"owner_id": string | null,"rhythm_label": string | null,"visibility": Database["public"]['Enums']["group_visibility"],"group_card_json": Json | null
                  }
                  ComputedFields: "group_card_json"
                  Insert: {
                    "category_id": number,"city_id": number,"cover_url"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"invite_code"?: string,"name": string,"owner_id"?: string | null,"rhythm_label"?: string | null,"visibility"?: Database["public"]['Enums']["group_visibility"]
                  }
                  Update: {
                    "category_id"?: number,"city_id"?: number,"cover_url"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"invite_code"?: string,"name"?: string,"owner_id"?: string | null,"rhythm_label"?: string | null,"visibility"?: Database["public"]['Enums']["group_visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "groups_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "groups_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "groups_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"created_at": string,"deleted_at": string | null,"group_id": string | null,"id": number,"session_id": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"deleted_at"?: string | null,"group_id"?: string | null,"id"?: never,"session_id"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"deleted_at"?: string | null,"group_id"?: string | null,"id"?: never,"session_id"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": number,"kind": string,"payload": NonNullable<Json>,"pushed_at": string | null,"read_at": string | null,"session_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"kind": string,"payload"?: NonNullable<Json>,"pushed_at"?: string | null,"read_at"?: string | null,"session_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"kind"?: string,"payload"?: NonNullable<Json>,"pushed_at"?: string | null,"read_at"?: string | null,"session_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_cents": number,"created_at": string,"currency": string,"id": string,"platform_fee_cents": number,"session_id": string,"status": Database["public"]['Enums']["payment_status"],"stripe_payment_intent_id": string | null,"stripe_refund_id": string | null,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"currency"?: string,"id"?: string,"platform_fee_cents": number,"session_id": string,"status"?: Database["public"]['Enums']["payment_status"],"stripe_payment_intent_id"?: string | null,"stripe_refund_id"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"currency"?: string,"id"?: string,"platform_fee_cents"?: number,"session_id"?: string,"status"?: Database["public"]['Enums']["payment_status"],"stripe_payment_intent_id"?: string | null,"stripe_refund_id"?: string | null,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payout_accounts": {
                  Row: {
                    "charges_enabled": boolean,"created_at": string,"details_submitted": boolean,"payouts_enabled": boolean,"stripe_account_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "charges_enabled"?: boolean,"created_at"?: string,"details_submitted"?: boolean,"payouts_enabled"?: boolean,"stripe_account_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "charges_enabled"?: boolean,"created_at"?: string,"details_submitted"?: boolean,"payouts_enabled"?: boolean,"stripe_account_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payout_accounts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"platform_settings": {
                  Row: {
                    "key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "adult_confirmed_at": string | null,"avatar_url": string | null,"bio": string | null,"city_id": number | null,"created_at": string,"display_name": string,"id": string,"is_admin": boolean,"is_banned": boolean,"locale": string,"phone_verified_at": string | null,"terms_accepted_at": string | null,"terms_version": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "adult_confirmed_at"?: string | null,"avatar_url"?: string | null,"bio"?: string | null,"city_id"?: number | null,"created_at"?: string,"display_name"?: string,"id": string,"is_admin"?: boolean,"is_banned"?: boolean,"locale"?: string,"phone_verified_at"?: string | null,"terms_accepted_at"?: string | null,"terms_version"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "adult_confirmed_at"?: string | null,"avatar_url"?: string | null,"bio"?: string | null,"city_id"?: number | null,"created_at"?: string,"display_name"?: string,"id"?: string,"is_admin"?: boolean,"is_banned"?: boolean,"locale"?: string,"phone_verified_at"?: string | null,"terms_accepted_at"?: string | null,"terms_version"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    }
                  ]
                },"push_tokens": {
                  Row: {
                    "platform": string,"token": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "platform": string,"token": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "platform"?: string,"token"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"details": string | null,"id": number,"reason": string,"reporter_id": string | null,"status": Database["public"]['Enums']["report_status"],"target_id": string,"target_type": Database["public"]['Enums']["report_target"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"id"?: never,"reason": string,"reporter_id"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_id": string,"target_type": Database["public"]['Enums']["report_target"]
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"id"?: never,"reason"?: string,"reporter_id"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_id"?: string,"target_type"?: Database["public"]['Enums']["report_target"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "created_at": string,"id": number,"rating": number,"reviewed_id": string,"reviewer_id": string,"session_id": string,"tags": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"rating": number,"reviewed_id": string,"reviewer_id": string,"session_id": string,"tags"?: (string)[]
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"rating"?: number,"reviewed_id"?: string,"reviewer_id"?: string,"session_id"?: string,"tags"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_reviewed_id_fkey"
      columns: ["reviewed_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_sessions": {
                  Row: {
                    "created_at": string,"session_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"session_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"session_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_sessions_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_sessions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"session_participants": {
                  Row: {
                    "guest_count": number,"joined_at": string,"payment_status": Database["public"]['Enums']["payment_status"],"session_id": string,"status": Database["public"]['Enums']["participant_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "guest_count"?: number,"joined_at"?: string,"payment_status"?: Database["public"]['Enums']["payment_status"],"session_id": string,"status": Database["public"]['Enums']["participant_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "guest_count"?: number,"joined_at"?: string,"payment_status"?: Database["public"]['Enums']["payment_status"],"session_id"?: string,"status"?: Database["public"]['Enums']["participant_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "session_participants_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "session_participants_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"sessions": {
                  Row: {
                    "address": string | null,"cancellation_policy": Database["public"]['Enums']["cancellation_policy"],"cancelled_reason": string | null,"category_id": number,"city_id": number,"cover_blurhash": string | null,"cover_url": string | null,"created_at": string,"currency": string,"description": string | null,"ends_at": string,"group_id": string | null,"host_id": string | null,"id": string,"level": Database["public"]['Enums']["session_level"],"location": unknown,"max_players": number,"min_players": number,"places_taken": number,"price_cents": number,"priority_until": string | null,"recurrence_rule": string | null,"search_text": string | null,"series_id": string | null,"starts_at": string,"status": Database["public"]['Enums']["session_status"],"title": string,"updated_at": string,"venue_name": string,"waitlist_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"cancellation_policy"?: Database["public"]['Enums']["cancellation_policy"],"cancelled_reason"?: string | null,"category_id": number,"city_id": number,"cover_blurhash"?: string | null,"cover_url"?: string | null,"created_at"?: string,"currency"?: string,"description"?: string | null,"ends_at": string,"group_id"?: string | null,"host_id"?: string | null,"id"?: string,"level"?: Database["public"]['Enums']["session_level"],"location": unknown,"max_players": number,"min_players"?: number,"places_taken"?: number,"price_cents"?: number,"priority_until"?: string | null,"recurrence_rule"?: string | null,"search_text"?: never,"series_id"?: string | null,"starts_at": string,"status"?: Database["public"]['Enums']["session_status"],"title": string,"updated_at"?: string,"venue_name": string,"waitlist_count"?: number
                  }
                  Update: {
                    "address"?: string | null,"cancellation_policy"?: Database["public"]['Enums']["cancellation_policy"],"cancelled_reason"?: string | null,"category_id"?: number,"city_id"?: number,"cover_blurhash"?: string | null,"cover_url"?: string | null,"created_at"?: string,"currency"?: string,"description"?: string | null,"ends_at"?: string,"group_id"?: string | null,"host_id"?: string | null,"id"?: string,"level"?: Database["public"]['Enums']["session_level"],"location"?: unknown,"max_players"?: number,"min_players"?: number,"places_taken"?: number,"price_cents"?: number,"priority_until"?: string | null,"recurrence_rule"?: string | null,"search_text"?: never,"series_id"?: string | null,"starts_at"?: string,"status"?: Database["public"]['Enums']["session_status"],"title"?: string,"updated_at"?: string,"venue_name"?: string,"waitlist_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessions_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_host_id_fkey"
      columns: ["host_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_interests": {
                  Row: {
                    "category_id": number,"level": Database["public"]['Enums']["session_level"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": number,"level"?: Database["public"]['Enums']["session_level"],"user_id": string
                  }
                  Update: {
                    "category_id"?: number,"level"?: Database["public"]['Enums']["session_level"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_interests_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_interests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_city_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_list_reports":
{ Args: { "p_limit"?: number,"p_status"?: Database["public"]['Enums']["report_status"] }; Returns: Json
                           },
"admin_resolve_report":
{ Args: { "p_action": string,"p_report_id": number,"p_status": Database["public"]['Enums']["report_status"] }; Returns: undefined
                           },
"admin_unban":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"can_manage_session":
{ Args: { "p_session_id": string,"p_user_id"?: string }; Returns: boolean
                           },
"can_view_session":
{ Args: { "p_session_id": string,"p_user_id"?: string }; Returns: boolean
                           },
"cancel_session":
{ Args: { "p_reason"?: string,"p_session_id": string }; Returns: undefined
                           },
"cancel_session_internal":
{ Args: { "p_reason": string,"p_session_id": string }; Returns: undefined
                           },
"complete_profile":
{ Args: { "p_birthdate": string,"p_city_id"?: number,"p_display_name": string,"p_interest_ids"?: (number)[],"p_terms_version": string }; Returns: undefined
                           },
"create_session":
{ Args: { "p_address": string,"p_cancellation_policy"?: Database["public"]['Enums']["cancellation_policy"],"p_category_id": number,"p_cover_url"?: string,"p_description": string,"p_duration_minutes": number,"p_group_id"?: string,"p_lat": number,"p_level"?: Database["public"]['Enums']["session_level"],"p_lng": number,"p_max_players": number,"p_min_players": number,"p_occurrences"?: number,"p_price_cents"?: number,"p_recurrence_rule"?: string,"p_starts_at": string,"p_title": string,"p_venue_name": string }; Returns: string
                           },
"delete_message":
{ Args: { "p_message_id": number }; Returns: undefined
                           },
"delete_my_account":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"duplicate_session":
{ Args: { "p_session_id": string,"p_starts_at": string }; Returns: string
                           },
"enqueue_reminders":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"f_unaccent":
{ Args: { "": string }; Returns: string
                           },
"feed_sessions":
{ Args: { "p_category_ids"?: (number)[],"p_city_id": number,"p_cursor_id"?: string,"p_cursor_starts_at"?: string,"p_from"?: string,"p_lat"?: number,"p_levels"?: (Database["public"]['Enums']["session_level"])[],"p_limit"?: number,"p_lng"?: number,"p_price"?: string,"p_query"?: string,"p_radius_m"?: number,"p_to"?: string }; Returns: Json
                           },
"get_group":
{ Args: { "p_group_id"?: string,"p_invite_code"?: string }; Returns: Json
                           },
"get_me":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_profile":
{ Args: { "p_user_id": string }; Returns: Json
                           },
"get_session":
{ Args: { "p_lat"?: number,"p_lng"?: number,"p_session_id": string }; Returns: Json
                           },
"group_card_json":
{ Args: { "g": Omit<Database["public"]['Tables']["groups"]['Row'], Database["public"]['Tables']["groups"]['ComputedFields']> }; Returns: Json
                           },
"group_members_list":
{ Args: { "p_group_id": string }; Returns: Json
                           },
"host_dashboard":
{ Args: { "p_days"?: number }; Returns: Json
                           },
"host_json":
{ Args: { "p_user_id": string }; Returns: Json
                           },
"is_blocked_between":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"is_group_admin":
{ Args: { "p_group_id": string,"p_user_id"?: string }; Returns: boolean
                           },
"is_group_member":
{ Args: { "p_group_id": string,"p_user_id"?: string }; Returns: boolean
                           },
"is_platform_admin":
{ Args: { "p_user_id"?: string }; Returns: boolean
                           },
"is_session_member":
{ Args: { "p_session_id": string,"p_user_id"?: string }; Returns: boolean
                           },
"join_group":
{ Args: { "p_group_id"?: string,"p_invite_code"?: string }; Returns: string
                           },
"join_series":
{ Args: { "p_series_id": string }; Returns: number
                           },
"join_session":
{ Args: { "p_bring_guest"?: boolean,"p_session_id": string }; Returns: Json
                           },
"leave_group":
{ Args: { "p_group_id": string }; Returns: undefined
                           },
"leave_session":
{ Args: { "p_session_id": string }; Returns: Json
                           },
"list_groups":
{ Args: { "p_city_id": number,"p_scope"?: string }; Returns: Json
                           },
"list_messages":
{ Args: { "p_before"?: number,"p_group_id"?: string,"p_limit"?: number,"p_session_id"?: string }; Returns: Json
                           },
"list_notifications":
{ Args: { "p_limit"?: number }; Returns: Json
                           },
"mark_notifications_read":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"my_past_hosted":
{ Args: { "p_limit"?: number }; Returns: Json
                           },
"my_saved_sessions":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"my_sessions":
{ Args: { "p_kind": string,"p_limit"?: number }; Returns: Json
                           },
"person_json":
{ Args: { "p_user_id": string }; Returns: Json
                           },
"promote_waitlist":
{ Args: { "p_session_id": string }; Returns: number
                           },
"record_attendance":
{ Args: { "p_attended": (string)[],"p_session_id": string }; Returns: undefined
                           },
"refresh_session_counts":
{ Args: { "p_session_id": string }; Returns: undefined
                           },
"reliability_score":
{ Args: { "p_user_id": string }; Returns: number
                           },
"require_admin":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"require_ready_user":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"require_user":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"session_card_json":
{ Args: { "p_lat"?: number,"p_lng"?: number,"s": Omit<Database["public"]['Tables']["sessions"]['Row'], Database["public"]['Tables']["sessions"]['ComputedFields']> }; Returns: Json
                           },
"session_roster":
{ Args: { "p_session_id": string }; Returns: Json
                           },
"sessions_within_radius":
{ Args: { "p_lat": number,"p_limit"?: number,"p_lng": number,"p_radius_m"?: number }; Returns: Json
                           },
"set_group_member":
{ Args: { "p_group_id": string,"p_role"?: Database["public"]['Enums']["group_role"],"p_trusted"?: boolean,"p_user_id": string }; Returns: undefined
                           },
"set_guest":
{ Args: { "p_guest": boolean,"p_session_id": string }; Returns: Json
                           },
"set_interests":
{ Args: { "p_interest_ids": (number)[] }; Returns: undefined
                           },
"set_priority_window":
{ Args: { "p_hours": number,"p_session_id": string }; Returns: undefined
                           },
"shares_session":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"submit_reviews":
{ Args: { "p_reviews": Json,"p_session_id": string }; Returns: number
                           }
          }
          Enums: {
            "cancellation_policy": "flexible"|"moderate"|"strict","group_role": "admin"|"member","group_visibility": "public"|"private","participant_status": "joined"|"waitlist"|"cancelled"|"no_show"|"attended","payment_status": "none"|"pending"|"paid"|"refunded","report_status": "open"|"reviewed"|"actioned"|"dismissed","report_target": "user"|"session"|"group"|"message","session_level": "all"|"beginner"|"intermediate"|"advanced","session_status": "draft"|"published"|"cancelled"|"completed"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "cancellation_policy": ["flexible", "moderate", "strict"],"group_role": ["admin", "member"],"group_visibility": ["public", "private"],"participant_status": ["joined", "waitlist", "cancelled", "no_show", "attended"],"payment_status": ["none", "pending", "paid", "refunded"],"report_status": ["open", "reviewed", "actioned", "dismissed"],"report_target": ["user", "session", "group", "message"],"session_level": ["all", "beginner", "intermediate", "advanced"],"session_status": ["draft", "published", "cancelled", "completed"]
          }
        }
} as const
