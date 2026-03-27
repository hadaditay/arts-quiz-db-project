
-- Map artworks to art periods based on artist birth/death years and culture keywords.
-- An artwork matches a period if the artist was active during that period
-- AND the artwork's culture aligns with the period's region.

INSERT IGNORE INTO artwork_period (artwork_id, period_id)
SELECT DISTINCT ma.artwork_id, ap.period_id
FROM met_artwork ma
JOIN artist_profile prof ON prof.full_name = ma.artist_display_name
JOIN art_period ap ON (
  -- Artist lifespan overlaps with period
  prof.birth_year IS NOT NULL
  AND prof.death_year IS NOT NULL
  AND prof.birth_year <= ap.end_year
  AND prof.death_year >= ap.start_year
)
WHERE (
  -- Match culture to region
  (ap.region = 'European' AND (
    ma.culture LIKE 'French%' OR ma.culture LIKE 'Italian%' OR ma.culture LIKE 'German%'
    OR ma.culture LIKE 'British%' OR ma.culture LIKE 'Dutch%' OR ma.culture LIKE 'Spanish%'
    OR ma.culture LIKE 'Austrian%' OR ma.culture LIKE 'Belgian%' OR ma.culture LIKE 'Swiss%'
    OR ma.culture LIKE 'Russian%' OR ma.culture LIKE 'Greek%' OR ma.culture LIKE 'Portuguese%'
    OR ma.culture LIKE 'Swedish%' OR ma.culture LIKE 'Danish%' OR ma.culture LIKE 'Norwegian%'
    OR ma.culture LIKE 'Polish%' OR ma.culture LIKE 'Hungarian%' OR ma.culture LIKE 'Czech%'
    OR ma.culture LIKE 'Flemish%' OR ma.culture LIKE 'Scottish%' OR ma.culture LIKE 'Irish%'
    OR ma.culture LIKE 'Romanian%' OR ma.culture LIKE 'Finnish%'
  ))
  OR (ap.region = 'American' AND (
    ma.culture LIKE 'American%'
  ))
  OR (ap.region = 'East Asian' AND (
    ma.culture LIKE 'Chinese%' OR ma.culture LIKE 'Japan%' OR ma.culture LIKE 'Korean%'
    OR ma.culture LIKE 'China%'
  ))
  OR (ap.region = 'South Asian' AND (
    ma.culture LIKE 'Indian%' OR ma.culture LIKE 'India%' OR ma.culture LIKE 'Mughal%'
    OR ma.culture LIKE 'Pakistani%' OR ma.culture LIKE 'Nepal%' OR ma.culture LIKE 'Sri Lanka%'
  ))
  OR (ap.region = 'Middle Eastern' AND (
    ma.culture LIKE 'Iran%' OR ma.culture LIKE 'Iraq%' OR ma.culture LIKE 'Syria%'
    OR ma.culture LIKE 'Turkey%' OR ma.culture LIKE 'Turkish%' OR ma.culture LIKE 'Ottoman%'
    OR ma.culture LIKE 'Islamic%' OR ma.culture LIKE 'Arab%' OR ma.culture LIKE 'Persian%'
  ))
  OR (ap.region = 'African' AND (
    ma.culture LIKE 'Egypt%' OR ma.culture LIKE 'African%' OR ma.culture LIKE 'Nigeria%'
    OR ma.culture LIKE 'Ghana%' OR ma.culture LIKE 'Ethiopian%' OR ma.culture LIKE 'Morocc%'
  ))
  OR (ap.region = 'Global' AND ma.culture IS NOT NULL)
);

-- Also map artworks without artist profiles using culture alone
INSERT IGNORE INTO artwork_period (artwork_id, period_id)
SELECT DISTINCT ma.artwork_id, ap.period_id
FROM met_artwork ma
JOIN art_period ap ON 1=1
WHERE ma.artist_display_name IS NULL
  AND ma.artwork_id NOT IN (SELECT artwork_id FROM artwork_period)
  AND (
    (ap.period_name = 'Ancient Egyptian' AND ma.culture LIKE '%Egypt%')
    OR (ap.period_name = 'Ancient Greek' AND (ma.culture LIKE '%Greek%' OR ma.culture LIKE '%Attic%'))
    OR (ap.period_name = 'Ancient Roman' AND (ma.culture LIKE '%Roman%' OR ma.culture LIKE '%Etruscan%'))
    OR (ap.period_name = 'Byzantine' AND ma.culture LIKE '%Byzantine%')
    OR (ap.period_name = 'Islamic Golden Age' AND (ma.culture LIKE '%Islamic%' OR ma.culture LIKE '%Arab%'))
    OR (ap.period_name = 'Pre-Columbian' AND (
      ma.culture LIKE '%Maya%' OR ma.culture LIKE '%Aztec%' OR ma.culture LIKE '%Inca%'
      OR ma.culture LIKE '%Moche%' OR ma.culture LIKE '%Olmec%' OR ma.culture LIKE '%Nazca%'
      OR ma.culture LIKE '%Chavin%' OR ma.culture LIKE '%Mixtec%'
    ))
    OR (ap.period_name = 'African Traditional' AND (
      ma.culture LIKE '%African%' OR ma.culture LIKE '%Yoruba%' OR ma.culture LIKE '%Akan%'
      OR ma.culture LIKE '%Kongo%' OR ma.culture LIKE '%Benin%' OR ma.culture LIKE '%Dogon%'
    ))
    OR (ap.period_name = 'Ming Dynasty' AND ma.culture LIKE '%Chinese%' AND ma.culture LIKE '%Ming%')
    OR (ap.period_name = 'Qing Dynasty' AND ma.culture LIKE '%Chinese%' AND ma.culture LIKE '%Qing%')
  );
