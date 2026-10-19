export type SourceId = "dz" | "it" | "mb";

export type RecordType = "album" | "ep" | "single" | "compilation";

export interface Track {
  id: string;
  position: number; // 1-based, ordered by disc then track number
  disc: number;
  title: string;
  durationSec: number;
  previewUrl?: string;
  explicit?: boolean;
}

export interface Album {
  source: SourceId;
  id: string;
  title: string;
  artist: string;
  year?: number;
  coverUrl: string; // largest available
  coverThumbUrl: string;
  genre?: string;
  recordType?: RecordType;
  tracks: Track[];
  externalUrl?: string; // Deezer / Apple Music page, used for attribution
}

export interface AlbumSummary {
  source: SourceId;
  id: string;
  title: string;
  artist: string;
  year?: number;
  coverThumbUrl: string;
  trackCount?: number;
  recordType?: RecordType;
}

export interface MusicProvider {
  id: SourceId;
  searchAlbums(query: string): Promise<AlbumSummary[]>;
  getAlbum(id: string): Promise<Album>;
}

export const SOURCE_LABEL: Record<SourceId, string> = {
  dz: "Deezer",
  it: "Apple Music",
  mb: "MusicBrainz",
};
