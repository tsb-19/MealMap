import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jkshirekmwaejhpufapd.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprc2hpcmVrbXdhZWpocHVmYXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NTczODksImV4cCI6MjA3NzEzMzM4OX0.4gwBh1SndQLpWovx0y_RmtWdqzp8oYvz5HsVe3yuaHk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 数据类型定义
export interface Student {
  id: string
  user_id: string
  country: 'china' | 'usa'
  region_id: string
  region_name: string
  name: string
  school: string
  city: string
  created_at: string
  updated_at: string
}

export interface Region {
  id: string
  name: string
  name_en: string
  code: string
  type: string
  administrative_center: string
  coordinates: {
    lat: number
    lng: number
  }
}

export interface MapsConfig {
  metadata: {
    version: string
    created_date: string
    description: string
  }
  countries: {
    china: {
      name: string
      name_en: string
      code: string
      administrative_divisions: Region[]
    }
    usa: {
      name: string
      name_en: string
      code: string
      administrative_divisions: Region[]
    }
  }
}
