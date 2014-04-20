# Parallax.js

Simple, lightweight **Parallax Engifne** that reacts to the orientation of a
smart device. Where no gyroscope or motion detection hardware is available, the
position of the cursor is used instead.

Check out this **[demo][demo]** to see it in action!

## Setup

Simply create a list of elements giving each item that you want to move within
your parallax scene a class of `layer` and a `data-depth` attribute specifying
its depth within the scene. A depth of **0** will cause the layer to remain
stationary, and a depth of **1** will cause the layer to move by the total
effect of the calculated motion. Values inbetween **0** and **1** will cause the
layer to move by an amount relative to the supplied ratio.

```html
<ul id="scene">
  <li class="layer" data-depth="0.00"><img src="layer1.png"></li>
  <li class="layer" data-depth="0.20"><img src="layer2.png"></li>
  <li class="layer" data-depth="0.40"><img src="layer3.png"></li>
  <li class="layer" data-depth="0.60"><img src="layer4.png"></li>
  <li class="layer" data-depth="0.80"><img src="layer5.png"></li>
  <li class="layer" data-depth="1.00"><img src="layer6.png"></li>
</ul>
```

To kickoff a **Parallax** scene, simply select your parent DOM Element and pass
it to the **Parallax** constructor.

```javascript
var scene = document.getElementById('scene');
var parallax = new Parallax(scene);
```

## Behaviours

There are a number of behaviours that you can setup for any given **Parallax**
instance. These behaviours can either be specified in the markup via data
attributes or in JavaScript via the constructor and API.

| Behaviour     | Values              | Description                                                                                                        |
| ------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `calibrate-x` | `true` or `false`   | Specifies whether or not to cache & calculate the motion relative to the initial `x` axis value on initialisation. |
| `calibrate-y` | `true` or `false`   | Specifies whether or not to cache & calculate the motion relative to the initial `y` axis value on initialisation. |
| `invert-x`    | `true` or `false`   | `true` moves layers in opposition to the device motion, `false` slides them away.                                  |
| `invert-y`    | `true` or `false`   | `true` moves layers in opposition to the device motion, `false` slides them away.                                  |
| `limit-x`     | `number` or `false` | A numeric value limits the total range of motion in `x`, `false` allows layers to move with complete freedom.      |
| `limit-y`     | `number` or `false` | A numeric value limits the total range of motion in `y`, `false` allows layers to move with complete freedom.      |
| `scalar-x`    | `number`            | Multiplies the input motion by this value, increasing or decreasing the sensitivity of the layer motion.           |
| `scalar-y`    | `number`            | Multiplies the input motion by this value, increasing or decreasing the sensitivity of the layer motion.           |
| `friction-x`  | `number` `0 - 1`    | The amount of friction the layers experience. This essentially adds some easing to the layer motion.               |
| `friction-y`  | `number` `0 - 1`    | The amount of friction the layers experience. This essentially adds some easing to the layer motion.               |
| `client-measurement`  | `true` or `false`    | Specifies whether or not to measure the mouse movement by the absolute position of the cursor within the clients viewport. Else it will be measured by the absolute position on the whole page. (DEFAULT: false)              |

In addition to the behaviours described above, there are **two** methods `enable()`
and `disable()` that *activate* and *deactivate* the **Parallax** instance respectively.

### Behaviours: Data Attributes Example

```html
<ul id="scene"
  data-calibrate-x="false"
  data-calibrate-y="true"
  data-invert-x="false"
  data-invert-y="true"
  data-limit-x="false"
  data-limit-y="10"
  data-scalar-x="2"
  data-scalar-y="8"
  data-friction-x="0.2"
  data-friction-y="0.8"
  data-client-measurement="true">
  <li class="layer" data-depth="0.00"><img src="graphics/layer1.png"></li>
  <li class="layer" data-depth="0.20"><img src="graphics/layer2.png"></li>
  <li class="layer" data-depth="0.40"><img src="graphics/layer3.png"></li>
  <li class="layer" data-depth="0.60"><img src="graphics/layer4.png"></li>
  <li class="layer" data-depth="0.80"><img src="graphics/layer5.png"></li>
  <li class="layer" data-depth="1.00"><img src="graphics/layer6.png"></li>
</ul>
```

### Behaviours: Constructor Object Example

```javascript
var scene = document.getElementById('scene');
var parallax = new Parallax(scene, {
  calibrateX: false,
  calibrateY: true,
  invertX: false,
  invertY: true,
  limitX: false,
  limitY: 10,
  scalarX: 2,
  scalarY: 8,
  frictionX: 0.2,
  frictionY: 0.8
});
```

### Behaviours: API Example

```javascript
var scene = document.getElementById('scene');
var parallax = new Parallax(scene);
parallax.enable();
parallax.disable();
parallax.calibrate(false, true);
parallax.invert(false, true);
parallax.limit(false, 10);
parallax.scalar(2, 8);
parallax.friction(0.2, 0.8);
```

## jQuery

If you're using **[jQuery][jquery]** or **[Zepto][zepto]** and would prefer to
use **Parallax.js** as a plugin, you're in luck!

```javascript
$('#scene').parallax();
```

### jQuery: Passing Options

```javascript
$('#scene').parallax({
  calibrateX: false,
  calibrateY: true,
  invertX: false,
  invertY: true,
  limitX: false,
  limitY: 10,
  scalarX: 2,
  scalarY: 8,
  frictionX: 0.2,
  frictionY: 0.8,
  clientMeasurement: true
});
```
### jQuery: API

```javascript
var $scene = $('#scene').parallax();
$scene.parallax('enable');
$scene.parallax('disable');
$scene.parallax('calibrate', false, true);
$scene.parallax('invert', false, true);
$scene.parallax('limit', false, 10);
$scene.parallax('scalar', 2, 8);
$scene.parallax('friction', 0.2, 0.8);
```

## iOS

If you are writing a **native iOS application** and would like to use **parallax.js**
within a `UIWebView`, you will need to do a little bit of work to get it running.

`UIWebView` no longer automatically receives the `deviceorientation` event, so
your native application must intercept the events from the gyroscope and reroute
them to the `UIWebView`:

1. Include the **CoreMotion** framework `#import <CoreMotion/CoreMotion.h>`
and create a reference to the **UIWebView** `@property(nonatomic, strong) IBOutlet UIWebView *parallaxWebView;`
2. Add a property to the app delegate (or controller that will own the **UIWebView**)
`@property(nonatomic, strong) CMMotionManager *motionManager;`
3. Finally, make the following calls:

```Objective-C
  self.motionManager = [[CMMotionManager alloc] init];

  if (self.motionManager.isGyroAvailable && !self.motionManager.isGyroActive) {

    [self.motionManager setGyroUpdateInterval:0.5f]; // Set the event update frequency (in seconds)

    [self.motionManager startGyroUpdatesToQueue:NSOperationQueue.mainQueue
                                    withHandler:^(CMGyroData *gyroData, NSError *error) {

      NSString *js = [NSString stringWithFormat:@"parallax.onDeviceOrientation({beta:%f, gamma:%f})", gyroData.rotationRate.x, gyroData.rotationRate.y];

      [self.parallaxWebView stringByEvaluatingJavaScriptFromString:js];

    }];
  }
```

## Build

> As a prerequisite, you will need [gulp][gulp] installed: `npm install -g gulp`

```
npm install
gulp
```

During development you can have gulp watch the `source` directory for changes and automatically build the `deploy` files by running:

```
gulp watch
```

## Author

Matthew Wagerfield: [@mwagerfield][twitter]

## License

Licensed under [MIT][mit]. Enjoy.

[demo]: http://wagerfield.github.com/parallax/
[twitter]: http://twitter.com/mwagerfield
[mit]: http://www.opensource.org/licenses/mit-license.php
[jquery]: http://jquery.com/
[zepto]: http://zeptojs.com/
[gulp]: http://gulpjs.com/
