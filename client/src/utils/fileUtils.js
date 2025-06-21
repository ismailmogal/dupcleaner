export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (item) => {
  if (item.folder) {
    return '📁';
  }
  
  const extension = item.name.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
      return '🖼️';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
      return '🎥';
    case 'mp3':
    case 'wav':
    case 'flac':
      return '🎵';
    case 'pdf':
      return '📄';
    case 'doc':
    case 'docx':
      return '📝';
    case 'xls':
    case 'xlsx':
      return '📊';
    case 'ppt':
    case 'pptx':
      return '📈';
    case 'zip':
    case 'rar':
    case '7z':
      return '📦';
    default:
      return '📄';
  }
};

export const getFileType = (item) => {
  if (item.folder) return 'Folder';
  
  const extension = item.name.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
      return 'Image';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
      return 'Video';
    case 'mp3':
    case 'wav':
    case 'flac':
      return 'Audio';
    case 'pdf':
      return 'PDF Document';
    case 'doc':
    case 'docx':
      return 'Word Document';
    case 'xls':
    case 'xlsx':
      return 'Excel Spreadsheet';
    case 'ppt':
    case 'pptx':
      return 'PowerPoint Presentation';
    case 'zip':
    case 'rar':
    case '7z':
      return 'Compressed Folder';
    default:
      return 'File';
  }
}; 