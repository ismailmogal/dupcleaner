// Real file test data for AI validation
export const realFileTestData = {
  // Image files with different scenarios
  images: [
    {
      id: 'img_original_1',
      name: 'vacation_photo.jpg',
      size: 2048576, // 2MB
      type: 'image/jpeg',
      content: generateImageHash('vacation_photo_original'),
      metadata: {
        width: 1920,
        height: 1080,
        format: 'JPEG',
        colorSpace: 'sRGB',
        dpi: 72,
        dateCreated: '2024-01-15T10:30:00Z',
        dateModified: '2024-01-15T10:30:00Z'
      },
      path: '/Photos/Vacation/vacation_photo.jpg'
    },
    {
      id: 'img_duplicate_1',
      name: 'vacation_photo_copy.jpg',
      size: 2048576, // Same size
      type: 'image/jpeg',
      content: generateImageHash('vacation_photo_original'), // Same hash
      metadata: {
        width: 1920,
        height: 1080,
        format: 'JPEG',
        colorSpace: 'sRGB',
        dpi: 72,
        dateCreated: '2024-01-20T14:15:00Z',
        dateModified: '2024-01-20T14:15:00Z'
      },
      path: '/Photos/Vacation/Backup/vacation_photo_copy.jpg'
    },
    {
      id: 'img_resized_1',
      name: 'vacation_photo_thumbnail.jpg',
      size: 512000, // Smaller size
      type: 'image/jpeg',
      content: generateImageHash('vacation_photo_resized'), // Similar but different
      metadata: {
        width: 480,
        height: 270,
        format: 'JPEG',
        colorSpace: 'sRGB',
        dpi: 72,
        dateCreated: '2024-01-25T09:45:00Z',
        dateModified: '2024-01-25T09:45:00Z'
      },
      path: '/Photos/Vacation/Thumbnails/vacation_photo_thumbnail.jpg'
    },
    {
      id: 'img_different_1',
      name: 'beach_sunset.jpg',
      size: 3072000, // 3MB
      type: 'image/jpeg',
      content: generateImageHash('beach_sunset_different'),
      metadata: {
        width: 2560,
        height: 1440,
        format: 'JPEG',
        colorSpace: 'sRGB',
        dpi: 300,
        dateCreated: '2024-02-01T18:20:00Z',
        dateModified: '2024-02-01T18:20:00Z'
      },
      path: '/Photos/Vacation/beach_sunset.jpg'
    }
  ],

  // Document files with content analysis
  documents: [
    {
      id: 'doc_report_1',
      name: 'Q1_Sales_Report.docx',
      size: 1048576, // 1MB
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      content: `Q1 2024 Sales Report

Executive Summary:
Our Q1 2024 sales performance exceeded expectations with a 15% increase in revenue compared to Q4 2023. Key highlights include:

• Revenue: $2.5M (15% increase)
• New customers: 150
• Customer retention: 95%
• Top performing product: AI Suite

Regional Performance:
- North America: $1.2M (20% growth)
- Europe: $800K (12% growth)
- Asia Pacific: $500K (18% growth)

Product Performance:
1. AI Suite: $1.5M (60% of revenue)
2. Cloud Storage: $600K (24% of revenue)
3. Security Tools: $400K (16% of revenue)

Recommendations:
- Increase marketing budget for AI Suite
- Expand European sales team
- Launch new features in Q2

Prepared by: John Smith
Date: March 31, 2024`,
      metadata: {
        pages: 8,
        author: 'John Smith',
        title: 'Q1 2024 Sales Report',
        subject: 'Sales Performance',
        keywords: ['sales', 'report', 'Q1', '2024', 'revenue'],
        dateCreated: '2024-03-31T16:00:00Z',
        dateModified: '2024-03-31T16:00:00Z',
        wordCount: 1250
      },
      path: '/Documents/Reports/Q1_Sales_Report.docx'
    },
    {
      id: 'doc_report_2',
      name: 'Q1_Sales_Report_Final.docx',
      size: 1048576, // Same size
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      content: `Q1 2024 Sales Report

Executive Summary:
Our Q1 2024 sales performance exceeded expectations with a 15% increase in revenue compared to Q4 2023. Key highlights include:

• Revenue: $2.5M (15% increase)
• New customers: 150
• Customer retention: 95%
• Top performing product: AI Suite

Regional Performance:
- North America: $1.2M (20% growth)
- Europe: $800K (12% growth)
- Asia Pacific: $500K (18% growth)

Product Performance:
1. AI Suite: $1.5M (60% of revenue)
2. Cloud Storage: $600K (24% of revenue)
3. Security Tools: $400K (16% of revenue)

Recommendations:
- Increase marketing budget for AI Suite
- Expand European sales team
- Launch new features in Q2

Prepared by: John Smith
Date: March 31, 2024`,
      metadata: {
        pages: 8,
        author: 'John Smith',
        title: 'Q1 2024 Sales Report',
        subject: 'Sales Performance',
        keywords: ['sales', 'report', 'Q1', '2024', 'revenue'],
        dateCreated: '2024-04-01T10:30:00Z',
        dateModified: '2024-04-01T10:30:00Z',
        wordCount: 1250
      },
      path: '/Documents/Reports/Final/Q1_Sales_Report_Final.docx'
    },
    {
      id: 'doc_presentation_1',
      name: 'Q1_Sales_Presentation.pptx',
      size: 2097152, // 2MB
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      content: `Q1 2024 Sales Presentation

Slide 1: Title
Q1 2024 Sales Performance Review
Presented by: John Smith

Slide 2: Executive Summary
• 15% revenue increase vs Q4 2023
• $2.5M total revenue
• 150 new customers acquired
• 95% customer retention rate

Slide 3: Revenue Breakdown
• AI Suite: $1.5M (60%)
• Cloud Storage: $600K (24%)
• Security Tools: $400K (16%)

Slide 4: Regional Performance
• North America: $1.2M (20% growth)
• Europe: $800K (12% growth)
• Asia Pacific: $500K (18% growth)

Slide 5: Key Achievements
• Launched new AI features
• Expanded European market
• Improved customer satisfaction
• Increased team productivity

Slide 6: Q2 Goals
• 20% revenue growth target
• Launch new product line
• Expand to new markets
• Improve customer support

Slide 7: Questions & Discussion`,
      metadata: {
        slides: 7,
        author: 'John Smith',
        title: 'Q1 2024 Sales Presentation',
        subject: 'Sales Performance Review',
        keywords: ['sales', 'presentation', 'Q1', '2024', 'performance'],
        dateCreated: '2024-04-02T14:00:00Z',
        dateModified: '2024-04-02T14:00:00Z'
      },
      path: '/Documents/Presentations/Q1_Sales_Presentation.pptx'
    }
  ],

  // Video files for comparison testing
  videos: [
    {
      id: 'vid_meeting_1',
      name: 'Team_Meeting_Recording.mp4',
      size: 52428800, // 50MB
      type: 'video/mp4',
      content: generateVideoHash('team_meeting_original'),
      metadata: {
        duration: 1800, // 30 minutes
        resolution: '1920x1080',
        fps: 30,
        codec: 'H.264',
        bitrate: '2.5 Mbps',
        audioCodec: 'AAC',
        audioChannels: 2,
        dateCreated: '2024-03-15T10:00:00Z',
        dateModified: '2024-03-15T10:00:00Z'
      },
      path: '/Videos/Meetings/Team_Meeting_Recording.mp4'
    },
    {
      id: 'vid_meeting_2',
      name: 'Team_Meeting_Recording_Copy.mp4',
      size: 52428800, // Same size
      type: 'video/mp4',
      content: generateVideoHash('team_meeting_original'), // Same hash
      metadata: {
        duration: 1800, // 30 minutes
        resolution: '1920x1080',
        fps: 30,
        codec: 'H.264',
        bitrate: '2.5 Mbps',
        audioCodec: 'AAC',
        audioChannels: 2,
        dateCreated: '2024-03-20T15:30:00Z',
        dateModified: '2024-03-20T15:30:00Z'
      },
      path: '/Videos/Meetings/Backup/Team_Meeting_Recording_Copy.mp4'
    },
    {
      id: 'vid_compressed_1',
      name: 'Team_Meeting_Recording_Compressed.mp4',
      size: 26214400, // 25MB (compressed)
      type: 'video/mp4',
      content: generateVideoHash('team_meeting_compressed'), // Similar but different
      metadata: {
        duration: 1800, // 30 minutes
        resolution: '1280x720',
        fps: 30,
        codec: 'H.264',
        bitrate: '1.2 Mbps',
        audioCodec: 'AAC',
        audioChannels: 2,
        dateCreated: '2024-03-25T11:45:00Z',
        dateModified: '2024-03-25T11:45:00Z'
      },
      path: '/Videos/Meetings/Compressed/Team_Meeting_Recording_Compressed.mp4'
    },
    {
      id: 'vid_different_1',
      name: 'Product_Demo_Recording.mp4',
      size: 41943040, // 40MB
      type: 'video/mp4',
      content: generateVideoHash('product_demo_different'),
      metadata: {
        duration: 1200, // 20 minutes
        resolution: '1920x1080',
        fps: 30,
        codec: 'H.264',
        bitrate: '2.8 Mbps',
        audioCodec: 'AAC',
        audioChannels: 2,
        dateCreated: '2024-04-01T13:00:00Z',
        dateModified: '2024-04-01T13:00:00Z'
      },
      path: '/Videos/Demos/Product_Demo_Recording.mp4'
    }
  ]
};

// Helper functions to generate realistic hashes
function generateImageHash(content) {
  // Simulate perceptual hashing for images
  const hash = btoa(content).substring(0, 64);
  return hash;
}

function generateVideoHash(content) {
  // Simulate video frame hashing
  const hash = btoa(content + '_video').substring(0, 64);
  return hash;
}

// Expected test results for validation
export const expectedTestResults = {
  exactDuplicates: [
    {
      groupId: 'img_group_1',
      files: ['img_original_1', 'img_duplicate_1'],
      confidence: 1.0,
      type: 'exact',
      reason: 'Identical image content and metadata'
    },
    {
      groupId: 'doc_group_1',
      files: ['doc_report_1', 'doc_report_2'],
      confidence: 1.0,
      type: 'exact',
      reason: 'Identical document content'
    },
    {
      groupId: 'vid_group_1',
      files: ['vid_meeting_1', 'vid_meeting_2'],
      confidence: 1.0,
      type: 'exact',
      reason: 'Identical video content and metadata'
    }
  ],
  similarFiles: [
    {
      groupId: 'img_group_2',
      files: ['img_original_1', 'img_resized_1'],
      confidence: 0.85,
      type: 'similar',
      reason: 'Same image, different resolution'
    },
    {
      groupId: 'doc_group_2',
      files: ['doc_report_1', 'doc_presentation_1'],
      confidence: 0.65,
      type: 'similar',
      reason: 'Similar content about Q1 sales'
    },
    {
      groupId: 'vid_group_2',
      files: ['vid_meeting_1', 'vid_compressed_1'],
      confidence: 0.90,
      type: 'similar',
      reason: 'Same video, different compression'
    }
  ],
  uniqueFiles: [
    'img_different_1',
    'vid_different_1'
  ]
};

// Test scenarios for different AI detection methods
export const testScenarios = {
  visualSimilarity: {
    description: 'Test image similarity detection with various scenarios',
    files: realFileTestData.images,
    expectedGroups: [
      ['img_original_1', 'img_duplicate_1'], // Exact duplicates
      ['img_original_1', 'img_resized_1']    // Similar (resized)
    ],
    expectedUnique: ['img_different_1']
  },
  contentAnalysis: {
    description: 'Test document content analysis',
    files: realFileTestData.documents,
    expectedGroups: [
      ['doc_report_1', 'doc_report_2'],     // Exact duplicates
      ['doc_report_1', 'doc_presentation_1'] // Similar content
    ],
    expectedUnique: []
  },
  videoComparison: {
    description: 'Test video comparison with different qualities',
    files: realFileTestData.videos,
    expectedGroups: [
      ['vid_meeting_1', 'vid_meeting_2'],       // Exact duplicates
      ['vid_meeting_1', 'vid_compressed_1']     // Similar (compressed)
    ],
    expectedUnique: ['vid_different_1']
  },
  hybridDetection: {
    description: 'Test hybrid detection across all file types',
    files: [...realFileTestData.images, ...realFileTestData.documents, ...realFileTestData.videos],
    expectedGroups: [
      ['img_original_1', 'img_duplicate_1'],
      ['doc_report_1', 'doc_report_2'],
      ['vid_meeting_1', 'vid_meeting_2'],
      ['img_original_1', 'img_resized_1'],
      ['doc_report_1', 'doc_presentation_1'],
      ['vid_meeting_1', 'vid_compressed_1']
    ],
    expectedUnique: ['img_different_1', 'vid_different_1']
  }
}; 