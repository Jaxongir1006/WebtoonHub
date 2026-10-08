# Publication ordering and reading positions

Chapter `published_at` is set on its first transition to published, and refreshed
when a previously unpublished/rejected chapter is published again. Legacy published
chapters are backfilled with their creation date. The public updated/recent sort
uses this publication timestamp rather than the original upload timestamp.

Reading progress validates manga/manhwa image indexes against chapter page count.
Novel indexes belong to client text pagination, so illustration count does not limit
them. Novel `word:<offset>` anchors persist reading position across repagination.
