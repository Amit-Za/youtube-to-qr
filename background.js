/**
 * YouTube QR Code Generator - Background Script
 * Handles keyboard shortcuts and QR code generation
 */

// Initialize extension
console.log('[YT QR] Background script loaded');

/**
 * Handles keyboard shortcut commands
 * @param {string} command - The command received from the keyboard shortcut
 */
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'generate-qr') return;
  
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.url) {
      console.error('[YT QR] No active tab found');
      return;
    }

    // Check if we're on YouTube
    if (!tab.url.includes('youtube.com')) {
      console.log('[YT QR] Not on YouTube, ignoring command');
      return;
    }

    // Execute script to get video info
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getVideoInfo
    });

    // Show QR code in new tab
    if (result?.result) {
      const { videoUrl } = result.result;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(videoUrl)}`;
      
      // Create new tab with direct QR code URL
      chrome.tabs.create({
        url: qrCodeUrl,
        active: true
      });
      
      console.log('[YT QR] QR code opened in new tab');
    } else {
      console.error('[YT QR] Failed to generate QR code');
    }
  } catch (error) {
    console.error('[YT QR] Error:', error);
  }
});

/**
 * Gets video information and generates QR code URL
 * @returns {Object|null} Object containing videoUrl, qrCodeUrl, and currentTime
 */
function getVideoInfo() {
  try {
    // Get video element and ID
    const video = document.querySelector('video');
    if (!video) {
      console.error('[YT QR] No video element found');
      return null;
    }
    
    const videoId = new URLSearchParams(window.location.search).get('v');
    if (!videoId) {
      console.error('[YT QR] No video ID found');
      return null;
    }
    
    // Get current timestamp
    const currentTime = Math.floor(video.currentTime);
    
    // Generate video URL
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}&t=${currentTime}s`;
    
    console.log('[YT QR] Generated URL for timestamp:', currentTime);
    return { videoUrl };
  } catch (error) {
    console.error('[YT QR] Error in getVideoInfo:', error);
    return null;
  }
}

function handleVideoInfo(videoInfo) {
  if (!videoInfo || !videoInfo.videoId) {
    console.error('Invalid video info:', videoInfo);
    return;
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoInfo.videoId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(videoUrl)}`;

  // Send the QR code to the popup
  chrome.runtime.sendMessage({
    type: 'SHOW_QR_CODE',
    qrCodeUrl: qrCodeUrl
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_VIDEO_INFO') {
    getVideoInfo()
      .then(handleVideoInfo)
      .catch(error => {
        console.error('Error getting video info:', error);
      });
  }
});

// Add a message listener for debugging
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  if (message.type === 'debug') {
    console.log('Debug message:', message.data);
  }
}); 