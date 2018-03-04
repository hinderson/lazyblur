# Lazy Blur
Progressively load media (images, video) with a blur effect. Loads the media when scrolled into view.

Uses the [StackBlur for JavaScript/Canvas](http://www.quasimondo.com/StackBlurForCanvas/StackBlurDemo.html) library by Mario Klingemann.

# Usage

## JavaScript
```
var LazyBlur = require('lazyblur');

var mediaElements = document.querySelectorAll('.progressive-media');
var lazyBlur = new LazyBlur(mediaElements, {
    blur: 40
});

lazyBlur.on('mediaLoaded', function (media) {
    console.log(media + ' has loaded!');
});
```

## CSS
```
.progressive-media {
    position: relative;
    overflow: hidden;

    canvas {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        visibility: visible;
        opacity: 1;
    }

    .thumb {
        display: none;
    }

    .media {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        visibility: hidden;
        opacity: 0;
        backface-visibility: hidden;
    }

    &.media-loaded {
        canvas {
            visibility: hidden;
            opacity: 0;
            transition: visibility 0s linear .5s,opacity .1s .4s;
        }

        .media {
            visibility: visible;
            opacity: 1;
            transition: visibility 0s linear 0s, opacity .4s 0s;
        }
    }
}
```

## HTML

### Image
```
<div class="progressive-media" data-attributes='{ "srcset": "{{ realImageSrcSet }}", "sizes": "100vw", "alt": "" }'>
    <div style="padding-bottom: {{ (realImageHeight / realImageWidth) * 100 }}%;">
    <img src="{{ microSrc }}" crossorigin="anonymous" aria-hidden="true" class="thumb" alt="">
    <canvas width="{{ realImageWidth }}" height="{{ realImageHeight }}"></canvas>
    <noscript>
        <img src="{{ realImageSrc }}" srcset="{{ realImageSrcSet }}" sizes="100vw" alt="">
    </noscript>
</div>
```

### Video
Requires a screenshot from the video to be used for the micro thumbnail.
```
<div class="progressive-media" data-attributes='{ "src": "{{ realVideoSrc }}", "muted" : "", "autoplay": "", "loop": "" }'>
    <div style="padding-bottom: {{ (realImageHeight / realImageWidth) * 100 }}%;">
    <img src="{{ screenshotMicroSrc }}" crossorigin="anonymous" aria-hidden="true" class="thumb" alt="">
    <canvas width="{{ realVideoWidth }}" height="{{ realVideoHeight }}"></canvas>
    <noscript>
        <video src="{{ realVideoSrc }}" muted loop autoplay data-object-fit="cover"></video>
    </noscript>
</div>
```
