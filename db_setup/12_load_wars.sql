USE curators_eye;

LOAD DATA LOCAL INFILE 'data/historical/wars_battles.csv'
INTO TABLE war_battle
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(
  @war_name,
  @war_type,
  @start_year,
  @end_year,
  @region,
  @country_name,
  @description,
  @notable_figures
)
SET
  war_name        = TRIM(TRAILING '\r' FROM @war_name),
  war_type        = TRIM(TRAILING '\r' FROM @war_type),
  start_year      = CAST(@start_year AS SIGNED),
  end_year        = CAST(@end_year AS SIGNED),
  region          = NULLIF(TRIM(TRAILING '\r' FROM @region), ''),
  country_name    = NULLIF(TRIM(TRAILING '\r' FROM @country_name), ''),
  description     = NULLIF(TRIM(TRAILING '\r' FROM @description), ''),
  notable_figures = NULLIF(TRIM(TRAILING '\r' FROM @notable_figures), '');
