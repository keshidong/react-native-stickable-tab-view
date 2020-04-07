const React = require('react');
const ReactNative = require('react-native');
const PropTypes = require('prop-types');
const createReactClass = require('create-react-class');
const {
  ViewPropTypes,
  View,
  Animated,
  StyleSheet,
  ScrollView,
  Text,
  Dimensions,
} = ReactNative;
const Button = require('./Button');

import { FONT_FAMILY } from '@constants';
import { FONT_MEDIUM } from '@constants/font';

const WINDOW_WIDTH = Dimensions.get('window').width;

const ScrollableTabBar = createReactClass({
  propTypes: {
    goToPage: PropTypes.func,
    activeTab: PropTypes.number,
    tabs: PropTypes.array,
    backgroundColor: PropTypes.string,
    activeTextColor: PropTypes.string,
    inactiveTextColor: PropTypes.string,
    scrollOffset: PropTypes.number,
    style: ViewPropTypes.style,
    tabStyle: ViewPropTypes.style,
    tabsContainerStyle: ViewPropTypes.style,
    textStyle: Text.propTypes.style,
    renderTab: PropTypes.func,
    underlineStyle: ViewPropTypes.style,
    onScroll: PropTypes.func,
  },

  getDefaultProps() {
    return {
      scrollOffset: 52,
      activeTextColor: 'navy',
      inactiveTextColor: 'black',
      backgroundColor: null,
      style: {},
      tabStyle: {},
      tabsContainerStyle: {},
      underlineStyle: {},
    };
  },

  getInitialState() {
    this._tabsMeasurements = [];
    return {
      _containerWidth: null,
      _tabContainerWidth: null,
      _tabUnderlineWidth: null,
    };
  },
  // eslint-disable-next-line max-params
  renderTab(name, page, isTabActive, onPressHandler, onLayoutHandler) {
    const { activeTextColor, inactiveTextColor, textStyle } = this.props;
    const textColor = isTabActive ? activeTextColor : inactiveTextColor;
    const fontWeight = isTabActive ? FONT_MEDIUM : FONT_FAMILY;

    return (
      <Button
        key={`${name}_${page}`}
        accessible={true}
        accessibilityLabel={name}
        accessibilityTraits="button"
        onPress={() => onPressHandler(page)}
        onLayout={onLayoutHandler}
      >
        <View style={[styles.tab, this.props.tabStyle]}>
          <Text style={[{ color: textColor, ...fontWeight }, textStyle]}>
            {name}
          </Text>
        </View>
      </Button>
    );
  },

  measureTab(page, event) {
    const { x, width, height } = event.nativeEvent.layout;
    this._tabsMeasurements[page] = { x, width, height };

    // bat setState
    if (this.allTabsMeasurementsCompleted()) {
      this.setState({});
    }
  },
  scrollItemToMiddle(index) {
    const { _containerWidth, _tabContainerWidth } = this.state;
    const tabMeasurement = this._tabsMeasurements[index];
    let newScrollX =
      tabMeasurement.x + tabMeasurement.width / 2 - _containerWidth / 2;
    newScrollX = Math.min(
      Math.max(newScrollX, 0),
      _tabContainerWidth - _containerWidth
    );
    this._scrollView.scrollTo({
      x: newScrollX,
      y: 0,
      animated: true,
    });
  },
  allTabsMeasurementsCompleted() {
    return this.props.tabs.every((_, index) => this._tabsMeasurements[index]);
  },
  necessarilyMeasurementsCompleted() {
    return (
      this.allTabsMeasurementsCompleted() &&
      this.state._tabUnderlineWidth &&
      this.state._containerWidth &&
      this.state._tabContainerWidth
    );
  },
  render() {
    const { tabs } = this.props;
    const { _tabUnderlineWidth } = this.state;
    const tabUnderlineStyle = {
      position: 'absolute',
      height: 4,
      width: 6,
      backgroundColor: 'navy',
      bottom: 0,
    };

    let inputRange = [-999, 999];
    let outputRange = [-999, -999]; // out of bound
    if (this.necessarilyMeasurementsCompleted()) {
      inputRange = tabs.reduce((acc, cur, index) => {
        return [...acc, index];
      }, []);

      const getUnderlineLeftValue = (left, width, underlineWidth) => {
        return left + width / 2 - underlineWidth / 2;
      };
      outputRange = tabs.reduce((acc, cur, index) => {
        // min width
        const tabMeasurement = this._tabsMeasurements[index];
        return [
          ...acc,
          getUnderlineLeftValue(
            tabMeasurement.x,
            tabMeasurement.width,
            _tabUnderlineWidth
          ),
        ];
      }, []);
    }
    const tabUnderlineAnimatedValue = this.props.scrollValue.interpolate({
      inputRange,
      outputRange,
    });

    return (
      <View
        style={[
          styles.container,
          { backgroundColor: this.props.backgroundColor },
          this.props.style,
        ]}
        onLayout={this.onContainerLayout}
      >
        <ScrollView
          ref={scrollView => {
            this._scrollView = scrollView;
          }}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          directionalLockEnabled={true}
          bounces={false}
          scrollsToTop={false}
        >
          <View
            style={[
              styles.tabs,
              { width: this.state._tabContainerWidth },
              this.props.tabsContainerStyle,
            ]}
            ref={'tabContainer'}
            onLayout={this.onTabContainerLayout}
          >
            {this.props.tabs.map((name, page) => {
              const isTabActive = this.props.activeTab === page;
              const renderTab = this.props.renderTab || this.renderTab;
              return renderTab(
                name,
                page,
                isTabActive,
                this.props.goToPage,
                this.measureTab.bind(this, page)
              );
            })}
            <Animated.View
              style={[
                tabUnderlineStyle,
                this.props.underlineStyle,
                {
                  transform: [
                    {
                      translateX: tabUnderlineAnimatedValue,
                    },
                  ],
                },
              ]}
              onLayout={this.onTabUnderlineLayout}
            />
          </View>
        </ScrollView>
      </View>
    );
  },

  componentDidUpdate(prevProps) {
    // If the tabs change, force the width of the tabs container to be recalculated
    if (
      JSON.stringify(prevProps.tabs) !== JSON.stringify(this.props.tabs) &&
      this.state._tabContainerWidth
    ) {
      this.setState({ _tabContainerWidth: null });
    }

    if (prevProps.activeTab !== this.props.activeTab) {
      this.scrollItemToMiddle(this.props.activeTab);
    }
  },

  onTabContainerLayout(e) {
    let width = e.nativeEvent.layout.width;
    if (width < WINDOW_WIDTH) {
      width = WINDOW_WIDTH;
    }
    this.setState({ _tabContainerWidth: width });
  },

  onContainerLayout(e) {
    const width = e.nativeEvent.layout.width;
    this.setState({ _containerWidth: width });
    if (typeof this.props.onLayout === 'function') {
      this.props.onLayout(e);
    }
    // this.updateView({ value: this.props.scrollValue.__getValue() });
  },
  onTabUnderlineLayout(e) {
    const width = e.nativeEvent.layout.width;
    if (this.state._tabUnderlineWidth !== width) {
      this.setState({
        _tabUnderlineWidth: width,
      });
    }
  },
});

module.exports = ScrollableTabBar;

const styles = StyleSheet.create({
  tab: {
    height: 49,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 20,
    paddingRight: 20,
  },
  container: {
    height: 50,
    // borderWidth: 1,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: '#ccc',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
