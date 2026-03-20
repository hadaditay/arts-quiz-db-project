DROP TABLE IF EXISTS game_round;
DROP TABLE IF EXISTS game_session;
DROP TABLE IF EXISTS game_user;
DROP TABLE IF EXISTS artist_profile;
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

CREATE INDEX idx_artwork_department ON met_artwork (department);
CREATE INDEX idx_artwork_culture ON met_artwork (culture);
CREATE INDEX idx_artwork_image_checked ON met_artwork (image_checked);
CREATE INDEX idx_game_user_username ON game_user (username);
