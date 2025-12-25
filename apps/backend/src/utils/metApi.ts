const MET_API_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1/objects';

export interface MetApiArtwork {
  objectID: number;
  primaryImage?: string;
  primaryImageSmall?: string;
  objectURL?: string;
  isPublicDomain?: boolean;
}

export async function fetchMetArtwork(objectId: number): Promise<MetApiArtwork | null> {
  try {
    const response = await fetch(`${MET_API_BASE}/${objectId}`);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as MetApiArtwork;
    return data;
  } catch {
    return null;
  }
}
