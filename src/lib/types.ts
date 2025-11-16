// 项目类型定义

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

