USE curators_eye;

SELECT COUNT(*) AS users_count FROM game_user;
SELECT COUNT(*) AS artists_count FROM artist_profile;
SELECT COUNT(*) AS artworks_count FROM met_artwork;
SELECT artwork_id, title, department, culture, artist_display_name
FROM met_artwork
LIMIT 5;
