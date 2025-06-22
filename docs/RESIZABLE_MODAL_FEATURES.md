# Resizable "Select Folder for Comparison" Modal

## 🎯 Features Added

### 1. **Resizable Modal**
- **Drag Handle**: Bottom-right corner with visual indicator
- **Size Constraints**: Minimum 600x400px, Maximum 90% of viewport
- **Smooth Resizing**: Real-time size updates with visual feedback
- **Size Persistence**: Modal size saved to localStorage

### 2. **Draggable Modal**
- **Drag by Header**: Click and drag the header to move the modal
- **Viewport Constraints**: Modal stays within screen bounds
- **Visual Feedback**: Enhanced shadow during dragging
- **Smart Controls**: Header controls (reset, close) don't trigger dragging

### 3. **Enhanced Controls**
- **Reset Button**: ↺ button to reset both size and position
- **Improved Close Button**: Better hover effects and styling
- **Header Controls**: Organized button layout with proper spacing

### 4. **Responsive Design**
- **Mobile**: Fixed size, no resize/drag on small screens
- **Tablet**: Optimized for medium screens
- **Desktop**: Full resizable and draggable functionality
- **Dark Theme**: Automatic dark mode support

## 🎮 How to Use

### **Resizing**
1. Hover over the bottom-right corner
2. Click and drag the resize handle (⋮⋮ indicator)
3. Modal will resize in real-time
4. Release to set the new size

### **Dragging**
1. Click and drag anywhere on the header (except buttons)
2. Modal will follow your mouse
3. Release to set the new position
4. Modal automatically stays within screen bounds

### **Reset**
1. Click the ↺ button in the header
2. Modal returns to default size (1000x700px) and center position

## 🎨 Visual Features

### **Resize Handle**
- Bottom-right corner with diagonal gradient
- Hover effect with scale animation
- Clear visual indicator (⋮⋮)
- Proper cursor (nw-resize)

### **Header Styling**
- Hover effects for better UX
- Active state during dragging
- Organized control buttons
- Clear visual hierarchy

### **Responsive Behavior**
- **Desktop**: Full functionality
- **Tablet**: Limited to viewport bounds
- **Mobile**: Fixed size, no resize/drag

## 🔧 Technical Implementation

### **State Management**
```javascript
const [isResizing, setIsResizing] = useState(false);
const [isDragging, setIsDragging] = useState(false);
const [modalSize, setModalSize] = useState({ width: 1000, height: 700 });
const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
```

### **Event Handling**
- **Mouse Events**: Proper event listeners for drag and resize
- **Touch Events**: Disabled on mobile for better UX
- **Keyboard**: Respects user preferences

### **Persistence**
- **Size**: Saved to localStorage
- **Position**: Resets to center on page reload
- **State**: Maintains folder navigation state

## 📱 Responsive Breakpoints

### **Mobile (< 768px)**
- Fixed size: 95% width, 90% height
- No resize handle
- No drag functionality
- Optimized button sizes

### **Tablet (769px - 1024px)**
- Limited to 95% viewport
- Full resize and drag functionality
- Optimized for touch

### **Desktop (> 1024px)**
- Full functionality
- Maximum 1200x800px
- Enhanced visual effects

## 🎯 User Experience Improvements

### **Visual Feedback**
- Enhanced shadows during interactions
- Smooth transitions
- Clear hover states
- Proper cursor indicators

### **Accessibility**
- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- High contrast support

### **Performance**
- Efficient event handling
- Minimal re-renders
- Smooth animations
- Optimized for large file lists

## 🔄 Future Enhancements

1. **Position Persistence**: Save modal position to localStorage
2. **Keyboard Shortcuts**: Ctrl+R to reset, Esc to close
3. **Snap to Grid**: Optional grid snapping for precise positioning
4. **Multiple Monitors**: Better support for multi-monitor setups
5. **Touch Gestures**: Pinch-to-resize on touch devices

## 🛠️ Usage Examples

```javascript
// The modal automatically handles:
// - Resizing with mouse drag
// - Dragging by header
// - Size and position constraints
// - Responsive behavior
// - State persistence

// No additional code needed - just use the existing component
<FolderSelector 
  onFetchFolderFiles={fetchFolderFiles}
  onFolderSelect={handleFolderSelect}
  onClose={handleClose}
/>
```

The resizable modal provides a much better user experience for folder selection, especially when working with large folder structures or when users need to compare multiple folders side by side. 