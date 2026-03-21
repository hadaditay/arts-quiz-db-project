USE curators_eye;

LOAD DATA LOCAL INFILE 'data/wines/winemag-data-130k-v2.csv'
INTO TABLE wine
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(
  @idx,
  @country,
  @description,
  @designation,
  @points,
  @price,
  @province,
  @region_1,
  @region_2,
  @taster_name,
  @taster_twitter,
  @title,
  @variety,
  @winery
)
SET
  title       = NULLIF(TRIM(TRAILING '\r' FROM @title), ''),
  variety     = NULLIF(TRIM(TRAILING '\r' FROM @variety), ''),
  winery      = NULLIF(TRIM(TRAILING '\r' FROM @winery), ''),
  country     = NULLIF(TRIM(TRAILING '\r' FROM @country), ''),
  province    = NULLIF(TRIM(TRAILING '\r' FROM @province), ''),
  region_1    = NULLIF(TRIM(TRAILING '\r' FROM @region_1), ''),
  points      = NULLIF(TRIM(TRAILING '\r' FROM @points), ''),
  price       = NULLIF(TRIM(TRAILING '\r' FROM @price), ''),
  description = NULLIF(TRIM(TRAILING '\r' FROM @description), '');
