/**
* Parallax.js
* @author Matthew Wagerfield - @wagerfield, René Roth - mail@reneroth.org
* @description Creates a parallax effect between an array of layers,
*              driving the motion from the gyroscope output of a smartdevice.
*              If no gyroscope is available, the cursor position is used.
*/

const rqAnFr = require('raf'),
      clamp = require('clamp')

// Constants
const NAME = 'Parallax',
      MAGIC_NUMBER = 30,
      DEFAULTS = {
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
      }

class Parallax {
  constructor(element, options) {

    // DOM Context
    this.element = element
    this.layers = element.getElementsByClassName('layer')

    // Data Extraction
    let data = {
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
    }

    // Delete Null Data Values
    for (let key in data) {
      if (data[key] === null) delete data[key]
    }

    // Compose Settings Object
    Object.assign(this, DEFAULTS, options, data)

    // States
    this.calibrationTimer = null
    this.calibrationFlag = true
    this.enabled = false
    this.depthsX = []
    this.depthsY = []
    this.raf = null

    // Element Bounds
    this.bounds = null
    this.ex = 0
    this.ey = 0
    this.ew = 0
    this.eh = 0

    // Element Center
    this.ecx = 0
    this.ecy = 0

    // Element Range
    this.erx = 0
    this.ery = 0

    // Calibration
    this.cx = 0
    this.cy = 0

    // Input
    this.ix = 0
    this.iy = 0

    // Motion
    this.mx = 0
    this.my = 0

    // Velocity
    this.vx = 0
    this.vy = 0

    // Callbacks
    this.onMouseMove = this.onMouseMove.bind(this)
    this.onDeviceOrientation = this.onDeviceOrientation.bind(this)
    this.onOrientationTimer = this.onOrientationTimer.bind(this)
    this.onCalibrationTimer = this.onCalibrationTimer.bind(this)
    this.onAnimationFrame = this.onAnimationFrame.bind(this)
    this.onWindowResize = this.onWindowResize.bind(this)

    // Reset properties
    this.ww = null
    this.wh = null
    this.wcx = null
    this.wcy = null
    this.wrx = null
    this.wry = null
    this.portrait = null
    this.desktop = !navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|BB10|mobi|tablet|opera mini|nexus 7)/i)
    this.vendors = [null,['-webkit-','webkit'],['-moz-','Moz'],['-o-','O'],['-ms-','ms']]
    this.motionSupport = !!window.DeviceMotionEvent
    this.orientationSupport = !!window.DeviceOrientationEvent
    this.orientationStatus = 0
    this.motionStatus = 0
    this.propertyCache = {}

    // Initialise
    this.initialise()
  }

  data(element, name) {
    return this.deserialize(element.getAttribute('data-'+name))
  }

  deserialize(value) {
    if (value === 'true') {
      return true
    } else if (value === 'false') {
      return false
    } else if (value === 'null') {
      return null
    } else if (!isNaN(parseFloat(value)) && isFinite(value)) {
      return parseFloat(value)
    } else {
      return value
    }
  }

  camelCase(value) {
    return value.replace(/-+(.)?/g, (match, character) => {
      return character ? character.toUpperCase() : ''
    })
  }

  transformSupport(value) {
    let element = document.createElement('div'),
        propertySupport = false,
        propertyValue = null,
        featureSupport = false,
        cssProperty = null,
        jsProperty = null
    for (let i = 0, l = this.vendors.length; i < l; i++) {
      if (this.vendors[i] !== null) {
        cssProperty = this.vendors[i][0] + 'transform'
        jsProperty = this.vendors[i][1] + 'Transform'
      } else {
        cssProperty = 'transform'
        jsProperty = 'transform'
      }
      if (element.style[jsProperty] !== undefined) {
        propertySupport = true
        break
      }
    }
    switch(value) {
      case '2D':
        featureSupport = propertySupport
        break
      case '3D':
        if (propertySupport) {
          let body = document.body || document.createElement('body'),
              documentElement = document.documentElement,
              documentOverflow = documentElement.style.overflow,
              isCreatedBody = false

          if (!document.body) {
            isCreatedBody = true
            documentElement.style.overflow = 'hidden'
            documentElement.appendChild(body)
            body.style.overflow = 'hidden'
            body.style.background = ''
          }

          body.appendChild(element)
          element.style[jsProperty] = 'translate3d(1px,1px,1px)'
          propertyValue = window.getComputedStyle(element).getPropertyValue(cssProperty)
          featureSupport = propertyValue !== undefined && propertyValue.length > 0 && propertyValue !== 'none'
          documentElement.style.overflow = documentOverflow
          body.removeChild(element)

          if ( isCreatedBody ) {
            body.removeAttribute('style')
            body.parentNode.removeChild(body)
          }
        }
        break
    }
    return featureSupport
  }

  initialise() {
    if (this.transform2DSupport === undefined) {
      this.transform2DSupport = this.transformSupport('2D')
      this.transform3DSupport = this.transformSupport('3D')
    }

    // Configure Context Styles
    if (this.transform3DSupport) {
      this.accelerate(this.element)
    }

    let style = window.getComputedStyle(this.element)
    if (style.getPropertyValue('position') === 'static') {
      this.element.style.position = 'relative';
    }

    // Pointer events
    if(!this.pointerEvents) {
      this.element.style.pointerEvents = 'none'
    }

    // Setup
    this.updateLayers()
    this.updateDimensions()
    this.enable()
    this.queueCalibration(this.calibrationDelay)
  }

  updateLayers() {
    // Cache Layer Elements
    this.layers = this.element.getElementsByClassName('layer')
    this.depthsX = []
    this.depthsY = []

    // Configure Layer Styles
    for (let i = 0, l = this.layers.length; i < l; i++) {
      let layer = this.layers[i]

      if (this.transform3DSupport) {
        this.accelerate(layer)
      }

      layer.style.position = i ? 'absolute' : 'relative'
      layer.style.display = 'block'
      layer.style.left = 0
      layer.style.top = 0

      // Cache Layer Depth
      //Graceful fallback on depth if depth-x or depth-y is absent
      var depth = this.data(layer, 'depth') || 0
      this.depthsX.push(this.data(layer, 'depth-x') || depth)
      this.depthsY.push(this.data(layer, 'depth-y') || depth)
    }
  }

  updateDimensions() {
    this.ww = window.innerWidth
    this.wh = window.innerHeight
    this.wcx = this.ww * this.originX
    this.wcy = this.wh * this.originY
    this.wrx = Math.max(this.wcx, this.ww - this.wcx)
    this.wry = Math.max(this.wcy, this.wh - this.wcy)
  }

  updateBounds() {
    this.bounds = this.element.getBoundingClientRect()
    this.ex = this.bounds.left
    this.ey = this.bounds.top
    this.ew = this.bounds.width
    this.eh = this.bounds.height
    this.ecx = this.ew * this.originX
    this.ecy = this.eh * this.originY
    this.erx = Math.max(this.ecx, this.ew - this.ecx)
    this.ery = Math.max(this.ecy, this.eh - this.ecy)
  }

  queueCalibration(delay) {
    clearTimeout(this.calibrationTimer)
    this.calibrationTimer = setTimeout(this.onCalibrationTimer, delay)
  }

  enable() {
    if (this.enabled) {
      return
    }
    this.enabled = true

    if (!this.desktop && this.orientationSupport) {
      this.portrait = null
      window.addEventListener('deviceorientation', this.onDeviceOrientation)
      setTimeout(this.onOrientationTimer, this.supportDelay)
    } else if (!this.desktop && this.motionSupport) {
      this.portrait = null
      window.addEventListener('devicemotion', this.onDeviceMotion)
      setTimeout(this.onMotionTimer, this.supportDelay)
    } else {
      this.cx = 0
      this.cy = 0
      this.portrait = false
      window.addEventListener('mousemove', this.onMouseMove)
    }

    window.addEventListener('resize', this.onWindowResize)
    this.raf = rqAnFr(this.onAnimationFrame)
  }

  disable() {
    if (!this.enabled) {
      return
    }

    this.enabled = false
    if (this.orientationSupport) {
      window.removeEventListener('deviceorientation', this.onDeviceOrientation)
    } else if (this.motionSupport) {
      window.removeEventListener('devicemotion', this.onDeviceMotion)
    } else {
      window.removeEventListener('mousemove', this.onMouseMove)
    }

    window.removeEventListener('resize', this.onWindowResize)
    rqAnFr.cancel(this.raf)
  }

  calibrate(x, y) {
    this.calibrateX = x === undefined ? this.calibrateX : x
    this.calibrateY = y === undefined ? this.calibrateY : y
  }

  invert(x, y) {
    this.invertX = x === undefined ? this.invertX : x
    this.invertY = y === undefined ? this.invertY : y
  }

  friction(x, y) {
    this.frictionX = x === undefined ? this.frictionX : x
    this.frictionY = y === undefined ? this.frictionY : y
  }

  scalar(x, y) {
    this.scalarX = x === undefined ? this.scalarX : x
    this.scalarY = y === undefined ? this.scalarY : y
  }

  limit(x, y) {
    this.limitX = x === undefined ? this.limitX : x
    this.limitY = y === undefined ? this.limitY : y
  }

  origin(x, y) {
    this.originX = x === undefined ? this.originX : x
    this.originY = y === undefined ? this.originY : y
  }

  css(element, property, value) {
    let jsProperty = this.propertyCache[property]
    if (!jsProperty) {
      for (let i = 0, l = this.vendors.length; i < l; i++) {
        if (this.vendors[i] !== null) {
          jsProperty = this.camelCase(this.vendors[i][1] + '-' + property)
        } else {
          jsProperty = property
        }
        if (element.style[jsProperty] !== undefined) {
          this.propertyCache[property] = jsProperty
          break
        }
      }
    }
    element.style[jsProperty] = value
  }

  accelerate(element) {
    this.css(element, 'transform', 'translate3d(0,0,0)')
    this.css(element, 'transform-style', 'preserve-3d')
    this.css(element, 'backface-visibility', 'hidden')
  }

  setPosition(element, x, y) {
    x = x.toFixed(this.precision) + 'px'
    y = y.toFixed(this.precision) + 'px'
    if (this.transform3DSupport) {
      this.css(element, 'transform', 'translate3d(' + x + ',' + y + ',0)')
    } else if (this.transform2DSupport) {
      this.css(element, 'transform', 'translate(' + x + ',' + y + ')')
    } else {
      element.style.left = x
      element.style.top = y
    }
  }

  onOrientationTimer() {
    if (this.orientationSupport && this.orientationStatus === 0) {
      this.disable()
      this.orientationSupport = false
      this.enable()
    }
  }

  onMotionTimer() {
    if (this.motionSupport && this.motionStatus === 0) {
      this.disable()
      this.motionSupport = false
      this.enable()
    }
  }

  onCalibrationTimer() {
    this.calibrationFlag = true
  }

  onWindowResize() {
    this.updateDimensions()
  }

  onAnimationFrame() {
    this.updateBounds()
    let dx = this.ix - this.cx,
        dy = this.iy - this.cy
    if ((Math.abs(dx) > this.calibrationThreshold) || (Math.abs(dy) > this.calibrationThreshold)) {
      this.queueCalibration(0)
    }
    if (this.portrait) {
      this.mx = this.calibrateX ? dy : this.iy
      this.my = this.calibrateY ? dx : this.ix
    } else {
      this.mx = this.calibrateX ? dx : this.ix
      this.my = this.calibrateY ? dy : this.iy
    }
    this.mx *= this.ew * (this.scalarX / 100)
    this.my *= this.eh * (this.scalarY / 100)
    if (!isNaN(parseFloat(this.limitX))) {
      this.mx = clamp(this.mx, -this.limitX, this.limitX)
    }
    if (!isNaN(parseFloat(this.limitY))) {
      this.my = clamp(this.my, -this.limitY, this.limitY)
    }
    this.vx += (this.mx - this.vx) * this.frictionX
    this.vy += (this.my - this.vy) * this.frictionY
    for (let i = 0, l = this.layers.length; i < l; i++) {
      let layer = this.layers[i],
          depthX = this.depthsX[i],
          depthY = this.depthsY[i],
          xOffset = this.vx * (depthX * (this.invertX ? -1 : 1)),
          yOffset = this.vy * (depthY * (this.invertY ? -1 : 1))
      this.setPosition(layer, xOffset, yOffset)
    }
    this.raf = rqAnFr(this.onAnimationFrame)
  }

  rotate(beta,gamma){
    // Extract Rotation
    let x = (event.beta  || 0) / MAGIC_NUMBER, //  -90 :: 90
        y = (event.gamma || 0) / MAGIC_NUMBER // -180 :: 180

    // Detect Orientation Change
    let portrait = this.wh > this.ww
    if (this.portrait !== portrait) {
      this.portrait = portrait
      this.calibrationFlag = true
    }

    // Set Calibration
    if (this.calibrationFlag) {
      this.calibrationFlag = false
      this.cx = x
      this.cy = y
    }

    // Set Input
    this.ix = x
    this.iy = y
  }

  onDeviceOrientation(event) {
    // Validate environment and event properties.
    var beta = event.beta
    var gamma = event.gamma
    if (!this.desktop && beta !== null && gamma !== null) {
      // Set orientation status.
      this.orientationStatus = 1
      this.rotate(beta, gamma)
    }
  }

  onDeviceMotion(event) {
    // Validate environment and event properties.
    var beta = event.rotationRate.beta
    var gamma = event.rotationRate.gamma
    if (!this.desktop && beta !== null && gamma !== null) {
      // Set motion status.
      this.motionStatus = 1
      this.rotate(beta, gamma)
    }
  }

  onMouseMove(event) {
    // Cache mouse coordinates.
    let clientX = event.clientX,
        clientY = event.clientY

    // Calculate Mouse Input
    if (!this.orientationSupport && this.relativeInput) {
      // Clip mouse coordinates inside element bounds.
      if (this.clipRelativeInput) {
        clientX = Math.max(clientX, this.ex)
        clientX = Math.min(clientX, this.ex + this.ew)
        clientY = Math.max(clientY, this.ey)
        clientY = Math.min(clientY, this.ey + this.eh)
      }

      // Calculate input relative to the element.
      this.ix = (clientX - this.ex - this.ecx) / this.erx
      this.iy = (clientY - this.ey - this.ecy) / this.ery

    } else {
      // Calculate input relative to the window.
      this.ix = (clientX - this.wcx) / this.wrx
      this.iy = (clientY - this.wcy) / this.wry
    }
  }

}

// Expose Parallax
window[NAME] = Parallax;
