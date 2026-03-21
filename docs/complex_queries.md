# Complex SQL Queries Documentation

## Overview

Curator's Eye uses 12 complex SQL queries that span 4 data sources:
- **Met Artworks** (47K artworks, 20K artists)
- **Art Periods** (30 historical movements, 26K artwork mappings)
- **Countries** (69 countries, 1.3K culture mappings)
- **Wines & Food** (130K wine reviews, 91 food pairings)

**9 queries power quiz questions** (75%), **3 serve analytics**.

### Quiz Integration

The complex queries are integrated into the quiz through 5 question generators in `apps/backend/src/question/`:

| Generator | Question Type | Complex Query |
|-----------|--------------|---------------|
| `wineRegionQuestion.ts` | `wine_region` | Q1 |
| `foodPairingQuestion.ts` | `food_pairing` | Q2 |
| `artPeriodQuestion.ts` | `art_period` | artPeriodsFromArtwork |
| `sommelierQuestion.ts` | `sommelier` | Q4 |
| `sensoryQuestion.ts` | `sensory` | Q8 |

All 12 queries are also exposed as REST endpoints under `/api/analytics/` (see `apps/backend/src/routes/analytics.ts`).

### Data Source Relationships

```
met_artwork ──┬── artwork_period ── art_period
              │
              ├── culture_country ── country ── wine
              │                                  │
              └── artist_profile          wine_food_pairing
```

---

## Query 1: Wine Region from Artwork

**Purpose:** Quiz question — "Which wine region shares a homeland with this artwork?"
**Data Sources:** Art + Wine + Country
**Complexity:** Correlated subquery, GROUP BY, HAVING, 4-table join

Given an artwork, finds wine provinces from the same country. The correct answer is a real wine region; distractors are from other countries.

```sql
SELECT
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
LIMIT 4;
```

**Why complex:** The correlated subquery finds the top variety per province — it operates at a different granularity (per-variety within a province) than the outer GROUP BY (per-province). The 4-table join chain crosses from artwork through culture_country to country to wine. HAVING filters provinces with insufficient data. None of these can be removed without losing the cross-source linkage.

| Feature | Used |
|---------|------|
| Nesting | Yes (correlated subquery) |
| GROUP BY | Yes (province-level + variety-level) |
| HAVING | Yes (>= 5 wines) |
| Multi-source JOIN | Yes (4 tables, 2 data sources) |

---

## Query 2: Food Pairing from Artwork

**Purpose:** Quiz question — "Which dish pairs with wines from the region of this artwork?"
**Data Sources:** Art + Wine + Food + Country
**Complexity:** Nested derived table, GROUP BY, HAVING, 5-table join across 3 data sources

```sql
SELECT
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
LIMIT 4;
```

**Why complex:** The 5-table join is the minimum path from artwork to food pairing (artwork → culture_country → country → wine → wine_food_pairing). Each join is structurally necessary. GROUP BY with HAVING ensures only pairings with sufficient wine evidence are returned. The derived table wrapping enables clean ORDER BY on computed columns.

| Feature | Used |
|---------|------|
| Nesting | Yes (derived table) |
| GROUP BY | Yes (multi-column) |
| HAVING | Yes (>= 3 distinct wines) |
| Multi-source JOIN | Yes (5 tables, 3 data sources) |

---

## Query 3: Art Period from Wine

**Purpose:** Quiz question — "Which art movement flourished in the homeland of this wine?"
**Data Sources:** Wine + Country + Art + Period
**Complexity:** Scalar subquery, nested derived table, GROUP BY, HAVING, 5-table join

```sql
SELECT
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
LIMIT 4;
```

**Why complex:** The scalar subquery resolves the wine's country before the main query begins its 5-table join from country through culture_country to artwork to artwork_period to art_period. HAVING ensures statistical significance. The two-level nesting (scalar subquery + derived table) cannot be collapsed — the scalar subquery operates on a different table (wine) than the main aggregation path.

| Feature | Used |
|---------|------|
| Nesting | Yes (scalar subquery + derived table) |
| GROUP BY | Yes (per-period aggregation) |
| HAVING | Yes (>= 5 artworks) |
| Multi-source JOIN | Yes (5 tables, 3 data sources) |

---

## Query 4: Sommelier's Pick by Era

**Purpose:** Quiz question — "A curator suggests pairing this Renaissance painting with a wine. Which gets the best reviews?"
**Data Sources:** Art + Period + Wine + Country
**Complexity:** Self-referencing join, nested derived table, GROUP BY, HAVING, CONCAT aggregation, 6-table join

```sql
SELECT
    wine_picks.variety,
    wine_picks.winery,
    wine_picks.avg_points,
    wine_picks.country,
    wine_picks.price_range
FROM (
    SELECT
        w.variety,
        w.winery,
        ROUND(AVG(w.points), 1) AS avg_points,
        w.country,
        CONCAT('$', MIN(w.price), ' - $', MAX(w.price)) AS price_range,
        COUNT(*) AS review_count
    FROM wine w
    JOIN country c ON c.country_name = w.country
    JOIN culture_country cc ON cc.country_id = c.country_id
    JOIN met_artwork ma ON ma.culture = cc.culture_value
    JOIN artwork_period awp ON awp.artwork_id = ma.artwork_id
    JOIN artwork_period awp_target ON awp_target.artwork_id = ?
        AND awp_target.period_id = awp.period_id
    WHERE w.price IS NOT NULL
    GROUP BY w.variety, w.winery, w.country
    HAVING COUNT(*) >= 3
) AS wine_picks
ORDER BY wine_picks.avg_points DESC
LIMIT 4;
```

**Why complex:** The self-referencing join on artwork_period (awp_target matches the target artwork's period against other artworks' periods) is the key complexity — it finds all artworks from the same period as the target, then traces through country to wine. The 6-table join chain spans 3 data sources. CONCAT produces a formatted price range from MIN/MAX aggregation.

| Feature | Used |
|---------|------|
| Nesting | Yes (derived table) |
| GROUP BY | Yes (per-variety/winery) |
| HAVING | Yes (>= 3 reviews) |
| Self-referencing JOIN | Yes (artwork_period x2) |
| Multi-source JOIN | Yes (6 tables, 3 data sources) |

---

## Query 5: Continental Art Period Timeline (UNION)

**Purpose:** Quiz question — "Which continent had more artworks during the Renaissance?"
**Data Sources:** Art + Period + Country
**Complexity:** UNION ALL, NOT EXISTS, two independent GROUP BY + HAVING branches

```sql
SELECT
    timeline.continent,
    timeline.period_name,
    timeline.artwork_count,
    timeline.source
FROM (
    -- Branch 1: artworks mapped via country/culture
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

    -- Branch 2: artworks without country mapping, using period region
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
ORDER BY timeline.period_name, timeline.artwork_count DESC;
```

**Why complex:** UNION ALL is structurally required because the two branches follow completely different join paths — one goes through country→culture_country, the other uses art_period.region directly. NOT EXISTS in branch 2 prevents double-counting artworks already captured by branch 1. Each branch has its own GROUP BY and HAVING. This cannot be reduced to a single query without losing the completeness guarantee.

| Feature | Used |
|---------|------|
| UNION ALL | Yes (two branches) |
| NOT EXISTS | Yes (anti-join) |
| GROUP BY | Yes (both branches) |
| HAVING | Yes (both branches, >= 5 artworks) |
| Multi-source JOIN | Yes (5 tables, 3 data sources) |

---

## Query 6: Department Diversity

**Purpose:** Quiz question — "Which Met department represents the most countries?"
**Data Sources:** Art + Country
**Complexity:** Two correlated subqueries, GROUP BY, HAVING

```sql
SELECT
    dept.department,
    dept.total_artworks,
    dept.country_count,
    dept.top_country,
    ROUND(dept.top_country_pct, 1) AS top_country_dominance_pct
FROM (
    SELECT
        ma.department,
        COUNT(DISTINCT ma.artwork_id) AS total_artworks,
        COUNT(DISTINCT c.country_id) AS country_count,
        (
            SELECT c2.country_name
            FROM met_artwork ma2
            JOIN culture_country cc2 ON cc2.culture_value = ma2.culture
            JOIN country c2 ON c2.country_id = cc2.country_id
            WHERE ma2.department = ma.department
            GROUP BY c2.country_id, c2.country_name
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ) AS top_country,
        (
            SELECT COUNT(*) * 100.0 / COUNT(DISTINCT ma3.artwork_id)
            FROM met_artwork ma3
            JOIN culture_country cc3 ON cc3.culture_value = ma3.culture
            JOIN country c3 ON c3.country_id = cc3.country_id
            WHERE ma3.department = ma.department
            GROUP BY c3.country_id
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ) AS top_country_pct
    FROM met_artwork ma
    JOIN culture_country cc ON cc.culture_value = ma.culture
    JOIN country c ON c.country_id = cc.country_id
    WHERE ma.department IS NOT NULL
    GROUP BY ma.department
    HAVING COUNT(DISTINCT ma.artwork_id) >= 20
) AS dept
ORDER BY dept.country_count DESC
LIMIT 4;
```

**Why complex:** The two correlated subqueries must each independently find the top country per department — this requires a GROUP BY + ORDER BY + LIMIT within each department's scope, which cannot be expressed in the outer GROUP BY. The outer query groups by department, while the inner subqueries re-aggregate by country within each department. These operate at different granularities and cannot be flattened.

| Feature | Used |
|---------|------|
| Nesting | Yes (2 correlated subqueries + derived table) |
| Correlated subqueries | Yes (2x) |
| GROUP BY | Yes (outer + inner) |
| HAVING | Yes (>= 20 artworks) |

---

## Query 7: Wine & Art Country Match

**Purpose:** Quiz question — "Which country has both highly-rated wines AND highlighted artworks in the Met?"
**Data Sources:** Wine + Art + Country
**Complexity:** Two derived table subqueries with independent GROUP BY, correlated subquery, HAVING

```sql
SELECT
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
LIMIT 4;
```

**Why complex:** Two independent derived tables aggregate from completely different source tables (met_artwork vs wine), both keyed to country. Merging them into one GROUP BY would create a cartesian product (each artwork paired with each wine from the same country), corrupting all counts. The INNER JOIN between them naturally filters to countries that meet both thresholds (>= 50 artworks AND >= 85 avg wine points).

| Feature | Used |
|---------|------|
| Nesting | Yes (2 derived tables + correlated subquery) |
| GROUP BY | Yes (independent in each derived table) |
| HAVING | Yes (both, different thresholds) |
| Multi-source JOIN | Yes (3 tables, 2 data sources) |

---

## Query 8: A Taste of Art — Full Sensory Experience

**Purpose:** Quiz question — "For a gallery evening with this artwork, the sommelier recommends..."
**Data Sources:** ALL 4 (Art + Period + Country + Wine + Food)
**Complexity:** 7-table join, nested derived table, GROUP BY, HAVING

This is the crown jewel — it assembles a complete cultural experience recommendation.

```sql
SELECT
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
LIMIT 4;
```

**Why complex:** The 7-table join chain is the minimum path connecting all 4 data sources: artwork → artwork_period → art_period (period info), artwork → culture_country → country → wine → wine_food_pairing (wine + food from the same country). Every join is structurally necessary. The GROUP BY aggregates wine reviews by variety/food/period combination, and HAVING ensures quality matches. This query literally cannot be decomposed into simpler queries without losing the cross-source linkage that makes it meaningful.

| Feature | Used |
|---------|------|
| Nesting | Yes (derived table) |
| GROUP BY | Yes (5-column) |
| HAVING | Yes (>= 2 matches) |
| Multi-source JOIN | Yes (7 tables, ALL 4 data sources) |

---

## Query 9: Cross-Period Artists and Their Homeland Wines

**Purpose:** Quiz question — "This artist worked across multiple art periods. Which wine is from their homeland?"
**Data Sources:** Art + Artist + Period + Wine + Country
**Complexity:** Two derived tables, 4-table join, HAVING, GROUP_CONCAT, LEFT JOIN, correlated subquery

```sql
SELECT
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
        (
            SELECT w2.variety
            FROM wine w2
            WHERE w2.country = c.country_name
            GROUP BY w2.variety
            ORDER BY AVG(w2.points) DESC
            LIMIT 1
        ) AS top_variety,
        ROUND(AVG(w.points), 1) AS avg_points
    FROM culture_country cc
    JOIN country c ON c.country_id = cc.country_id
    JOIN wine w ON w.country = c.country_name
    GROUP BY cc.culture_value, c.country_name
) AS homeland_wine ON homeland_wine.culture_value = multi.primary_culture
ORDER BY multi.artwork_count DESC
LIMIT 4;
```

**Why complex:** The first derived table requires a 4-table join (artist_profile → met_artwork → artwork_period → art_period) with GROUP_CONCAT to build a comma-separated list of period names, and HAVING to filter only multi-period artists. The second derived table independently aggregates wine data by culture with a correlated subquery to find the highest-rated variety. LEFT JOIN is required because some cultures may not have wine-producing countries. These two aggregation paths diverge completely and cannot be merged.

| Feature | Used |
|---------|------|
| Nesting | Yes (2 derived tables + correlated subquery) |
| GROUP BY | Yes (both derived tables) |
| HAVING | Yes (>= 2 periods) |
| GROUP_CONCAT | Yes (period names) |
| LEFT JOIN | Yes (not all cultures have wines) |
| COALESCE | Yes (NULL handling) |

---

## Query 10: Period-Weighted Leaderboard (Analytics)

**Purpose:** Leaderboard that rewards breadth of art knowledge across periods.
**Data Sources:** Game + Period
**Complexity:** Correlated subquery wrapping a derived table with its own GROUP BY + HAVING, CROSS JOIN

```sql
SELECT
    base.username, base.base_score, base.periods_mastered,
    total_p.cnt AS total_periods,
    ROUND(base.base_score * (1 + (base.periods_mastered / total_p.cnt) * 0.5), 0)
        AS weighted_score
FROM (
    SELECT u.user_id, u.username, SUM(gr.points_awarded) AS base_score,
        (SELECT COUNT(*) FROM (
            SELECT ap2.period_id
            FROM game_round gr2
            JOIN game_session gs2 ON gs2.session_id = gr2.session_id
            JOIN artwork_period ap2 ON ap2.artwork_id = gr2.artwork_id
            WHERE gs2.user_id = u.user_id
              AND gr2.result IN ('correct','incorrect')
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
ORDER BY weighted_score DESC LIMIT 25;
```

**Why complex:** The periods_mastered count requires a 3-level nesting: correlated subquery → derived table → GROUP BY + HAVING. This evaluates per-period accuracy for each user — a grouping granularity (per-user-per-period) that differs from the outer query (per-user). The CROSS JOIN for total period count enables the breadth bonus calculation.

| Feature | Used |
|---------|------|
| Nesting | Yes (3 levels) |
| Correlated subquery | Yes |
| GROUP BY | Yes (2 levels) |
| HAVING | Yes (2 levels) |
| CROSS JOIN | Yes (scalar) |

---

## Query 11: Player Best Session + All-Time Stats (Analytics, UNION)

**Purpose:** Player profile — returns best single-session AND cumulative stats in one result.
**Data Sources:** Game
**Complexity:** UNION ALL, GROUP BY + ORDER BY + LIMIT in one branch, full aggregation in other

```sql
(
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
);
```

**Why complex:** UNION is structurally required because the two result rows have fundamentally different aggregation scopes — branch 1 groups by session and picks the top via ORDER BY + LIMIT, while branch 2 aggregates across all sessions (no GROUP BY). A single query cannot produce both a per-session best and a cross-session total.

| Feature | Used |
|---------|------|
| UNION ALL | Yes |
| GROUP BY | Yes (branch 1 only) |
| ORDER BY + LIMIT | Yes (within UNION branch) |
| Multiple aggregations | Yes (COUNT, SUM, MIN, MAX, ROUND) |

---

## Query 12: Question Difficulty by Art Period (Analytics)

**Purpose:** Analytics — which period + question-type combos are hardest for players.
**Data Sources:** Game + Period
**Complexity:** Nested derived table, GROUP BY with multiple aggregations, CASE, HAVING

```sql
SELECT d.period_name, d.region, d.question_type, d.total_answered,
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
ORDER BY d.accuracy_pct ASC;
```

**Why complex:** HAVING filters statistically insignificant groups (< 10 answers). The CASE expression derives a categorical difficulty tier from aggregated values — this computation depends on the GROUP BY results and cannot exist independently. The subquery wrapping is needed because MySQL doesn't allow ORDER BY on column aliases computed with CASE in the same SELECT level.

| Feature | Used |
|---------|------|
| Nesting | Yes (derived table) |
| GROUP BY | Yes (4-column) |
| HAVING | Yes (>= 10 answers) |
| CASE | Yes (derived from aggregation) |
| Multiple aggregations | Yes (COUNT, SUM, ROUND) |

---

## Complexity Summary

| # | Name | Quiz? | Nesting | UNION | GROUP BY | HAVING | Correlated | Data Sources |
|---|------|-------|---------|-------|----------|--------|------------|--------------|
| 1 | Wine Region from Artwork | Yes | Yes | - | Yes | Yes | Yes | Art+Wine+Country |
| 2 | Food Pairing from Artwork | Yes | Yes | - | Yes | Yes | - | Art+Wine+Food+Country |
| 3 | Art Period from Wine | Yes | Yes | - | Yes | Yes | - | Wine+Country+Art+Period |
| 4 | Sommelier's Pick by Era | Yes | Yes | - | Yes | Yes | - | Art+Period+Wine+Country |
| 5 | Continental Timeline | Yes | - | Yes | Yes | Yes | - | Art+Period+Country |
| 6 | Department Diversity | Yes | Yes | - | Yes | Yes | Yes | Art+Country |
| 7 | Wine & Art Country Match | Yes | Yes | - | Yes | Yes | Yes | Wine+Art+Country |
| 8 | Full Sensory Experience | Yes | Yes | - | Yes | Yes | - | ALL 4 sources |
| 9 | Cross-Period Artist Wines | Yes | Yes | - | Yes | Yes | Yes | Art+Artist+Period+Wine+Country |
| 10 | Period Leaderboard | No | Yes | - | Yes | Yes | Yes | Game+Period |
| 11 | Session + All-Time | No | - | Yes | Yes | - | - | Game |
| 12 | Difficulty by Period | No | Yes | - | Yes | Yes | - | Game+Period |

**Totals:** 12 queries | 9 quiz (75%) | 3 analytics | 10 use nesting | 2 use UNION | 12 use GROUP BY | 10 use HAVING | 5 use correlated subqueries
