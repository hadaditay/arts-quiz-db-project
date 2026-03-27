
-- Requires: python3 scripts/preprocess_met_csv.py (generates the clean TSV)
LOAD DATA LOCAL INFILE 'data/met/MetObjects_clean.tsv'
INTO TABLE met_artwork
CHARACTER SET utf8mb4
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
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
  artwork_id = @object_id,
  title = NULLIF(@title, ''),
  department = NULLIF(@department, ''),
  culture = NULLIF(@culture, ''),
  artist_display_name = NULLIF(@artist_display_name, ''),
  is_public_domain = CASE
    WHEN LOWER(@is_public_domain) = 'true' THEN 1
    ELSE 0
  END,
  is_highlight = CASE
    WHEN LOWER(@is_highlight) = 'true' THEN 1
    ELSE 0
  END,
  primary_image = NULL,
  primary_image_small = NULL,
  image_checked = 0,
  object_url = NULLIF(@link_resource, ''),
  tags = NULL;
