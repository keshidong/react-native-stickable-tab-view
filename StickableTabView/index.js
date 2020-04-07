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
    console.log('handleStickBarLayout', stickBarHeight);
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
// !import, not only label scene via index
const makeSceneKey = (tabLabel, index) =>
  `${JSON.stringify(tabLabel || null)}-${index}`;
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
  // header's height and stickBar's height is dymanic
  state = {
    headerHeight: 0,
    stickBarHeight: 0,
  };
  // sync header offset for diff scene via scrollTop
  // TODO need filter scrollNodes before render be exec when update tabs
  scrollNodes = {};
  _getScrollNode = sceneKey => {
    return this.scrollNodes[sceneKey] || null;
  };
  _setScrollNode = (sceneKey, node) => {
    this.scrollNodes[sceneKey] = node;
  };

  // TODO use to currentScrollOffset?
  // TODO need filter
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

  // TODO need filter
  cachedScrollOffsetMap = {};
  _getCachedScrollOffset = sceneKey => {
    return this.cachedScrollOffsetMap[sceneKey] || 0;
  };
  _setCachedScrollOffset = (sceneKey, offset) => {
    this.cachedScrollOffsetMap[sceneKey] = offset;
  };

  // TODO: use currentScrollOffset deride headerOffset
  // expose getHeaderOffset api
  headerOffset = 0;
  _getHeaderOffset = () => {
    return this.headerOffset;
  };
  _setHeaderOffset = offset => {
    this.headerOffset = offset;
  };

  // TODO: check if need init when tabs change
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

  // TODO: filter when tabs change
  hasListRenderedSceneKeys = {};
  hasRendered = sceneKey => {
    return this.hasListRenderedSceneKeys[sceneKey] === true;
  };
  addRenderedList = sceneKey => {
    this.hasListRenderedSceneKeys[sceneKey] = true;
  };

  // TODO: filter when tabs change avoid memory leak
  childrenNodeRerenderMap = {};
  _getChildrenNodeRerender = sceneKey => {
    return this.childrenNodeRerenderMap[sceneKey] || (() => {});
  };
  _setChildrenNodeRerender = (sceneKey, rerender) => {
    this.childrenNodeRerenderMap[sceneKey] = rerender;
  };

  // TODO: filter when tabs change avoid memory leak
  childrenMountingThatMap = {};
  _getMountingThat = sceneKey => {
    return this.childrenMountingThatMap[sceneKey];
  };
  _setMountingThat = (sceneKey, ref) => {
    this.childrenMountingThatMap[sceneKey] = ref;
  };

  // api
  getFlatListRender = i => {
    const tabLabel = this.props.tabs[i];
    const sceneKey = makeSceneKey(tabLabel, i);
    return (propsOrFunction, didUpdate) => {
      const {
        _getHeaderOffset,
        _getFoldableHeaderOffset,
        _getCachedScrollOffset,
        _getChildrenNodeRerender,

        scrollOffsetAnimatedValue,
        _handleScrollStop,

        _getMountingThat,

        _getAdditionalHeightAnimatedValue,
        _setFunctionOfGetListContentLayoutHeightMap,
      } = this;
      const { hasRendered: hasRenderedFn, addRenderedList } = this;
      const additionalHeightAnimatedValue = _getAdditionalHeightAnimatedValue(
        sceneKey
      );
      const hasRendered = hasRenderedFn(sceneKey);
      if (!hasRendered) {
        addRenderedList(sceneKey);
      }

      console.log('render xxdw', this.hasListRenderedSceneKeys);

      const y = calcAlterScrollOffset(
        _getHeaderOffset(),
        _getFoldableHeaderOffset(),
        _getCachedScrollOffset(sceneKey)
      );

      const handleScroll = _handleScrollStop(sceneKey);
      const mountingThat = _getMountingThat(sceneKey);
      let nextPropsOrFunction;
      const makeProps = _props => ({
        // TODO
        contentOffset: { y },
        ..._props,
        // forward ListFooterComponent
        // // other layer for proxy ListFooterComponent and avoid cross reference
        // rename
        onScroll: Animated.event(
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
              if (_props.onScroll) {
                _props.onScroll(e, mountingThat);
              }
              handleScroll(e);
            },
          }
        ),
        ListFooterComponent: (
          <View>
            {_props.ListFooterComponent || null}
            <Animated.View
              style={{
                height: additionalHeightAnimatedValue,
                backgroundColor: Math.random() > 0.5 ? 'red' : 'green',
              }}
            />
          </View>
        ),
      });
      if (typeof propsOrFunction === 'function') {
        nextPropsOrFunction = lastProps =>
          makeProps(propsOrFunction(lastProps));
      } else {
        nextPropsOrFunction = makeProps(propsOrFunction);
      }

      _setFunctionOfGetListContentLayoutHeightMap(
        sceneKey,
        nextPropsOrFunction.getListContentLayoutHeight
      );
      const rerender = _getChildrenNodeRerender(sceneKey);
      rerender(nextPropsOrFunction, () => {
        const {
          _getAdditionalHeightAnimatedValue,
          _getListContentLayoutHeight,
        } = this;
        const { containerHeight, stickBarHeight } = this.state;

        // const additionalHeight = this._getListAdditionalHeight(sceneKey);
        // const listHeight = contentHeight - headerHeight - additionalHeight;

        const listContentHeight = _getListContentLayoutHeight(sceneKey);
        const additionalHeightAnimatedValue = _getAdditionalHeightAnimatedValue(
          sceneKey
        );

        const minListContentHeightRequire = containerHeight - stickBarHeight;
        // TODO prove convergence
        const alterAdditionalHeight = Math.max(
          minListContentHeightRequire - listContentHeight,
          0
        );

        console.log('_handleListContentSizeChange', 'contentHeight');
        additionalHeightAnimatedValue.setValue(alterAdditionalHeight);

        if (didUpdate) {
          didUpdate();
        }
      });
    };
    // return this._getChildrenNodeRerender(sceneKey);
  };

  functionOfGetListContentLayoutHeightMap = {};
  _getFunctionOfGetListContentLayoutHeightMap = scenekey =>
    this.functionOfGetListContentLayoutHeightMap[scenekey] || (() => 9999);
  _setFunctionOfGetListContentLayoutHeightMap = (scenekey, fn) => {
    this.functionOfGetListContentLayoutHeightMap[scenekey] = fn;
  };

  _getListContentLayoutHeight = scenekey => {
    return this._getFunctionOfGetListContentLayoutHeightMap(scenekey)();
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
  _renderChildren = () => {
    const { _setScrollNode, _setChildrenNodeRerender, _setMountingThat } = this;
    const { tabs } = this.props;
    const { headerHeight, containerHeight, stickBarLayoutHeight } = this.state;
    console.log(
      'containerHeight, stickBarLayoutHeight',
      containerHeight,
      stickBarLayoutHeight
    );
    return tabs.map((child, index) => {
      const tabLabel = tabs[index];
      const sceneKey = makeSceneKey(tabLabel, index);

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
            if (channelRenderInstance) {
              _setChildrenNodeRerender(
                sceneKey,
                channelRenderInstance.rerender
              );
              _setMountingThat(sceneKey, channelRenderInstance.mountingThat);
            }
          }}
          ListHeaderComponent={
            <View
              style={{
                height: headerHeight,
              }}
            />
          }
          scrollEventThrottle={16}
        />
      );
    });
  };
  necessarilyLayoutCompleted = () => {
    // TODO
  };

  // TODO filter
  additionalHeightAnimatedValueMap = {};
  _getAdditionalHeightAnimatedValue = sceneKey => {
    let animatedValue = this.additionalHeightAnimatedValueMap[sceneKey];
    if (!animatedValue) {
      animatedValue = new Animated.Value(0);
      this.additionalHeightAnimatedValueMap[sceneKey] = animatedValue;
    }

    return animatedValue;
  };
  // _setCurrentListAdditionalHeight = (sceneKey, height) => {
  //   this.currentListAdditionalHeightMap[sceneKey] = height;
  // };
  // _handleListContentSizeChange = sceneKey => contentHeight => {
  // };
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
      _ts: 0,
    };
    lastSupplementProps = this.state.supplementProps;
    _setLastSupplementProps = val => {
      this.lastSupplementProps = val;
    };
    _getLastSupplementProps = () => {
      return this.lastSupplementProps;
    };

    rerenderDidUpdates = [];
    _addDidUpdate = (callback, ts) => {
      const t = {
        callback,
        ts,
      };
      this.rerenderDidUpdates.push(t);
    };
    // for mount same data
    mountingThat = {};
    _consumeDidUpdates = ts => {
      const consumeableDidUpdates = this.rerenderDidUpdates.filter(
        t => t.ts <= ts
      );
      consumeableDidUpdates.forEach(t => {
        if (t.callback) {
          t.callback();
        }
      });
      this.rerenderDidUpdates = this.rerenderDidUpdates.filter(t => t.ts > ts);
    };
    rerender = (supplementProps = {}, didUpdate) => {
      let supplementPropsObj;
      if (typeof supplementProps === 'function') {
        supplementPropsObj = supplementProps({
          ...this.props,
          ...this.state.supplementProps,
        });
      } else {
        supplementPropsObj = supplementProps;
      }

      console.log('render ccvx rerender', this.state._ts);

      this._addDidUpdate(didUpdate, this.state._ts);

      this.setState({
        supplementProps: {
          ...this.state.supplementProps,
          ...supplementPropsObj,
        },
        allowRenderTrulyComponent: true,
        _ts: this.state._ts + 1,
      });
    };
    componentDidUpdate(prevProps, prevState) {
      console.log('render ccvx didUpdate', this.rerenderDidUpdates);
      this._consumeDidUpdates(prevState._ts);
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

      console.log('xxd', supplementProps);

      return allowRenderTrulyComponent ? (
        <WrapedComponment {...alterProps} ref={forwardedRef} />
      ) : null;
    }
  }
  return ChannelRender;
}
