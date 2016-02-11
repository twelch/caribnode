function rotateBanners(elem) {
  var active = $(elem+" .slide.active");
  var next = active.next();
  if (next.length == 0) 
    next = $(elem+" .slide:first");
  active.removeClass("active").fadeOut(400);
  next.addClass("active").delay(500).fadeIn(400);
}

function prepareRotator(elem) {
  $(elem+" .slide").fadeOut(0);
  $(elem+" .slide:first").fadeIn(0).addClass("active");
}

function startRotator(elem) {
  prepareRotator(elem);
  setInterval("rotateBanners('"+elem+"')", 10000);
}