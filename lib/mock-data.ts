export type MediaType = "image" | "video"

export interface MediaItem {
  id: string
  url: string
  type: MediaType
  title: string
  description?: string
  thumbnailUrl: string
  signedUrl?: string
}

export interface ShareLink {
  id: string
  token: string
  name: string
  isPasswordProtected: boolean
  password?: string
  createdAt: string
  analytics: {
    totalViews: number
    mediaInteractions: number
    timeSpentPerMedia: number // in seconds
  }
}

export interface Lightbox {
  id: string
  name: string
  description: string
  types: MediaType[]
  keywords: string[]
  mediaItems: MediaItem[]
  shareLinks: ShareLink[]
}

export const mockLightboxes: Lightbox[] = [
  {
    id: "1",
    name: "Nature Collection",
    description: "Beautiful nature shots from around the world",
    types: ["image", "video"],
    keywords: ["nature", "landscape", "wildlife"],
    mediaItems: [
      {
        id: "101",
        url: "s3://mock-bucket/nature/forest.jpg",
        type: "image",
        title: "Forest Landscape",
        description: "Dense forest with morning fog",
        thumbnailUrl: "/lush-forest-path.png",
      },
      {
        id: "102",
        url: "s3://mock-bucket/nature/waterfall.jpg",
        type: "image",
        title: "Waterfall",
        description: "Majestic waterfall in the mountains",
        thumbnailUrl: "/lush-forest-waterfall.png",
      },
      {
        id: "103",
        url: "s3://mock-bucket/nature/wildlife.mp4",
        type: "video",
        title: "Wildlife Documentary",
        description: "Short clip of animals in their natural habitat",
        thumbnailUrl: "/diverse-wildlife.png",
      },
    ],
    shareLinks: [
      {
        id: "201",
        token: "nature-collection-public",
        name: "Public Link",
        isPasswordProtected: false,
        createdAt: "2023-10-15T10:30:00Z",
        analytics: {
          totalViews: 245,
          mediaInteractions: 189,
          timeSpentPerMedia: 12,
        },
      },
      {
        id: "202",
        token: "nature-collection-private",
        name: "Client Preview",
        isPasswordProtected: true,
        password: "nature123",
        createdAt: "2023-11-05T14:20:00Z",
        analytics: {
          totalViews: 32,
          mediaInteractions: 28,
          timeSpentPerMedia: 25,
        },
      },
    ],
  },
  {
    id: "2",
    name: "Urban Photography",
    description: "City life and architecture",
    types: ["image"],
    keywords: ["city", "architecture", "street", "urban"],
    mediaItems: [
      {
        id: "201",
        url: "s3://mock-bucket/urban/skyline.jpg",
        type: "image",
        title: "City Skyline",
        description: "Panoramic view of downtown",
        thumbnailUrl: "/vibrant-city-skyline.png",
      },
      {
        id: "202",
        url: "s3://mock-bucket/urban/street.jpg",
        type: "image",
        title: "Street Photography",
        description: "Busy street scene with pedestrians",
        thumbnailUrl: "/placeholder.svg?key=miflf",
      },
    ],
    shareLinks: [
      {
        id: "301",
        token: "urban-collection-public",
        name: "Portfolio Showcase",
        isPasswordProtected: false,
        createdAt: "2023-09-20T08:15:00Z",
        analytics: {
          totalViews: 178,
          mediaInteractions: 145,
          timeSpentPerMedia: 8,
        },
      },
    ],
  },
  {
    id: "3",
    name: "Travel Moments",
    description: "Highlights from various travel destinations",
    types: ["image", "video"],
    keywords: ["travel", "vacation", "adventure", "destinations"],
    mediaItems: [
      {
        id: "301",
        url: "s3://mock-bucket/travel/beach.jpg",
        type: "image",
        title: "Tropical Beach",
        description: "Sunset at a tropical beach",
        thumbnailUrl: "/tropical-beach-sunset.png",
      },
      {
        id: "302",
        url: "s3://mock-bucket/travel/mountains.jpg",
        type: "image",
        title: "Mountain Range",
        description: "Scenic view of mountain peaks",
        thumbnailUrl: "/placeholder.svg?key=jf5jx",
      },
      {
        id: "303",
        url: "s3://mock-bucket/travel/cityscape.mp4",
        type: "video",
        title: "European Cityscape",
        description: "Walking tour of historic European city",
        thumbnailUrl: "/placeholder.svg?key=w6chb",
      },
    ],
    shareLinks: [
      {
        id: "401",
        token: "travel-moments-client",
        name: "Client Review",
        isPasswordProtected: true,
        password: "travel456",
        createdAt: "2023-12-01T16:45:00Z",
        analytics: {
          totalViews: 42,
          mediaInteractions: 38,
          timeSpentPerMedia: 18,
        },
      },
    ],
  },
]

// Mock user for authentication
export const mockUser = {
  email: "admin@example.com",
  password: "password123",
}
