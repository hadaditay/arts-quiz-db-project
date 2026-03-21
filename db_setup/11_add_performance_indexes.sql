USE curators_eye;

-- Indexes to speed up the 12 complex analytics queries.
-- Safe to re-run: CREATE INDEX IF NOT EXISTS (MySQL 8.0.29+) or use separate statements.

-- artwork_period: reverse lookup by period_id (Q3, Q4, Q5, Q8, Q9, Q12)
CREATE INDEX idx_awp_period ON artwork_period (period_id);

-- culture_country: lookup by country_id (Q1, Q2, Q3, Q7)
CREATE INDEX idx_cc_country ON culture_country (country_id);

-- wine: composite for correlated subquery in Q1
CREATE INDEX idx_wine_province_country ON wine (province, country);

-- wine: composite for price-filtered queries (Q4)
CREATE INDEX idx_wine_country_price ON wine (country, price);

-- met_artwork: join with artist_profile by name (Q9)
CREATE INDEX idx_artwork_artist_name ON met_artwork (artist_display_name(255));

-- game_round: session + result for analytics (Q10, Q11)
CREATE INDEX idx_ground_session_result ON game_round (session_id, result);

-- game_round: artwork for period-based analytics (Q12)
CREATE INDEX idx_ground_artwork ON game_round (artwork_id);

-- game_round: points for leaderboard (Q10)
CREATE INDEX idx_ground_points ON game_round (points_awarded);
