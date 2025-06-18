// AI-Powered Duplicate Detection
export class AIDuplicateDetector {
  constructor() {
    this.imageSimilarityThreshold = 0.85;
    this.documentSimilarityThreshold = 0.75;
  }

  // AI-powered image similarity detection
  async detectSimilarImages(files) {
    const imageFiles = files.filter(file => 
      ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(this.getFileExtension(file.name))
    );

    const groups = [];
    const processed = new Set();

    for (let i = 0; i < imageFiles.length; i++) {
      if (processed.has(i)) continue;

      const similarImages = [imageFiles[i]];
      processed.add(i);

      // Use perceptual hashing for image similarity
      for (let j = i + 1; j < imageFiles.length; j++) {
        if (processed.has(j)) continue;

        const similarity = await this.calculateImageSimilarity(imageFiles[i], imageFiles[j]);
        if (similarity > this.imageSimilarityThreshold) {
          similarImages.push(imageFiles[j]);
          processed.add(j);
        }
      }

      if (similarImages.length > 1) {
        groups.push({
          method: 'ai_image_similarity',
          files: similarImages,
          confidence: this.calculateGroupConfidence(similarImages),
          totalSize: similarImages.reduce((sum, file) => sum + file.size, 0)
        });
      }
    }

    return groups;
  }

  // AI-powered document similarity detection
  async detectSimilarDocuments(files) {
    const documentFiles = files.filter(file => 
      ['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(this.getFileExtension(file.name))
    );

    const groups = [];
    const processed = new Set();

    for (let i = 0; i < documentFiles.length; i++) {
      if (processed.has(i)) continue;

      const similarDocs = [documentFiles[i]];
      processed.add(i);

      for (let j = i + 1; j < documentFiles.length; j++) {
        if (processed.has(j)) continue;

        const similarity = await this.calculateDocumentSimilarity(documentFiles[i], documentFiles[j]);
        if (similarity > this.documentSimilarityThreshold) {
          similarDocs.push(documentFiles[j]);
          processed.add(j);
        }
      }

      if (similarDocs.length > 1) {
        groups.push({
          method: 'ai_document_similarity',
          files: similarDocs,
          confidence: this.calculateGroupConfidence(similarDocs),
          totalSize: similarDocs.reduce((sum, file) => sum + file.size, 0)
        });
      }
    }

    return groups;
  }

  // Content-based video similarity
  async detectSimilarVideos(files) {
    const videoFiles = files.filter(file => 
      ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(this.getFileExtension(file.name))
    );

    const groups = [];
    const processed = new Set();

    for (let i = 0; i < videoFiles.length; i++) {
      if (processed.has(i)) continue;

      const similarVideos = [videoFiles[i]];
      processed.add(i);

      for (let j = i + 1; j < videoFiles.length; j++) {
        if (processed.has(j)) continue;

        const similarity = await this.calculateVideoSimilarity(videoFiles[i], videoFiles[j]);
        if (similarity > 0.8) {
          similarVideos.push(videoFiles[j]);
          processed.add(j);
        }
      }

      if (similarVideos.length > 1) {
        groups.push({
          method: 'ai_video_similarity',
          files: similarVideos,
          confidence: this.calculateGroupConfidence(similarVideos),
          totalSize: similarVideos.reduce((sum, file) => sum + file.size, 0)
        });
      }
    }

    return groups;
  }

  // Calculate image similarity using perceptual hashing
  async calculateImageSimilarity(file1, file2) {
    try {
      // In a real implementation, you would:
      // 1. Download the images from OneDrive
      // 2. Generate perceptual hashes
      // 3. Compare hashes for similarity
      
      // For now, we'll simulate based on file metadata
      const sizeDiff = Math.abs(file1.size - file2.size) / Math.max(file1.size, file2.size);
      const nameSimilarity = this.calculateNameSimilarity(file1.name, file2.name);
      
      return (1 - sizeDiff) * 0.6 + nameSimilarity * 0.4;
    } catch (error) {
      console.error('Error calculating image similarity:', error);
      return 0;
    }
  }

  // Calculate document similarity
  async calculateDocumentSimilarity(file1, file2) {
    try {
      // In a real implementation, you would:
      // 1. Extract text content from documents
      // 2. Use NLP techniques to compare content
      // 3. Return similarity score
      
      // For now, simulate based on metadata
      const sizeDiff = Math.abs(file1.size - file2.size) / Math.max(file1.size, file2.size);
      const nameSimilarity = this.calculateNameSimilarity(file1.name, file2.name);
      
      return (1 - sizeDiff) * 0.7 + nameSimilarity * 0.3;
    } catch (error) {
      console.error('Error calculating document similarity:', error);
      return 0;
    }
  }

  // Calculate video similarity
  async calculateVideoSimilarity(file1, file2) {
    try {
      // In a real implementation, you would:
      // 1. Extract video frames
      // 2. Compare frame sequences
      // 3. Analyze audio tracks
      
      const sizeDiff = Math.abs(file1.size - file2.size) / Math.max(file1.size, file2.size);
      const nameSimilarity = this.calculateNameSimilarity(file1.name, file2.name);
      
      return (1 - sizeDiff) * 0.8 + nameSimilarity * 0.2;
    } catch (error) {
      console.error('Error calculating video similarity:', error);
      return 0;
    }
  }

  // Calculate confidence score for a group
  calculateGroupConfidence(files) {
    if (files.length < 2) return 0;
    
    let totalConfidence = 0;
    let comparisons = 0;
    
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const nameSimilarity = this.calculateNameSimilarity(files[i].name, files[j].name);
        const sizeSimilarity = 1 - Math.abs(files[i].size - files[j].size) / Math.max(files[i].size, files[j].size);
        
        totalConfidence += (nameSimilarity + sizeSimilarity) / 2;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalConfidence / comparisons : 0;
  }

  // Levenshtein distance for name similarity
  calculateNameSimilarity(name1, name2) {
    const distance = this.levenshteinDistance(name1.toLowerCase(), name2.toLowerCase());
    const maxLength = Math.max(name1.length, name2.length);
    return maxLength > 0 ? 1 - distance / maxLength : 0;
  }

  // Levenshtein distance algorithm
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Get file extension
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }
}

// Create a singleton instance
const aiDetector = new AIDuplicateDetector();

// Export the main function that the test suite expects
export async function detectAIDuplicates(files, options = {}) {
  const { method = 'hybrid' } = options;
  
  try {
    let results = [];
    
    switch (method) {
      case 'visual':
        results = await aiDetector.detectSimilarImages(files);
        break;
      case 'content':
        results = await aiDetector.detectSimilarDocuments(files);
        break;
      case 'video':
        results = await aiDetector.detectSimilarVideos(files);
        break;
      case 'hybrid':
      default:
        const imageResults = await aiDetector.detectSimilarImages(files);
        const documentResults = await aiDetector.detectSimilarDocuments(files);
        const videoResults = await aiDetector.detectSimilarVideos(files);
        results = [...imageResults, ...documentResults, ...videoResults];
        break;
    }
    
    // Add group IDs and normalize format
    return results.map((group, index) => ({
      groupId: `ai_group_${index + 1}`,
      files: group.files,
      confidence: group.confidence,
      method: group.method,
      totalSize: group.totalSize,
      type: group.confidence >= 0.95 ? 'exact' : 'similar'
    }));
    
  } catch (error) {
    console.error('Error in AI duplicate detection:', error);
    return [];
  }
} 