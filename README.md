# Lazy Blur
Progressively load media (images, video) with a blur effect. Loads the media when scrolled into view.

# Usage

## CSS
```
.progressive-media {
    position: relative;
    overflow: hidden;
    background: #dedede;

    canvas {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        max-width: 100%;
        visibility: visible;
        opacity: 1;
    }

    .thumb {
        visibility: hidden;
        opacity: 0;
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
<div class="progressive-media" data-attributes='{ "srcset": "{{ realImageSrcSet }}", "sizes": "100vw", "alt": "", "data-object-fit": "cover" }'>
    <img src="{{ microSrc }}" crossorigin="anonymous" aria-hidden="true" class="thumb" alt="">
    <canvas width="{{ realImageWidth }}" height="{{ realImageHeight }}" data-object-fit="cover"></canvas>
    <noscript>
        <img src="{{ realImageSrc }}" srcset="{{ realImageSrcSet }}" sizes="100vw" alt="">
    </noscript>
</div>
```

### Video
```
<div class="progressive-media" data-attributes='{ "src": "{{ realVideoSrc }}", "muted" : "", "autoplay": "", "loop": "", "data-object-fit" : "cover" }' data-type="video">
    <img src="{{ microSrc }}" crossorigin="anonymous" aria-hidden="true" class="thumb" alt="">
    <canvas width="{{ realVideoWidth }}" height="{{ realVideoHeight }}" data-object-fit="cover"></canvas>
    <noscript>
        <video src="{{ realVideoSrc }}" muted loop autoplay data-object-fit="cover"></video>
    </noscript>
</div>
```
