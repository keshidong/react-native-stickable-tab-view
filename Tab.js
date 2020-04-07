import React, { PureComponent } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import { STATIC_URL } from '@constants';
import { getWindowSize } from '@utils/index';
import ScrollableTabBar from '@components/ScrollableTabBar';

import { FONT_FAMILY } from '@constants';
import { FONT_MEDIUM } from '@constants/font';
import cache, { TAB_HEIGHT } from '../../utils/cache';

// const { width } = getWindowSize();
// const widthLessThanIphone5 = width < 324; //324: tab宽度 96x3, 边界宽度 10*2, tab间宽度 8x2

const winWidth = getWindowSize().width;
const isSmallSizeScreen = winWidth <= 324;
const itemHeight = isSmallSizeScreen ? 40 : 48;
const itemWidth = isSmallSizeScreen ? 80 : 96;
const tabBarPaddingHorizontal = 6;
const tabBarPaddingVertical = 8;
const itemMarginHorizontal = 4;

const getSuitableTabItemWidth = (itemNum, tabBarWidth = winWidth) => {
  const divisionNum = 3;
  return itemNum > 3
    ? itemWidth
    : (tabBarWidth -
        2 * tabBarPaddingHorizontal -
        2 * itemMarginHorizontal * divisionNum) /
        divisionNum;
};

const tabItemStyles = StyleSheet.create({
  container: {
    height: itemHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: itemMarginHorizontal,
    marginLeft: itemMarginHorizontal,
    position: 'relative',
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#D5D5D5',
  },
  bg: {
    height: '100%',
    width: '100%',
  },
  textContainer: {
    position: 'absolute',
    bottom: 0,
    top: itemHeight / 2,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingLeft: 2,
    paddingRight: 2,
  },
  text: {
    textAlign: 'center',
    fontSize: 12,
  },
});

const tabBarStyles = StyleSheet.create({
  container: {
    height: 'auto',
  },
  tabsContainer: {
    paddingTop: tabBarPaddingVertical,
    paddingLeft: tabBarPaddingHorizontal,
    paddingRight: tabBarPaddingHorizontal,
    paddingBottom: tabBarPaddingVertical,
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
  },
  underline: {
    height: 2,
    width: 60,
    backgroundColor: '#ee4d2d',
  },
});

class Tab extends PureComponent {
  state = { pressing: false };

  render() {
    const { style, item, isActive, onPress, onLayout } = this.props;
    const textColor = isActive ? '#EE4D2D' : 'rgba(0,0,0,0.87)';
    const fontWeight = isActive ? FONT_MEDIUM : FONT_FAMILY;
    return (
      <TouchableOpacity
        activeOpacity={1}
        key={item.id}
        accessible={true}
        accessibilityLabel={item.title}
        accessibilityTraits="button"
        onPress={onPress}
        onLayout={onLayout}
        onPressIn={() => {
          this.setState({ pressing: true });
        }}
        onPressOut={() => {
          this.setState({ pressing: false });
        }}
      >
        <View style={[tabItemStyles.container, style]}>
          <ImageBackground
            source={{ uri: `${STATIC_URL}/${item.image}` }}
            style={tabItemStyles.bg}
            opacity={this.state.pressing ? 0.8 : 1}
          >
            <View style={tabItemStyles.textContainer}>
              <Text
                numberOfLines={1}
                style={[
                  tabItemStyles.text,
                  { color: textColor, ...fontWeight },
                ]}
              >
                {item.title}
              </Text>
            </View>
          </ImageBackground>
        </View>
      </TouchableOpacity>
    );
  }
}

export default Tab;

export function renderTabBar(props, tabs) {
  return (
    <ScrollableTabBar
      {...props}
      style={tabBarStyles.container}
      tabsContainerStyle={tabBarStyles.tabsContainer}
      underlineStyle={tabBarStyles.underline}
      tabs={tabs}
      onLayout={e => cache.set(TAB_HEIGHT, e.nativeEvent.layout.height)}
      renderTab={(
        tabItem,
        page,
        isTabActive,
        onPressHandler,
        onLayoutHandler
        // eslint-disable-next-line max-params
      ) => {
        const tabWidth = getSuitableTabItemWidth(tabs.length, winWidth);
        return (
          <Tab
            key={JSON.stringify(tabItem)}
            item={tabItem}
            style={{ width: tabWidth }}
            isActive={isTabActive}
            onPress={() => onPressHandler(page)}
            onLayout={onLayoutHandler}
          />
        );
      }}
    />
  );
}
