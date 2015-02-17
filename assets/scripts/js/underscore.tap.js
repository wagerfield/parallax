//============================================================
//
// Tap Utility Class
//
// @author Matthew Wagerfield @mwagerfield
// @description When tapped, adds a tap class to an element,
//              removing it x milliseconds later.
// @version 1.00
//
//============================================================

_ = _ || {};

_.tap = function($elements, selection, wait) {

  wait = wait || 400;

  if (!!selection) {

    $elements.on('tap', selection, function(event) {
      var $target = $(event.currentTarget);
      var debounce = $target.data('debounce');
      if (!debounce) {
        debounce = _.debounce(function($element) {
          $element.removeClass('tap');
        }, wait);
        $target.data('debounce', debounce);
      }
      $target.addClass('tap');
      debounce($target);
    });

  } else {

    $elements.each(function(index, element) {
      var debounce = _.debounce(function($element) {
        $element.removeClass('tap');
      }, wait);
      $(element).on('tap', function(event) {
        var $target = $(event.currentTarget);
        $target.addClass('tap');
        debounce($target);
      });
    });
  }
};
