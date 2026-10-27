export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      ad_campaigns: {
        Row: {
          ad_type: string
          advertiser_id: string
          budget_cents: number
          click_url: string | null
          cpm_cents: number
          created_at: string
          creative_url: string
          ends_at: string | null
          headline: string | null
          id: string
          name: string
          review_note: string | null
          reviewed_at: string | null
          skip_after_seconds: number
          spent_cents: number
          starts_at: string
          status: string
          target_categories: string[]
          updated_at: string
        }
        Insert: {
          ad_type?: string
          advertiser_id: string
          budget_cents?: number
          click_url?: string | null
          cpm_cents?: number
          created_at?: string
          creative_url: string
          ends_at?: string | null
          headline?: string | null
          id?: string
          name: string
          review_note?: string | null
          reviewed_at?: string | null
          skip_after_seconds?: number
          spent_cents?: number
          starts_at?: string
          status?: string
          target_categories?: string[]
          updated_at?: string
        }
        Update: {
          ad_type?: string
          advertiser_id?: string
          budget_cents?: number
          click_url?: string | null
          cpm_cents?: number
          created_at?: string
          creative_url?: string
          ends_at?: string | null
          headline?: string | null
          id?: string
          name?: string
          review_note?: string | null
          reviewed_at?: string | null
          skip_after_seconds?: number
          spent_cents?: number
          starts_at?: string
          status?: string
          target_categories?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_events: {
        Row: {
          campaign_id: string
          created_at: string
          creator_id: string | null
          creator_share_cents: number
          event_type: string
          id: string
          revenue_cents: number
          video_id: string | null
          viewer_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          creator_id?: string | null
          creator_share_cents?: number
          event_type?: string
          id?: string
          revenue_cents?: number
          video_id?: string | null
          viewer_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          creator_id?: string | null
          creator_share_cents?: number
          event_type?: string
          id?: string
          revenue_cents?: number
          video_id?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_events_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_credit_transactions: {
        Row: {
          advertiser_id: string
          amount_cents: number
          created_at: string
          id: string
          kind: string
          reference: string | null
        }
        Insert: {
          advertiser_id: string
          amount_cents: number
          created_at?: string
          id?: string
          kind?: string
          reference?: string | null
        }
        Update: {
          advertiser_id?: string
          amount_cents?: number
          created_at?: string
          id?: string
          kind?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_credit_transactions_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_notifications: {
        Row: {
          advertiser_id: string
          body: string | null
          campaign_id: string | null
          created_at: string
          id: string
          read_at: string | null
          title: string
        }
        Insert: {
          advertiser_id: string
          body?: string | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
        }
        Update: {
          advertiser_id?: string
          body?: string | null
          campaign_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_notifications_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advertiser_notifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisers: {
        Row: {
          company_name: string
          contact_email: string
          created_at: string
          credits_cents: number
          id: string
          low_balance_email_alerts: boolean
          low_balance_notified_at: string | null
          low_balance_threshold_cents: number
          status: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          company_name: string
          contact_email: string
          created_at?: string
          credits_cents?: number
          id?: string
          low_balance_email_alerts?: boolean
          low_balance_notified_at?: string | null
          low_balance_threshold_cents?: number
          status?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          company_name?: string
          contact_email?: string
          created_at?: string
          credits_cents?: number
          id?: string
          low_balance_email_alerts?: boolean
          low_balance_notified_at?: string | null
          low_balance_threshold_cents?: number
          status?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      audio_tracks: {
        Row: {
          artist_name: string | null
          audio_url: string
          cover_url: string | null
          created_at: string
          description: string | null
          duration: number | null
          genre: string | null
          id: string
          is_published: boolean
          streams: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_name?: string | null
          audio_url: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          genre?: string | null
          id?: string
          is_published?: boolean
          streams?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_name?: string | null
          audio_url?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          genre?: string | null
          id?: string
          is_published?: boolean
          streams?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_tracks_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          category: string | null
          comments_count: number
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          likes: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          comments_count?: number
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          likes?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          comments_count?: number
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          likes?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      live_chat_messages: {
        Row: {
          amount_usd: number | null
          created_at: string
          id: string
          is_super_chat: boolean
          message: string
          stream_id: string
          user_id: string
        }
        Insert: {
          amount_usd?: number | null
          created_at?: string
          id?: string
          is_super_chat?: boolean
          message: string
          stream_id: string
          user_id: string
        }
        Update: {
          amount_usd?: number | null
          created_at?: string
          id?: string
          is_super_chat?: boolean
          message?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_credentials: {
        Row: {
          created_at: string
          stream_id: string
          stream_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          stream_id: string
          stream_key?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          stream_id?: string
          stream_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_credentials_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: true
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          ended_at: string | null
          hls_ready: boolean
          id: string
          ingest_url: string | null
          last_publish_at: string | null
          last_publish_done_at: string | null
          latency_mode: string
          peak_viewer_count: number
          playback_url: string | null
          record_replay: boolean
          replay_video_id: string | null
          scheduled_for: string | null
          started_at: string | null
          status: string
          stream_url: string | null
          thumbnail_url: string | null
          title: string
          total_super_chat_cents: number
          updated_at: string
          viewer_count: number
          visibility: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          ended_at?: string | null
          hls_ready?: boolean
          id?: string
          ingest_url?: string | null
          last_publish_at?: string | null
          last_publish_done_at?: string | null
          latency_mode?: string
          peak_viewer_count?: number
          playback_url?: string | null
          record_replay?: boolean
          replay_video_id?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          stream_url?: string | null
          thumbnail_url?: string | null
          title: string
          total_super_chat_cents?: number
          updated_at?: string
          viewer_count?: number
          visibility?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          ended_at?: string | null
          hls_ready?: boolean
          id?: string
          ingest_url?: string | null
          last_publish_at?: string | null
          last_publish_done_at?: string | null
          latency_mode?: string
          peak_viewer_count?: number
          playback_url?: string | null
          record_replay?: boolean
          replay_video_id?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          stream_url?: string | null
          thumbnail_url?: string | null
          title?: string
          total_super_chat_cents?: number
          updated_at?: string
          viewer_count?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_creator_id_profiles_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "live_streams_replay_video_id_fkey"
            columns: ["replay_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      live_super_chats: {
        Row: {
          amount_usd: number
          created_at: string
          id: string
          message: string | null
          stream_id: string
          user_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          id?: string
          message?: string | null
          stream_id: string
          user_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          message?: string | null
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_super_chats_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_applications: {
        Row: {
          created_at: string
          id: string
          note: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subscriber_count_at_apply: number
          updated_at: string
          user_id: string
          watch_hours_at_apply: number
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subscriber_count_at_apply?: number
          updated_at?: string
          user_id: string
          watch_hours_at_apply?: number
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subscriber_count_at_apply?: number
          updated_at?: string
          user_id?: string
          watch_hours_at_apply?: number
        }
        Relationships: []
      }
      playlist_items: {
        Row: {
          added_at: string
          audio_id: string | null
          id: string
          playlist_id: string
          position: number
          video_id: string | null
        }
        Insert: {
          added_at?: string
          audio_id?: string | null
          id?: string
          playlist_id: string
          position?: number
          video_id?: string | null
        }
        Update: {
          added_at?: string
          audio_id?: string | null
          id?: string
          playlist_id?: string
          position?: number
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          is_published: boolean
          playlist_type: Database["public"]["Enums"]["playlist_type"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          is_published?: boolean
          playlist_type?: Database["public"]["Enums"]["playlist_type"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          is_published?: boolean
          playlist_type?: Database["public"]["Enums"]["playlist_type"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_creator: boolean
          is_monetized: boolean
          subscriber_count: number
          updated_at: string
          user_id: string
          watch_hours: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_creator?: boolean
          is_monetized?: boolean
          subscriber_count?: number
          updated_at?: string
          user_id: string
          watch_hours?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_creator?: boolean
          is_monetized?: boolean
          subscriber_count?: number
          updated_at?: string
          user_id?: string
          watch_hours?: number
        }
        Relationships: []
      }
      stream_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          metadata: Json
          status: string
          stream_id: string | null
          stream_key_hint: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json
          status?: string
          stream_id?: string | null
          stream_key_hint?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          status?: string
          stream_id?: string | null
          stream_key_hint?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_events_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          stream_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          stream_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          stream_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_reactions_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          subscriber_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          subscriber_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          subscriber_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          duration: number | null
          id: string
          is_published: boolean
          is_short: boolean
          processing_status: string
          publish_at: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string
          views: number
          visibility: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_published?: boolean
          is_short?: boolean
          processing_status?: string
          publish_at?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          video_url: string
          views?: number
          visibility?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_published?: boolean
          is_short?: boolean
          processing_status?: string
          publish_at?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string
          views?: number
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      watch_history: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          video_id: string
          viewer_id: string | null
          watch_seconds: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          video_id: string
          viewer_id?: string | null
          watch_seconds?: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          video_id?: string
          viewer_id?: string | null
          watch_seconds?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_advertiser_credits: {
        Args: { p_amount_cents: number; p_reference?: string }
        Returns: number
      }
      add_video_to_playlist: {
        Args: { p_playlist_id: string; p_video_id: string }
        Returns: undefined
      }
      add_watch_time: {
        Args: {
          p_creator_id: string
          p_seconds?: number
          p_video_id: string
          p_viewer_id?: string
        }
        Returns: undefined
      }
      apply_for_monetization: { Args: { _note?: string }; Returns: string }
      check_monetization_eligibility: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      create_playlist: {
        Args: {
          p_cover_url?: string
          p_description?: string
          p_playlist_type?: Database["public"]["Enums"]["playlist_type"]
          p_title: string
        }
        Returns: string
      }
      disable_creator_ads: { Args: never; Returns: boolean }
      enable_creator_ads: { Args: never; Returns: boolean }
      get_advertiser_billing_statement: {
        Args: { p_end: string; p_start: string }
        Returns: {
          campaign_id: string
          campaign_name: string
          clicks: number
          impressions: number
          spend_cents: number
        }[]
      }
      get_advertiser_campaign_analytics: {
        Args: never
        Returns: {
          budget_cents: number
          campaign_id: string
          campaign_name: string
          clicks: number
          impressions: number
          spend_cents: number
          status: string
          videos_reached: number
        }[]
      }
      get_advertiser_ledger: {
        Args: { p_end: string; p_start: string }
        Returns: {
          amount_cents: number
          created_at: string
          kind: string
          reference: string
        }[]
      }
      get_creator_ad_dashboard: { Args: never; Returns: Json }
      get_creator_ad_earnings: {
        Args: never
        Returns: {
          clicks: number
          earnings_cents: number
          impressions: number
        }[]
      }
      get_creator_earnings: {
        Args: never
        Returns: {
          ad_earnings_cents: number
          clicks: number
          impressions: number
          super_chat_cents: number
          total_cents: number
        }[]
      }
      get_live_ad_overview: {
        Args: never
        Returns: {
          ad_type: string
          advertiser_name: string
          budget_cents: number
          campaign_id: string
          campaign_name: string
          clicks_total: number
          cpm_cents: number
          impressions_last_hour: number
          impressions_total: number
          live_impressions_last_hour: number
          midroll_impressions_last_hour: number
          spent_cents: number
          status: string
        }[]
      }
      get_live_ad_placements: {
        Args: never
        Returns: {
          creator_id: string
          creator_name: string
          duration: number
          impressions_last_hour: number
          is_live: boolean
          midroll_eligible: boolean
          title: string
          video_id: string
        }[]
      }
      get_stream_key: { Args: { p_stream_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_streams: { Args: { track_id: string }; Returns: undefined }
      list_monetization_applications: {
        Args: { _status?: string }
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          id: string
          is_monetized: boolean
          note: string
          review_note: string
          reviewed_at: string
          status: string
          subscriber_count: number
          subscriber_count_at_apply: number
          user_id: string
          watch_hours: number
          watch_hours_at_apply: number
        }[]
      }
      notify_low_balance: {
        Args: { p_advertiser_id: string }
        Returns: undefined
      }
      record_ad_event: {
        Args: {
          p_campaign_id: string
          p_event_type: string
          p_video_id: string
        }
        Returns: undefined
      }
      remove_video_from_playlist: {
        Args: { p_playlist_id: string; p_video_id: string }
        Returns: undefined
      }
      reorder_playlist_items: {
        Args: {
          p_new_position: number
          p_playlist_id: string
          p_video_id: string
        }
        Returns: undefined
      }
      review_ad_campaign: {
        Args: { p_approve: boolean; p_campaign_id: string; p_note?: string }
        Returns: undefined
      }
      review_monetization_application: {
        Args: { _application_id: string; _approve: boolean; _note?: string }
        Returns: boolean
      }
      rotate_stream_key: { Args: { p_stream_id: string }; Returns: string }
      serve_ad: {
        Args: { p_ad_type?: string; p_category?: string; p_video_id: string }
        Returns: {
          campaign_id: string
          click_url: string
          creative_url: string
          headline: string
          skip_after_seconds: number
        }[]
      }
      serve_live_ad: {
        Args: { p_ad_type?: string; p_category?: string; p_stream_id: string }
        Returns: {
          campaign_id: string
          click_url: string
          creative_url: string
          headline: string
          skip_after_seconds: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      playlist_type: "album" | "ep" | "compilation" | "custom" | "watch_later"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      playlist_type: ["album", "ep", "compilation", "custom", "watch_later"],
    },
  },
} as const
