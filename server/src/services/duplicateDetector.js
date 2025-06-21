const crypto = require('crypto');

class DuplicateDetector {
  constructor() {
    this.hashCache = new Map();
  }

  // Calculate SHA-256 hash of file content
  calculateHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Calculate hash for a file
  async calculateFileHash(fileContent) {
    try {
      return this.calculateHash(fileContent);
    } catch (error) {
      console.error('Error calculating file hash:', error);
      throw new Error('Failed to calculate file hash');
    }
  }

  // Find duplicates based on file hashes
  async findDuplicatesByHash(files, microsoftGraphService, accessToken) {
    try {
      const hashGroups = new Map();
      const results = {
        duplicates: [],
        totalFiles: files.length,
        processedFiles: 0,
        scanTime: new Date().toISOString()
      };

      console.log(`Starting duplicate detection for ${files.length} files...`);

      // Process each file
      for (const file of files) {
        try {
          // Skip folders
          if (file.folder) {
            results.processedFiles++;
            continue;
          }

          // Skip files without size (likely folders or special items)
          if (!file.size || file.size === 0) {
            results.processedFiles++;
            continue;
          }

          console.log(`Processing file: ${file.name} (${file.size} bytes)`);

          // Get file content and calculate hash
          const fileContent = await microsoftGraphService.getFileContent(accessToken, file.id);
          const fileHash = await this.calculateFileHash(fileContent);

          // Group files by hash
          if (!hashGroups.has(fileHash)) {
            hashGroups.set(fileHash, []);
          }
          hashGroups.get(fileHash).push({
            id: file.id,
            name: file.name,
            size: file.size,
            lastModified: file.lastModifiedDateTime,
            hash: fileHash
          });

          results.processedFiles++;
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          results.processedFiles++;
        }
      }

      // Find groups with more than one file (duplicates)
      for (const [hash, fileGroup] of hashGroups) {
        if (fileGroup.length > 1) {
          results.duplicates.push({
            hash: hash,
            files: fileGroup,
            count: fileGroup.length,
            totalSize: fileGroup.reduce((sum, file) => sum + file.size, 0)
          });
        }
      }

      console.log(`Duplicate detection completed. Found ${results.duplicates.length} duplicate groups.`);
      return results;

    } catch (error) {
      console.error('Error in duplicate detection:', error);
      throw new Error('Failed to detect duplicates');
    }
  }

  // Find duplicates based on file names (simple method)
  findDuplicatesByName(files) {
    try {
      const nameGroups = new Map();
      const results = {
        duplicates: [],
        totalFiles: files.length,
        processedFiles: files.length,
        scanTime: new Date().toISOString()
      };

      // Group files by name
      for (const file of files) {
        if (file.folder) continue; // Skip folders

        const fileName = file.name.toLowerCase();
        if (!nameGroups.has(fileName)) {
          nameGroups.set(fileName, []);
        }
        nameGroups.get(fileName).push({
          id: file.id,
          name: file.name,
          size: file.size,
          lastModified: file.lastModifiedDateTime
        });
      }

      // Find groups with more than one file
      for (const [name, fileGroup] of nameGroups) {
        if (fileGroup.length > 1) {
          results.duplicates.push({
            name: name,
            files: fileGroup,
            count: fileGroup.length,
            totalSize: fileGroup.reduce((sum, file) => sum + (file.size || 0), 0)
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in name-based duplicate detection:', error);
      throw new Error('Failed to detect duplicates by name');
    }
  }

  // Find duplicates based on file size (quick method)
  findDuplicatesBySize(files) {
    try {
      const sizeGroups = new Map();
      const results = {
        duplicates: [],
        totalFiles: files.length,
        processedFiles: files.length,
        scanTime: new Date().toISOString()
      };

      // Group files by size
      for (const file of files) {
        if (file.folder || !file.size || file.size === 0) continue; // Skip folders and empty files

        const size = file.size;
        if (!sizeGroups.has(size)) {
          sizeGroups.set(size, []);
        }
        sizeGroups.get(size).push({
          id: file.id,
          name: file.name,
          size: file.size,
          lastModified: file.lastModifiedDateTime
        });
      }

      // Find groups with more than one file
      for (const [size, fileGroup] of sizeGroups) {
        if (fileGroup.length > 1) {
          results.duplicates.push({
            size: size,
            files: fileGroup,
            count: fileGroup.length,
            totalSize: size * fileGroup.length
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in size-based duplicate detection:', error);
      throw new Error('Failed to detect duplicates by size');
    }
  }

  // Comprehensive duplicate detection
  async findDuplicates(files, microsoftGraphService, accessToken, method = 'hash') {
    try {
      switch (method) {
        case 'hash':
          return await this.findDuplicatesByHash(files, microsoftGraphService, accessToken);
        case 'name':
          return this.findDuplicatesByName(files);
        case 'size':
          return this.findDuplicatesBySize(files);
        default:
          throw new Error(`Unknown duplicate detection method: ${method}`);
      }
    } catch (error) {
      console.error('Error in duplicate detection:', error);
      throw error;
    }
  }
}

module.exports = new DuplicateDetector(); 