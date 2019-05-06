import React from 'react';
import PropTypes from 'prop-types';
import {
  PanResponder,
  Animated,
  Dimensions,
  StyleSheet,
  Platform
} from 'react-native';
const { width, height } = Dimensions.get('window');

const PESPECTIVE = Platform.OS === 'ios' ? 2.38 : 1.7;
const TR_POSITION = Platform.OS === 'ios' ? 2 : 1.5;

export default class CubeNavigationHorizontal extends React.Component {
  constructor(props) {
    super(props);

    this.pages = this.props.children.map((child, index) => width * -index);

    this.state = {
      scrollLockPage: this.pages[this.props.scrollLockPage]
    };
  }

  componentWillMount() {
    this._animatedValue = new Animated.ValueXY();
    this._animatedValue.setValue({ x: 0, y: 0 });
    this._value = { x: 0, y: 0 };

    this._animatedValue.addListener(value => {
      this._value = value;
    });

    this._panResponder = PanResponder.create({
      onMoveShouldSetResponderCapture: () => Math.abs(gestureState.dx) > 20,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) =>
        Math.abs(gestureState.dx) > 20,
      onPanResponderGrant: (e, gestureState) => {
        this._animatedValue.stopAnimation();
        this._animatedValue.setOffset({ x: this._value.x, y: this._value.y });
      },
      onPanResponderMove: (e, gestureState) => {
        Animated.event([null, { dx: this._animatedValue.x }])(e, gestureState);

        // Avoid last movement
        this.lockLast =
          this.state.scrollLockPage != undefined
            ? -this.state.scrollLockPage
            : this.pages[this.pages.length - 1];
        if (this._value.x > this.pages[0] || this._value.x < this.lockLast) {
          this._animatedValue.setValue({ x: 0, y: 0 });
        }
      },
      onPanResponderTerminationRequest: (e, gestureState) => false,
      onPanResponderRelease: (e, gestureState) => {
        let mod = 0;
        if(gestureState.dx > 50){
          mod = width / 2;
        }else if(gestureState.dx < -50){
          mod = -width / 2;
        }

        let goTo = this._closest(this._value.x + mod);
        if (this.lockLast > goTo) return; //remove in the future
        this._animatedValue.flattenOffset({
          x: this._value.x,
          y: this._value.y
        });
        Animated.spring(this._animatedValue, {
          toValue: { x: goTo, y: 0 },
          friction: 3,
          tension: 0.6
        }).start();
        setTimeout(() => {
          if (this.props.callBackAfterSwipe)
            this.props.callBackAfterSwipe(goTo, Math.abs(goTo / width));
        }, 500);
      }
    });
  }

  componentWillReceiveProps(props) {
    this.setState({
      scrollLockPage: props.scrollLockPage
        ? this.pages[props.scrollLockPage]
        : undefined
    });
  }

  /*
    @page: index
  */
  scrollTo(page, animated) {
    animated = animated == undefined ? true : animated;

    if (animated) {
      Animated.spring(this._animatedValue, {
        toValue: { x: this.pages[page], y: 0 },
        friction: 4,
        tension: 0.8
      }).start();
    } else {
      this._animatedValue.setValue({ x: this.pages[page], y: 0 });
    }
  }

  /*
  Private methods
  */

  _getTransformsFor = i => {
    let scrollX = this._animatedValue.x;
    let pageX = -width * i;

    let translateX = scrollX.interpolate({
      inputRange: [pageX - width, pageX, pageX + width],
      outputRange: [(-width - 1) / TR_POSITION, 0, (width + 1) / TR_POSITION],
      extrapolate: 'clamp'
    });

    let rotateY = scrollX.interpolate({
      inputRange: [pageX - width, pageX, pageX + width],
      outputRange: ['-60deg', '0deg', '60deg'],
      extrapolate: 'clamp'
    });

    let translateXAfterRotate = scrollX.interpolate({
      inputRange: [pageX - width, pageX, pageX + width],
      inputRange: [
        pageX - width,
        pageX - width + 0.1,
        pageX,
        pageX + width - 0.1,
        pageX + width
      ],
      outputRange: [
        -width - 1,
        (-width - 1) / PESPECTIVE,
        0,
        (width + 1) / PESPECTIVE,
        +width + 1
      ],
      extrapolate: 'clamp'
    });

    let opacity = scrollX.interpolate({
      inputRange: [
        pageX - width,
        pageX - width + 10,
        pageX,
        pageX + width - 250,
        pageX + width
      ],
      outputRange: [0, 0.6, 1, 0.6, 0],
      extrapolate: 'clamp'
    });

    return {
      transform: [
        { perspective: width },
        { translateX },
        { rotateY: rotateY },
        { translateX: translateXAfterRotate }
      ],
      opacity: opacity
    };
  };

  _renderChild = (child, i) => {
    let expandStyle = this.props.expandView
      ? { paddingTop: 100, paddingBottom: 100, height: height + 200 }
      : { width, height };
    let style = [child.props.style, expandStyle];
    let props = {
      i,
      style
    };
    let element = React.cloneElement(child, props);

    return (
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'transparent' },
          this._getTransformsFor(i, false)
        ]}
        key={`child- ${i}`}
      >
        {element}
      </Animated.View>
    );
  };

  _closest = num => {
    let array = this.pages;

    let i = 0;
    let minDiff = 1000;
    let ans;
    for (i in array) {
      let m = Math.abs(num - array[i]);
      if (m < minDiff) {
        minDiff = m;
        ans = array[i];
      }
    }
    return ans;
  };

  render() {
    let expandStyle = this.props.expandView
      ? { top: -100, left: 0, width, height: height + 200 }
      : { width, height };

    return (
      <Animated.View
        style={[{ flex: 1 }]}
        ref={view => {
          this._scrollView = view;
        }}
        {...this._panResponder.panHandlers}
      >
        <Animated.View
          style={[
            { position: 'absolute' },
            expandStyle
          ]}
        >
          {this.props.children.map(this._renderChild)}
        </Animated.View>
      </Animated.View>
    );
  }
}

CubeNavigationHorizontal.propTypes = {
  callBackAfterSwipe: PropTypes.func,
  scrollLockPage: PropTypes.number,
  expandView: PropTypes.bool
};

CubeNavigationHorizontal.defaultProps = {
  expandView: false
};
