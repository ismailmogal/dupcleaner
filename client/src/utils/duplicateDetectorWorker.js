// Web Worker for duplicate detection
// This runs in a separate thread to prevent UI blocking

// Optimized duplicate detection algorithms
class DuplicateDetectorWorker {
  constructor() {
    this.progressCallback = null;
  }

  // Set progress callback
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  // Update progress
  updateProgress(current, total, message = '') {
    if (this.progressCallback) {
      this.progressCallback(current, total, message);
    }
  }

  // Method 1: Exact name and size match (O(n) with hash map)
  findExactMatches(files) {
    console.log('Worker: findExactMatches called with', files.length, 'files');
    const groups = new Map();
    let processed = 0;
    
    for (const file of files) {
      // Create a more robust key that handles edge cases
      const fileName = file.name || '';
      const fileSize = file.size || 0;
      const key = `${fileName}_${fileSize}`;
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(file);
      
      processed++;
      if (processed % 5000 === 0) { // Reduced logging frequency
        this.updateProgress(processed, files.length, 'Finding exact matches...');
      }
    }

    const result = Array.from(groups.values()).filter(group => group.length > 1);
    console.log('Worker: findExactMatches found', result.length, 'groups');
    
    // Debug: log some sample groups
    if (result.length > 0) {
      console.log('Worker: Sample exact match groups:');
      result.slice(0, 3).forEach((group, index) => {
        console.log(`Worker: Exact Group ${index + 1}:`, group.map(f => ({
          name: f.name,
          size: f.size,
          formattedSize: this.formatFileSize(f.size || 0)
        })));
      });
    }
    
    return result;
  }

  // Method 2: Optimized name similarity with chunked processing
  findSimilarNames(files, threshold = 0.8) {
    console.log('Worker: findSimilarNames called with', files.length, 'files, threshold:', threshold);
    const groups = [];
    const processed = new Set();
    
    // Pre-filter by extension and length to reduce comparisons
    const filesByExtension = new Map();
    const filesByLength = new Map();
    
    // Single pass to build both indexes
    for (const file of files) {
      const fileName = file.name || '';
      const ext = this.getFileExtension(fileName);
      const length = fileName.length;
      
      // Extension index
      if (!filesByExtension.has(ext)) {
        filesByExtension.set(ext, []);
      }
      filesByExtension.get(ext).push(file);
      
      // Length index (for early termination)
      if (!filesByLength.has(length)) {
        filesByLength.set(length, []);
      }
      filesByLength.get(length).push(file);
    }

    // Process in chunks to prevent UI blocking
    const chunkSize = 100;
    const totalChunks = Math.ceil(files.length / chunkSize);
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const startIndex = chunkIndex * chunkSize;
      const endIndex = Math.min(startIndex + chunkSize, files.length);
      const chunk = files.slice(startIndex, endIndex);
      
      for (const file of chunk) {
        if (processed.has(file.id)) continue;

        const fileName = file.name || '';
        const ext = this.getFileExtension(fileName);
        const length = fileName.length;
        
        const similarFiles = [file];
        processed.add(file.id);
        
        // Get candidates from both extension and length filters
        const extensionCandidates = filesByExtension.get(ext) || [];
        const lengthCandidates = filesByLength.get(length) || [];
        
        // Use the smaller candidate set for efficiency
        const candidates = extensionCandidates.length <= lengthCandidates.length 
          ? extensionCandidates 
          : lengthCandidates;

        // Quick pre-filter by length difference
        const minLength = Math.floor(length * 0.5);
        const maxLength = Math.ceil(length * 1.5);
        
        for (const candidate of candidates) {
          if (processed.has(candidate.id) || candidate.id === file.id) continue;

          const candidateName = candidate.name || '';
          const candidateLength = candidateName.length;
          
          // Early termination by length
          if (candidateLength < minLength || candidateLength > maxLength) continue;
          
          // Quick prefix/suffix check for common cases
          if (this.quickSimilarityCheck(fileName, candidateName, threshold)) {
            const similarity = this.calculateNameSimilarityOptimized(fileName, candidateName);
            if (similarity >= threshold) {
              similarFiles.push(candidate);
              processed.add(candidate.id);
            }
          }
        }

        if (similarFiles.length > 1) {
          groups.push(similarFiles);
        }
      }
      
      // Update progress for each chunk
      this.updateProgress(chunkIndex + 1, totalChunks, 'Finding similar names...');
    }

    console.log('Worker: findSimilarNames found', groups.length, 'groups');
    
    // Debug: log some sample groups
    if (groups.length > 0) {
      console.log('Worker: Sample similar name groups:');
      groups.slice(0, 3).forEach((group, index) => {
        console.log(`Worker: Similar Group ${index + 1}:`, group.map(f => ({
          name: f.name,
          size: f.size,
          formattedSize: this.formatFileSize(f.size || 0)
        })));
      });
    }
    
    return groups;
  }

  // Quick similarity check for early termination
  quickSimilarityCheck(name1, name2, threshold) {
    if (name1 === name2) return true;
    
    const len1 = name1.length;
    const len2 = name2.length;
    const maxLen = Math.max(len1, len2);
    const minLen = Math.min(len1, len2);
    
    // Early termination for very different lengths
    if (minLen / maxLen < 0.5) return false;
    
    // Check common prefix
    let commonPrefix = 0;
    const maxPrefix = Math.min(4, minLen);
    for (let i = 0; i < maxPrefix; i++) {
      if (name1[i] === name2[i]) commonPrefix++;
      else break;
    }
    
    // If we have a good prefix match, it's worth checking
    return commonPrefix >= Math.min(2, minLen * 0.3);
  }

  // Method 3: Optimized size-based grouping with bucket approach
  findSizeMatches(files, tolerance = 0.01) {
    console.log('Worker: findSizeMatches called with', files.length, 'files, tolerance:', tolerance);
    
    const groups = [];
    const sizeBuckets = new Map();
    
    // Single pass to create size buckets
    for (const file of files) {
      const size = file.size || 0;
      if (size === 0) continue;
      
      // Create bucket key based on size ranges
      const bucketKey = Math.floor(Math.log10(size) * 10); // Logarithmic bucketing
      
      if (!sizeBuckets.has(bucketKey)) {
        sizeBuckets.set(bucketKey, []);
      }
      sizeBuckets.get(bucketKey).push(file);
    }
    
    // Process each bucket
    let processedBuckets = 0;
    const totalBuckets = sizeBuckets.size;
    
    for (const [bucketKey, bucketFiles] of sizeBuckets) {
      if (bucketFiles.length < 2) continue;
      
      // Sort files in this bucket by size
      bucketFiles.sort((a, b) => (a.size || 0) - (b.size || 0));
      
      // Use sliding window within the bucket
      for (let i = 0; i < bucketFiles.length; i++) {
        const currentFile = bucketFiles[i];
        const currentSize = currentFile.size || 0;
        
        const similarFiles = [currentFile];
        
        // Look forward within the bucket
        for (let j = i + 1; j < bucketFiles.length; j++) {
          const otherFile = bucketFiles[j];
          const otherSize = otherFile.size || 0;
          
          // Calculate tolerance
          const minSize = Math.min(currentSize, otherSize);
          const maxSize = Math.max(currentSize, otherSize);
          const actualTolerance = (maxSize - minSize) / minSize;
          
          if (actualTolerance <= tolerance) {
            similarFiles.push(otherFile);
          } else {
            break; // Files are sorted, no more matches
          }
        }
        
        if (similarFiles.length > 1) {
          groups.push(similarFiles);
          
          // Mark files as processed by removing them from the bucket
          for (let k = similarFiles.length - 1; k > 0; k--) {
            const index = bucketFiles.indexOf(similarFiles[k]);
            if (index > i) {
              bucketFiles.splice(index, 1);
            }
          }
        }
      }
      
      processedBuckets++;
      if (processedBuckets % 10 === 0) {
        this.updateProgress(processedBuckets, totalBuckets, 'Finding size matches...');
      }
    }

    console.log('Worker: findSizeMatches found', groups.length, 'groups');
    
    // Debug: log some sample groups
    if (groups.length > 0) {
      console.log('Worker: Sample size groups:');
      groups.slice(0, 3).forEach((group, index) => {
        console.log(`Worker: Size Group ${index + 1}:`, group.map(f => ({
          name: f.name,
          size: f.size,
          formattedSize: this.formatFileSize(f.size || 0)
        })));
      });
    }
    
    return groups;
  }

  // Method 4: Hash-based matching
  findHashMatches(files) {
    console.log('Worker: findHashMatches called with', files.length, 'files');
    const groups = new Map();
    let processed = 0;
    let filesWithHash = 0;
    
    for (const file of files) {
      // Check for hash in different possible locations
      let hash = null;
      if (file.file?.hashes?.sha1Hash) {
        hash = file.file.hashes.sha1Hash;
      } else if (file.hashes?.sha1Hash) {
        hash = file.hashes.sha1Hash;
      } else if (file.sha1Hash) {
        hash = file.sha1Hash;
      }
      
      if (hash) {
        filesWithHash++;
        if (!groups.has(hash)) {
          groups.set(hash, []);
        }
        groups.get(hash).push(file);
      }
      
      processed++;
      if (processed % 5000 === 0) { // Reduced logging frequency
        this.updateProgress(processed, files.length, 'Finding hash matches...');
      }
    }

    const result = Array.from(groups.values()).filter(group => group.length > 1);
    console.log('Worker: findHashMatches found', result.length, 'groups from', filesWithHash, 'files with hashes');
    
    // Debug: log some sample groups
    if (result.length > 0) {
      console.log('Worker: Sample hash groups:');
      result.slice(0, 3).forEach((group, index) => {
        console.log(`Worker: Hash Group ${index + 1}:`, group.map(f => ({
          name: f.name,
          size: f.size,
          formattedSize: this.formatFileSize(f.size || 0),
          hash: f.file?.hashes?.sha1Hash || f.hashes?.sha1Hash || f.sha1Hash || 'N/A'
        })));
      });
    }
    
    return result;
  }

  // Optimized similarity calculation
  calculateNameSimilarityOptimized(name1, name2) {
    if (name1 === name2) return 1.0;
    if (name1.length === 0 || name2.length === 0) return 0.0;
    
    const len1 = name1.length;
    const len2 = name2.length;
    const maxLen = Math.max(len1, len2);
    const minLen = Math.min(len1, len2);
    
    if (minLen / maxLen < 0.5) return 0.0;
    
    if (maxLen < 50) {
      return this.levenshteinDistanceOptimized(name1, name2);
    } else {
      return this.jaroWinklerDistance(name1, name2);
    }
  }

  // Optimized Levenshtein distance
  levenshteinDistanceOptimized(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;
    
    let prev = new Array(len2 + 1);
    let curr = new Array(len2 + 1);
    
    for (let i = 0; i <= len2; i++) {
      prev[i] = i;
    }
    
    for (let i = 1; i <= len1; i++) {
      curr[0] = i;
      
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        curr[j] = Math.min(
          curr[j - 1] + 1,
          prev[j] + 1,
          prev[j - 1] + cost
        );
      }
      
      [prev, curr] = [curr, prev];
    }
    
    const distance = prev[len2];
    const maxLen = Math.max(len1, len2);
    return (maxLen - distance) / maxLen;
  }

  // Jaro-Winkler distance for longer strings
  jaroWinklerDistance(str1, str2) {
    if (str1 === str2) return 1.0;
    
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0 || len2 === 0) return 0.0;
    
    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
    if (matchWindow < 0) return 0.0;
    
    const str1Matches = new Array(len1).fill(false);
    const str2Matches = new Array(len2).fill(false);
    
    let matches = 0;
    let transpositions = 0;
    
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(len2, i + matchWindow + 1);
      
      for (let j = start; j < end; j++) {
        if (str2Matches[j] || str1[i] !== str2[j]) continue;
        
        str1Matches[i] = true;
        str2Matches[j] = true;
        matches++;
        break;
      }
    }
    
    if (matches === 0) return 0.0;
    
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!str1Matches[i]) continue;
      
      while (!str2Matches[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }
    
    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
    
    let prefix = 0;
    const maxPrefix = Math.min(4, Math.min(len1, len2));
    for (let i = 0; i < maxPrefix; i++) {
      if (str1[i] === str2[i]) prefix++;
      else break;
    }
    
    return jaro + prefix * 0.1 * (1 - jaro);
  }

  // Get file extension
  getFileExtension(filename) {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Main method to find all duplicates with optimized processing
  async findAllDuplicates(files, methods = ['exact', 'similar', 'size']) {
    console.log('Worker: findAllDuplicates called with:', { filesLength: files.length, methods });
    
    // Validate input
    if (!Array.isArray(files) || files.length === 0) {
      console.warn('Worker: findAllDuplicates: No files provided or invalid input');
      return [];
    }
    
    if (!Array.isArray(methods) || methods.length === 0) {
      console.warn('Worker: findAllDuplicates: No methods provided, using defaults');
      methods = ['exact', 'similar', 'size'];
    }
    
    this.updateProgress(0, methods.length, 'Starting duplicate detection...');
    
    // Process methods in parallel for better performance
    const methodPromises = methods.map(async (method, methodIndex) => {
      console.log(`Worker: Processing ${method} detection...`);
      this.updateProgress(methodIndex, methods.length, `Processing ${method} detection...`);
      
      let groups = [];
      try {
        switch (method) {
          case 'exact':
            groups = this.findExactMatches(files);
            break;
          case 'similar':
            groups = this.findSimilarNames(files);
            break;
          case 'size':
            groups = this.findSizeMatches(files);
            break;
          case 'hash':
            groups = this.findHashMatches(files);
            break;
          default:
            console.warn(`Worker: Unknown detection method: ${method}`);
            break;
        }
      } catch (error) {
        console.error(`Worker: Error in ${method} detection:`, error);
        return [];
      }
      
      console.log(`Worker: ${method} detection found ${groups.length} groups`);
      
      // Validate groups before adding
      const validGroups = groups.filter(group => 
        Array.isArray(group) && 
        group.length > 1 && 
        group.every(file => file && typeof file === 'object')
      );
      
      return validGroups.map(group => ({
        method,
        files: group,
        totalSize: group.reduce((sum, file) => sum + (file.size || 0), 0)
      }));
    });
    
    // Wait for all methods to complete
    const methodResults = await Promise.all(methodPromises);
    
    // Combine all results
    const allGroups = [];
    methodResults.forEach(groups => {
      allGroups.push(...groups);
    });
    
    console.log('Worker: Total groups found:', allGroups.length);
    this.updateProgress(methods.length, methods.length, 'Duplicate detection completed');
    return allGroups;
  }
}

// Worker message handling
const detector = new DuplicateDetectorWorker();

self.onmessage = async function(e) {
  const { type, data } = e.data;
  
  switch (type) {
    case 'detect_duplicates':
      try {
        const { files, methods } = data;
        
        // Set up progress callback
        detector.setProgressCallback((current, total, message) => {
          self.postMessage({
            type: 'progress',
            data: { current, total, message }
          });
        });
        
        const results = await detector.findAllDuplicates(files, methods);
        
        self.postMessage({
          type: 'complete',
          data: results
        });
      } catch (error) {
        self.postMessage({
          type: 'error',
          data: error.message
        });
      }
      break;
      
    case 'cancel':
      // Handle cancellation if needed
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
}; 