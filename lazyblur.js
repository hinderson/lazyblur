/*! Image Zoom - v1
 *  Copyright (c) 2016 Mattias Hinderson
 *  License: MIT
 */

(function (window, factory) {
    'use strict';

    if (typeof define == 'function' && define.amd) {
        // AMD
        define([
            './utils',
            './pubsub',
            './vendor/stackblur',
            './vendor/picturefill'
        ], function(utils, pubsub, stackblur, picturefill) {
            return factory(window, utils, pubsub, stackblur, picturefill);
        });
    } else if (typeof exports == 'object') {
        // CommonJS
        module.exports = factory(
            window,
            require('./utils'),
            require('./pubsub'),
            require('./vendor/stackblur'),
            require('./vendor/picturefill')
        );
    }

}(window, function factory (window, utils, pubsub, stackblur, picturefill) {
    'use strict';

    // Constants
    var BLUR_AMOUNT = 40;

    // Unloaded items
    var unloadedItems = [];

    // Cached values
    var cache = {
        ticking: false,
        lastScrollY: window.pageYOffset,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
    };

    // Window events
    var resizeEvent = utils.debounce(function ( ) {
    	cache.viewportWidth = window.innerWidth;
    	cache.viewportHeight = window.innerHeight;
        cache.lastScrollY = window.pageYOffset;

        checkImageVisibility();
    }, 250);

    var scrollEvent = utils.throttle(function ( ) {
    	checkImageVisibility();
    }, 500);

    window.addEventListener('resize', resizeEvent);
    window.addEventListener('scroll', scrollEvent);

    // Support helpers
    var supportsObjectFit = 'objectFit' in document.documentElement.style;

    // Add a background-image fallback for object-fit
    // Must be called after Picturefill
    function polyfillObjectFit (img, container) {
        if (supportsObjectFit) { return; }

        utils.requestAnimFrame.call(window, function ( ) {
            // Get current image src: Edge only supports 'currentSrc' for getting the current image src ('src' returns value DOM value)
            var imageSrc = img.currentSrc || img.src;
            img.style.display = 'none';
            container.style.backgroundSize = img.getAttribute('data-object-fit');
            container.style.backgroundImage = 'url(' + imageSrc + ')';
        });
    }

    function checkImageVisibility ( ) {
        if (!Object.keys(unloadedItems).length) {
            // We've loaded all images in the document
            return destroy();
        }

        utils.forEach(unloadedItems, function (index, item) {
    		if (!item) { return; }

    		if (utils.isInViewport(item)) {
                loadMedia(item);
    		}
	   });
    }

    function loadMedia (item) {
        var showMedia = function ( ) {
            var mediaElem = this;

            item.classList.remove('loading-media');
            item.classList.add('media-loaded');

            pubsub.publish('mediaLoaded', [item, mediaElem]);
        };

        var makeImageElem = function (attributes) {
            var mediaElem = new Image();
            mediaElem.classList.add('media');

            var constructAttributes = function (prop) {
                mediaElem.setAttribute(prop, attributes[prop]);
            };

            item.appendChild(mediaElem);

            // Does the browser support srcset?
            // We either have srcset and native support for it, or just a regular src attribute
            if ('srcset' in mediaElem || !attributes.hasOwnProperty('srcset')) {
                mediaElem.onload = showMedia.bind(mediaElem);
                Object.keys(attributes).forEach(constructAttributes);
            } else {
                // We have only srcset, and we need to polyfill
                Object.keys(attributes).forEach(constructAttributes);
                showMedia.call(mediaElem);
                picturefill({ elements: [ mediaElem ] }); // Polyfill srcset images
                if (attributes.hasOwnProperty('data-object-fit')) {
                    polyfillObjectFit(mediaElem, item); // Polyfill object-fit images
                }
            }

            return mediaElem;
        };

        var makeVideoElem = function (attributes) {
            // Construct media element
            var mediaElem = document.createElement('video');
            mediaElem.classList.add('media');

            // Event listeners
            utils.once(mediaElem, 'playing', showMedia);

            // Construct attributes
            Object.keys(attributes).forEach(function (prop) {
                mediaElem.setAttribute(prop, attributes[prop]);
            });

            mediaElem.preload = 'auto';
            mediaElem.autoplay = true;
            mediaElem.load();

            item.appendChild(mediaElem);

            return mediaElem;
        };

        var attributes = JSON.parse(item.getAttribute('data-attributes'));
        var type = (attributes.src || attributes.srcset.split(',')[0].split(' ')[0]).match(/\.(jpg|jpeg|png|gif)$/) ? 'image' : 'video';

        // Add loading class
        item.classList.add('loading-media');

        // Try to load media element
        if (type === 'video') {
            utils.isAutoplaySupported(function (supported) {
                if (supported || !item.hasAttribute('data-video-fallback')) {
                    var videoElem = makeVideoElem(attributes);
                    if (!supported) {
                        videoElem.style.pointerEvents = 'none';
                        showMedia.call(videoElem);
                    }
                } else {
                    // Device doesn't support autoplay
                    // Delete video attributes
                    delete attributes.loop;
                    delete attributes.muted;
                    delete attributes.autoplay;
                    delete attributes['webkit-playsinline'];

                    // Append video fallback image
                    attributes.src = item.getAttribute('data-video-fallback');
                    var mediaElem = makeImageElem(attributes);
                    item.classList.add('using-video-fallback');
                    mediaElem.classList.add('video-fallback');
                }
            }, 500);
        } else {
            makeImageElem(attributes);
        }

        // Remove item from unloaded items array
        delete unloadedItems[unloadedItems.indexOf(item)];
    }

    function createBlurryPlaceholder (item) {
        var placeholder = item.getElementsByTagName('img')[0];
        var canvas = item.getElementsByTagName('canvas')[0];

        // Force reload
        var placeholderImg = new Image();
        placeholderImg.crossOrigin = 'Anonymous';
        placeholderImg.src = placeholder.src;

        // Wait for thumb to load completely
        var applyBlur = function ( ) {
            canvas.getContext('2d').drawImage(placeholderImg, 0, 0, canvas.width, canvas.height);
            stackblur.canvasRGB(canvas, 0, 0, canvas.width, canvas.height, BLUR_AMOUNT);
            item.classList.add('placeholder-loaded');
            pubsub.publish('placeholderCreated', item);
        };

        if (placeholderImg.complete) {
            applyBlur();
        } else {
            placeholderImg.onload = applyBlur;
        }

        // Add item to unloaded items array
        unloadedItems.push(item);
    }

    function destroy ( ) {
        window.removeEventListener('resize', resizeEvent);
        window.removeEventListener('scroll', scrollEvent);
    }

    var lazyBlur = function (query, options) {
        if (!query) return;

        if (options) {
            BLUR_AMOUNT = options.blur;
        }

        // Export event emitter
        this.on = pubsub.subscribe;

        // Export functions
        this.check = checkImageVisibility;

        // Instantiate all provided queries
        var elems = (typeof query === 'string' ? document.querySelectorAll(query) : query);
        utils.forEach(elems, function (index, elem) {
            createBlurryPlaceholder(elem);
        });

        // Do an initial check of image visibility
        checkImageVisibility();
    };

	// Expose to interface
	if (typeof module === 'object' && typeof module.exports === 'object') {
		// CommonJS, just export
		module.exports = lazyBlur;
	} else if (typeof define === 'function' && define.amd) {
		// AMD support
		define('lazyBlur', function ( ) { return lazyBlur; } );
	}
}));
