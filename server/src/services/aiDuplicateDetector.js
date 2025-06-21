const stringSimilarity = require('string-similarity');
const crypto = require('crypto');
const Jimp = require('jimp');

// Helper: Compute perceptual hash for an image buffer
async function getImageHash(buffer) {
  try {
    const image = await Jimp.read(buffer);
    return image.hash(); // Returns a perceptual hash string
  } catch (e) {
    return null;
  }
}

// Helper: Compute SHA-1 hash for non-image files (as fallback)
function getFileHash(buffer) {
  return crypto.createHash('sha1').update(buffer).digest('hex');
}

// Main AI duplicate detector
async function findAIDuplicates(files, getFileContent) {
  // files: [{ id, name, size, mimeType, ... }]
  // getFileContent: async (fileId) => Buffer
  const results = [];
  const checked = new Set();

  // Fuzzy filename groups
  for (let i = 0; i < files.length; i++) {
    const fileA = files[i];
    if (checked.has(fileA.id)) continue;
    const group = [fileA];
    for (let j = i + 1; j < files.length; j++) {
      const fileB = files[j];
      if (checked.has(fileB.id)) continue;
      // Fuzzy filename match
      const sim = stringSimilarity.compareTwoStrings(fileA.name, fileB.name);
      if (sim > 0.85) {
        group.push(fileB);
        checked.add(fileB.id);
      }
    }
    if (group.length > 1) {
      group.forEach(f => checked.add(f.id));
      results.push({
        type: 'fuzzy-filename',
        confidence: 0.85,
        files: group,
        reason: 'Fuzzy filename match'
      });
    }
  }

  // Image perceptual hash groups
  const imageFiles = files.filter(f => f.mimeType && f.mimeType.startsWith('image/'));
  const imageHashes = {};
  for (const file of imageFiles) {
    try {
      const buffer = await getFileContent(file.id);
      const hash = await getImageHash(buffer);
      if (hash) {
        if (!imageHashes[hash]) imageHashes[hash] = [];
        imageHashes[hash].push(file);
      }
    } catch (e) { /* skip */ }
  }
  for (const [hash, group] of Object.entries(imageHashes)) {
    if (group.length > 1) {
      results.push({
        type: 'image-phash',
        confidence: 0.95,
        files: group,
        reason: 'Image perceptual hash match'
      });
    }
  }

  // TODO: Add text content similarity, PDF, etc.

  return results;
}

module.exports = { findAIDuplicates }; 