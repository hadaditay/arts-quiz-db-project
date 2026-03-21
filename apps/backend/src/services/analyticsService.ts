import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { withConnection } from '../db';

type Conn = PoolConnection;

async function useConn<T>(existingConn: Conn | undefined, fn: (c: Conn) => Promise<T>): Promise<T> {
  if (existingConn) return fn(existingConn);
  return withConnection(fn);
}

// Q1: Which wine region shares a homeland with this artwork?
export async function wineRegionFromArtwork(artworkId: number, connection?: Conn) {
  return useConn(connection, async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
          w_stats.province,
          w_stats.avg_points,
          w_stats.wine_count,
          w_stats.top_variety
      FROM (
          SELECT
              w.province,
              ROUND(AVG(w.points), 1) AS avg_points,
              COUNT(*) AS wine_count,
              (
                  SELECT w2.variety
                  FROM wine w2
                  WHERE w2.province = w.province
                    AND w2.country = w.country
                  GROUP BY w2.variety
                  ORDER BY COUNT(*) DESC
                  LIMIT 1
              ) AS top_variety
          FROM wine w
          JOIN country c ON c.country_name = w.country
          JOIN culture_country cc ON cc.country_id = c.country_id
          JOIN met_artwork ma ON ma.culture = cc.culture_value
          WHERE ma.artwork_id = ?
          GROUP BY w.country, w.province
          HAVING COUNT(*) >= 5
      ) AS w_stats
      ORDER BY w_stats.wine_count DESC
      LIMIT 4`,
      [artworkId]
    );
    return rows;
  });
}

// Q2: What food pairs with wines from this artwork's homeland?
export async function foodPairingFromArtwork(artworkId: number, connection?: Conn) {
  return useConn(connection, async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
          pairings.food_name,
          pairings.cuisine_region,
          pairings.variety,
          pairings.avg_wine_points,
          pairings.wine_count
      FROM (
          SELECT
              wfp.food_name,
              wfp.cuisine_region,
              wfp.variety,
              ROUND(AVG(w.points), 1) AS avg_wine_points,
              COUNT(DISTINCT w.wine_id) AS wine_count
          FROM wine_food_pairing wfp
          JOIN wine w ON w.variety = wfp.variety
          JOIN country c ON c.country_name = w.country
          JOIN culture_country cc ON cc.country_id = c.country_id
          JOIN met_artwork ma ON ma.culture = cc.culture_value
          WHERE ma.artwork_id = ?
          GROUP BY wfp.food_name, wfp.cuisine_region, wfp.variety
          HAVING COUNT(DISTINCT w.wine_id) >= 3
      ) AS pairings
      ORDER BY pairings.avg_wine_points DESC
      LIMIT 4`,
      [artworkId]
    );
    return rows;
  });
}

// Q3: Which art period matches this wine's homeland?
export async function artPeriodFromWine(wineId: number) {
  return withConnection(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
          period_stats.period_name,
          period_stats.region,
          period_stats.artwork_count,
          period_stats.highlight_count
      FROM (
          SELECT
              ap.period_name,
              ap.region,
              COUNT(DISTINCT ma.artwork_id) AS artwork_count,
              SUM(ma.is_highlight) AS highlight_count
          FROM art_period ap
          JOIN artwork_period awp ON awp.period_id = ap.period_id
          JOIN met_artwork ma ON ma.artwork_id = awp.artwork_id
          JOIN culture_country cc ON cc.culture_value = ma.culture
          JOIN country c ON c.country_id = cc.country_id
          WHERE c.country_name = (
              SELECT w.country FROM wine w WHERE w.wine_id = ?
          )
          GROUP BY ap.period_id, ap.period_name, ap.region
          HAVING COUNT(DISTINCT ma.artwork_id) >= 5
      ) AS period_stats
      ORDER BY period_stats.artwork_count DESC
      LIMIT 4`,
      [wineId]
    );
    return rows;
  });
}

// Art periods for an artwork's homeland (used by quiz question generator)
export async function artPeriodsFromArtwork(artworkId: number, connection?: Conn) {
  return useConn(connection, async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
          period_stats.period_name,
          period_stats.region,
          period_stats.artwork_count
      FROM (
          SELECT
              ap.period_name,
              ap.region,
              COUNT(DISTINCT ma2.artwork_id) AS artwork_count
          FROM art_period ap
          JOIN artwork_period awp ON awp.period_id = ap.period_id
          JOIN met_artwork ma2 ON ma2.artwork_id = awp.artwork_id
          JOIN culture_country cc ON cc.culture_value = ma2.culture
          JOIN country c ON c.country_id = cc.country_id
          WHERE c.country_id IN (
              SELECT cc2.country_id
              FROM met_artwork ma3
              JOIN culture_country cc2 ON cc2.culture_value = ma3.culture
              WHERE ma3.artwork_id = ?
          )
          GROUP BY ap.period_id, ap.period_name, ap.region
          HAVING COUNT(DISTINCT ma2.artwork_id) >= 5
      ) AS period_stats
      ORDER BY period_stats.artwork_count DESC
      LIMIT 4`,
      [artworkId]
    );
    return rows;
  });
}

// Q4: Sommelier's Pick — which wine complements this artwork's era?
export async function sommelierPick(artworkId: number, connection?: Conn) {
  return useConn(connection, async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
          w.variety,
          w.winery,
          ROUND(AVG(w.points), 1) AS avg_points,
          w.country,
          CONCAT('$', MIN(w.price), ' - $', MAX(w.price)) AS price_range
      FROM wine w
      JOIN (
          SELECT DISTINCT c.country_name
          FROM met_artwork ma
          JOIN culture_country cc ON cc.culture_value = ma.culture
          JOIN country c ON c.country_id = cc.country_id
          WHERE ma.artwork_id = ?
      ) ac ON ac.country_name = w.country
      WHERE w.price IS NOT NULL
      GROUP BY w.variety, w.winery, w.country
      HAVING COUNT(*) >= 3
      ORDER BY avg_points DESC
      LIMIT 4`,
      [artworkId]
    );
    return rows;
  });
}

// Q5: Continental Art Period Timeline (UNION)
export async function continentalTimeline() {
  return withConnection(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
          timeline.continent,
          timeline.period_name,
          timeline.artwork_count,
          timeline.source
      FROM (
          SELECT
              c.continent,
              ap.period_name,
              COUNT(DISTINCT ma.artwork_id) AS artwork_count,
              'country_mapping' AS source
          FROM country c
          JOIN culture_country cc ON cc.country_id = c.country_id
          JOIN met_artwork ma ON ma.culture = cc.culture_value
          JOIN artwork_period awp ON awp.artwork_id = ma.artwork_id
          JOIN art_period ap ON ap.period_id = awp.period_id
          GROUP BY c.continent, ap.period_id, ap.period_name
          HAVING COUNT(DISTINCT ma.artwork_id) >= 5

          UNION ALL

          SELECT
              ap.region AS continent,
              ap.period_name,
              COUNT(DISTINCT ma.artwork_id) AS artwork_count,
              'period_region' AS source
          FROM art_period ap
          JOIN artwork_period awp ON awp.period_id = ap.period_id
          JOIN met_artwork ma ON ma.artwork_id = awp.artwork_id
          WHERE NOT EXISTS (
              SELECT 1
              FROM culture_country cc2
              WHERE cc2.culture_value = ma.culture
          )
          GROUP BY ap.region, ap.period_id, ap.period_name
          HAVING COUNT(DISTINCT ma.artwork_id) >= 5
      ) AS timeline
      ORDER BY timeline.period_name, timeline.artwork_count DESC`
    );
    return rows;
  });
}

// Q6: Which department has the most globally diverse collection?
export async function departmentDiversity() {
  return withConnection(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
          dept.department,
          dept.total_artworks,
          dept.country_count,
          top_c.country_name AS top_country,
          ROUND(top_c.cnt * 100.0 / dept.total_artworks, 1) AS top_country_dominance_pct
      FROM (
          SELECT
              ma.department,
              COUNT(DISTINCT ma.artwork_id) AS total_artworks,
              COUNT(DISTINCT c.country_id) AS country_count
          FROM met_artwork ma
          JOIN culture_country cc ON cc.culture_value = ma.culture
          JOIN country c ON c.country_id = cc.country_id
          WHERE ma.department IS NOT NULL
          GROUP BY ma.department
          HAVING COUNT(DISTINCT ma.artwork_id) >= 20
      ) AS dept
      JOIN (
          SELECT
              ma2.department,
              c2.country_name,
              COUNT(*) AS cnt,
              ROW_NUMBER() OVER (PARTITION BY ma2.department ORDER BY COUNT(*) DESC) AS rn
          FROM met_artwork ma2
          JOIN culture_country cc2 ON cc2.culture_value = ma2.culture
          JOIN country c2 ON c2.country_id = cc2.country_id
          WHERE ma2.department IS NOT NULL
          GROUP BY ma2.department, c2.country_id, c2.country_name
      ) AS top_c ON top_c.department = dept.department AND top_c.rn = 1
      ORDER BY dept.country_count DESC
      LIMIT 4`
    );
    return rows;
  });
}

// Q7: Wine & Art Country Match
export async function wineArtCountryMatch() {
  return withConnection(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
          art_stats.country_name,
          art_stats.artwork_count,
          art_stats.highlight_count,
          wine_stats.wine_count,
          wine_stats.avg_points AS avg_wine_score,
          wine_stats.top_variety
      FROM (
          SELECT
              c.country_id,
              c.country_name,
              COUNT(DISTINCT ma.artwork_id) AS artwork_count,
              SUM(ma.is_highlight) AS highlight_count
          FROM country c
          JOIN culture_country cc ON cc.country_id = c.country_id
          JOIN met_artwork ma ON ma.culture = cc.culture_value
          GROUP BY c.country_id, c.country_name
          HAVING COUNT(DISTINCT ma.artwork_id) >= 50
      ) AS art_stats
      JOIN (
          SELECT
              c.country_id,
              COUNT(*) AS wine_count,
              ROUND(AVG(w.points), 1) AS avg_points,
              (
                  SELECT w2.variety
                  FROM wine w2
                  WHERE w2.country = c.country_name
                  GROUP BY w2.variety
                  ORDER BY COUNT(*) DESC
                  LIMIT 1
              ) AS top_variety
          FROM country c
          JOIN wine w ON w.country = c.country_name
          GROUP BY c.country_id, c.country_name
          HAVING AVG(w.points) >= 85
      ) AS wine_stats ON wine_stats.country_id = art_stats.country_id
      ORDER BY (art_stats.highlight_count + wine_stats.avg_points) DESC
      LIMIT 4`
    );
    return rows;
  });
}

// Q8: Full Sensory Experience — art + wine + food + period
export async function fullSensoryExperience(artworkId: number, connection?: Conn) {
  return useConn(connection, async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
          experience.variety,
          experience.food_name,
          experience.cuisine_region,
          experience.wine_country,
          experience.avg_wine_points,
          experience.period_name
      FROM (
          SELECT
              wfp.variety,
              wfp.food_name,
              wfp.cuisine_region,
              w.country AS wine_country,
              ROUND(AVG(w.points), 1) AS avg_wine_points,
              ap.period_name,
              COUNT(*) AS match_strength
          FROM met_artwork ma
          JOIN artwork_period awp ON awp.artwork_id = ma.artwork_id
          JOIN art_period ap ON ap.period_id = awp.period_id
          JOIN culture_country cc ON cc.culture_value = ma.culture
          JOIN country c ON c.country_id = cc.country_id
          JOIN wine w ON w.country = c.country_name
          JOIN wine_food_pairing wfp ON wfp.variety = w.variety
          WHERE ma.artwork_id = ?
            AND w.points >= 85
          GROUP BY wfp.variety, wfp.food_name, wfp.cuisine_region,
                   w.country, ap.period_name
          HAVING COUNT(*) >= 2
      ) AS experience
      ORDER BY experience.avg_wine_points DESC, experience.match_strength DESC
      LIMIT 4`,
      [artworkId]
    );
    return rows;
  });
}

// Q9: Cross-Period Artists and Their Homeland Wines
export async function crossPeriodArtistWines() {
  return withConnection(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
          multi.full_name,
          multi.period_names,
          multi.artwork_count,
          COALESCE(homeland_wine.top_variety, 'No wines found') AS homeland_wine,
          COALESCE(homeland_wine.avg_points, 0) AS wine_avg_points
      FROM (
          SELECT
              prof.full_name,
              GROUP_CONCAT(DISTINCT ap.period_name ORDER BY ap.start_year SEPARATOR ', ')
                  AS period_names,
              COUNT(DISTINCT ma.artwork_id) AS artwork_count,
              ma.culture AS primary_culture
          FROM artist_profile prof
          JOIN met_artwork ma ON ma.artist_display_name = prof.full_name
          JOIN artwork_period awp ON awp.artwork_id = ma.artwork_id
          JOIN art_period ap ON ap.period_id = awp.period_id
          GROUP BY prof.artist_profile_id, prof.full_name, ma.culture
          HAVING COUNT(DISTINCT ap.period_id) >= 2
      ) AS multi
      LEFT JOIN (
          SELECT
              cc.culture_value,
              top_var.variety AS top_variety,
              wine_avg.avg_points
          FROM culture_country cc
          JOIN country c ON c.country_id = cc.country_id
          LEFT JOIN (
              SELECT w.country, w.variety,
                     ROW_NUMBER() OVER (PARTITION BY w.country ORDER BY AVG(w.points) DESC) AS rn
              FROM wine w
              GROUP BY w.country, w.variety
          ) AS top_var ON top_var.country = c.country_name AND top_var.rn = 1
          LEFT JOIN (
              SELECT w.country, ROUND(AVG(w.points), 1) AS avg_points
              FROM wine w
              GROUP BY w.country
          ) AS wine_avg ON wine_avg.country = c.country_name
      ) AS homeland_wine ON homeland_wine.culture_value = multi.primary_culture
      ORDER BY multi.artwork_count DESC
      LIMIT 4`
    );
    return rows;
  });
}

// Q10: Period-Weighted Leaderboard with Breadth Bonus
export async function periodLeaderboard() {
  return withConnection(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
          base.username, base.base_score, base.periods_mastered,
          total_p.cnt AS total_periods,
          ROUND(base.base_score * (1 + (base.periods_mastered / total_p.cnt) * 0.5), 0) AS weighted_score
      FROM (
          SELECT u.user_id, u.username, SUM(gr.points_awarded) AS base_score,
              (SELECT COUNT(*) FROM (
                  SELECT ap2.period_id
                  FROM game_round gr2
                  JOIN game_session gs2 ON gs2.session_id = gr2.session_id
                  JOIN artwork_period ap2 ON ap2.artwork_id = gr2.artwork_id
                  WHERE gs2.user_id = u.user_id AND gr2.result IN ('correct','incorrect')
                  GROUP BY ap2.period_id
                  HAVING SUM(gr2.result = 'correct') / COUNT(*) >= 0.6
              ) AS mastered) AS periods_mastered
          FROM game_user u
          JOIN game_session gs ON gs.user_id = u.user_id
          JOIN game_round gr ON gr.session_id = gs.session_id
          WHERE gr.result != 'pending'
          GROUP BY u.user_id, u.username
          HAVING SUM(gr.points_awarded) > 0
      ) AS base
      CROSS JOIN (SELECT COUNT(*) AS cnt FROM art_period) AS total_p
      ORDER BY weighted_score DESC
      LIMIT 25`
    );
    return rows;
  });
}

// Q11: Player Best Session + All-Time Stats (UNION)
export async function playerSessionStats(userId: number) {
  return withConnection(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `(
          SELECT 'best_session' AS stat_type, gs.session_id AS context_id,
              COUNT(*) AS rounds_played, SUM(gr.result = 'correct') AS correct_answers,
              SUM(gr.points_awarded) AS total_points,
              ROUND(SUM(gr.result = 'correct') * 100.0 / COUNT(*), 1) AS accuracy_pct,
              MIN(gr.created_at) AS period_start, MAX(gr.created_at) AS period_end
          FROM game_round gr JOIN game_session gs ON gs.session_id = gr.session_id
          WHERE gs.user_id = ? AND gr.result != 'pending'
          GROUP BY gs.session_id
          ORDER BY total_points DESC, accuracy_pct DESC LIMIT 1
      )
      UNION ALL
      (
          SELECT 'all_time' AS stat_type, NULL AS context_id,
              COUNT(*) AS rounds_played, SUM(gr.result = 'correct') AS correct_answers,
              SUM(gr.points_awarded) AS total_points,
              ROUND(SUM(gr.result = 'correct') * 100.0 / COUNT(*), 1) AS accuracy_pct,
              MIN(gr.created_at) AS period_start, MAX(gr.created_at) AS period_end
          FROM game_round gr JOIN game_session gs ON gs.session_id = gr.session_id
          WHERE gs.user_id = ? AND gr.result != 'pending'
      )`,
      [userId, userId]
    );
    return rows;
  });
}

// Q13: War/Battle from Artwork — "Which conflict raged near this artwork's homeland while it was being created?"
export async function warFromArtwork(artworkId: number, connection?: Conn) {
  return useConn(connection, async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
          matches.war_name,
          matches.war_type,
          matches.start_year,
          matches.end_year,
          matches.description,
          matches.overlap_years
      FROM (
          SELECT
              wb.war_id,
              wb.war_name,
              wb.war_type,
              wb.start_year,
              wb.end_year,
              wb.description,
              MAX(LEAST(wb.end_year, ap.end_year) - GREATEST(wb.start_year, ap.start_year) + 1)
                  AS overlap_years
          FROM met_artwork ma
          JOIN culture_country cc ON cc.culture_value = ma.culture
          JOIN country c ON c.country_id = cc.country_id
          JOIN artwork_period awp ON awp.artwork_id = ma.artwork_id
          JOIN art_period ap ON ap.period_id = awp.period_id
          JOIN war_battle wb
              ON wb.country_name = c.country_name
              AND wb.start_year <= ap.end_year
              AND wb.end_year >= ap.start_year
          WHERE ma.artwork_id = ?
          GROUP BY wb.war_id, wb.war_name, wb.war_type, wb.start_year, wb.end_year,
                   wb.description
      ) AS matches
      ORDER BY matches.overlap_years DESC
      LIMIT 4`,
      [artworkId]
    );
    return rows;
  });
}

// Q14: Artwork from War — "Which artwork was created during this famous war, in the same region?"
export async function artworkFromWar(warId: number, connection?: Conn) {
  return useConn(connection, async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
          candidates.artwork_id,
          candidates.title,
          candidates.artist_display_name,
          candidates.period_name,
          candidates.overlap_years
      FROM (
          SELECT
              ma.artwork_id,
              ma.title,
              ma.artist_display_name,
              ap.period_name,
              LEAST(wb.end_year, ap.end_year) - GREATEST(wb.start_year, ap.start_year) + 1
                  AS overlap_years,
              (
                  SELECT COUNT(DISTINCT ma2.artwork_id)
                  FROM met_artwork ma2
                  JOIN culture_country cc2 ON cc2.culture_value = ma2.culture
                  JOIN country c2 ON c2.country_id = cc2.country_id
                  WHERE c2.country_name = wb.country_name
              ) AS region_artwork_count
          FROM war_battle wb
          JOIN country c ON c.country_name = wb.country_name
          JOIN culture_country cc ON cc.country_id = c.country_id
          JOIN met_artwork ma ON ma.culture = cc.culture_value
          JOIN artwork_period awp ON awp.artwork_id = ma.artwork_id
          JOIN art_period ap ON ap.period_id = awp.period_id
          WHERE wb.war_id = ?
            AND wb.start_year <= ap.end_year
            AND wb.end_year >= ap.start_year
            AND ma.primary_image_small IS NOT NULL
      ) AS candidates
      WHERE candidates.region_artwork_count >= 5
      ORDER BY candidates.overlap_years DESC
      LIMIT 4`,
      [warId]
    );
    return rows;
  });
}

// Q15: Art Born in Conflict — Regions where most art was created during active wars
export async function artBornInConflict() {
  return withConnection(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT
          conflict_art.continent,
          conflict_art.period_name,
          conflict_art.artwork_count,
          conflict_art.war_count,
          conflict_art.notable_wars,
          ROUND(conflict_art.artwork_count * 100.0 / total.total_artworks, 1) AS pct_of_total
      FROM (
          SELECT
              c.continent,
              ap.period_name,
              COUNT(DISTINCT ma.artwork_id) AS artwork_count,
              COUNT(DISTINCT wb.war_id) AS war_count,
              GROUP_CONCAT(DISTINCT wb.war_name ORDER BY wb.start_year SEPARATOR ', ') AS notable_wars,
              ap.period_id
          FROM met_artwork ma
          JOIN artwork_period awp ON awp.artwork_id = ma.artwork_id
          JOIN art_period ap ON ap.period_id = awp.period_id
          JOIN culture_country cc ON cc.culture_value = ma.culture
          JOIN country c ON c.country_id = cc.country_id
          JOIN war_battle wb
              ON wb.country_name = c.country_name
              AND wb.start_year <= ap.end_year
              AND wb.end_year >= ap.start_year
          GROUP BY c.continent, ap.period_id, ap.period_name
          HAVING COUNT(DISTINCT ma.artwork_id) >= 10
      ) AS conflict_art
      JOIN (
          SELECT
              ap.period_id,
              COUNT(DISTINCT awp.artwork_id) AS total_artworks
          FROM art_period ap
          JOIN artwork_period awp ON awp.period_id = ap.period_id
          GROUP BY ap.period_id
      ) AS total ON total.period_id = conflict_art.period_id
      ORDER BY conflict_art.artwork_count DESC
      LIMIT 20`
    );
    return rows;
  });
}

// Q12: Question Difficulty by Art Period
export async function difficultyByPeriod() {
  return withConnection(async (conn) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT d.period_name, d.region, d.question_type, d.total_answered,
          d.accuracy_pct, d.difficulty_tier
      FROM (
          SELECT p.period_name, p.region, gr.question_type, COUNT(*) AS total_answered,
              ROUND(SUM(gr.result = 'correct') * 100.0 / COUNT(*), 1) AS accuracy_pct,
              CASE
                  WHEN SUM(gr.result='correct') * 100.0 / COUNT(*) < 30 THEN 'Hard'
                  WHEN SUM(gr.result='correct') * 100.0 / COUNT(*) < 60 THEN 'Medium'
                  ELSE 'Easy'
              END AS difficulty_tier
          FROM game_round gr
          JOIN artwork_period ap ON ap.artwork_id = gr.artwork_id
          JOIN art_period p ON p.period_id = ap.period_id
          WHERE gr.result IN ('correct','incorrect')
          GROUP BY p.period_id, p.period_name, p.region, gr.question_type
          HAVING COUNT(*) >= 10
      ) AS d
      ORDER BY d.accuracy_pct ASC`
    );
    return rows;
  });
}
