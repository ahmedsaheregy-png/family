/**
 * General UI interactions
 */

document.addEventListener('DOMContentLoaded', function () {
  // Auto fade out alerts after 5 seconds
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(function (alert) {
    setTimeout(function () {
      alert.style.opacity = '0';
      alert.style.transition = 'opacity 0.8s ease-in-out';
      setTimeout(function () {
        alert.remove();
      }, 850);
    }, 5000);
  });
});
