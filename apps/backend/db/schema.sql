-- Core Met artwork records pulled from the CSV/API.
CREATE TABLE IF NOT EXISTS met_artwork (
  artwork_id BIGINT PRIMARY KEY,
  title VARCHAR(512),
  department VARCHAR(255),
  culture VARCHAR(255),
  classification VARCHAR(255),
  medium VARCHAR(255),
  object_begin_year INT,
  object_end_year INT,
  era_bucket VARCHAR(64),
  is_public_domain TINYINT DEFAULT 0,
  is_highlight TINYINT DEFAULT 0,
  primary_image TEXT,
  primary_image_small TEXT,
  object_url TEXT,
  tags JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Met artists/constituents and link table (not yet used by questions, but available for expansion).
CREATE TABLE IF NOT EXISTS met_constituent (
  constituent_id BIGINT PRIMARY KEY,
  display_name VARCHAR(512),
  role VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS met_artwork_constituent (
  artwork_id BIGINT,
  constituent_id BIGINT,
  role VARCHAR(255),
  PRIMARY KEY (artwork_id, constituent_id),
  CONSTRAINT fk_artwork_constituent_artwork FOREIGN KEY (artwork_id) REFERENCES met_artwork(artwork_id) ON DELETE CASCADE,
  CONSTRAINT fk_artwork_constituent_const FOREIGN KEY (constituent_id) REFERENCES met_constituent(constituent_id) ON DELETE CASCADE
);

-- Auth model: username-only users and session tracking.
CREATE TABLE IF NOT EXISTS game_user (
  user_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_session (
  session_id CHAR(36) PRIMARY KEY,
  user_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  revoked TINYINT DEFAULT 0,
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES game_user(user_id) ON DELETE CASCADE
);

-- Game rounds store each asked question and answer state.
CREATE TABLE IF NOT EXISTS game_round (
  round_id CHAR(36) PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  question_type VARCHAR(64) NOT NULL,
  artwork_id BIGINT NOT NULL,
  prompt VARCHAR(255) NOT NULL,
  correct_value VARCHAR(255) NOT NULL,
  options JSON NOT NULL,
  selected_value VARCHAR(255),
  result ENUM('pending', 'correct', 'incorrect') DEFAULT 'pending',
  points_awarded INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_round_session FOREIGN KEY (session_id) REFERENCES game_session(session_id) ON DELETE CASCADE,
  CONSTRAINT fk_round_artwork FOREIGN KEY (artwork_id) REFERENCES met_artwork(artwork_id) ON DELETE CASCADE
);

-- Simple all-time leaderboard (one row per user).
CREATE TABLE IF NOT EXISTS leaderboard_all_time (
  user_id BIGINT PRIMARY KEY,
  score BIGINT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_leaderboard_user FOREIGN KEY (user_id) REFERENCES game_user(user_id) ON DELETE CASCADE
);

-- Indexes defined without IF NOT EXISTS for compatibility; drop first if rerunning on an existing DB.
CREATE INDEX idx_artwork_department ON met_artwork (department);
CREATE INDEX idx_artwork_culture ON met_artwork (culture);
CREATE INDEX idx_artwork_medium ON met_artwork (medium);
CREATE INDEX idx_artwork_era ON met_artwork (era_bucket);
