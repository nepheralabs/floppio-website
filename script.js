// FLOPPIO - Coming Soon Interactions

document.addEventListener("DOMContentLoaded", () => {
  const insertButton = document.getElementById("insert-button");
  const resetButton = document.getElementById("reset-button");
  const diskScene = document.getElementById("disk-scene");
  const driveMessage = document.getElementById("drive-message");
  const bootResult = document.getElementById("boot-result");
  const loadingLabel = document.getElementById("loading-label");
  const progressFill = document.getElementById("progress-fill");
  const progressTrack = document.querySelector(".progress-track");
  const year = document.getElementById("copyright-year");

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  let running = false;
  let scheduledTimers = [];

  // Update copyright year automatically
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    scheduledTimers.push(timer);
  }

  function clearTimers() {
    scheduledTimers.forEach(window.clearTimeout);
    scheduledTimers = [];
  }

  function setProgress(percent) {
    progressFill.style.width = `${percent}%`;
    progressTrack.setAttribute("aria-valuenow", String(percent));
  }

  function playDiskAnimation() {
    if (running) return;

    running = true;
    clearTimers();

    insertButton.disabled = true;
    bootResult.hidden = true;

    driveMessage.textContent = "Reading disk...";
    loadingLabel.textContent = "BOOTING FLOPPIO";
    setProgress(45);

    diskScene.classList.remove("inserting");

    // Restart the animation if the visitor tries again
    void diskScene.offsetWidth;

    if (!reducedMotion.matches) {
      diskScene.classList.add("inserting");
    }

    const loadingDelay = reducedMotion.matches ? 0 : 700;
    const resultDelay = reducedMotion.matches ? 100 : 1700;

    schedule(() => {
      driveMessage.textContent = "Checking daily trivia files...";
      loadingLabel.textContent = "CHECKING DISK...";
      setProgress(85);
    }, loadingDelay);

    schedule(() => {
      driveMessage.textContent = "Drive not ready. Check back soon.";
      loadingLabel.textContent = "COMING SOON";
      setProgress(100);

      bootResult.hidden = false;
      insertButton.disabled = false;
      insertButton.querySelector("span").textContent = "INSERT DISK";

      running = false;
    }, resultDelay);
  }

  function resetDisk() {
    clearTimers();
    running = false;

    diskScene.classList.remove("inserting");
    bootResult.hidden = true;

    insertButton.disabled = false;
    driveMessage.textContent = "Drive not ready. Check back soon.";
    loadingLabel.textContent = "SOMETHING AWESOME...";

    setProgress(25);

    insertButton.focus();
  }

  insertButton.addEventListener("click", playDiskAnimation);
  resetButton.addEventListener("click", resetDisk);
});

