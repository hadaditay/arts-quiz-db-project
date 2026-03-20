USE curators_eye;

LOAD DATA LOCAL INFILE 'Data/met/MetObjects_update.csv'
INTO TABLE met_artwork
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '
'
IGNORE 1 LINES
(
  @object_number,
  @is_highlight,
  @is_public_domain,
  @object_id,
  @department,
  @object_name,
  @title,
  @culture,
  @period,
  @reign,
  @portfolio,
  @artist_role,
  @artist_display_name,
  @geography_type,
  @city,
  @county,
  @region,
  @link_resource,
  @metadata_date,
  @repository
)
SET
  artwork_id = NULLIF(TRIM(TRAILING '' FROM @object_id), ''),
  title = NULLIF(TRIM(TRAILING '' FROM @title), ''),
  department = NULLIF(TRIM(TRAILING '' FROM @department), ''),
  culture = NULLIF(TRIM(TRAILING '' FROM @culture), ''),
  artist_display_name = NULLIF(TRIM(TRAILING '' FROM @artist_display_name), ''),
  is_public_domain = CASE
    WHEN LOWER(TRIM(TRAILING '' FROM @is_public_domain)) = 'true' THEN 1
    ELSE 0
  END,
  is_highlight = CASE
    WHEN LOWER(TRIM(TRAILING '' FROM @is_highlight)) = 'true' THEN 1
    ELSE 0
  END,
  primary_image = NULL,
  primary_image_small = NULL,
  image_checked = 0,
  object_url = NULLIF(TRIM(TRAILING '' FROM @link_resource), ''),
  tags = NULL;
