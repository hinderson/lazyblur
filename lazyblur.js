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
            './vendor/stackblur'
        ], function(utils, pubsub, stackblur) {
            return factory(window, utils, pubsub, stackblur);
        });
    } else if (typeof exports == 'object') {
        // CommonJS
        module.exports = factory(
            window,
            require('./utils'),
            require('./pubsub'),
            require('./vendor/stackblur')
        );
    }

}(window, function factory (window, utils, pubsub, stackblur) {
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

    // Transition event helper
    var transitionEvent = utils.whichTransitionEvent();

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
        var attributes = JSON.parse(item.getAttribute('data-attributes'));
        var type = (attributes.src || attributes.srcset.split(',')[0].split(' ')[0]).match(/\.(jpg|jpeg|png|gif)$/) ? 'image' : 'video';

        var makeMediaElem = function (type) {
            // Construct media element
            var mediaElem = type === 'video' ? document.createElement('VIDEO') : new Image();

            // Add loading class
            item.classList.add('loading-media');

            // Construct attributes
            for (var prop in attributes) {
                mediaElem.setAttribute(prop, attributes[prop]);
            }

            return mediaElem;
        };

        var appendElem = function ( ) {
            var mediaElem = this;
            mediaElem.removeEventListener('canplaythrough', appendElem);
            mediaElem.removeEventListener('canplay', appendElem);
            mediaElem.classList.add('media');

            setTimeout(function ( ) {
                item.classList.remove('loading-media');
                item.classList.add('media-loaded');
            }, 100);

            item.appendChild(mediaElem);
            pubsub.publish('mediaLoaded', [item, mediaElem]);
        };

        var mediaElem;
        if (type === 'video') {
            if (utils.isAutoplaySupported()) {
                mediaElem = makeMediaElem('video');
                mediaElem.setAttribute('preload', 'auto');
                mediaElem.addEventListener('canplaythrough', appendElem.bind(mediaElem));
                mediaElem.addEventListener('canplay', appendElem.bind(mediaElem));
                mediaElem.load();
            } else {
                // Device doesn't support autoplay
                // Append video fallback image
                if (item.hasAttribute('data-video-fallback')) {
                    mediaElem = makeMediaElem('image');
                    mediaElem.classList.add('video-fallback');
                    mediaElem.src = item.getAttribute('data-video-fallback');
                    mediaElem.onload = appendElem.bind(mediaElem);
                } else {
                    // No fallback image is provided, just append the video
                    mediaElem = makeMediaElem('video');
                    appendElem.call(mediaElem);
                }
            }
        } else {
            mediaElem = makeMediaElem('image');
            mediaElem.onload = appendElem.bind(mediaElem);
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

    var lazyBlur = function (elems, options) {
        if (!elems) return;

        if (options) {
            BLUR_AMOUNT = options.blur;
        }

        // Export event emitter
        this.on = pubsub.subscribe;

        // Export functions
        this.check = checkImageVisibility;

        // Accepts both a single node and a NodeList
        if (elems.length) {
            utils.forEach(elems, function (index, elem) {
                createBlurryPlaceholder(elem);
            });
        } else {
            createBlurryPlaceholder(elems);
        }

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
