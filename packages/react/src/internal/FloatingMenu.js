/**
 * Copyright IBM Corp. 2016, 2018
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import warning from 'warning';
import PropTypes from 'prop-types';
import React from 'react';
import ReactDOM from 'react-dom';
import window from 'window-or-global';
import { settings } from 'carbon-components';
import OptimizedResize from './OptimizedResize';

const { prefix } = settings;

/**
 * The structure for the position of floating menu.
 * @typedef {object} FloatingMenu~position
 * @property {number} left The left position.
 * @property {number} top The top position.
 * @property {number} right The right position.
 * @property {number} bottom The bottom position.
 */

/**
 * The structure for the size of floating menu.
 * @typedef {object} FloatingMenu~size
 * @property {number} width The width.
 * @property {number} height The height.
 */

/**
 * The structure for the position offset of floating menu.
 * @typedef {object} FloatingMenu~offset
 * @property {number} top The top position.
 * @property {number} left The left position.
 */

/**
 * The structure for the target container.
 * @typedef {object} FloatingMenu~container
 * @property {DOMRect} rect Return of element.getBoundingClientRect()
 * @property {string} position Position style (static, absolute, relative...)
 */

export const DIRECTION_LEFT = 'left';
export const DIRECTION_TOP = 'top';
export const DIRECTION_RIGHT = 'right';
export const DIRECTION_BOTTOM = 'bottom';

/**
 * @param {FloatingMenu~offset} [oldMenuOffset={}] The old value.
 * @param {FloatingMenu~offset} [menuOffset={}] The new value.
 * @returns `true` if the parent component wants to change in the adjustment of the floating menu position.
 * @private
 */
const hasChangeInOffset = (oldMenuOffset = {}, menuOffset = {}) => {
  if (typeof oldMenuOffset !== typeof menuOffset) {
    return true;
  } else if (
    Object(menuOffset) === menuOffset &&
    typeof menuOffset !== 'function'
  ) {
    return (
      oldMenuOffset.top !== menuOffset.top ||
      oldMenuOffset.left !== menuOffset.left
    );
  }
  return oldMenuOffset !== menuOffset;
};

/**
 * @param {object} params The parameters.
 * @param {FloatingMenu~size} params.menuSize The size of the menu.
 * @param {FloatingMenu~position} params.refPosition The position of the triggering element.
 * @param {FloatingMenu~offset} [params.offset={ left: 0, top: 0 }] The position offset of the menu.
 * @param {FloatingMenu~offset} [params.viewportOffset={left: 0, top: 0}] The position offset of the custom viewport
 * @param {string} [params.direction=bottom] The menu direction.
 * @param {number} [params.scrollX=0] The scroll position of the viewport.
 * @param {number} [params.scrollY=0] The scroll position of the viewport.
 * @param {FloatingMenu~container} [params.container] The size and position type of target element.
 * @returns {FloatingMenu~offset} The position of the menu, relative to the top-left corner of the viewport.
 * @private
 */
const getFloatingPosition = ({
  menuSize,
  refPosition = {},
  offset = {},
  viewportOffset = {},
  direction = DIRECTION_BOTTOM,
  scrollX = 0,
  scrollY = 0,
  container,
}) => {
  const {
    left: refLeft = 0,
    top: refTop = 0,
    right: refRight = 0,
    bottom: refBottom = 0,
  } = refPosition;
  const relativeDiff =
    container.position !== 'static'
      ? {
          top: container.rect.top,
          left: container.rect.left,
        }
      : {
          top: 0,
          left: 0,
        };

  const { width, height } = menuSize;
  const { top = 0, left = 0 } = offset;
  const { left: viewportLeft = 0, top: viewportTop = 0 } = viewportOffset;
  const refCenterHorizontal = (refLeft + refRight) / 2;
  const refCenterVertical = (refTop + refBottom) / 2;

  /**
   * TODO: temp fix, should resolve getViewport and container implementations
   */
  if (!container) {
    return {
      [DIRECTION_LEFT]: () => ({
        left: refLeft - width + scrollX - left - viewportLeft,
        top: refCenterVertical - height / 2 + scrollY + top - viewportTop,
      }),
      [DIRECTION_TOP]: () => ({
        left: refCenterHorizontal - width / 2 + scrollX + left - viewportLeft,
        top: refTop - height + scrollY - top - viewportTop,
      }),
      [DIRECTION_RIGHT]: () => ({
        left: refRight + scrollX + left - viewportLeft,
        top: refCenterVertical - height / 2 + scrollY + top - viewportTop,
      }),
      [DIRECTION_BOTTOM]: () => ({
        left: refCenterHorizontal - width / 2 + scrollX + left - viewportLeft,
        top: refBottom + scrollY + top - viewportTop,
      }),
    }[direction]();
  } else {
    return {
      [DIRECTION_LEFT]: () => ({
        left: refLeft - width + scrollX - left - relativeDiff.left,
        top:
          refCenterVertical - height / 2 + scrollY + top - 9 - relativeDiff.top,
      }),
      [DIRECTION_TOP]: () => ({
        left:
          refCenterHorizontal - width / 2 + scrollX + left - relativeDiff.left,
        top: refTop - height + scrollY - top - relativeDiff.top,
      }),
      [DIRECTION_RIGHT]: () => ({
        left: refRight + scrollX + left - relativeDiff.left,
        top:
          refCenterVertical - height / 2 + scrollY + top + 3 - relativeDiff.top,
      }),
      [DIRECTION_BOTTOM]: () => ({
        left:
          refCenterHorizontal - width / 2 + scrollX + left - relativeDiff.left,
        top: refBottom + scrollY + top - relativeDiff.top,
      }),
    }[direction]();
  }
};

/**
 * A menu that is detached from the triggering element.
 * Useful when the container of the triggering element cannot have `overflow:visible` style, etc.
 */
class FloatingMenu extends React.Component {
  static propTypes = {
    /**
     * Contents to put into the floating menu.
     */
    children: PropTypes.object,

    /**
     * The query selector indicating where the floating menu body should be placed.
     */
    target: PropTypes.func,

    /**
     * Where to put the tooltip, relative to the trigger button.
     */
    menuDirection: PropTypes.oneOf([
      DIRECTION_LEFT,
      DIRECTION_TOP,
      DIRECTION_RIGHT,
      DIRECTION_BOTTOM,
    ]),

    /**
     * The adjustment of the floating menu position, considering the position of dropdown arrow, etc.
     */
    menuOffset: PropTypes.oneOfType([
      PropTypes.shape({
        top: PropTypes.number,
        left: PropTypes.number,
      }),
      PropTypes.func,
    ]),

    /**
     * The additional styles to put to the floating menu.
     */
    styles: PropTypes.object,

    /**
     * The callback called when the menu body has been mounted to/will be unmounted from the DOM.
     */
    menuRef: PropTypes.func,

    /**
     * The callback called when the menu body has been mounted and positioned.
     */
    onPlace: PropTypes.func,

    /**
     * Optional callback used to obtain a custom 'viewport' that differs from the window.
     */
    getViewport: PropTypes.func,
  };

  static defaultProps = {
    menuOffset: {},
    menuDirection: DIRECTION_BOTTOM,
  };

  // `true` if the menu body is mounted and calculation of the position is in progress.
  _placeInProgress = false;

  state = {
    /**
     * The position of the menu, relative to the top-left corner of the viewport.
     * @type {FloatingMenu~offset}
     */
    floatingPosition: undefined,
  };

  /**
   * The cached reference to the menu container.
   * Only used if React portal API is not available.
   * @type {Element}
   * @private
   */
  _menuContainer = null;

  /**
   * The cached reference to the menu body.
   * The reference is set via callback ref instead of object ref,
   * in order to hook the event when the element ref gets available,
   * which can be at a different timing from `cDM()`, presumably with SSR scenario.
   * @type {Element}
   * @private
   */
  _menuBody = null;

  /**
   * Calculates the position in the viewport of floating menu,
   * once this component is mounted or updated upon change in the following props:
   *
   * * `menuOffset` (The adjustment that should be applied to the calculated floating menu's position)
   * * `menuDirection` (Where the floating menu menu should be placed relative to the trigger button)
   *
   * @private
   */
  _updateMenuSize = (prevProps = {}) => {
    const menuBody = this._menuBody;
    warning(
      menuBody,
      'The DOM node for menu body for calculating its position is not available. Skipping...'
    );
    if (!menuBody) {
      return;
    }

    const {
      menuOffset: oldMenuOffset = {},
      menuDirection: oldMenuDirection,
      getViewport: oldGetViewport,
    } = prevProps;
    const { menuOffset = {}, menuDirection, getViewport } = this.props;

    if (
      hasChangeInOffset(oldMenuOffset, menuOffset) ||
      oldMenuDirection !== menuDirection ||
      (oldGetViewport && oldGetViewport()) !== (getViewport && getViewport())
    ) {
      const { flipped, triggerRef } = this.props;
      const { current: triggerEl } = triggerRef;
      const menuSize = menuBody.getBoundingClientRect();
      const refPosition = triggerEl && triggerEl.getBoundingClientRect();
      const offset =
        typeof menuOffset !== 'function'
          ? menuOffset
          : menuOffset(menuBody, menuDirection, triggerEl, flipped);

      const viewport = getViewport && getViewport();
      const viewportSize = viewport && viewport.getBoundingClientRect();
      // Skips if either in the following condition:
      // a) Menu body has `display:none`
      // b) `menuOffset` as a callback returns `undefined` (The callback saw that it couldn't calculate the value)

      if ((menuSize.width > 0 && menuSize.height > 0) || !offset) {
        this.setState({
          floatingPosition: getFloatingPosition({
            menuSize,
            refPosition,
            direction: menuDirection,
            offset,
            viewportOffset: {
              ...(viewportSize && {
                left: viewportSize.left,
                top: viewportSize.top,
              }),
            },
            scrollX: viewport ? viewport.scrollLeft : window.pageXOffset,
            scrollY: viewport ? viewport.scrollTop : window.pageYOffset,
            container: {
              rect: this.props.target().getBoundingClientRect(),
              position: getComputedStyle(this.props.target()).position,
            },
          }),
        });
      }
    }
  };

  componentWillUnmount() {
    this.hResize.release();
  }

  componentDidMount() {
    this.hResize = OptimizedResize.add(() => {
      this._updateMenuSize();
    });
  }

  componentDidUpdate(prevProps) {
    this._updateMenuSize(prevProps);
    const { onPlace } = this.props;
    if (
      this._placeInProgress &&
      this.state.floatingPosition &&
      typeof onPlace === 'function'
    ) {
      onPlace(this._menuBody);
      this._placeInProgress = false;
    }
  }

  /**
   * A callback for called when menu body is mounted or unmounted.
   * @param {Element} menuBody The menu body being mounted. `null` if the menu body is being unmounted.
   */
  _menuRef = menuBody => {
    const { menuRef } = this.props;
    this._placeInProgress = !!menuBody;
    menuRef && menuRef((this._menuBody = menuBody));
    if (menuBody) {
      this._updateMenuSize();
    }
  };

  /**
   * @returns The child nodes, with styles containing the floating menu position.
   * @private
   */
  _getChildrenWithProps = () => {
    const { styles, children } = this.props;
    const { floatingPosition: pos } = this.state;
    // If no pos available, we need to hide the element (offscreen to the left)
    // This is done so we can measure the content before positioning it correctly.
    const positioningStyle = pos
      ? {
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          right: 'auto',
        }
      : {
          visibility: 'hidden',
          top: '0px',
        };
    return React.cloneElement(children, {
      ref: this._menuRef,
      style: {
        ...styles,
        ...positioningStyle,
        position: 'absolute',
        margin: 0,
        opacity: 1,
      },
    });
  };

  render() {
    if (typeof document !== 'undefined') {
      const { target } = this.props;
      return ReactDOM.createPortal(
        <>
          {/* Non-translatable: Focus management code makes this `<span>` not actually read by screen readers */}
          <span
            ref={this.startSentinel}
            tabIndex="0"
            role="link"
            className={`${prefix}--visually-hidden`}>
            Focus sentinel
          </span>
          {this._getChildrenWithProps()}
          {/* Non-translatable: Focus management code makes this `<span>` not actually read by screen readers */}
          <span
            ref={this.endSentinel}
            tabIndex="0"
            role="link"
            className={`${prefix}--visually-hidden`}>
            Focus sentinel
          </span>
        </>,
        !target ? document.body : target()
      );
    }
    return null;
  }
}

export default FloatingMenu;
