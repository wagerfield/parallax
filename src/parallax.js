/**
* Parallax.js
* @author Matthew Wagerfield - @wagerfield, René Roth - mail@reneroth.org
* @description Creates a parallax effect between an array of layers,
*              driving the motion from the gyroscope output of a smartdevice.
*              If no gyroscope is available, the cursor position is used.
*/

const rqAnFr = require('raf')
const objectAssign = require('object-assign')

const helpers = {
  propertyCache: {},
  vendors: [null,['-webkit-','webkit'],['-moz-','Moz'],['-o-','O'],['-ms-','ms']],

  clamp(value, min, max) {
    return min < max
      ? (value < min ? min : value > max ? max : value)
      : (value < max ? max : value > min ? min : value)
  },

  data(element, name) {
    return helpers.deserialize(element.getAttribute('data-'+name))
  },

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
  },

  camelCase(value) {
    return value.replace(/-+(.)?/g, (match, character) => {
      return character ? character.toUpperCase() : ''
    })
  },

  accelerate(element) {
    helpers.css(element, 'transform', 'translate3d(0,0,0) rotate(0.0001deg)')
    helpers.css(element, 'transform-style', 'preserve-3d')
    helpers.css(element, 'backface-visibility', 'hidden')
  },

  transformSupport(value) {
    let element = document.createElement('div'),
        propertySupport = false,
        propertyValue = null,
        featureSupport = false,
        cssProperty = null,
        jsProperty = null
    for (let i = 0, l = helpers.vendors.length; i < l; i++) {
      if (helpers.vendors[i] !== null) {
        cssProperty = helpers.vendors[i][0] + 'transform'
        jsProperty = helpers.vendors[i][1] + 'Transform'
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
  },

  css(element, property, value) {
    let jsProperty = helpers.propertyCache[property]
    if (!jsProperty) {
      for (let i = 0, l = helpers.vendors.length; i < l; i++) {
        if (helpers.vendors[i] !== null) {
          jsProperty = helpers.camelCase(helpers.vendors[i][1] + '-' + property)
        } else {
          jsProperty = property
        }
        if (element.style[jsProperty] !== undefined) {
          helpers.propertyCache[property] = jsProperty
          break
        }
      }
    }
    element.style[jsProperty] = value
  }

}

const MAGIC_NUMBER = 30,
      DEFAULTS = {
        relativeInput: false,
        clipRelativeInput: false,
        inputElement: null,
        hoverOnly: false,
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
        pointerEvents: false,
        precision: 1,
        onReady: null
      }

class Parallax {
  constructor(element, options) {

    this.element = element
    this.layers = element.getElementsByClassName('layer')

    const data = {
      calibrateX: helpers.data(this.element, 'calibrate-x'),
      calibrateY: helpers.data(this.element, 'calibrate-y'),
      invertX: helpers.data(this.element, 'invert-x'),
      invertY: helpers.data(this.element, 'invert-y'),
      limitX: helpers.data(this.element, 'limit-x'),
      limitY: helpers.data(this.element, 'limit-y'),
      scalarX: helpers.data(this.element, 'scalar-x'),
      scalarY: helpers.data(this.element, 'scalar-y'),
      frictionX: helpers.data(this.element, 'friction-x'),
      frictionY: helpers.data(this.element, 'friction-y'),
      originX: helpers.data(this.element, 'origin-x'),
      originY: helpers.data(this.element, 'origin-y'),
      pointerEvents: helpers.data(this.element, 'pointer-events'),
      precision: helpers.data(this.element, 'precision'),
      relativeInput: helpers.data(this.element, 'relative-input'),
      clipRelativeInput: helpers.data(this.element, 'clip-relative-input'),
      hoverOnly: helpers.data(this.element, 'hover-only'),
      inputElement: document.querySelector(helpers.data(this.element, 'input-element'))
    }

    for (let key in data) {
      if (data[key] === null) {
        delete data[key]
      }
    }

    objectAssign(this, DEFAULTS, data, options)

    if(!this.inputElement) {
      this.inputElement = this.element
    }

    this.calibrationTimer = null
    this.calibrationFlag = true
    this.enabled = false
    this.depthsX = []
    this.depthsY = []
    this.raf = null

    this.bounds = null
    this.elementPositionX = 0
    this.elementPositionY = 0
    this.elementWidth = 0
    this.elementHeight = 0

    this.elementCenterX = 0
    this.elementCenterY = 0

    this.elementRangeX = 0
    this.elementRangeY = 0

    this.calibrationX = 0
    this.calibrationY = 0

    this.inputX = 0
    this.inputY = 0

    this.motionX = 0
    this.motionY = 0

    this.velocityX = 0
    this.velocityY = 0

    this.onMouseMove = this.onMouseMove.bind(this)
    this.onDeviceOrientation = this.onDeviceOrientation.bind(this)
    this.onDeviceMotion = this.onDeviceMotion.bind(this)
    this.onOrientationTimer = this.onOrientationTimer.bind(this)
    this.onMotionTimer = this.onMotionTimer.bind(this)
    this.onCalibrationTimer = this.onCalibrationTimer.bind(this)
    this.onAnimationFrame = this.onAnimationFrame.bind(this)
    this.onWindowResize = this.onWindowResize.bind(this)

    this.windowWidth = null
    this.windowHeight = null
    this.windowCenterX = null
    this.windowCenterY = null
    this.windowRadiusX = null
    this.windowRadiusY = null
    this.portrait = false
    this.desktop = !navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|BB10|mobi|tablet|opera mini|nexus 7)/i)
    this.motionSupport = !!window.DeviceMotionEvent && !this.desktop
    this.orientationSupport = !!window.DeviceOrientationEvent && !this.desktop
    this.orientationStatus = 0
    this.motionStatus = 0

    this.initialise()
  }

  initialise() {
    if (this.transform2DSupport === undefined) {
      this.transform2DSupport = helpers.transformSupport('2D')
      this.transform3DSupport = helpers.transformSupport('3D')
    }

    // Configure Context Styles
    if (this.transform3DSupport) {
      helpers.accelerate(this.element)
    }

    let style = window.getComputedStyle(this.element)
    if (style.getPropertyValue('position') === 'static') {
      this.element.style.position = 'relative'
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

  doReadyCallback() {
    if(this.onReady) {
      this.onReady()
    }
  }

  updateLayers() {
    this.layers = this.element.children
    this.depthsX = []
    this.depthsY = []

    for (let index = 0; index < this.layers.length; index++) {
      let layer = this.layers[index]

      if (this.transform3DSupport) {
        helpers.accelerate(layer)
      }

      layer.style.position = index ? 'absolute' : 'relative'
      layer.style.display = 'block'
      layer.style.left = 0
      layer.style.top = 0

      let depth = helpers.data(layer, 'depth') || 0
      this.depthsX.push(helpers.data(layer, 'depth-x') || depth)
      this.depthsY.push(helpers.data(layer, 'depth-y') || depth)
    }
  }

  updateDimensions() {
    this.windowWidth = window.innerWidth
    this.windowHeight = window.innerHeight
    this.windowCenterX = this.windowWidth * this.originX
    this.windowCenterY = this.windowHeight * this.originY
    this.windowRadiusX = Math.max(this.windowCenterX, this.windowWidth - this.windowCenterX)
    this.windowRadiusY = Math.max(this.windowCenterY, this.windowHeight - this.windowCenterY)
  }

  updateBounds() {
    this.bounds = this.inputElement.getBoundingClientRect()
    this.elementPositionX = this.bounds.left
    this.elementPositionY = this.bounds.top
    this.elementWidth = this.bounds.width
    this.elementHeight = this.bounds.height
    this.elementCenterX = this.elementWidth * this.originX
    this.elementCenterY = this.elementHeight * this.originY
    this.elementRangeX = Math.max(this.elementCenterX, this.elementWidth - this.elementCenterX)
    this.elementRangeY = Math.max(this.elementCenterY, this.elementHeight - this.elementCenterY)
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

    if (this.orientationSupport) {
      this.portrait = false
      window.addEventListener('deviceorientation', this.onDeviceOrientation)
      setTimeout(this.onOrientationTimer, this.supportDelay)
    } else if (this.motionSupport) {
      this.portrait = false
      window.addEventListener('devicemotion', this.onDeviceMotion)
      setTimeout(this.onMotionTimer, this.supportDelay)
    } else {
      this.calibrationX = 0
      this.calibrationY = 0
      this.portrait = false
      window.addEventListener('mousemove', this.onMouseMove)
      this.doReadyCallback()
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

  setInputElement(element) {
    this.inputElement = element
    this.updateDimensions()
  }

  setPosition(element, x, y) {
    x = x.toFixed(this.precision) + 'px'
    y = y.toFixed(this.precision) + 'px'
    if (this.transform3DSupport) {
      helpers.css(element, 'transform', 'translate3d(' + x + ',' + y + ',0)')
    } else if (this.transform2DSupport) {
      helpers.css(element, 'transform', 'translate(' + x + ',' + y + ')')
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
    } else {
      this.doReadyCallback()
    }
  }

  onMotionTimer() {
    if (this.motionSupport && this.motionStatus === 0) {
      this.disable()
      this.motionSupport = false
      this.enable()
    } else {
      this.doReadyCallback()
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
    let calibratedInputX = this.inputX - this.calibrationX,
        calibratedInputY = this.inputY - this.calibrationY
    if ((Math.abs(calibratedInputX) > this.calibrationThreshold) || (Math.abs(calibratedInputY) > this.calibrationThreshold)) {
      this.queueCalibration(0)
    }
    if (this.portrait) {
      this.motionX = this.calibrateX ? calibratedInputY : this.inputY
      this.motionY = this.calibrateY ? calibratedInputX : this.inputX
    } else {
      this.motionX = this.calibrateX ? calibratedInputX : this.inputX
      this.motionY = this.calibrateY ? calibratedInputY : this.inputY
    }
    this.motionX *= this.elementWidth * (this.scalarX / 100)
    this.motionY *= this.elementHeight * (this.scalarY / 100)
    if (!isNaN(parseFloat(this.limitX))) {
      this.motionX = helpers.clamp(this.motionX, -this.limitX, this.limitX)
    }
    if (!isNaN(parseFloat(this.limitY))) {
      this.motionY = helpers.clamp(this.motionY, -this.limitY, this.limitY)
    }
    this.velocityX += (this.motionX - this.velocityX) * this.frictionX
    this.velocityY += (this.motionY - this.velocityY) * this.frictionY
    for (let index = 0; index < this.layers.length; index++) {
      let layer = this.layers[index],
          depthX = this.depthsX[index],
          depthY = this.depthsY[index],
          xOffset = this.velocityX * (depthX * (this.invertX ? -1 : 1)),
          yOffset = this.velocityY * (depthY * (this.invertY ? -1 : 1))
      this.setPosition(layer, xOffset, yOffset)
    }
    this.raf = rqAnFr(this.onAnimationFrame)
  }

  rotate(beta, gamma){
    // Extract Rotation
    let x = (beta || 0) / MAGIC_NUMBER, //  -90 :: 90
        y = (gamma || 0) / MAGIC_NUMBER // -180 :: 180

    // Detect Orientation Change
    let portrait = this.windowHeight > this.windowWidth
    if (this.portrait !== portrait) {
      this.portrait = portrait
      this.calibrationFlag = true
    }

    if (this.calibrationFlag) {
      this.calibrationFlag = false
      this.calibrationX = x
      this.calibrationY = y
    }

    this.inputX = x
    this.inputY = y
  }

  onDeviceOrientation(event) {
    let beta = event.beta
    let gamma = event.gamma
    if (beta !== null && gamma !== null) {
      this.orientationStatus = 1
      this.rotate(beta, gamma)
    }
  }

  onDeviceMotion(event) {
    let beta = event.rotationRate.beta
    let gamma = event.rotationRate.gamma
    if (beta !== null && gamma !== null) {
      this.motionStatus = 1
      this.rotate(beta, gamma)
    }
  }

  onMouseMove(event) {
    let clientX = event.clientX,
        clientY = event.clientY

    // reset input to center if hoverOnly is set and we're not hovering the element
    if(this.hoverOnly &&
      ((clientX < this.elementPositionX || clientX > this.elementPositionX + this.elementWidth) ||
      (clientY < this.elementPositionY || clientY > this.elementPositionY + this.elementHeight))) {
        this.inputX = 0
        this.inputY = 0
        return
      }

    if (this.relativeInput) {
      // Clip mouse coordinates inside element bounds.
      if (this.clipRelativeInput) {
        clientX = Math.max(clientX, this.elementPositionX)
        clientX = Math.min(clientX, this.elementPositionX + this.elementWidth)
        clientY = Math.max(clientY, this.elementPositionY)
        clientY = Math.min(clientY, this.elementPositionY + this.elementHeight)
      }
      // Calculate input relative to the element.
      if(this.elementRangeX && this.elementRangeY) {
        this.inputX = (clientX - this.elementPositionX - this.elementCenterX) / this.elementRangeX
        this.inputY = (clientY - this.elementPositionY - this.elementCenterY) / this.elementRangeY
      }
    } else {
      // Calculate input relative to the window.
      if(this.windowRadiusX && this.windowRadiusY) {
        this.inputX = (clientX - this.windowCenterX) / this.windowRadiusX
        this.inputY = (clientY - this.windowCenterY) / this.windowRadiusY
      }
    }
  }

}

module.exports = Parallax
