
LOAD DATA LOCAL INFILE 'data/users/users_data.csv'
INTO TABLE game_user
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ';'
ENCLOSED BY '"'
LINES TERMINATED BY '
'
IGNORE 1 LINES
(@first_name, @last_name, @username, @password)
SET
  first_name = NULLIF(TRIM(TRAILING '' FROM @first_name), ''),
  last_name  = NULLIF(TRIM(TRAILING '' FROM @last_name), ''),
  username   = NULLIF(TRIM(TRAILING '' FROM @username), ''),
  `password` = NULLIF(TRIM(TRAILING '' FROM @password), '');
