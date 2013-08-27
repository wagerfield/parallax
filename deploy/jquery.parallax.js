//============================================================
//
// The MIT License
//
// Copyright (C) 2013 Matthew Wagerfield - @mwagerfield
//
// Permission is hereby granted, free of charge, to any
// person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the
// Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute,
// sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do
// so, subject to the following conditions:
//
// The above copyright notice and this permission notice
// shall be included in all copies or substantial portions
// of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY
// OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
// LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
// EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
// FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN
// AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
// OR OTHER DEALINGS IN THE SOFTWARE.
//
//============================================================

/**
 * jQuery/Zepto Parallax Plugin
 * @author Matthew Wagerfield - @mwagerfield
 * @description Creates a parallax effect between an array of layers,
 *              driving the motion from the gyroscope output of a smartdevice.
 *              If no gyroscope is available, the cursor position is used.
 */
;(function($, window, document, undefined) {

  var NAME = 'parallax';
  var MAGIC_NUMBER = 30;
  var DEFAULTS = {
    calibrationThreshold: 100,
    calibrationDelay: 500,
    calibrateX: false,
    calibrateY: true,
    invertX: true,
    invertY: true,
    limitX: false,
    limitY: false,
    scalarX: 10.0,
    scalarY: 10.0,
    frictionX: 0.1,
    frictionY: 0.1
  };

  function Plugin(element, options) {

    // DOM Context
    this.element = element;

    // Selections
    this.$context = $(element).data('api', this);
    this.$layers = this.$context.find('.layer');

    // Data Extraction
    var data = {
      calibrateX: this.$context.data('calibrate-x') || null,
      calibrateY: this.$context.data('calibrate-y') || null,
      invertX: this.$context.data('invert-x') || null,
      invertY: this.$context.data('invert-y') || null,
      limitX: parseFloat(this.$context.data('limit-x')) || null,
      limitY: parseFloat(this.$context.data('limit-y')) || null,
      scalarX: parseFloat(this.$context.data('scalar-x')) || null,
      scalarY: parseFloat(this.$context.data('scalar-y')) || null,
      frictionX: parseFloat(this.$context.data('friction-x')) || null,
      frictionY: parseFloat(this.$context.data('friction-y')) || null
    };

    // Delete Null Data Values
    for (var key in data) {
      if (data[key] === null) delete data[key];
    }

    // Compose Settings Object
    $.extend(this, DEFAULTS, options, data);

    // States
    this.calibrationTimer = null;
    this.calibrationFlag = true;
    this.enabled = false;
    this.depths = [];
    this.raf = null;

    // Offset
    this.ox = 0;
    this.oy = 0;
    this.ow = 0;
    this.oh = 0;

    // Calibration
    this.cx = 0;
    this.cy = 0;

    // Input
    this.ix = 0;
    this.iy = 0;

    // Motion
    this.mx = 0;
    this.my = 0;

    // Velocity
    this.vx = 0;
    this.vy = 0;

    // Initialise
    this.initialise();
  }

  Plugin.prototype.transformSupport = function(value) {
    var element = document.createElement('div');
    var id = 'crash-test-dummy';
    var propertySupport = false;
    var featureSupport = false;
    element.id = id;
    for (var i = 0, l = this.vendors.length; i < l; i++) {
      var vendorPrefix = this.vendors[i];
      var vendorProperty = vendorPrefix === null ? 'transform' : $.camelCase(vendorPrefix+'-transform');
      if (element.style[vendorProperty] !== undefined) {
        propertySupport = true;
        break;
      }
    }
    switch(value) {
      case '2D':
        featureSupport = propertySupport;
        break;
      case '3D':
        if (propertySupport) {
          // Testing technique taken from Modernizr
          // @see http://modernizr.com/
          var css = '@media (transform-3d),(-webkit-transform-3d){#'+id+'{left:9px;position:absolute;height:3px;}}';
          var style = document.createElement('style');
          style.type = 'text/css';
          if (style.styleSheet){
            style.styleSheet.cssText = css;
          } else {
            style.appendChild(document.createTextNode(css));
          }
          document.head.appendChild(style);
          document.body.appendChild(element);
          featureSupport = element.offsetLeft === 9 && element.offsetHeight === 3;
          document.head.removeChild(style);
          document.body.removeChild(element);
        }
        break;
    }
    return featureSupport;
  };

  Plugin.prototype.ww = null;
  Plugin.prototype.wh = null;
  Plugin.prototype.hw = null;
  Plugin.prototype.hh = null;
  Plugin.prototype.portrait = null;
  Plugin.prototype.desktop = !navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/);
  Plugin.prototype.vendors = ['O','ms','Moz','webkit',null];
  Plugin.prototype.motionSupport = window.DeviceMotionEvent !== undefined;
  Plugin.prototype.orientationSupport = window.DeviceOrientationEvent !== undefined;
  Plugin.prototype.transform2DSupport = Plugin.prototype.transformSupport('2D');
  Plugin.prototype.transform3DSupport = Plugin.prototype.transformSupport('3D');

  Plugin.prototype.initialise = function() {

    // Configure Styles
    if (this.$context.css('position') === 'static') {
      this.$context.css({
        position:'relative'
      });
    }
    this.$layers.css({
      position:'absolute',
      display:'block',
      height:'100%',
      width:'100%',
      left: 0,
      top: 0
    });
    this.$layers.first().css({
      position:'relative'
    });

    // Cache Depths
    this.$layers.each($.proxy(function(index, element) {
      this.depths.push($(element).data('depth') || 0);
    }, this));

    // Hardware Accelerate Elements
    this.accelerate(this.$context);
    this.accelerate(this.$layers);

    // Setup
    this.updateDimensions();
    this.enable();
    this.queueCalibration(this.calibrationDelay);
  };

  Plugin.prototype.updateDimensions = function() {

    // Cache Context Dimensions
    this.ox = this.$context.offset().left;
    this.oy = this.$context.offset().top;
    this.ow = this.$context.width();
    this.oh = this.$context.height();

    // Cache Window Dimensions
    this.ww = window.innerWidth;
    this.wh = window.innerHeight;
    this.hw = this.ww / 2;
    this.hh = this.wh / 2;
  };

  Plugin.prototype.queueCalibration = function(delay) {
    clearTimeout(this.calibrationTimer);
    this.calibrationTimer = setTimeout($.proxy(function(){
      this.calibrationFlag = true;
    },this),delay);
  };

  Plugin.prototype.enable = function() {
    if (!this.enabled) {
      this.enabled = true;
      if (this.orientationSupport) {
        this.portrait = null;
        this.onDeviceOrientationProxy = $.proxy(this.onDeviceOrientation, this);
        window.addEventListener('deviceorientation', this.onDeviceOrientationProxy);
      } else {
        this.cx = 0;
        this.cy = 0;
        this.portrait = false;
        this.onMouseMoveProxy = $.proxy(this.onMouseMove, this);
        window.addEventListener('mousemove', this.onMouseMoveProxy);
      }
      this.onWindowResizeProxy = $.proxy(this.onWindowResize, this);
      window.addEventListener('resize', this.onWindowResizeProxy);
      this.raf = requestAnimationFrame($.proxy(this.onAnimationFrame, this));
    }
  };

  Plugin.prototype.disable = function() {
    if (this.enabled) {
      this.enabled = false;
      if (this.orientationSupport) {
        window.removeEventListener('deviceorientation', this.onDeviceOrientationProxy);
      } else {
        window.removeEventListener('mousemove', this.onMouseMoveProxy);
      }
      window.removeEventListener('resize', this.onWindowResizeProxy);
      cancelAnimationFrame(this.raf);
    }
  };

  Plugin.prototype.calibrate = function(x, y) {
    this.calibrateX = x === undefined ? this.calibrateX : x;
    this.calibrateY = y === undefined ? this.calibrateY : y;
  };

  Plugin.prototype.invert = function(x, y) {
    this.invertX = x === undefined ? this.invertX : x;
    this.invertY = y === undefined ? this.invertY : y;
  };

  Plugin.prototype.friction = function(x, y) {
    this.frictionX = x === undefined ? this.frictionX : x;
    this.frictionY = y === undefined ? this.frictionY : y;
  };

  Plugin.prototype.scalar = function(x, y) {
    this.scalarX = x === undefined ? this.scalarX : x;
    this.scalarY = y === undefined ? this.scalarY : y;
  };

  Plugin.prototype.limit = function(x, y) {
    this.limitX = x === undefined ? this.limitX : x;
    this.limitY = y === undefined ? this.limitY : y;
  };

  Plugin.prototype.clamp = function(value, min, max) {
    value = Math.max(value, min);
    value = Math.min(value, max);
    return value;
  };

  Plugin.prototype.css = function(element, property, value) {
    for (var i = 0, l = this.vendors.length; i < l; i++) {
      var vendorPrefix = this.vendors[i];
      var vendorProperty = vendorPrefix === null ? property : $.camelCase(vendorPrefix+'-'+property);
      element.style[vendorProperty] = value;
    }
  };

  Plugin.prototype.accelerate = function($element) {
    $element.each($.proxy(function(index, element) {
      this.css(element, 'transform', 'translate3d(0,0,0)');
      this.css(element, 'transform-style', 'preserve-3d');
      this.css(element, 'backface-visibility', 'hidden');
    }, this));
  };

  Plugin.prototype.setPosition = function(element, x, y) {
    x += '%';
    y += '%';
    if (this.transform3DSupport) {
      this.css(element, 'transform', 'translate3d('+x+','+y+',0)');
    } else if (this.transform2DSupport) {
      this.css(element, 'transform', 'translate('+x+','+y+')');
    } else {
      element.style.left = x;
      element.style.top = y;
    }
  };

  Plugin.prototype.onWindowResize = function(event) {
    this.updateDimensions();
  };

  Plugin.prototype.onAnimationFrame = function() {
    var dx = this.ix - this.cx;
    var dy = this.iy - this.cy;
    if ((Math.abs(dx) > this.calibrationThreshold) || (Math.abs(dy) > this.calibrationThreshold)) {
      this.queueCalibration(0);
    }
    if (this.portrait) {
      this.mx = (this.calibrateX ? dy : this.iy) * this.scalarX;
      this.my = (this.calibrateY ? dx : this.ix) * this.scalarY;
    } else {
      this.mx = (this.calibrateX ? dx : this.ix) * this.scalarX;
      this.my = (this.calibrateY ? dy : this.iy) * this.scalarY;
    }
    if (!isNaN(parseFloat(this.limitX))) {
      this.mx = this.clamp(this.mx, -this.limitX, this.limitX);
    }
    if (!isNaN(parseFloat(this.limitY))) {
      this.my = this.clamp(this.my, -this.limitY, this.limitY);
    }
    this.vx += (this.mx - this.vx) * this.frictionX;
    this.vy += (this.my - this.vy) * this.frictionY;
    this.$layers.each($.proxy(function(index, element) {
      var depth = this.depths[index];
      var xOffset = this.vx * depth * (this.invertX ? -1 : 1);
      var yOffset = this.vy * depth * (this.invertY ? -1 : 1);
      this.setPosition(element, xOffset, yOffset);
    }, this));
    this.raf = requestAnimationFrame($.proxy(this.onAnimationFrame, this));
  };

  Plugin.prototype.onDeviceOrientation = function(event) {

    // Update Orientation Support Flag
    if (this.desktop || event.beta === null || event.gamma === null) {
      this.disable();
      this.orientationSupport = false;
      this.enable();
      return false;
    }

    // Extract Rotation
    var x = (event.beta  || 0) / MAGIC_NUMBER; //  -90 :: 90
    var y = (event.gamma || 0) / MAGIC_NUMBER; // -180 :: 180

    // Detect Orientation Change
    var portrait = window.innerHeight > window.innerWidth;
    if (this.portrait !== portrait) {
      this.portrait = portrait;
      this.calibrationFlag = true;
    }

    // Set Calibration
    if (this.calibrationFlag) {
      this.calibrationFlag = false;
      this.cx = x;
      this.cy = y;
    }

    // Set Input
    this.ix = x;
    this.iy = y;
  };

  Plugin.prototype.onMouseMove = function(event) {

    // Calculate Input
    this.ix = (event.pageX - this.hw) / this.hw;
    this.iy = (event.pageY - this.hh) / this.hh;
  };

  var API = {
    enable: Plugin.prototype.enable,
    disable: Plugin.prototype.disable,
    calibrate: Plugin.prototype.calibrate,
    friction: Plugin.prototype.friction,
    invert: Plugin.prototype.invert,
    scalar: Plugin.prototype.scalar,
    limit: Plugin.prototype.limit
  };

  $.fn[NAME] = function (value) {
    var args = arguments;
    return this.each(function () {
      var $this = $(this);
      var plugin = $this.data(NAME);
      if (!plugin) {
        plugin = new Plugin(this, value);
        $this.data(NAME, plugin);
      }
      if (API[value]) {
        plugin[value].apply(plugin, Array.prototype.slice.call(args, 1));
      }
    });
  };

})(window.jQuery || window.Zepto, window, document);

/**
 * Request Animation Frame Polyfill.
 * @author Tino Zijdel
 * @author Paul Irish
 * @see https://gist.github.com/paulirish/1579671
 */
;(function() {

  var lastTime = 0;
  var vendors = ['ms', 'moz', 'webkit', 'o'];

  for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback, element) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function() { callback(currTime + timeToCall); },
        timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
  }

}());
