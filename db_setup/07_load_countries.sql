USE curators_eye;

LOAD DATA LOCAL INFILE 'data/countries.csv'
INTO TABLE country
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@country_name, @iso_code, @continent)
SET
  country_name = TRIM(@country_name),
  iso_code     = TRIM(@iso_code),
  continent    = TRIM(@continent);
