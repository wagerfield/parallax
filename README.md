# Parallax.js

Simple, lightweight **Parallax Engine** that reacts to the orientation of a
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
  <li class="layer" data-depth="0.00"><img src="graphics/layer6.png"></li>
  <li class="layer" data-depth="0.20"><img src="graphics/layer5.png"></li>
  <li class="layer" data-depth="0.40"><img src="graphics/layer4.png"></li>
  <li class="layer" data-depth="0.60"><img src="graphics/layer3.png"></li>
  <li class="layer" data-depth="0.80"><img src="graphics/layer2.png"></li>
  <li class="layer" data-depth="1.00"><img src="graphics/layer1.png"></li>
</ul>
```

To kickoff a **Parallax** scene, simply select your parent DOM Element and pass
it to the **Parallax** constructor.

```javascript
var scene = document.getElementById('scene');
var parallax = new Parallax(scene);
```

## Behaviors

There are a number of behaviors that you can setup for any given **Parallax**
instance. These behaviors can either be specified in the markup via data
attributes or in JavaScript via the constructor or later on through the API.

| Behavior      | Values              | Description                                                                                              |
| ------------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| `transition`  | `0.8s ease-out`     | CSS transition string specifying the duration and easing.                                                |
| `invert-x`    | `true` or `false`   | `true` moves layers in oposition to the device motion, `false` slides them away.                         |
| `invert-y`    | `true` or `false`   | `true` moves layers in oposition to the device motion, `false` slides them away.                         |
| `limit-x`     | `number` or `false` | A numeric value limits the total range of motion, `false` allows layers to move with a complete freedom. |
| `limit-y`     | `number` or `false` | A numeric value limits the total range of motion, `false` allows layers to move with a complete freedom. |
| `scalar-x`    | `number`            | Multiplies the input motion by this value, increasing or decreasing the sensitivity of the layer motion. |
| `scalar-y`    | `number`            | Multiplies the input motion by this value, increasing or decreasing the sensitivity of the layer motion. |

### Behaviors: Data Attributes

```html
<ul id="scene"
  data-transition="1s ease-out"
  data-invert-x="false"
  data-invert-y="true"
  data-limit-x="false"
  data-limit-y="10"
  data-scalar-x="2"
  data-scalar-y="8">
  <li class="layer" data-depth="0.00"><img src="graphics/layer6.png"></li>
  <li class="layer" data-depth="0.20"><img src="graphics/layer5.png"></li>
  <li class="layer" data-depth="0.40"><img src="graphics/layer4.png"></li>
  <li class="layer" data-depth="0.60"><img src="graphics/layer3.png"></li>
  <li class="layer" data-depth="0.80"><img src="graphics/layer2.png"></li>
  <li class="layer" data-depth="1.00"><img src="graphics/layer1.png"></li>
</ul>
```

### Behaviors: Constructor Object

```javascript
var scene = document.getElementById('scene');
var parallax = new Parallax(scene, {
  invertX: false,
  invertY: true,
  limitX: false,
  limitY: 10,
  scalarX: 2,
  scalarY: 8
});
```

### API

```javascript
var scene = document.getElementById('scene');
var parallax = new Parallax(scene);
parallax.enable();
parallax.disable();
parallax.invert(false, true);
parallax.limit(false, 10);
parallax.scalar(2, 8);
```

### jQuery

```javascript
$('.scene').parallax();
```

### jQuery: Passing Options

```javascript
$('.scene').parallax({
  invertX: false,
  invertY: true,
  limitX: false,
  limitY: 10,
  scalarX: 2,
  scalarY: 8
});
```
### jQuery: API

```javascript
var $scene = $('.scene').parallax();
$scene.parallax('enable');
$scene.parallax('disable');
$scene.parallax('invert', false, true);
$scene.parallax('limit', false, 10);
$scene.parallax('scalar', 2, 8);
```

## Author

Matthew Wagerfield: [@mwagerfield][mwagerfield]

## License

Licensed under [MIT][mit]. Enjoy.

[demo]: http://wagerfield.github.com/parallax/
[mwagerfield]: http://twitter.com/mwagerfield
[mit]: http://www.opensource.org/licenses/mit-license.php
