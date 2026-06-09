const { PrismaClient } = require('@prisma/client');
const cloudinary = require('cloudinary').v2;
const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const runCleanup = async () => {
  try {
    console.log('[Cleanup] Checking for expired chat files...');

    // Find all messages with expired files
    const expiredMessages = await prisma.message.findMany({
      where: {
        fileExpiresAt: { lt: new Date() },
        fileUrl: { not: null },
        cloudinaryId: { not: null },
      },
      select: { id: true, cloudinaryId: true, fileType: true },
    });

    if (expiredMessages.length === 0) {
      console.log('[Cleanup] No expired files found.');
      return;
    }

    console.log(`[Cleanup] Found ${expiredMessages.length} expired file(s). Deleting...`);

    let deleted = 0;
    let failed = 0;

    for (const msg of expiredMessages) {
      try {
        // Delete from Cloudinary
        const resourceType = msg.fileType === 'image' ? 'image' : 'raw';
        await cloudinary.uploader.destroy(msg.cloudinaryId, { resource_type: resourceType });

        // Clear file fields in database (keep message content/caption)
        await prisma.message.update({
          where: { id: msg.id },
          data: {
            fileUrl: null,
            cloudinaryId: null,
            // Keep fileType and fileName so frontend knows it was a file
          },
        });

        deleted++;
      } catch (err) {
        console.error(`[Cleanup] Failed to delete ${msg.cloudinaryId}:`, err.message);
        failed++;
      }
    }

    console.log(`[Cleanup] Done. Deleted: ${deleted}, Failed: ${failed}`);
  } catch (err) {
    console.error('[Cleanup] Job error:', err);
  }
};

const startCleanupJob = () => {
  // Run once on startup
  runCleanup();

  // Then run every 24 hours
  const INTERVAL = 24 * 60 * 60 * 1000;
  setInterval(runCleanup, INTERVAL);
  console.log('[Cleanup] Daily file cleanup job started.');
};

module.exports = { startCleanupJob };
