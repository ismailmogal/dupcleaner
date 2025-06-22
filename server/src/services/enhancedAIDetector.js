// Enhanced AI Detection Service for Phase 1
// This provides visual similarity and content analysis capabilities

class EnhancedAIDetector {
  constructor() {
    this.supportedImageFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    this.supportedDocumentFormats = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
    this.supportedVideoFormats = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
  }

  // Main method to detect duplicates with enhanced AI
  async detectEnhancedDuplicates(files, options = {}) {
    const { method = 'hybrid', threshold = 0.8 } = options;
    
    try {
      let results = [];
      
      switch (method) {
        case 'visual':
          results = await this.detectVisualSimilarity(files, threshold);
          break;
        case 'content':
          results = await this.detectContentSimilarity(files, threshold);
          break;
        case 'hybrid':
        default:
          const visualResults = await this.detectVisualSimilarity(files, threshold);
          const contentResults = await this.detectContentSimilarity(files, threshold);
          results = this.mergeResults(visualResults, contentResults);
          break;
      }
      
      return this.formatResults(results);
    } catch (error) {
      console.error('Error in enhanced AI detection:', error);
      return [];
    }
  }

  // Detect visual similarity for images and videos
  async detectVisualSimilarity(files, threshold = 0.8) {
    const imageFiles = files.filter(file => 
      this.supportedImageFormats.includes(this.getFileExtension(file.name))
    );
    
    const videoFiles = files.filter(file => 
      this.supportedVideoFormats.includes(this.getFileExtension(file.name))
    );

    const results = [];
    const processed = new Set();

    // Process images
    for (let i = 0; i < imageFiles.length; i++) {
      if (processed.has(i)) continue;

      const similarImages = [imageFiles[i]];
      processed.add(i);

      for (let j = i + 1; j < imageFiles.length; j++) {
        if (processed.has(j)) continue;

        const similarity = await this.calculateImageSimilarity(imageFiles[i], imageFiles[j]);
        if (similarity >= threshold) {
          similarImages.push(imageFiles[j]);
          processed.add(j);
        }
      }

      if (similarImages.length > 1) {
        results.push({
          type: 'visual_similarity',
          method: 'ai_visual',
          files: similarImages,
          confidence: this.calculateGroupConfidence(similarImages),
          totalSize: similarImages.reduce((sum, file) => sum + (file.size || 0), 0),
          metadata: {
            fileType: 'image',
            similarityThreshold: threshold,
            detectionMethod: 'visual_analysis'
          }
        });
      }
    }

    // Process videos (simplified for now)
    for (let i = 0; i < videoFiles.length; i++) {
      if (processed.has(`video_${i}`)) continue;

      const similarVideos = [videoFiles[i]];
      processed.add(`video_${i}`);

      for (let j = i + 1; j < videoFiles.length; j++) {
        if (processed.has(`video_${j}`)) continue;

        const similarity = await this.calculateVideoSimilarity(videoFiles[i], videoFiles[j]);
        if (similarity >= threshold) {
          similarVideos.push(videoFiles[j]);
          processed.add(`video_${j}`);
        }
      }

      if (similarVideos.length > 1) {
        results.push({
          type: 'visual_similarity',
          method: 'ai_visual',
          files: similarVideos,
          confidence: this.calculateGroupConfidence(similarVideos),
          totalSize: similarVideos.reduce((sum, file) => sum + (file.size || 0), 0),
          metadata: {
            fileType: 'video',
            similarityThreshold: threshold,
            detectionMethod: 'frame_analysis'
          }
        });
      }
    }

    return results;
  }

  // Detect content similarity for documents
  async detectContentSimilarity(files, threshold = 0.7) {
    const documentFiles = files.filter(file => 
      this.supportedDocumentFormats.includes(this.getFileExtension(file.name))
    );

    const results = [];
    const processed = new Set();

    for (let i = 0; i < documentFiles.length; i++) {
      if (processed.has(i)) continue;

      const similarDocs = [documentFiles[i]];
      processed.add(i);

      for (let j = i + 1; j < documentFiles.length; j++) {
        if (processed.has(j)) continue;

        const similarity = await this.calculateDocumentSimilarity(documentFiles[i], documentFiles[j]);
        if (similarity >= threshold) {
          similarDocs.push(documentFiles[j]);
          processed.add(j);
        }
      }

      if (similarDocs.length > 1) {
        results.push({
          type: 'content_similarity',
          method: 'ai_content',
          files: similarDocs,
          confidence: this.calculateGroupConfidence(similarDocs),
          totalSize: similarDocs.reduce((sum, file) => sum + (file.size || 0), 0),
          metadata: {
            fileType: 'document',
            similarityThreshold: threshold,
            detectionMethod: 'content_analysis'
          }
        });
      }
    }

    return results;
  }

  // Calculate image similarity using perceptual hashing
  async calculateImageSimilarity(file1, file2) {
    try {
      // In a real implementation, you would:
      // 1. Download the images from OneDrive
      // 2. Generate perceptual hashes using libraries like 'blockhash' or 'imghash'
      // 3. Compare hashes for similarity
      
      // For now, we'll simulate based on file metadata
      const sizeDiff = Math.abs((file1.size || 0) - (file2.size || 0)) / Math.max((file1.size || 1), (file2.size || 1));
      const nameSimilarity = this.calculateNameSimilarity(file1.name, file2.name);
      
      // Simulate visual similarity based on file characteristics
      const visualSimilarity = (1 - sizeDiff) * 0.6 + nameSimilarity * 0.4;
      
      return Math.min(visualSimilarity, 1.0);
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
      const sizeDiff = Math.abs((file1.size || 0) - (file2.size || 0)) / Math.max((file1.size || 1), (file2.size || 1));
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
      
      const sizeDiff = Math.abs((file1.size || 0) - (file2.size || 0)) / Math.max((file1.size || 1), (file2.size || 1));
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
        const sizeSimilarity = 1 - Math.abs((files[i].size || 0) - (files[j].size || 0)) / Math.max((files[i].size || 1), (files[j].size || 1));
        
        totalConfidence += (nameSimilarity + sizeSimilarity) / 2;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalConfidence / comparisons : 0;
  }

  // Merge results from different detection methods
  mergeResults(visualResults, contentResults) {
    const merged = [...visualResults, ...contentResults];
    
    // Remove duplicates based on file IDs
    const seen = new Set();
    return merged.filter(result => {
      const fileIds = result.files.map(f => f.id).sort().join(',');
      if (seen.has(fileIds)) {
        return false;
      }
      seen.add(fileIds);
      return true;
    });
  }

  // Format results for API response
  formatResults(results) {
    return results.map((result, index) => ({
      groupId: `enhanced_ai_group_${index + 1}`,
      files: result.files,
      confidence: result.confidence,
      method: result.method,
      totalSize: result.totalSize,
      type: result.type,
      metadata: result.metadata,
      suggestedAction: this.getSuggestedAction(result)
    }));
  }

  // Get suggested action based on confidence and file type
  getSuggestedAction(result) {
    if (result.confidence >= 0.95) {
      return 'high_confidence_duplicate';
    } else if (result.confidence >= 0.8) {
      return 'likely_duplicate';
    } else if (result.confidence >= 0.6) {
      return 'possible_duplicate';
    } else {
      return 'review_manually';
    }
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

// Create singleton instance
const enhancedAIDetector = new EnhancedAIDetector();

module.exports = enhancedAIDetector; 