DROP TABLE IF EXISTS game_round;
DROP TABLE IF EXISTS game_session;
DROP TABLE IF EXISTS game_user;
DROP TABLE IF EXISTS artist_profile;
DROP TABLE IF EXISTS artwork_period;
DROP TABLE IF EXISTS art_period;
DROP TABLE IF EXISTS culture_country;
DROP TABLE IF EXISTS wine_food_pairing;
DROP TABLE IF EXISTS wine;
DROP TABLE IF EXISTS country;
DROP TABLE IF EXISTS met_artwork;
DROP TABLE IF EXISTS leaderboard_all_time;

CREATE TABLE met_artwork (
  artwork_id BIGINT PRIMARY KEY,
  title VARCHAR(512) NULL,
  department VARCHAR(255) NULL,
  culture VARCHAR(255) NULL,
  artist_display_name TEXT NULL,
  is_public_domain TINYINT NOT NULL DEFAULT 0,
  is_highlight TINYINT NOT NULL DEFAULT 0,
  primary_image TEXT NULL,
  primary_image_small TEXT NULL,
  image_checked TINYINT NOT NULL DEFAULT 0,
  object_url TEXT NULL,
  tags JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE artist_profile (
  artist_profile_id BIGINT NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(512) NOT NULL,
  bio TEXT NULL,
  birth_year INT NULL,
  death_year INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (artist_profile_id),
  UNIQUE KEY uq_artist_profile_full_name (full_name)
);

CREATE TABLE game_user (
  user_id BIGINT NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  first_name VARCHAR(64) NOT NULL,
  last_name VARCHAR(64) NOT NULL,
  `password` VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_game_user_username (username)
);

CREATE TABLE game_session (
  session_id CHAR(36) NOT NULL,
  user_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  revoked TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id),
  CONSTRAINT fk_session_user
    FOREIGN KEY (user_id) REFERENCES game_user(user_id) ON DELETE CASCADE
);

CREATE TABLE game_round (
  round_id CHAR(36) NOT NULL,
  session_id CHAR(36) NOT NULL,
  question_type VARCHAR(64) NOT NULL,
  artwork_id BIGINT NOT NULL,
  prompt VARCHAR(255) NOT NULL,
  correct_value VARCHAR(255) NOT NULL,
  options JSON NOT NULL,
  selected_value VARCHAR(255) NULL,
  result ENUM('pending', 'correct', 'incorrect') NOT NULL DEFAULT 'pending',
  points_awarded INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (round_id),
  CONSTRAINT fk_round_session
    FOREIGN KEY (session_id) REFERENCES game_session(session_id) ON DELETE CASCADE,
  CONSTRAINT fk_round_artwork
    FOREIGN KEY (artwork_id) REFERENCES met_artwork(artwork_id) ON DELETE CASCADE
);

CREATE TABLE art_period (
  period_id INT NOT NULL AUTO_INCREMENT,
  period_name VARCHAR(128) NOT NULL,
  region VARCHAR(128) NOT NULL,
  start_year INT NOT NULL,
  end_year INT NOT NULL,
  PRIMARY KEY (period_id),
  UNIQUE KEY uq_period_name_region (period_name, region)
);

CREATE TABLE artwork_period (
  artwork_id BIGINT NOT NULL,
  period_id INT NOT NULL,
  PRIMARY KEY (artwork_id, period_id),
  CONSTRAINT fk_ap_artwork FOREIGN KEY (artwork_id) REFERENCES met_artwork(artwork_id) ON DELETE CASCADE,
  CONSTRAINT fk_ap_period FOREIGN KEY (period_id) REFERENCES art_period(period_id) ON DELETE CASCADE
);

CREATE TABLE country (
  country_id INT NOT NULL AUTO_INCREMENT,
  country_name VARCHAR(128) NOT NULL,
  iso_code CHAR(2) NOT NULL,
  continent VARCHAR(64) NOT NULL,
  PRIMARY KEY (country_id),
  UNIQUE KEY uq_country_name (country_name)
);

CREATE TABLE culture_country (
  culture_country_id INT NOT NULL AUTO_INCREMENT,
  culture_value VARCHAR(255) NOT NULL,
  country_id INT NOT NULL,
  PRIMARY KEY (culture_country_id),
  UNIQUE KEY uq_culture_value (culture_value),
  CONSTRAINT fk_cc_country FOREIGN KEY (country_id) REFERENCES country(country_id) ON DELETE CASCADE
);

CREATE TABLE wine (
  wine_id BIGINT NOT NULL AUTO_INCREMENT,
  title VARCHAR(512) NULL,
  variety VARCHAR(255) NULL,
  winery VARCHAR(255) NULL,
  country VARCHAR(128) NULL,
  province VARCHAR(255) NULL,
  region_1 VARCHAR(255) NULL,
  points INT NULL,
  price DECIMAL(8,2) NULL,
  description TEXT NULL,
  PRIMARY KEY (wine_id)
);

CREATE TABLE wine_food_pairing (
  pairing_id INT NOT NULL AUTO_INCREMENT,
  variety VARCHAR(255) NOT NULL,
  food_name VARCHAR(255) NOT NULL,
  cuisine_region VARCHAR(128) NOT NULL,
  PRIMARY KEY (pairing_id)
);

CREATE INDEX idx_artwork_department ON met_artwork (department);
CREATE INDEX idx_artwork_culture ON met_artwork (culture);
CREATE INDEX idx_artwork_image_checked ON met_artwork (image_checked);
CREATE INDEX idx_game_user_username ON game_user (username);
CREATE INDEX idx_wine_country ON wine (country);
CREATE INDEX idx_wine_variety ON wine (variety);
CREATE INDEX idx_wine_points ON wine (points);
CREATE INDEX idx_wine_province_country ON wine (province, country);
CREATE INDEX idx_wine_country_price ON wine (country, price);
CREATE INDEX idx_culture_country_value ON culture_country (culture_value);
CREATE INDEX idx_cc_country ON culture_country (country_id);
CREATE INDEX idx_wfp_variety ON wine_food_pairing (variety);
CREATE INDEX idx_awp_period ON artwork_period (period_id);
CREATE INDEX idx_artwork_artist_name ON met_artwork (artist_display_name(255));
CREATE INDEX idx_ground_session_result ON game_round (session_id, result);
CREATE INDEX idx_ground_artwork ON game_round (artwork_id);
CREATE INDEX idx_ground_points ON game_round (points_awarded);
