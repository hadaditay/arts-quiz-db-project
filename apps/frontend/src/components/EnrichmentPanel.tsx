import { useState } from 'react';
import {
  AnswerEnrichment,
  ArtworkContext,
  ArtistContext,
  PeriodContext
} from '../types';
import styles from './EnrichmentPanel.module.css';

interface Props {
  enrichment: AnswerEnrichment;
}

function ArtworkInfo({ artwork, artist }: { artwork: ArtworkContext; artist?: ArtistContext | null }) {
  const parts: string[] = [];
  if (artist) {
    let line = artist.fullName;
    if (artist.birthYear) {
      line += ` (${artist.birthYear}`;
      line += artist.deathYear ? `\u2013${artist.deathYear})` : '\u2013present)';
    }
    parts.push(line);
  } else if (artwork.artistName) {
    parts.push(artwork.artistName);
  }
  if (artwork.culture) parts.push(artwork.culture);

  return (
    <div>
      {parts.length > 0 && (
        <p className={styles.narrative}>
          <strong>{parts.join(' \u00b7 ')}</strong>
        </p>
      )}
      {artist?.bio && <p className={styles.artistBio}>{artist.bio}</p>}
      {artwork.objectUrl && (
        <a className={styles.metLink} href={artwork.objectUrl} target="_blank" rel="noopener noreferrer">
          View on The Met
        </a>
      )}
    </div>
  );
}

function PeriodBadges({ periods }: { periods: PeriodContext[] }) {
  if (!periods.length) return null;
  return (
    <div>
      {periods.map(p => (
        <span key={p.periodName} className={styles.badge}>
          {p.periodName} ({p.startYear}\u2013{p.endYear})
        </span>
      ))}
    </div>
  );
}

function DepartmentContent({ e }: { e: Extract<AnswerEnrichment, { type: 'department' }> }) {
  const { artwork, artist, periods, departmentStats } = e;
  return (
    <>
      <ArtworkInfo artwork={artwork} artist={artist} />
      {periods.length > 0 && (
        <div>
          <p className={styles.sectionLabel}>Art Period</p>
          <PeriodBadges periods={periods} />
        </div>
      )}
      {departmentStats.totalArtworks > 0 && (
        <div>
          <p className={styles.sectionLabel}>About this department</p>
          <p className={styles.narrative}>
            <strong>{artwork.department}</strong> holds{' '}
            <strong>{departmentStats.totalArtworks.toLocaleString()}</strong> artworks spanning{' '}
            <strong>{departmentStats.countryCount}</strong> countries
            {departmentStats.topCountry && <>, predominantly from <strong>{departmentStats.topCountry}</strong></>}.
          </p>
        </div>
      )}
    </>
  );
}

function CultureContent({ e }: { e: Extract<AnswerEnrichment, { type: 'culture' }> }) {
  const { artwork, artist, country, cultureArtworkCount, notableWineVariety } = e;
  return (
    <>
      <ArtworkInfo artwork={artwork} artist={artist} />
      {country && <span className={styles.badge}>{country.continent}</span>}
      {cultureArtworkCount > 0 && (
        <p className={styles.narrative}>
          <strong>{artwork.culture}</strong> art at The Met:{' '}
          <strong>{cultureArtworkCount.toLocaleString()}</strong> artworks in the collection.
          {country && <> From <strong>{country.countryName}</strong>.</>}
        </p>
      )}
      {notableWineVariety && (
        <p className={styles.narrative}>
          Notable wine from {country?.countryName ?? 'the homeland'}: <strong>{notableWineVariety}</strong>.
        </p>
      )}
    </>
  );
}

function WineRegionContent({ e }: { e: Extract<AnswerEnrichment, { type: 'wine_region' }> }) {
  const { artwork, regions, countryName } = e;
  return (
    <>
      <ArtworkInfo artwork={artwork} />
      {countryName && (
        <p className={styles.sectionLabel}>Wine Regions of {countryName}</p>
      )}
      <div className={styles.cardRow}>
        {regions.map(r => (
          <div key={r.province} className={styles.card}>
            <p className={styles.cardTitle}>{r.province}</p>
            <p className={styles.cardDetail}>
              Top grape: {r.topVariety}<br />
              Avg score: {r.avgPoints} pts &middot; {r.wineCount} wines
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

function FoodPairingContent({ e }: { e: Extract<AnswerEnrichment, { type: 'food_pairing' }> }) {
  const { artwork, pairings, countryName } = e;
  return (
    <>
      <ArtworkInfo artwork={artwork} />
      {countryName && (
        <p className={styles.sectionLabel}>Culinary connections from {countryName}</p>
      )}
      <div className={styles.cardRow}>
        {pairings.map(p => (
          <div key={`${p.foodName}-${p.variety}`} className={styles.card}>
            <p className={styles.cardTitle}>{p.foodName}</p>
            <p className={styles.cardDetail}>
              Pairs with {p.variety}<br />
              {p.cuisineRegion} cuisine &middot; {p.avgWinePoints} pts
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

function ArtPeriodContent({ e }: { e: Extract<AnswerEnrichment, { type: 'art_period' }> }) {
  const { artwork, artist, period, siblingPeriods } = e;
  return (
    <>
      <ArtworkInfo artwork={artwork} artist={artist} />
      {period && (
        <div>
          <p className={styles.sectionLabel}>{period.periodName}</p>
          <span className={styles.badge}>{period.region}</span>
          <span className={styles.badge}>{period.startYear}&ndash;{period.endYear}</span>
          <p className={styles.narrative}>
            This period encompasses <strong>{period.artworkCount.toLocaleString()}</strong> artworks at The Met.
          </p>
        </div>
      )}
      {siblingPeriods.length > 0 && (
        <div>
          <p className={styles.sectionLabel}>Related periods</p>
          <div className={styles.cardRow}>
            {siblingPeriods.map(p => (
              <div key={p.periodName} className={styles.card}>
                <p className={styles.cardTitle}>{p.periodName}</p>
                <p className={styles.cardDetail}>{p.artworkCount.toLocaleString()} artworks</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function SommelierContent({ e }: { e: Extract<AnswerEnrichment, { type: 'sommelier' }> }) {
  const { artwork, period, topWines } = e;
  return (
    <>
      <ArtworkInfo artwork={artwork} />
      {period && (
        <p className={styles.narrative}>
          Wines to complement the <strong>{period.periodName}</strong> era ({period.startYear}&ndash;{period.endYear}):
        </p>
      )}
      <div className={styles.cardRow}>
        {topWines.map(w => (
          <div key={`${w.variety}-${w.winery}`} className={styles.card}>
            <p className={styles.cardTitle}>{w.variety}</p>
            <p className={styles.cardDetail}>
              {w.winery} &middot; {w.country}<br />
              {w.avgPoints} pts{w.priceRange && <> &middot; {w.priceRange}</>}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

function SensoryContent({ e }: { e: Extract<AnswerEnrichment, { type: 'sensory' }> }) {
  const { artwork, period, wine, foodPairing, countryName } = e;
  return (
    <>
      <ArtworkInfo artwork={artwork} />
      <p className={styles.sectionLabel}>The Full Experience</p>
      {period && <span className={styles.badge}>{period.periodName} ({period.startYear}&ndash;{period.endYear})</span>}
      {countryName && <span className={styles.badge}>{countryName}</span>}
      <div className={styles.cardRow}>
        {wine && (
          <div className={styles.card}>
            <p className={styles.cardTitle}>{wine.variety}</p>
            <p className={styles.cardDetail}>
              {wine.country} &middot; {wine.avgPoints} pts
            </p>
          </div>
        )}
        {foodPairing && (
          <div className={styles.card}>
            <p className={styles.cardTitle}>{foodPairing.foodName}</p>
            <p className={styles.cardDetail}>
              {foodPairing.cuisineRegion} cuisine &middot; pairs with {foodPairing.variety}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export function EnrichmentPanel({ enrichment }: Props) {
  const [open, setOpen] = useState(true);

  let content: React.ReactNode;
  switch (enrichment.type) {
    case 'department':   content = <DepartmentContent e={enrichment} />; break;
    case 'culture':      content = <CultureContent e={enrichment} />; break;
    case 'wine_region':  content = <WineRegionContent e={enrichment} />; break;
    case 'food_pairing': content = <FoodPairingContent e={enrichment} />; break;
    case 'art_period':   content = <ArtPeriodContent e={enrichment} />; break;
    case 'sommelier':    content = <SommelierContent e={enrichment} />; break;
    case 'sensory':      content = <SensoryContent e={enrichment} />; break;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header} onClick={() => setOpen(v => !v)}>
        <span className={styles.headerTitle}>Curator's Note</span>
        <span className={`${styles.toggleIcon} ${!open ? styles.toggleIconCollapsed : ''}`}>
          &#9660;
        </span>
      </div>
      {open && <div className={styles.body}>{content}</div>}
    </div>
  );
}
