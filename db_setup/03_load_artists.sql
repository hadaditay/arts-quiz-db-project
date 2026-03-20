USE curators_eye;

LOAD DATA LOCAL INFILE 'Data/met/met_artists.csv'
INTO TABLE artist_profile
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '
'
IGNORE 1 LINES
(@full_name, @bio, @birth_year, @death_year)
SET
  full_name  = NULLIF(TRIM(TRAILING '' FROM @full_name), ''),
  bio        = NULLIF(TRIM(TRAILING '' FROM @bio), ''),
  birth_year = NULLIF(TRIM(TRAILING '' FROM @birth_year), ''),
  death_year = NULLIF(TRIM(TRAILING '' FROM @death_year), '');
