# Avatar frame artwork

Avatar frames are image overlays above a reader's circular avatar. Uploading an ordinary picture does not remove its background or cut an opening for the avatar.

1. Prepare square artwork, preferably **512 × 512 pixels**.
2. Keep the center genuinely transparent, with a centered circular opening about **372 pixels in diameter**. Draw the border and decorations around that opening. A white or checkerboard pattern painted into the image is not transparency.
3. Export as a transparent **PNG/WebP**, or as **SVG**. JPEG and screenshots cannot retain a transparent opening. The upload limit is 20 MB.
4. In the admin **Shop → Add New Item**, choose **Avatar Frame**, enter its name and Lightning price, select the artwork, and check the live preview before saving.
5. Readers buy the frame in the shop and equip it from their inventory.

The frame editor includes a downloadable [ready-to-use SVG template](../admin/public/templates/avatar-frame-template.svg). It already has the correct square canvas and transparent opening. Customize its colors and decorations while keeping the center clear. When exporting to PNG, keep the canvas background transparent.

The reader and admin use the same geometry: the frame canvas is 1.375 times the avatar's diameter. The avatar therefore occupies approximately 72.7% of the artwork width at every display size.

If an older upload already lost its transparency, edit that shop item and upload the original transparent file again. Transparency removed from a saved opaque image cannot be recovered automatically.
