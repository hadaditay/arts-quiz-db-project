USE curators_eye;

LOAD DATA LOCAL INFILE 'data/historical/art_periods.csv'
INTO TABLE art_period
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@period_name, @region, @start_year, @end_year)
SET
  period_name = TRIM(@period_name),
  region      = TRIM(@region),
  start_year  = CAST(TRIM(@start_year) AS SIGNED),
  end_year    = CAST(TRIM(@end_year) AS SIGNED);
