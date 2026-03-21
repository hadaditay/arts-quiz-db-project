USE curators_eye;

LOAD DATA LOCAL INFILE 'data/wine_food_pairings.csv'
INTO TABLE wine_food_pairing
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@variety, @food_name, @cuisine_region)
SET
  variety        = TRIM(@variety),
  food_name      = TRIM(@food_name),
  cuisine_region = TRIM(@cuisine_region);
