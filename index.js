import React, { PureComponent } from 'react';
import ScrollableTabView, {
  DefaultTabBar,
} from 'react-native-scrollable-tab-view';
import { View, Animated } from 'react-native';

class HeaderContainer extends PureComponent {
  state = {
    headerLayoutHeight: 0,
    stickBarLayoutHeight: 0,
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

const makeSceneKey = (child, index) =>
  `${child.props.tabLabel || 'unknown'}-${index}`;
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
  activeSceneKey = null;
  _getActiveSceneKey = () => {
    return this.activeSceneKey;
  };
  _setActiveSceneKey = sceneKey => {
    this.activeSceneKey = sceneKey;
  };

  defaultSceneKey = makeSceneKey(
    this.props.children[this.props.initialPage],
    this.props.initialPage
  );
  visitedSceneKeys = {};
  isVisited = sceneKey => {
    return this.visitedSceneKeys[sceneKey] !== undefined;
  };
  addVisitedSceneKey = sceneKey => {
    this.visitedSceneKeys[sceneKey] = true;
  };

  _getComponentName = node => {
    return node.props.as || node.type.name;
  };
  // 考虑性能
  _channelRenderableChildComponent = child => {
    // TODO: only support FlatList
    const { _getComponentName, _memo } = this;
    const typeName = _getComponentName(child);
    const AnimatedChannelRenderComponent = _memo(
      `${typeName}@_channelRenderableChildComponent`,
      () => {
        const AnimatedComponent = Animated[typeName];
        return withChannelRender(AnimatedComponent);
      },
      [typeName]
    );
    return AnimatedChannelRenderComponent;
  };

  // childrenNodeTypeMap = {};
  // _getChildrenNodeType = sceneKey => {
  //   return this.childrenNodeTypeMap[sceneKey];
  // };
  // _setChildrenNodeType = (sceneKey, nodeType) => {
  //   this.childrenNodeTypeMap[sceneKey] = nodeType;
  // };
  childrenNodeRerenderMap = {};
  _getChildrenNodeRerender = sceneKey => {
    return this.childrenNodeRerenderMap[sceneKey] || (() => {});
  };
  _setChildrenNodeRerender = (sceneKey, rerender) => {
    this.childrenNodeRerenderMap[sceneKey] = rerender;
  };

  // for lazy render scene content
  componentDidMount() {
    // render default scene
    const {
      defaultSceneKey,
      addVisitedSceneKey,
      _getChildrenNodeRerender,
      _setActiveSceneKey,
    } = this;
    const rerenderDefaultChild = _getChildrenNodeRerender(defaultSceneKey);

    _setActiveSceneKey(defaultSceneKey);
    addVisitedSceneKey(defaultSceneKey);
    if (rerenderDefaultChild) {
      rerenderDefaultChild();
    }
  }
  _rerenderChildrenOfVisitedTabs = sceneKey => {
    const { isVisited, addVisitedSceneKey, _getChildrenNodeRerender } = this;
    const hasVisited = isVisited(sceneKey);
    if (!hasVisited) {
      const rerender = _getChildrenNodeRerender(sceneKey);
      addVisitedSceneKey(sceneKey);
      if (rerender) {
        rerender();
      }
    }
  };
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
  _renderChildren = children => {
    const {
      _setScrollNode,
      _handleScrollStop,
      scrollOffsetAnimatedValue,
      _channelRenderableChildComponent,
      _setChildrenNodeRerender,
    } = this;
    const { onScroll: proxyOnScroll } = this.props;
    const { headerHeight } = this.state;
    return React.Children.map(children, (child, index) => {
      const AnimatedChannelRenderChildComponent = _channelRenderableChildComponent(
        child
      );
      const sceneKey = makeSceneKey(child, index);
      const handleScroll = _handleScrollStop(sceneKey);

      return (
        <AnimatedChannelRenderChildComponent
          {...child.props}
          forwardedRef={node => {
            // todo check ref api
            // child.props.ref(node)
            // set scrollNodes
            _setScrollNode(sceneKey, node ? node._component : null);
          }}
          ref={channelRenderInstance => {
            _setChildrenNodeRerender(sceneKey, () => {
              const {
                _getHeaderOffset,
                _getFoldableHeaderOffset,
                _getCachedScrollOffset,
              } = this;
              const y = calcAlterScrollOffset(
                _getHeaderOffset(),
                _getFoldableHeaderOffset(),
                _getCachedScrollOffset(sceneKey)
              );
              channelRenderInstance.rerender({
                contentOffset: { y },
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
  render() {
    const {
      _setCachedScrollOffset,
      _handleHeaderLayoutChange,
      _renderChildren,
      scrollOffsetAnimatedValue,
    } = this;
    const {
      header = null,
      renderTabBar,
      children,
      style,
      initialPage,
    } = this.props;
    return (
      <View
        style={{
          ...style,
          position: 'relative',
          flexGrow: 1,
        }}
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
              _rerenderChildrenOfVisitedTabs,
            } = this;
            const lastSceneKey = _getActiveSceneKey();
            _setCachedScrollOffset(
              lastSceneKey,
              _getAlterScrollOffset(lastSceneKey)
            );

            const activeSceneKey = makeSceneKey(ref, i);
            _setActiveSceneKey(activeSceneKey);

            _rerenderChildrenOfVisitedTabs(activeSceneKey);
          }}
        >
          {_renderChildren(children)}
        </ScrollableTabView>
      </View>
    );
  }
}

StickableTabView.defaultProps = {
  header: null,
  renderTabBar: props => <DefaultTabBar {...props} />,
  children: null,
  style: {},
  initialPage: 0,
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
      });
    }
    render() {
      let alterProps = {};
      const { props, _setLastSupplementProps, _getLastSupplementProps } = this;
      const { supplementProps } = this.state;

      const { forwardedRef } = props;
      if (_getLastSupplementProps() === supplementProps) {
        // rerender without call rerender funciton
        alterProps = { ...supplementProps, ...props };
      } else {
        _setLastSupplementProps(supplementProps);
        alterProps = { ...props, ...supplementProps };
      }

      return <WrapedComponment {...alterProps} ref={forwardedRef} />;
    }
  }
  return ChannelRender;
}
