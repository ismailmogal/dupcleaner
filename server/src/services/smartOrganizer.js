// Smart File Organizer Service
// Analyzes files and suggests intelligent organization strategies

class SmartOrganizer {
  constructor() {
    this.fileTypeCategories = {
      images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'svg'],
      videos: ['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm', 'flv', 'm4v'],
      audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'],
      documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
      spreadsheets: ['xls', 'xlsx', 'csv', 'ods'],
      presentations: ['ppt', 'pptx', 'odp'],
      archives: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
      code: ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs'],
      data: ['json', 'xml', 'yaml', 'yml', 'sql', 'db', 'sqlite']
    };
  }

  // Analyze files and generate organization insights
  analyzeFiles(files) {
    try {
      const analysis = {
        totalFiles: files.length,
        totalSize: 0,
        fileTypes: {},
        sizeDistribution: {
          small: 0,    // < 1MB
          medium: 0,   // 1MB - 100MB
          large: 0,    // 100MB - 1GB
          huge: 0      // > 1GB
        },
        dateDistribution: {
          recent: 0,   // Last 30 days
          recentMonth: 0, // Last 3 months
          recentYear: 0,  // Last year
          old: 0       // Older than 1 year
        },
        duplicates: [],
        recommendations: []
      };

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      files.forEach(file => {
        if (file.folder) return; // Skip folders

        // Calculate total size
        analysis.totalSize += file.size || 0;

        // Analyze file type
        const extension = this.getFileExtension(file.name);
        const category = this.getFileCategory(extension);
        
        if (!analysis.fileTypes[category]) {
          analysis.fileTypes[category] = { count: 0, size: 0, extensions: {} };
        }
        analysis.fileTypes[category].count++;
        analysis.fileTypes[category].size += file.size || 0;
        
        if (!analysis.fileTypes[category].extensions[extension]) {
          analysis.fileTypes[category].extensions[extension] = 0;
        }
        analysis.fileTypes[category].extensions[extension]++;

        // Analyze size distribution
        const sizeInMB = (file.size || 0) / (1024 * 1024);
        if (sizeInMB < 1) analysis.sizeDistribution.small++;
        else if (sizeInMB < 100) analysis.sizeDistribution.medium++;
        else if (sizeInMB < 1024) analysis.sizeDistribution.large++;
        else analysis.sizeDistribution.huge++;

        // Analyze date distribution
        const fileDate = new Date(file.lastModifiedDateTime);
        if (fileDate > thirtyDaysAgo) analysis.dateDistribution.recent++;
        else if (fileDate > threeMonthsAgo) analysis.dateDistribution.recentMonth++;
        else if (fileDate > oneYearAgo) analysis.dateDistribution.recentYear++;
        else analysis.dateDistribution.old++;
      });

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      return analysis;
    } catch (error) {
      console.error('Error analyzing files:', error);
      throw new Error('Failed to analyze files');
    }
  }

  // Generate organization plan based on analysis
  generateOrganizationPlan(files, analysis, options = {}) {
    try {
      const plan = {
        folders: [],
        moves: [],
        deletions: [],
        totalSpaceSaved: 0,
        estimatedTime: 0
      };

      const {
        organizeByType = true,
        organizeByDate = true,
        organizeBySize = false,
        deleteDuplicates = true,
        deleteOldFiles = false,
        oldFileThreshold = 365 // days
      } = options;

      // Create folder structure
      if (organizeByType) {
        plan.folders.push(...this.createTypeBasedFolders(analysis.fileTypes));
      }

      if (organizeByDate) {
        plan.folders.push(...this.createDateBasedFolders());
      }

      if (organizeBySize) {
        plan.folders.push(...this.createSizeBasedFolders());
      }

      // Generate move operations
      files.forEach(file => {
        if (file.folder) return;

        const move = this.determineFileMove(file, plan.folders, options);
        if (move) {
          plan.moves.push(move);
        }
      });

      // Generate deletion recommendations
      if (deleteDuplicates) {
        const duplicates = this.findPotentialDuplicates(files);
        plan.deletions.push(...duplicates);
        plan.totalSpaceSaved += duplicates.reduce((sum, d) => sum + d.size, 0);
      }

      if (deleteOldFiles) {
        const oldFiles = this.findOldFiles(files, oldFileThreshold);
        plan.deletions.push(...oldFiles);
        plan.totalSpaceSaved += oldFiles.reduce((sum, f) => sum + f.size, 0);
      }

      // Estimate processing time (rough calculation)
      plan.estimatedTime = Math.ceil((plan.moves.length * 2 + plan.deletions.length * 1) / 60); // minutes

      return plan;
    } catch (error) {
      console.error('Error generating organization plan:', error);
      throw new Error('Failed to generate organization plan');
    }
  }

  // Execute organization plan
  async executeOrganizationPlan(plan, fileOperations) {
    try {
      const results = {
        successful: [],
        failed: [],
        totalProcessed: 0,
        totalSpaceSaved: 0
      };

      // Create folders first
      for (const folder of plan.folders) {
        try {
          await fileOperations.createFolder(folder.name, folder.parentId);
          results.successful.push({ type: 'folder_created', name: folder.name });
        } catch (error) {
          results.failed.push({ type: 'folder_created', name: folder.name, error: error.message });
        }
      }

      // Execute moves
      for (const move of plan.moves) {
        try {
          await fileOperations.moveFile(move.fileId, move.destinationFolderId);
          results.successful.push({ type: 'file_moved', name: move.fileName });
          results.totalProcessed++;
        } catch (error) {
          results.failed.push({ type: 'file_moved', name: move.fileName, error: error.message });
        }
      }

      // Execute deletions
      for (const deletion of plan.deletions) {
        try {
          await fileOperations.deleteFile(deletion.fileId);
          results.successful.push({ type: 'file_deleted', name: deletion.fileName });
          results.totalSpaceSaved += deletion.size;
          results.totalProcessed++;
        } catch (error) {
          results.failed.push({ type: 'file_deleted', name: deletion.fileName, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Error executing organization plan:', error);
      throw new Error('Failed to execute organization plan');
    }
  }

  // Helper methods
  getFileExtension(filename) {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  getFileCategory(extension) {
    for (const [category, extensions] of Object.entries(this.fileTypeCategories)) {
      if (extensions.includes(extension)) {
        return category;
      }
    }
    return 'other';
  }

  createTypeBasedFolders(fileTypes) {
    const folders = [];
    for (const [category, data] of Object.entries(fileTypes)) {
      if (data.count > 0) {
        folders.push({
          name: this.capitalizeFirst(category),
          parentId: null,
          description: `${data.count} files, ${this.formatFileSize(data.size)}`
        });
      }
    }
    return folders;
  }

  createDateBasedFolders() {
    return [
      { name: 'Recent Files', parentId: null, description: 'Files from last 30 days' },
      { name: 'This Year', parentId: null, description: 'Files from this year' },
      { name: 'Archive', parentId: null, description: 'Files older than 1 year' }
    ];
  }

  createSizeBasedFolders() {
    return [
      { name: 'Large Files', parentId: null, description: 'Files larger than 100MB' },
      { name: 'Medium Files', parentId: null, description: 'Files 1MB-100MB' },
      { name: 'Small Files', parentId: null, description: 'Files smaller than 1MB' }
    ];
  }

  determineFileMove(file, folders, options) {
    const extension = this.getFileExtension(file.name);
    const category = this.getFileCategory(extension);
    const fileDate = new Date(file.lastModifiedDateTime);
    const now = new Date();

    // Find appropriate folder
    let destinationFolder = null;

    if (options.organizeByType) {
      destinationFolder = folders.find(f => f.name.toLowerCase() === category);
    }

    if (!destinationFolder && options.organizeByDate) {
      const daysDiff = (now - fileDate) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 30) {
        destinationFolder = folders.find(f => f.name === 'Recent Files');
      } else if (daysDiff <= 365) {
        destinationFolder = folders.find(f => f.name === 'This Year');
      } else {
        destinationFolder = folders.find(f => f.name === 'Archive');
      }
    }

    if (destinationFolder) {
      return {
        fileId: file.id,
        fileName: file.name,
        destinationFolderId: destinationFolder.id,
        destinationFolderName: destinationFolder.name,
        reason: `Organizing by ${destinationFolder.name.toLowerCase()}`
      };
    }

    return null;
  }

  findPotentialDuplicates(files) {
    const duplicates = [];
    const sizeGroups = new Map();

    // Group files by size
    files.forEach(file => {
      if (file.folder || !file.size) return;
      
      if (!sizeGroups.has(file.size)) {
        sizeGroups.set(file.size, []);
      }
      sizeGroups.get(file.size).push(file);
    });

    // Find potential duplicates (same size, similar names)
    for (const [size, fileGroup] of sizeGroups) {
      if (fileGroup.length > 1) {
        // Check for similar names
        for (let i = 0; i < fileGroup.length; i++) {
          for (let j = i + 1; j < fileGroup.length; j++) {
            const file1 = fileGroup[i];
            const file2 = fileGroup[j];
            
            if (this.areSimilarNames(file1.name, file2.name)) {
              duplicates.push({
                fileId: file1.id,
                fileName: file1.name,
                size: file1.size,
                reason: `Potential duplicate of ${file2.name}`
              });
            }
          }
        }
      }
    }

    return duplicates;
  }

  findOldFiles(files, thresholdDays) {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() - thresholdDays * 24 * 60 * 60 * 1000);

    return files
      .filter(file => !file.folder && new Date(file.lastModifiedDateTime) < thresholdDate)
      .map(file => ({
        fileId: file.id,
        fileName: file.name,
        size: file.size,
        reason: `File older than ${thresholdDays} days`
      }));
  }

  areSimilarNames(name1, name2) {
    const clean1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clean2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Simple similarity check - can be enhanced with more sophisticated algorithms
    return clean1 === clean2 || 
           clean1.includes(clean2) || 
           clean2.includes(clean1) ||
           this.levenshteinDistance(clean1, clean2) <= 3;
  }

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

  generateRecommendations(analysis) {
    const recommendations = [];

    // Size-based recommendations
    if (analysis.sizeDistribution.huge > 0) {
      recommendations.push({
        type: 'size',
        priority: 'high',
        title: 'Large Files Detected',
        description: `${analysis.sizeDistribution.huge} files larger than 1GB found. Consider moving to external storage.`,
        action: 'review_large_files'
      });
    }

    if (analysis.sizeDistribution.large > 10) {
      recommendations.push({
        type: 'size',
        priority: 'medium',
        title: 'Many Large Files',
        description: `${analysis.sizeDistribution.large} files between 100MB-1GB found. Consider compression or archiving.`,
        action: 'compress_large_files'
      });
    }

    // Date-based recommendations
    if (analysis.dateDistribution.old > 50) {
      recommendations.push({
        type: 'date',
        priority: 'medium',
        title: 'Old Files Found',
        description: `${analysis.dateDistribution.old} files older than 1 year. Consider archiving or deletion.`,
        action: 'archive_old_files'
      });
    }

    // Type-based recommendations
    const imageCount = analysis.fileTypes.images?.count || 0;
    if (imageCount > 100) {
      recommendations.push({
        type: 'organization',
        priority: 'medium',
        title: 'Many Images',
        description: `${imageCount} images found. Consider organizing by date or event.`,
        action: 'organize_images'
      });
    }

    const videoCount = analysis.fileTypes.videos?.count || 0;
    if (videoCount > 20) {
      recommendations.push({
        type: 'organization',
        priority: 'high',
        title: 'Video Collection',
        description: `${videoCount} videos found. Videos take up significant space. Consider external storage.`,
        action: 'review_videos'
      });
    }

    // Duplicate recommendations
    if (analysis.duplicates.length > 0) {
      recommendations.push({
        type: 'duplicates',
        priority: 'high',
        title: 'Potential Duplicates',
        description: `${analysis.duplicates.length} potential duplicate files found.`,
        action: 'remove_duplicates'
      });
    }

    return recommendations;
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = SmartOrganizer; 