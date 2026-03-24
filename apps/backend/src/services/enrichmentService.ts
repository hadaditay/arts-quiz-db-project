import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { withConnection } from '../db';
import {
  AnswerEnrichment,
  ArtworkContext,
  ArtistContext,
  PeriodContext,
  QuestionTypeId
} from '../types';
import {
  wineRegionFromArtwork,
  foodPairingFromArtwork,
  artPeriodsFromArtwork,
  sommelierPick,
  fullSensoryExperience
} from './analyticsService';

type Conn = PoolConnection;

async function useConn<T>(existing: Conn | undefined, fn: (c: Conn) => Promise<T>): Promise<T> {
  if (existing) return fn(existing);
  return withConnection(fn);
}

// --- Shared helpers ---

async function getArtworkContext(artworkId: number, conn: Conn): Promise<ArtworkContext | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT title, artist_display_name, culture, department, is_highlight, object_url, tags
     FROM met_artwork WHERE artwork_id = ? LIMIT 1`,
    [artworkId]
  );
  if (!rows.length) return null;
  const r = rows[0];
  let tags: string[] | null = null;
  if (r.tags) {
    try { tags = typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags; } catch { tags = null; }
  }
  return {
    title: r.title ?? null,
    artistName: r.artist_display_name ?? null,
    culture: r.culture ?? null,
    department: r.department ?? null,
    isHighlight: !!r.is_highlight,
    objectUrl: r.object_url ?? null,
    tags
  };
}

async function getArtistProfile(artistName: string | null, conn: Conn): Promise<ArtistContext | null> {
  if (!artistName) return null;
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT full_name, bio, birth_year, death_year
     FROM artist_profile WHERE full_name = ? LIMIT 1`,
    [artistName]
  );
  if (!rows.length) return null;
  const r = rows[0];
  let bio = r.bio ?? null;
  if (bio && bio.length > 300) bio = bio.slice(0, 297) + '...';
  return {
    fullName: r.full_name,
    bio,
    birthYear: r.birth_year ?? null,
    deathYear: r.death_year ?? null
  };
}

async function getPeriodsForArtwork(artworkId: number, conn: Conn): Promise<PeriodContext[]> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT ap.period_name, ap.region, ap.start_year, ap.end_year,
            COUNT(DISTINCT awp2.artwork_id) AS artwork_count
     FROM artwork_period awp
     JOIN art_period ap ON ap.period_id = awp.period_id
     LEFT JOIN artwork_period awp2 ON awp2.period_id = ap.period_id
     WHERE awp.artwork_id = ?
     GROUP BY ap.period_id, ap.period_name, ap.region, ap.start_year, ap.end_year`,
    [artworkId]
  );
  return rows.map(r => ({
    periodName: r.period_name,
    region: r.region,
    startYear: r.start_year,
    endYear: r.end_year,
    artworkCount: Number(r.artwork_count)
  }));
}

async function getCountryForArtwork(artworkId: number, conn: Conn): Promise<{ countryName: string; continent: string } | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT c.country_name, c.continent
     FROM met_artwork ma
     JOIN culture_country cc ON cc.culture_value = ma.culture
     JOIN country c ON c.country_id = cc.country_id
     WHERE ma.artwork_id = ? LIMIT 1`,
    [artworkId]
  );
  if (!rows.length) return null;
  return { countryName: rows[0].country_name, continent: rows[0].continent };
}

// --- Per-type enrichment builders ---

async function enrichDepartment(artworkId: number, conn: Conn): Promise<AnswerEnrichment> {
  const [artwork, periods] = await Promise.all([
    getArtworkContext(artworkId, conn),
    getPeriodsForArtwork(artworkId, conn)
  ]);
  const artist = await getArtistProfile(artwork?.artistName ?? null, conn);

  let departmentStats = { totalArtworks: 0, countryCount: 0, topCountry: null as string | null };
  if (artwork?.department) {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT ma.artwork_id) AS total_artworks,
              COUNT(DISTINCT c.country_id) AS country_count,
              (SELECT c2.country_name FROM met_artwork ma2
               JOIN culture_country cc2 ON cc2.culture_value = ma2.culture
               JOIN country c2 ON c2.country_id = cc2.country_id
               WHERE ma2.department = ?
               GROUP BY c2.country_id ORDER BY COUNT(*) DESC LIMIT 1) AS top_country
       FROM met_artwork ma
       LEFT JOIN culture_country cc ON cc.culture_value = ma.culture
       LEFT JOIN country c ON c.country_id = cc.country_id
       WHERE ma.department = ?`,
      [artwork.department, artwork.department]
    );
    if (rows.length) {
      departmentStats = {
        totalArtworks: Number(rows[0].total_artworks),
        countryCount: Number(rows[0].country_count),
        topCountry: rows[0].top_country ?? null
      };
    }
  }

  const trail: string[] = [];
  if (artwork?.title) trail.push(artwork.title);
  if (artwork?.department) trail.push(artwork.department);

  return { type: 'department', connectionTrail: trail, artwork: artwork!, artist, periods, departmentStats };
}

async function enrichCulture(artworkId: number, conn: Conn): Promise<AnswerEnrichment> {
  const artwork = await getArtworkContext(artworkId, conn);
  const artist = await getArtistProfile(artwork?.artistName ?? null, conn);

  let country: { countryName: string; continent: string } | null = null;
  let cultureArtworkCount = 0;
  let notableWineVariety: string | null = null;

  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT c.country_name, c.continent,
            (SELECT COUNT(*) FROM met_artwork ma2 WHERE ma2.culture = ma.culture) AS culture_artwork_count,
            (SELECT w.variety FROM wine w WHERE w.country = c.country_name
             GROUP BY w.variety ORDER BY COUNT(*) DESC LIMIT 1) AS notable_wine_variety
     FROM met_artwork ma
     JOIN culture_country cc ON cc.culture_value = ma.culture
     JOIN country c ON c.country_id = cc.country_id
     WHERE ma.artwork_id = ? LIMIT 1`,
    [artworkId]
  );
  if (rows.length) {
    country = { countryName: rows[0].country_name, continent: rows[0].continent };
    cultureArtworkCount = Number(rows[0].culture_artwork_count);
    notableWineVariety = rows[0].notable_wine_variety ?? null;
  }

  const trail: string[] = [];
  if (artwork?.title) trail.push(artwork.title);
  if (artwork?.culture) trail.push(artwork.culture);
  if (country) trail.push(country.countryName);

  return { type: 'culture', connectionTrail: trail, artwork: artwork!, artist, country, cultureArtworkCount, notableWineVariety };
}

async function enrichWineRegion(artworkId: number, conn: Conn): Promise<AnswerEnrichment> {
  const [artwork, regionRows, countryInfo] = await Promise.all([
    getArtworkContext(artworkId, conn),
    wineRegionFromArtwork(artworkId, conn),
    getCountryForArtwork(artworkId, conn)
  ]);

  const regions = regionRows.map((r: RowDataPacket) => ({
    province: r.province,
    avgPoints: Number(r.avg_points),
    wineCount: Number(r.wine_count),
    topVariety: r.top_variety
  }));

  const trail: string[] = [];
  if (artwork?.title) trail.push(artwork.title);
  if (artwork?.culture) trail.push(artwork.culture);
  if (countryInfo) trail.push(countryInfo.countryName);
  if (regions.length) trail.push(regions[0].province);

  return { type: 'wine_region', connectionTrail: trail, artwork: artwork!, regions, countryName: countryInfo?.countryName ?? null };
}

async function enrichFoodPairing(artworkId: number, conn: Conn): Promise<AnswerEnrichment> {
  const [artwork, pairingRows, countryInfo] = await Promise.all([
    getArtworkContext(artworkId, conn),
    foodPairingFromArtwork(artworkId, conn),
    getCountryForArtwork(artworkId, conn)
  ]);

  const pairings = pairingRows.map((r: RowDataPacket) => ({
    foodName: r.food_name,
    cuisineRegion: r.cuisine_region,
    variety: r.variety,
    avgWinePoints: Number(r.avg_wine_points)
  }));

  const trail: string[] = [];
  if (artwork?.title) trail.push(artwork.title);
  if (artwork?.culture) trail.push(artwork.culture);
  if (countryInfo) trail.push(countryInfo.countryName);
  if (pairings.length) trail.push(`${pairings[0].foodName} + ${pairings[0].variety}`);

  return { type: 'food_pairing', connectionTrail: trail, artwork: artwork!, pairings, countryName: countryInfo?.countryName ?? null };
}

async function enrichArtPeriod(artworkId: number, correctValue: string, conn: Conn): Promise<AnswerEnrichment> {
  const artwork = await getArtworkContext(artworkId, conn);
  const [artist, allPeriods, siblingRows] = await Promise.all([
    getArtistProfile(artwork?.artistName ?? null, conn),
    getPeriodsForArtwork(artworkId, conn),
    artPeriodsFromArtwork(artworkId, conn)
  ]);

  const period = allPeriods.find(p => p.periodName === correctValue) ?? allPeriods[0] ?? null;
  const siblingPeriods = siblingRows
    .filter((r: RowDataPacket) => r.period_name !== correctValue)
    .slice(0, 3)
    .map((r: RowDataPacket) => ({
      periodName: r.period_name,
      region: r.region,
      startYear: 0,
      endYear: 0,
      artworkCount: Number(r.artwork_count)
    }));

  const trail: string[] = [];
  if (artwork?.title) trail.push(artwork.title);
  if (artwork?.culture) trail.push(artwork.culture);
  if (period) trail.push(`${period.periodName} (${period.startYear}\u2013${period.endYear})`);

  return { type: 'art_period', connectionTrail: trail, artwork: artwork!, artist, period, siblingPeriods };
}

async function enrichSommelier(artworkId: number, conn: Conn): Promise<AnswerEnrichment> {
  const [artwork, periods, wineRows] = await Promise.all([
    getArtworkContext(artworkId, conn),
    getPeriodsForArtwork(artworkId, conn),
    sommelierPick(artworkId, conn)
  ]);

  const topWines = wineRows.slice(0, 3).map((r: RowDataPacket) => ({
    variety: r.variety,
    winery: r.winery,
    avgPoints: Number(r.avg_points),
    country: r.country,
    priceRange: r.price_range ?? null
  }));

  const p = periods[0] ?? null;
  const trail: string[] = [];
  if (artwork?.title) trail.push(artwork.title);
  if (p) trail.push(p.periodName);
  if (topWines.length) trail.push(topWines[0].variety);

  return { type: 'sommelier', connectionTrail: trail, artwork: artwork!, period: p, topWines };
}

async function enrichSensory(artworkId: number, conn: Conn): Promise<AnswerEnrichment> {
  const [artwork, periods, sensoryRows, countryInfo] = await Promise.all([
    getArtworkContext(artworkId, conn),
    getPeriodsForArtwork(artworkId, conn),
    fullSensoryExperience(artworkId, conn),
    getCountryForArtwork(artworkId, conn)
  ]);

  const top = sensoryRows[0] as RowDataPacket | undefined;

  const p = periods[0] ?? null;
  const trail: string[] = [];
  if (artwork?.title) trail.push(artwork.title);
  if (p) trail.push(p.periodName);
  if (top) trail.push(`${top.variety} + ${top.food_name}`);

  return {
    type: 'sensory',
    connectionTrail: trail,
    artwork: artwork!,
    period: p,
    wine: top ? {
      variety: top.variety,
      winery: '',
      avgPoints: Number(top.avg_wine_points),
      country: top.wine_country,
      priceRange: null
    } : null,
    foodPairing: top ? {
      foodName: top.food_name,
      cuisineRegion: top.cuisine_region,
      variety: top.variety,
      avgWinePoints: Number(top.avg_wine_points)
    } : null,
    countryName: countryInfo?.countryName ?? null
  };
}

async function enrichWarConflict(artworkId: number, correctValue: string, conn: Conn): Promise<AnswerEnrichment> {
  const [artwork, periods, artist] = await Promise.all([
    getArtworkContext(artworkId, conn),
    getPeriodsForArtwork(artworkId, conn),
    getArtworkContext(artworkId, conn).then(a => getArtistProfile(a?.artistName ?? null, conn))
  ]);

  // Fetch war details
  const [warRows] = await conn.query<RowDataPacket[]>(
    `SELECT war_name, war_type, start_year, end_year, region,
            country_name, description, notable_figures
     FROM war_battle WHERE war_name = ? LIMIT 1`,
    [correctValue]
  );

  const warRow = warRows[0];
  const war = warRow ? {
    warName: warRow.war_name,
    warType: warRow.war_type,
    startYear: Number(warRow.start_year),
    endYear: Number(warRow.end_year),
    region: warRow.region,
    countryName: warRow.country_name ?? null,
    description: warRow.description ?? null,
    notableFigures: warRow.notable_figures ?? null
  } : {
    warName: correctValue, warType: 'war', startYear: 0, endYear: 0,
    region: '', countryName: null, description: null, notableFigures: null
  };

  // Fetch sibling conflicts (same country, overlapping with artwork's period)
  const [siblingRows] = await conn.query<RowDataPacket[]>(
    `SELECT wb2.war_name, wb2.war_type, wb2.start_year, wb2.end_year
     FROM war_battle wb2
     JOIN country c ON c.country_name = wb2.country_name
     JOIN culture_country cc ON cc.country_id = c.country_id
     JOIN met_artwork ma ON ma.culture = cc.culture_value
     JOIN artwork_period awp ON awp.artwork_id = ma.artwork_id
     JOIN art_period ap ON ap.period_id = awp.period_id
     WHERE ma.artwork_id = ?
       AND wb2.war_name != ?
       AND wb2.start_year <= ap.end_year
       AND wb2.end_year >= ap.start_year
     ORDER BY wb2.start_year
     LIMIT 3`,
    [artworkId, correctValue]
  );

  const siblingConflicts = siblingRows.map((r: RowDataPacket) => ({
    warName: r.war_name,
    warType: r.war_type,
    startYear: Number(r.start_year),
    endYear: Number(r.end_year)
  }));

  const trail: string[] = [];
  if (artwork?.title) trail.push(artwork.title);
  if (artwork?.culture) trail.push(artwork.culture);
  if (war.countryName) trail.push(war.countryName);
  trail.push(`${war.warName} (${war.startYear}\u2013${war.endYear})`);

  return {
    type: 'war_conflict',
    connectionTrail: trail,
    artwork: artwork!,
    artist,
    period: periods[0] ?? null,
    war,
    siblingConflicts
  };
}


async function enrichArtistNationality(artworkId: number, correctValue: string, conn: Conn): Promise<AnswerEnrichment> {
  const artwork = await getArtworkContext(artworkId, conn);
  const artist = await getArtistProfile(artwork?.artistName ?? null, conn);

  const trail: string[] = [];
  if (artwork?.title) trail.push(artwork.title);
  if (artwork?.artistName) trail.push(artwork.artistName);
  trail.push(correctValue);

  return {
    type: 'artist_nationality',
    connectionTrail: trail,
    artwork: artwork!,
    artist,
    nationality: correctValue
  };
}

async function enrichArtworkName(artworkId: number, conn: Conn): Promise<AnswerEnrichment> {
  const artwork = await getArtworkContext(artworkId, conn);
  const artist = await getArtistProfile(artwork?.artistName ?? null, conn);

  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT title
     FROM met_artwork
     WHERE artist_display_name = ?
       AND artwork_id != ?
       AND title IS NOT NULL
       AND title != ''
     ORDER BY RAND()
     LIMIT 3`,
    [artwork?.artistName ?? '', artworkId]
  );

  const relatedTitles = rows.map((r) => r.title as string);

  const trail: string[] = [];
  if (artwork?.artistName) trail.push(artwork.artistName);
  if (artwork?.culture) trail.push(artwork.culture);
  if (artwork?.title) trail.push(artwork.title);

  return {
    type: 'artwork_name',
    connectionTrail: trail,
    artwork: artwork!,
    artist,
    relatedTitles
  };
}

// --- Main export ---

export async function getEnrichment(
  questionType: QuestionTypeId,
  artworkId: number,
  correctValue: string,
  connection?: Conn
): Promise<AnswerEnrichment | undefined> {
  try {
    return await useConn(connection, async (conn) => {
      switch (questionType) {
        case 'department':   return enrichDepartment(artworkId, conn);
        case 'culture':      return enrichCulture(artworkId, conn);
        case 'wine_region':  return enrichWineRegion(artworkId, conn);
        case 'food_pairing': return enrichFoodPairing(artworkId, conn);
        case 'art_period':   return enrichArtPeriod(artworkId, correctValue, conn);
        case 'sommelier':    return enrichSommelier(artworkId, conn);
        case 'sensory':      return enrichSensory(artworkId, conn);
        case 'war_conflict': return enrichWarConflict(artworkId, correctValue, conn);
        case 'artist_nationality': return enrichArtistNationality(artworkId, correctValue, conn);
        case 'artwork_name': return enrichArtworkName(artworkId, conn);
        default:             return undefined;
      }
    });
  } catch (err) {
    console.warn('Enrichment failed (non-blocking):', err);
    return undefined;
  }
}
