document.querySelectorAll("[data-carousel]").forEach((carousel) => {
  const viewport = carousel.querySelector(".carousel-viewport");
  const previous = carousel.querySelector("[data-carousel-previous]");
  const next = carousel.querySelector("[data-carousel-next]");

  function getSlideStep() {
    const firstSlide = carousel.querySelector(".carousel-track img");
    const track = carousel.querySelector(".carousel-track");
    const gap = Number.parseFloat(getComputedStyle(track).gap) || 0;
    return firstSlide.offsetWidth + gap;
  }

  function scrollBySlide(direction) {
    viewport.scrollBy({
      behavior: "smooth",
      left: direction * getSlideStep()
    });
  }

  previous.addEventListener("click", () => scrollBySlide(-1));
  next.addEventListener("click", () => scrollBySlide(1));
});
