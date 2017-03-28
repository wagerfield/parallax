//============================================================
//
// The MIT License
//
// Copyright (C) 2014 Matthew Wagerfield - @wagerfield
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
 * Parallax.js
 * @author Matthew Wagerfield - @wagerfield
 * @description Creates a parallax effect between an array of layers,
 *              driving the motion from the gyroscope output of a smartdevice.
 *              If no gyroscope is available, the cursor position is used.
 */
;(function(window, document, undefined) {

  // Strict Mode
  'use strict';

  // Constants
  var NAME = 'Parallax';
  var MAGIC_NUMBER = 30;
  var DEFAULTS = {
    relativeInput: false,
    clipRelativeInput: false,
    calibrationThreshold: 100,
    calibrationDelay: 500,
    supportDelay: 500,
    calibrateX: false,
    calibrateY: true,
    invertX: true,
    invertY: true,
    limitX: false,
    limitY: false,
    scalarX: 10.0,
    scalarY: 10.0,
    frictionX: 0.1,
    frictionY: 0.1,
    originX: 0.5,
    originY: 0.5,
    pointerEvents: true,
    precision: 1
  };

  function Parallax(element, options) {

    // DOM Context
    this.element = element;
    this.layers = element.getElementsByClassName('layer');

    // Data Extraction
    var data = {
      calibrateX: this.data(this.element, 'calibrate-x'),
      calibrateY: this.data(this.element, 'calibrate-y'),
      invertX: this.data(this.element, 'invert-x'),
      invertY: this.data(this.element, 'invert-y'),
      limitX: this.data(this.element, 'limit-x'),
      limitY: this.data(this.element, 'limit-y'),
      scalarX: this.data(this.element, 'scalar-x'),
      scalarY: this.data(this.element, 'scalar-y'),
      frictionX: this.data(this.element, 'friction-x'),
      frictionY: this.data(this.element, 'friction-y'),
      originX: this.data(this.element, 'origin-x'),
      originY: this.data(this.element, 'origin-y'),
      pointerEvents: this.data(this.element, 'pointer-events'),
      precision: this.data(this.element, 'precision')
    };

    // Delete Null Data Values
    for (var key in data) {
      if (data[key] === null) delete data[key];
    }

    // Compose Settings Object
    this.extend(this, DEFAULTS, options, data);
    var PARAMETERS={
    State:{
      calibrationTimer : null,
      calibrationFlag : true,
      enabled : false,
      depthsX : [],
      depthsY : [],
      raf : null
    },
    Bound:{ bounds : null, x : 0, y : 0, w : 0, h : 0 },
    Center:{ x : 0, y : 0 },
    Range:{ x : 0, y : 0 },
    Calibration:{ x : 0, y : 0 },
    Input:{ x : 0, y : 0 },
    Motion:{ x : 0, y : 0 },
    Velocity: { x : 0, y : 0 }
  };    

    // Callbacks
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onDeviceOrientation = this.onDeviceOrientation.bind(this);
    this.onOrientationTimer = this.onOrientationTimer.bind(this);
    this.onCalibrationTimer = this.onCalibrationTimer.bind(this);
    this.onAnimationFrame = this.onAnimationFrame.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);

    // Initialise
    this.initialise();
  }

  Parallax.prototype.extend = function() {
    if (arguments.length > 1) {
      var master = arguments[0];
      for (var i = 1, l = arguments.length; i < l; i++) {
        var object = arguments[i];
        for (var key in object) {
          master[key] = object[key];
        }
      }
    }
  };

  Parallax.prototype.data = function(element, name) {
    return this.deserialize(element.getAttribute('data-'+name));
  };

  Parallax.prototype.deserialize = function(value) {
    if (value === 'true') {
      return true;
    } else if (value === 'false') {
      return false;
    } else if (value === 'null') {
      return null;
    } else if (!isNaN(parseFloat(value)) && isFinite(value)) {
      return parseFloat(value);
    } else {
      return value;
    }
  };

  Parallax.prototype.camelCase = function(value) {
    return value.replace(/-+(.)?/g, function(match, character){
      return character ? character.toUpperCase() : '';
    });
  };

  Parallax.prototype.transformSupport = function(value) {
    var element = document.createElement('div');
    var propertySupport = false;
    var propertyValue = null;
    var featureSupport = false;
    var cssProperty = null;
    var jsProperty = null;
    for (var i = 0, l = this.vendors.length; i < l; i++) {
      if (this.vendors[i] !== null) {
        cssProperty = this.vendors[i][0] + 'transform';
        jsProperty = this.vendors[i][1] + 'Transform';
      } else {
        cssProperty = 'transform';
        jsProperty = 'transform';
      }
      if (element.style[jsProperty] !== undefined) {
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
          var body = document.body || document.createElement('body');
          var documentElement = document.documentElement;
          var documentOverflow = documentElement.style.overflow;
          var isCreatedBody = false;
          if (!document.body) {
            isCreatedBody = true;
            documentElement.style.overflow = 'hidden';
            documentElement.appendChild(body);
            body.style.overflow = 'hidden';
            body.style.background = '';
          }
          body.appendChild(element);
          element.style[jsProperty] = 'translate3d(1px,1px,1px)';
          propertyValue = window.getComputedStyle(element).getPropertyValue(cssProperty);
          featureSupport = propertyValue !== undefined && propertyValue.length > 0 && propertyValue !== 'none';
          documentElement.style.overflow = documentOverflow;
          body.removeChild(element);
          if ( isCreatedBody ) {
            body.removeAttribute('style');
            body.parentNode.removeChild(body);
          }
        }
        break;
    }
    return featureSupport;
  };

  Parallax.prototype.ww = null;
  Parallax.prototype.wh = null;
  Parallax.prototype.wcx = null;
  Parallax.prototype.wcy = null;
  Parallax.prototype.wrx = null;
  Parallax.prototype.wry = null;
  Parallax.prototype.portrait = null;
  Parallax.prototype.desktop = !navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|BB10|mobi|tablet|opera mini|nexus 7)/i);
  Parallax.prototype.vendors = [null,['-webkit-','webkit'],['-moz-','Moz'],['-o-','O'],['-ms-','ms']];
  Parallax.prototype.motionSupport = !!window.DeviceMotionEvent;
  Parallax.prototype.orientationSupport = !!window.DeviceOrientationEvent;
  Parallax.prototype.orientationStatus = 0;
  Parallax.prototype.motionStatus = 0;
  Parallax.prototype.propertyCache = {};

  Parallax.prototype.initialise = function() {

    if (Parallax.prototype.transform2DSupport === undefined) {
      Parallax.prototype.transform2DSupport = Parallax.prototype.transformSupport('2D');
      Parallax.prototype.transform3DSupport = Parallax.prototype.transformSupport('3D');
    }

    // Configure Context Styles
    if (this.transform3DSupport) this.accelerate(this.element);
    var style = window.getComputedStyle(this.element);
    if (style.getPropertyValue('position') === 'static') {
      this.element.style.position = 'relative';
    }

    // Pointer events
    if(!this.pointerEvents){
      this.element.style.pointerEvents = 'none';
    }

    // Setup
    this.updateLayers();
    this.updateDimensions();
    this.enable();
    this.queueCalibration(PARAMETERS.State.calibrationDelay);
  };

  Parallax.prototype.updateLayers = function() {

    // Cache Layer Elements
    this.layers = this.element.getElementsByClassName('layer');
    PARAMETERS.State.depthsX = [];
    PARAMETERS.State.depthsY = [];

    // Configure Layer Styles
    for (var i = 0, l = this.layers.length; i < l; i++) {
      var layer = this.layers[i];
      if (this.transform3DSupport) this.accelerate(layer);
      layer.style.position = i ? 'absolute' : 'relative';
      layer.style.display = 'block';
      layer.style.left = 0;
      layer.style.top = 0;

      // Cache Layer Depth
      //Graceful fallback on depth if depth-x or depth-y is absent
      var depth = this.data(layer, 'depth') || 0;
      PARAMETERS.State.depthsX.push(this.data(layer, 'depth-x') || depth);
      PARAMETERS.State.depthsY.push(this.data(layer, 'depth-y') || depth);
    }
  };

  Parallax.prototype.updateDimensions = function() {
    this.ww = window.innerWidth;
    this.wh = window.innerHeight;
    this.wcx = this.ww * this.originX;
    this.wcy = this.wh * this.originY;
    this.wrx = Math.max(this.wcx, this.ww - this.wcx);
    this.wry = Math.max(this.wcy, this.wh - this.wcy);
  };

  Parallax.prototype.updateBounds = function() {
    PARAMETERS.Bound.bounds = this.element.getBoundingClientRect();
    PARAMETERS.Bound.x = PARAMETERS.Bound.bounds.left;
    PARAMETERS.Bound.y = PARAMETERS.Bound.bounds.top;
    PARAMETERS.Bound.w = PARAMETERS.Bound.bounds.width;
    PARAMETERS.Bound.h = PARAMETERS.Bound.bounds.height;
    PARAMETERS.Center.x = PARAMETERS.Bound.w * this.originX;
    PARAMETERS.Center.y = PARAMETERS.Bound.h * this.originY;
    PARAMETERS.Range.x = Math.max(PARAMETERS.Center.x, PARAMETERS.Bound.w - PARAMETERS.Center.x);
    PARAMETERS.Range.y = Math.max(PARAMETERS.Center.y, PARAMETERS.Bound.h - PARAMETERS.Center.y);
  };

  Parallax.prototype.queueCalibration = function(delay) {
    clearTimeout(PARAMETERS.State.calibrationTimer);
    PARAMETERS.State.calibrationTimer = setTimeout(this.onCalibrationTimer, delay);
  };

  Parallax.prototype.enable = function() {
    if (!PARAMETERS.State.enabled) {
      PARAMETERS.State.enabled = true;
      if (!this.desktop && this.orientationSupport) {
        this.portrait = null;
        window.addEventListener('deviceorientation', this.onDeviceOrientation);
        setTimeout(this.onOrientationTimer, this.supportDelay);
      }
      else if (!this.desktop && this.motionSupport) {
        this.portrait = null;
        window.addEventListener('devicemotion', this.onDeviceMotion);
        setTimeout(this.onMotionTimer, this.supportDelay);
      }
      else {
        PARAMETERS.Calibration.x = 0;
        PARAMETERS.Calibration.y = 0;
        this.portrait = false;
        window.addEventListener('mousemove', this.onMouseMove);
      }
      window.addEventListener('resize', this.onWindowResize);
      PARAMETERS.State.raf = requestAnimationFrame(this.onAnimationFrame);
    }
  };

  Parallax.prototype.disable = function() {
    if (PARAMETERS.State.enabled) {
      PARAMETERS.State.enabled = false;
      if (this.orientationSupport) {
        window.removeEventListener('deviceorientation', this.onDeviceOrientation);
      }
      else if (this.motionSupport) {
        window.removeEventListener('devicemotion', this.onDeviceMotion);
      }
      else {
        window.removeEventListener('mousemove', this.onMouseMove);
      }
      window.removeEventListener('resize', this.onWindowResize);
      cancelAnimationFrame(PARAMETERS.State.raf);
    }
  };

  Parallax.prototype.calibrate = function(x, y) {
    this.calibrateX = x === undefined ? this.calibrateX : x;
    this.calibrateY = y === undefined ? this.calibrateY : y;
  };

  Parallax.prototype.invert = function(x, y) {
    this.invertX = x === undefined ? this.invertX : x;
    this.invertY = y === undefined ? this.invertY : y;
  };

  Parallax.prototype.friction = function(x, y) {
    this.frictionX = x === undefined ? this.frictionX : x;
    this.frictionY = y === undefined ? this.frictionY : y;
  };

  Parallax.prototype.scalar = function(x, y) {
    this.scalarX = x === undefined ? this.scalarX : x;
    this.scalarY = y === undefined ? this.scalarY : y;
  };

  Parallax.prototype.limit = function(x, y) {
    this.limitX = x === undefined ? this.limitX : x;
    this.limitY = y === undefined ? this.limitY : y;
  };

  Parallax.prototype.origin = function(x, y) {
    this.originX = x === undefined ? this.originX : x;
    this.originY = y === undefined ? this.originY : y;
  };

  Parallax.prototype.clamp = function(value, min, max) {
    value = Math.max(value, min);
    value = Math.min(value, max);
    return value;
  };

  Parallax.prototype.css = function(element, property, value) {
    var jsProperty = this.propertyCache[property];
    if (!jsProperty) {
      for (var i = 0, l = this.vendors.length; i < l; i++) {
        if (this.vendors[i] !== null) {
          jsProperty = this.camelCase(this.vendors[i][1] + '-' + property);
        } else {
          jsProperty = property;
        }
        if (element.style[jsProperty] !== undefined) {
          this.propertyCache[property] = jsProperty;
          break;
        }
      }
    }
    element.style[jsProperty] = value;
  };

  Parallax.prototype.accelerate = function(element) {
    this.css(element, 'transform', 'translate3d(0,0,0)');
    this.css(element, 'transform-style', 'preserve-3d');
    this.css(element, 'backface-visibility', 'hidden');
  };

  Parallax.prototype.setPosition = function(element, x, y) {
    x = x.toFixed(this.precision) + 'px';
    y = y.toFixed(this.precision) + 'px';
    if (this.transform3DSupport) {
      this.css(element, 'transform', 'translate3d('+x+','+y+',0)');
    } else if (this.transform2DSupport) {
      this.css(element, 'transform', 'translate('+x+','+y+')');
    } else {
      element.style.left = x;
      element.style.top = y;
    }
  };

  Parallax.prototype.onOrientationTimer = function() {
    if (this.orientationSupport && this.orientationStatus === 0) {
      this.disable();
      this.orientationSupport = false;
      this.enable();
    }
  };

  Parallax.prototype.onMotionTimer = function() {
    if (this.motionSupport && this.motionStatus === 0) {
      this.disable();
      this.motionSupport = false;
      this.enable();
    }
  };

  Parallax.prototype.onCalibrationTimer = function() {
    PARAMETERS.State.calibrationFlag = true;
  };

  Parallax.prototype.onWindowResize = function() {
    this.updateDimensions();
  };

  Parallax.prototype.onAnimationFrame = function() {
    this.updateBounds();
    var dx = PARAMETERS.Input.x - PARAMETERS.Calibration.x;
    var dy = PARAMETERS.Input.y - PARAMETERS.Calibration.y;
    if ((Math.abs(dx) > PARAMETERS.State.calibrationThreshold) || (Math.abs(dy) > PARAMETERS.State.calibrationThreshold)) {
      this.queueCalibration(0);
    }
    if (this.portrait) {
      PARAMETERS.Motion.x = this.calibrateX ? dy : PARAMETERS.Input.y;
      PARAMETERS.Motion.y = this.calibrateY ? dx : PARAMETERS.Input.x;
    } else {
      PARAMETERS.Motion.x = this.calibrateX ? dx : PARAMETERS.Input.x;
      PARAMETERS.Motion.y = this.calibrateY ? dy : PARAMETERS.Input.y;
    }
    PARAMETERS.Motion.x *= PARAMETERS.Bound.w * (this.scalarX / 100);
    PARAMETERS.Motion.y *= PARAMETERS.Bound.h * (this.scalarY / 100);
    if (!isNaN(parseFloat(this.limitX))) {
      PARAMETERS.Motion.x = this.clamp(PARAMETERS.Motion.x, -this.limitX, this.limitX);
    }
    if (!isNaN(parseFloat(this.limitY))) {
      PARAMETERS.Motion.y = this.clamp(PARAMETERS.Motion.y, -this.limitY, this.limitY);
    }
    PARAMETERS.Velocity.x += (PARAMETERS.Motion.x - PARAMETERS.Velocity.x) * this.frictionX;
    PARAMETERS.Velocity.y += (PARAMETERS.Motion.y - PARAMETERS.Velocity.y) * this.frictionY;
    for (var i = 0, l = this.layers.length; i < l; i++) {
      var layer = this.layers[i];
      var depthX = PARAMETERS.State.depthsX[i];
      var depthY = PARAMETERS.State.depthsY[i];
      var xOffset = PARAMETERS.Velocity.x * (depthX * (this.invertX ? -1 : 1));
      var yOffset = PARAMETERS.Velocity.y * (depthY * (this.invertY ? -1 : 1));
      this.setPosition(layer, xOffset, yOffset);
    }
    PARAMETERS.State.raf = requestAnimationFrame(this.onAnimationFrame);
  };

  Parallax.prototype.rotate = function(beta,gamma){
    // Extract Rotation
      var x = (event.beta  || 0) / MAGIC_NUMBER; //  -90 :: 90
      var y = (event.gamma || 0) / MAGIC_NUMBER; // -180 :: 180

      // Detect Orientation Change
      var portrait = this.wh > this.ww;
      if (this.portrait !== portrait) {
        this.portrait = portrait;
        PARAMETERS.State.calibrationFlag = true;
      }

      // Set Calibration
      if (PARAMETERS.State.calibrationFlag) {
        PARAMETERS.State.calibrationFlag = false;
        PARAMETERS.Calibration.x = x;
        PARAMETERS.Calibration.y = y;
      }

      // Set Input
      PARAMETERS.Input.x = x;
      PARAMETERS.Input.y = y;
  }
  Parallax.prototype.onDeviceOrientation = function(event) {
    // Validate environment and event properties.
    var beta = event.beta;
    var gamma = event.gamma;
    if (!this.desktop && beta !== null && gamma !== null) {
      // Set orientation status.
      this.orientationStatus = 1;
      this.rotate(beta,gamma);
    }
  };

  Parallax.prototype.onDeviceMotion = function(event) {
    // Validate environment and event properties.
    var beta = event.rotationRate.beta;
    var gamma = event.rotationRate.gamma;
    if (!this.desktop && beta !== null && gamma !== null) {
      // Set motion status.
      this.motionStatus = 1;
      this.rotate(beta,gamma);
    }
  };

  Parallax.prototype.onMouseMove = function(event) {
    // Cache mouse coordinates.
    var clientX = event.clientX;
    var clientY = event.clientY;

    // Calculate Mouse Input
    if (!this.orientationSupport && this.relativeInput) {

      // Clip mouse coordinates inside element bounds.
      if (this.clipRelativeInput) {
        clientX = Math.max(clientX, PARAMETERS.Bound.x);
        clientX = Math.min(clientX, PARAMETERS.Bound.x + PARAMETERS.Bound.w);
        clientY = Math.max(clientY, PARAMETERS.Bound.y);
        clientY = Math.min(clientY, PARAMETERS.Bound.y + PARAMETERS.Bound.h);
      }

      // Calculate input relative to the element.
      PARAMETERS.Input.x = (clientX - PARAMETERS.Bound.x - PARAMETERS.Center.x) / PARAMETERS.Range.x;
      PARAMETERS.Input.y = (clientY - PARAMETERS.Bound.y - PARAMETERS.Center.y) / PARAMETERS.Range.y;

    } else {

      // Calculate input relative to the window.
      PARAMETERS.Input.x = (clientX - this.wcx) / this.wrx;
      PARAMETERS.Input.y = (clientY - this.wcy) / this.wry;
    }
  };

  // Expose Parallax
  window[NAME] = Parallax;

})(window, document);

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
