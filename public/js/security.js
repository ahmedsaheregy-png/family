/**
 * Security Shield and Anti-Piracy scripts
 * Family archive web portal
 */

(function () {
  'use strict';

  // 1. Disable context menu (right click) globally
  document.addEventListener('contextmenu', function (e) {
    // Check if right click was on a form input, if so, allow it
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      return;
    }
    e.preventDefault();
  }, false);

  // 2. Keyboard lockout for inspector and save shortcuts
  document.addEventListener('keydown', function (e) {
    // Disable F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }

    // Disable Ctrl+Shift+I (Inspect Element)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
      e.preventDefault();
      return false;
    }

    // Disable Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
      e.preventDefault();
      return false;
    }

    // Disable Ctrl+U (View Source)
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
      e.preventDefault();
      return false;
    }

    // Disable Ctrl+S (Save Page)
    if (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
      e.preventDefault();
      return false;
    }

    // Disable Ctrl+P (Print Page)
    if (e.ctrlKey && (e.key === 'P' || e.key === 'p' || e.keyCode === 80)) {
      e.preventDefault();
      return false;
    }
  }, false);

  // 3. DevTools Detection & Debugger Loop
  // Simple check that triggers a debugger statement to slow down inspect tools
  setInterval(function() {
    const startTime = performance.now();
    debugger;
    const endTime = performance.now();
    if (endTime - startTime > 100) {
      // DevTools was probably open and hit the debugger statement
      console.warn('Security alert: Inspect tools detected.');
    }
  }, 1000);

  // 4. Dynamic Watermark Overlay to discourage screen recording
  document.addEventListener('DOMContentLoaded', function () {
    const watermark = document.createElement('div');
    watermark.id = 'security-watermark';
    
    // We display a solemn reminder + confidentiality warnings
    const today = new Date().toLocaleDateString('ar-EG');
    watermark.innerHTML = `محمي برمجياً • سري للغاية • غير قابل للنشر • ${today}`;
    
    document.body.appendChild(watermark);
    
    // Position watermark randomly every few seconds
    function moveWatermark() {
      const xMax = window.innerWidth - watermark.offsetWidth - 20;
      const yMax = window.innerHeight - watermark.offsetHeight - 20;
      
      const xRand = Math.max(10, Math.floor(Math.random() * xMax));
      const yRand = Math.max(10, Math.floor(Math.random() * yMax));
      
      watermark.style.transition = 'top 1.5s ease-in-out, left 1.5s ease-in-out, opacity 1s';
      watermark.style.opacity = '0';
      
      setTimeout(() => {
        watermark.style.left = `${xRand}px`;
        watermark.style.top = `${yRand}px`;
        watermark.style.opacity = (Math.random() * 0.08 + 0.06).toString(); // Keep opacity low and varying (6% to 14%)
      }, 1000);
    }
    
    // Initialize watermark styling
    watermark.style.position = 'fixed';
    watermark.style.pointerEvents = 'none';
    watermark.style.zIndex = '999999';
    watermark.style.color = '#ffffff';
    watermark.style.fontSize = '12px';
    watermark.style.letterSpacing = '1px';
    watermark.style.textShadow = '1px 1px 2px #000000, -1px -1px 2px #000000';
    watermark.style.opacity = '0.1';
    
    // Initial movement
    setTimeout(() => {
      moveWatermark();
      setInterval(moveWatermark, 10000); // Move every 10 seconds
    }, 500);

    // 5. Blur page if window loses focus
    window.addEventListener('blur', function () {
      document.body.style.filter = 'blur(15px)';
      document.body.style.transition = 'filter 0.3s ease';
    });

    window.addEventListener('focus', function () {
      document.body.style.filter = 'none';
    });
  });
})();
