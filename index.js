import React, { PureComponent } from 'react';
import ScrollableTabView, {
  DefaultTabBar,
} from 'react-native-scrollable-tab-view';
import { View, Animated } from 'react-native';

class HeaderContainer extends PureComponent {
  state = {
    headerLayoutHeight: 0,
    stickBarLayoutHeight: 0,
    containerHeight: 0,
  };
  handleHeaderLayout = ({ nativeEvent }) => {
    const { stickBarLayoutHeight } = this.state;
    const height = nativeEvent.layout.height;
    this.setState({
      headerLayoutHeight: height,
    });
    this.props.onLayoutChange({ height, stickBarHeight: stickBarLayoutHeight });
  };

  handleStickBarLayout = ({ nativeEvent }) => {
    const { headerLayoutHeight } = this.state;
    const stickBarHeight = nativeEvent.layout.height;
    this.setState({
      stickBarLayoutHeight: stickBarHeight,
    });
    this.props.onLayoutChange({ height: headerLayoutHeight, stickBarHeight });
  };
  render() {
    const { headerLayoutHeight, stickBarLayoutHeight } = this.state;
    const { scrollOffsetAnimatedValue, children } = this.props;
    const { handleHeaderLayout, handleStickBarLayout } = this;
    const maxScrollOutOfBoundAnimatedOffset = 999;
    const foldableHeaderOffset = Math.max(
      headerLayoutHeight - stickBarLayoutHeight,
      0
    );
    const translateY = scrollOffsetAnimatedValue.interpolate({
      inputRange: [-maxScrollOutOfBoundAnimatedOffset, foldableHeaderOffset],
      outputRange: [maxScrollOutOfBoundAnimatedOffset, -foldableHeaderOffset],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            zIndex: 1,
            transform: [{ translateY }],
          },
        ]}
        onLayout={handleHeaderLayout}
      >
        {children.slice(0, children.length - 1)}
        <View onLayout={handleStickBarLayout}>
          {children[children.length - 1]}
        </View>
      </Animated.View>
    );
  }
}

const makeSceneKey = (tabLabel, index) => `${tabLabel}-${index}`;
const calcAlterScrollOffset = (
  headerOffset,
  foldableHeaderOffset,
  cachedScrollOffset
) => {
  // const headerOffset = calcHeaderOffset(offset, foldableHeaderOffset)
  const cachedHeaderOffset = calcHeaderOffset(
    cachedScrollOffset,
    foldableHeaderOffset
  );

  return headerOffset < foldableHeaderOffset
    ? headerOffset
    : Math.max(cachedScrollOffset + (headerOffset - cachedHeaderOffset), 0);
};

const calcHeaderOffset = (scrollOffset = 0, foldableHeaderOffset) => {
  return Math.min(scrollOffset, foldableHeaderOffset);
};

const ChannelRenderAnimatedFlatList = withChannelRender(Animated.FlatList);

class StickableTabView extends PureComponent {
  cacheWithDeps = {};
  _memo = (key, fn, deps) => {
    const cachedDeps = this.cacheWithDeps[key];
    if (cachedDeps) {
      const currentDeps = cachedDeps.deps;
      const currenVal = cachedDeps.value;
      const isUseCache = deps.every((dp, index) => {
        return Object.is(dp, currentDeps[index]);
      });
      if (isUseCache) {
        return currenVal;
      }
    }
    const c = {
      value: fn(),
      deps,
    };
    this.cacheWithDeps[key] = c;
    return c.value;
  };
  // header's height and stickBar's height is dymanic
  state = {
    headerHeight: 0,
    stickBarHeight: 0,
  };
  // sync header offset for diff scene via scrollTop
  scrollNodes = {};
  _getScrollNode = sceneKey => {
    return this.scrollNodes[sceneKey] || null;
  };
  _setScrollNode = (sceneKey, node) => {
    this.scrollNodes[sceneKey] = node;
  };
  alterScrollOffsetMap = {};
  _getAlterScrollOffset = sceneKey => {
    return this.alterScrollOffsetMap[sceneKey];
  };
  _setAlterScrollOffset = (sceneKey, offset) => {
    this.alterScrollOffsetMap[sceneKey] = offset;
  };

  _getFoldableHeaderOffset = () => {
    // header's max offset
    const { headerHeight, stickBarHeight } = this.state;
    const foldableHeaderOffset = Math.max(headerHeight - stickBarHeight, 0);
    return foldableHeaderOffset;
  };

  cachedScrollOffsetMap = {};
  _getCachedScrollOffset = sceneKey => {
    return this.cachedScrollOffsetMap[sceneKey] || 0;
  };
  _setCachedScrollOffset = (sceneKey, offset) => {
    this.cachedScrollOffsetMap[sceneKey] = offset;
  };

  headerOffset = 0;
  _getHeaderOffset = () => {
    return this.headerOffset;
  };
  _setHeaderOffset = offset => {
    this.headerOffset = offset;
  };

  scrollOffsetAnimatedValue = new Animated.Value(0);

  defaultSceneKey = makeSceneKey(
    this.props.tabs[this.props.initialPage],
    this.props.initialPage
  );

  activeSceneKey = this.defaultSceneKey;
  _getActiveSceneKey = () => {
    return this.activeSceneKey;
  };
  _setActiveSceneKey = sceneKey => {
    this.activeSceneKey = sceneKey;
  };

  hasListRenderedSceneKeys = {};
  hasRendered = sceneKey => {
    this.hasListRenderedSceneKeys[sceneKey] !== undefined;
  };
  addRenderedList = sceneKey => {
    this.hasListRenderedSceneKeys[sceneKey] = true;
  };

  _getComponentName = node => {
    return node.props.as || node.type.name;
  };
  childrenNodeRerenderMap = {};
  _getChildrenNodeRerender = sceneKey => {
    return this.childrenNodeRerenderMap[sceneKey] || (() => {});
  };
  _setChildrenNodeRerender = (sceneKey, rerender) => {
    this.childrenNodeRerenderMap[sceneKey] = rerender;
  };

  // api
  getFlatListRender = i => {
    const tabLabel = this.props.tabs[i];
    const sceneKey = makeSceneKey(tabLabel, i);
    return this._getChildrenNodeRerender(sceneKey);
  };

  // for lazy render scene content
  componentDidMount() {}
  _handleHeaderLayoutChange = ({ height, stickBarHeight }) => {
    this.setState({
      headerHeight: height,
      stickBarHeight: stickBarHeight,
    });
  };
  _handleScrollStopInternal = (handlingSceneKey, offset) => {
    const {
      scrollNodes,
      _getCachedScrollOffset,
      _getFoldableHeaderOffset,
      _setHeaderOffset,
    } = this;

    const foldableHeaderOffset = _getFoldableHeaderOffset();

    const headerOffset = calcHeaderOffset(offset, foldableHeaderOffset);
    _setHeaderOffset(headerOffset);

    const scrollNodeSceneKeys = Object.keys(scrollNodes);
    scrollNodeSceneKeys.forEach(sceneKey => {
      const cachedScrollOffset = _getCachedScrollOffset(sceneKey);
      const alterOffset =
        handlingSceneKey === sceneKey
          ? offset
          : calcAlterScrollOffset(
              headerOffset,
              foldableHeaderOffset,
              cachedScrollOffset
            );
      this._setAlterScrollOffset(sceneKey, alterOffset);
      // not scroll target that response to scroll event
      if (handlingSceneKey === sceneKey) {
        return;
      }
      const node = scrollNodes[sceneKey];
      if (node) {
        // scrollToOffset will trigger onScroll event
        node.scrollToOffset({
          animated: false,
          offset: alterOffset,
        });
      }
    });
  };
  _handleScrollStop = sceneKey => {
    let timerHandler = null;
    return e => {
      // The purpose of debounds is to aviod affect header's transform
      // since `scrollToOffset` caused frequent onScroll event response.
      const { _getActiveSceneKey, _handleScrollStopInternal } = this;
      if (_getActiveSceneKey() !== sceneKey) {
        // only handle active scene list's onScroll event
        return;
      }

      // react-native cann't conditional Animated.event
      // reduce the number of times the scroll event is triggered via debounds
      if (timerHandler !== null) {
        clearTimeout(timerHandler);
      }
      // nativeEvent can only access synchronously
      const { nativeEvent } = e;
      const offset = nativeEvent.contentOffset.y;

      // 100ms is the ideal interval for 2 consecutive operations
      timerHandler = setTimeout(() => {
        _handleScrollStopInternal(sceneKey, offset);
      }, 100);
    };
  };
  _renderChildren = () => {
    const {
      _setScrollNode,
      _handleScrollStop,
      scrollOffsetAnimatedValue,
      _setChildrenNodeRerender,
    } = this;
    const { onScroll: proxyOnScroll, tabs } = this.props;
    const { headerHeight, containerHeight, stickBarLayoutHeight } = this.state;
    return tabs.map((child, index) => {
      const tabLabel = tabs[index];
      const sceneKey = makeSceneKey(tabLabel, index);
      const handleScroll = _handleScrollStop(sceneKey);

      return (
        <ChannelRenderAnimatedFlatList
          forwardedRef={node => {
            // todo check ref api
            // child.props.ref(node)
            // set scrollNodes
            _setScrollNode(sceneKey, node ? node._component : null);
          }}
          key={sceneKey}
          tabLabel={tabLabel}
          ref={channelRenderInstance => {
            _setChildrenNodeRerender(sceneKey, props => {
              const {
                _getHeaderOffset,
                _getFoldableHeaderOffset,
                _getCachedScrollOffset,
              } = this;
              const { containerHeight, stickBarHeight } = this.state;
              const { hasRendered: hasRenderedFn, addRenderedList } = this;
              const hasRendered = hasRenderedFn(sceneKey);
              if (!hasRendered) {
                addRenderedList(sceneKey);
              }

              const y = calcAlterScrollOffset(
                _getHeaderOffset(),
                _getFoldableHeaderOffset(),
                _getCachedScrollOffset(sceneKey)
              );
              channelRenderInstance.rerender({
                ...(hasRendered ? {} : { contentOffset: { y } }),
                ...props,
                ListEmptyComponent: (
                  <View
                    style={{
                      width: '100%',
                      height: containerHeight - stickBarHeight,
                    }}
                  >
                    {props.ListEmptyComponent || null}
                  </View>
                ),
              });
            });
          }}
          ListHeaderComponent={
            <View
              style={{
                height: headerHeight,
              }}
            />
          }
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [
              {
                nativeEvent: {
                  contentOffset: {
                    y: scrollOffsetAnimatedValue,
                  },
                },
              },
            ],
            {
              useNativeDriver: true,
              listener: e => {
                // proxy onScroll
                if (proxyOnScroll) {
                  proxyOnScroll(e);
                }
                handleScroll(e);
              },
            }
          )}
        />
      );
    });
  };
  necessarilyLayoutCompleted = () => {
    // TODO
  };
  _handleContainerLayout = e => {
    this.setState({
      containerHeight: e.nativeEvent.layout.height,
    });
  };
  render() {
    const {
      _setCachedScrollOffset,
      _handleHeaderLayoutChange,
      _renderChildren,
      scrollOffsetAnimatedValue,
      _handleContainerLayout,
    } = this;
    const { header = null, renderTabBar, style, initialPage } = this.props;
    return (
      <View
        style={{
          ...style,
          position: 'relative',
          flexGrow: 1,
        }}
        onLayout={_handleContainerLayout}
      >
        <ScrollableTabView
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
          renderTabBar={props => (
            <HeaderContainer
              scrollOffsetAnimatedValue={scrollOffsetAnimatedValue}
              onLayoutChange={_handleHeaderLayoutChange}
            >
              {header}
              {renderTabBar(props)}
            </HeaderContainer>
          )}
          initialPage={initialPage}
          onChangeTab={({ i, ref }) => {
            const {
              _getAlterScrollOffset,
              _getActiveSceneKey,
              _setActiveSceneKey,
            } = this;
            const lastSceneKey = _getActiveSceneKey();
            _setCachedScrollOffset(
              lastSceneKey,
              _getAlterScrollOffset(lastSceneKey)
            );
            // TODO ref

            const activeSceneKey = makeSceneKey(ref.props.tabLabel, i);
            _setActiveSceneKey(activeSceneKey);

            // proxy onChangeTab
            this.props.onChangeTab(i);

            // _rerenderChildrenOfVisitedTabs(activeSceneKey);
          }}
        >
          {_renderChildren()}
        </ScrollableTabView>
      </View>
    );
  }
}

StickableTabView.defaultProps = {
  header: null,
  renderTabBar: props => <DefaultTabBar {...props} />,
  children: null,
  tabs: [],
  style: {},
  initialPage: 0,
  onChangeTab: () => {},
};

export default StickableTabView;

function withChannelRender(WrapedComponment) {
  // TODO: if component's render after call rerender
  class ChannelRender extends PureComponent {
    state = {
      supplementProps: {},
    };
    lastSupplementProps = this.state.supplementProps;
    _setLastSupplementProps = val => {
      this.lastSupplementProps = val;
    };
    _getLastSupplementProps = () => {
      return this.lastSupplementProps;
    };

    rerender(supplementProps = {}) {
      this.setState({
        supplementProps,
        allowRenderTrulyComponent: true,
      });
    }
    render() {
      let alterProps = {};
      const { props, _setLastSupplementProps, _getLastSupplementProps } = this;
      const { supplementProps, allowRenderTrulyComponent } = this.state;

      const { forwardedRef } = props;
      if (_getLastSupplementProps() === supplementProps) {
        // rerender without call rerender funciton
        alterProps = { ...supplementProps, ...props };
      } else {
        _setLastSupplementProps(supplementProps);
        alterProps = { ...props, ...supplementProps };
      }

      return allowRenderTrulyComponent ? (
        <WrapedComponment {...alterProps} ref={forwardedRef} />
      ) : null;
    }
  }
  return ChannelRender;
}
