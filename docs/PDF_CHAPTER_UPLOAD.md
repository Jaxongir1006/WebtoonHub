# Upload one chapter from a PDF

In the studio, choose **PDF Upload** beside **Import chapters**. The button is
available on the dashboard, series list and manga/manhwa series details.

1. Choose the manga/manhwa and chapter number, with an optional title.
2. Select one PDF. One file creates exactly one chapter, with pages in PDF order.
3. Select **Upload chapter** and keep the window open until it finishes.

Chapters are submitted for review by default. Staff with publishing permission
can expand **Advanced options** and enable **Publish when upload finishes** before uploading.
PDF pages become ordinary chapter images in the existing reader. Novel chapters
continue to use the text editor.

PDFs may contain 1–100 pages and be at most 20 MB. Password-protected files are
rejected with an explanation. Conversion is limited to 50 MB of output, with
bounded page resolution and processing time for the free hosting instance.

Translation annotations and form text are included in the rendered page. PDF
pages use lossless WebP, at up to 288 DPI and 2400 pixels wide, without the normal
chapter upload's extra resize/compression. Long vertical pages are divided into
ordered sections to retain readable text; there may be at most 100 sections per
chapter. Output that exceeds the limits is rejected instead of silently reducing
its quality.

Chapters uploaded before this rendering fix must be reprocessed from their
original PDFs to restore missing translation overlays and lost detail. Existing
images cannot recover content that was omitted during their original conversion.

If a request fails, the form retains the PDF and retry key. Retrying the same
unchanged form resumes the saved import and does not create a second chapter.
The original PDF is temporary and is removed after processing.
